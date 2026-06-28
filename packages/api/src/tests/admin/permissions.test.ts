import { describe, expect, it } from "vitest";

import { PERMISSIONS } from "@forge/consts";
import { permissions } from "@forge/utils";

import {
  createEmptyPermissionMap,
  mergePermissionBitstrings,
} from "../../utils/permissions";

function bitstring(...indices: number[]) {
  const bits = Array.from(
    { length: Object.keys(PERMISSIONS.PERMISSION_DATA).length },
    () => "0",
  );
  for (const index of indices) bits[index] = "1";
  return bits.join("");
}

function permissionIndex(key: PERMISSIONS.PermissionKey) {
  const permission = PERMISSIONS.PERMISSION_DATA[key];
  if (!permission) throw new Error(`Missing permission ${key}`);
  return permission.idx;
}

describe("effective permissions", () => {
  it("returns a complete false map for users without linked roles", () => {
    expect(mergePermissionBitstrings([])).toEqual(createEmptyPermissionMap());
  });

  it("unions capabilities from every linked role", () => {
    const result = mergePermissionBitstrings([
      bitstring(permissionIndex("READ_MEMBERS")),
      bitstring(permissionIndex("EDIT_MEMBERS")),
    ]);

    expect(result.READ_MEMBERS).toBe(true);
    expect(result.EDIT_MEMBERS).toBe(true);
    expect(result.READ_CLUB_DATA).toBe(false);
  });

  it("ignores missing and malformed bits", () => {
    const result = mergePermissionBitstrings(["001", "not-a-bitstring"]);

    expect(result.READ_MEMBERS).toBe(true);
    expect(result.EDIT_MEMBERS).toBe(false);
  });

  it("lets officers override checks and uses forbidden for missing access", () => {
    const officer = {
      session: {
        permissions: {
          ...createEmptyPermissionMap(),
          IS_OFFICER: true,
        },
      },
    };
    const reader = {
      session: {
        permissions: {
          ...createEmptyPermissionMap(),
          READ_MEMBERS: true,
        },
      },
    };

    expect(permissions.controlPerms.or(["EDIT_MEMBERS"], officer)).toBe(true);
    expect(() =>
      permissions.controlPerms.or(["EDIT_MEMBERS"], reader),
    ).toThrowError(expect.objectContaining({ code: "FORBIDDEN" }));
  });
});
