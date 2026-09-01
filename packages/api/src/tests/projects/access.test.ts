import { describe, expect, it } from "vitest";

import { PERMISSIONS } from "@forge/consts";

import {
  assertCanManageProjects,
  assertCanViewProjects,
} from "../../utils/projects/access";

function actor(...allowed: PERMISSIONS.PermissionKey[]) {
  return {
    session: {
      permissions: Object.fromEntries(
        PERMISSIONS.PERMISSION_KEYS.map((key) => [key, allowed.includes(key)]),
      ) as Record<PERMISSIONS.PermissionKey, boolean>,
    },
  };
}

describe("project access", () => {
  it("allows judges to read but never manage the project inventory", () => {
    const judge = actor("IS_JUDGE");
    expect(() => assertCanViewProjects(judge)).not.toThrow();
    expect(() => assertCanManageProjects(judge)).toThrowError(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
  });

  it("preserves the officer override for reads and management", () => {
    const officer = actor("IS_OFFICER");
    expect(() => assertCanViewProjects(officer)).not.toThrow();
    expect(() => assertCanManageProjects(officer)).not.toThrow();
    expect(() => assertCanViewProjects(actor())).toThrowError(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
  });
});
