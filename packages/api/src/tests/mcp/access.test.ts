import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";

import type { PERMISSIONS } from "@forge/consts";
import { permissions as permissionUtils } from "@forge/utils";

import type { McpAccessRule } from "../../utils/mcp/access";
import type { PermissionMap } from "../../utils/permissions";
import { assertAccess, evaluateAccess } from "../../utils/mcp/access";
import { createEmptyPermissionMap } from "../../utils/permissions";

function grant(...keys: PERMISSIONS.PermissionKey[]): PermissionMap {
  const permissions = createEmptyPermissionMap();
  for (const key of keys) permissions[key] = true;
  return permissions;
}

/** Whether the existing resolver check lets these permissions through. */
function controlPermsAllows(rule: McpAccessRule, permissions: PermissionMap) {
  const check =
    rule.mode === "any"
      ? permissionUtils.controlPerms.or
      : permissionUtils.controlPerms.and;
  try {
    return check(rule.permissions, { session: { permissions } });
  } catch (error) {
    expect(error).toBeInstanceOf(TRPCError);
    expect(error).toMatchObject({ code: "FORBIDDEN" });
    return false;
  }
}

describe("evaluateAccess", () => {
  it("allows an any rule when at least one listed permission is held", () => {
    const rule: McpAccessRule = {
      mode: "any",
      permissions: ["READ_HACKERS", "EDIT_HACKERS"],
    };

    expect(evaluateAccess(rule, grant("READ_HACKERS"))).toBe(true);
    expect(evaluateAccess(rule, grant("EDIT_HACKERS"))).toBe(true);
    expect(evaluateAccess(rule, grant("READ_HACKERS", "EDIT_HACKERS"))).toBe(
      true,
    );
    expect(evaluateAccess(rule, grant("READ_HACK_DATA"))).toBe(false);
    expect(evaluateAccess(rule, grant())).toBe(false);
  });

  it("allows an all rule only when every listed permission is held", () => {
    const rule: McpAccessRule = {
      mode: "all",
      permissions: ["READ_HACK_DATA", "READ_HACKERS"],
    };

    expect(evaluateAccess(rule, grant("READ_HACK_DATA", "READ_HACKERS"))).toBe(
      true,
    );
    expect(evaluateAccess(rule, grant("READ_HACK_DATA"))).toBe(false);
    expect(evaluateAccess(rule, grant("READ_HACKERS"))).toBe(false);
    expect(evaluateAccess(rule, grant())).toBe(false);
  });

  it("lets officers through every rule without the listed permissions", () => {
    for (const mode of ["any", "all"] as const) {
      expect(
        evaluateAccess(
          { mode, permissions: ["READ_HACK_DATA", "READ_HACKERS"] },
          grant("IS_OFFICER"),
        ),
      ).toBe(true);
    }
  });

  it("matches controlPerms.or and controlPerms.and for every combination", () => {
    const keys = [
      "IS_OFFICER",
      "READ_CLUB_DATA",
      "READ_HACK_DATA",
      "READ_HACKERS",
    ] as const satisfies readonly PERMISSIONS.PermissionKey[];
    const lists: McpAccessRule["permissions"][] = [
      ["READ_CLUB_DATA"],
      ["READ_HACK_DATA", "READ_HACKERS"],
      ["IS_OFFICER"],
    ];

    let compared = 0;
    for (let mask = 0; mask < 1 << keys.length; mask++) {
      const held = keys.filter((_, index) => (mask & (1 << index)) !== 0);
      const permissions = grant(...held);
      for (const mode of ["any", "all"] as const) {
        for (const list of lists) {
          const rule: McpAccessRule = { mode, permissions: list };
          expect(
            evaluateAccess(rule, permissions),
            `${mode} ${list.join(",")} with [${held.join(",")}]`,
          ).toBe(controlPermsAllows(rule, permissions));
          compared++;
        }
      }
    }
    expect(compared).toBe(16 * 2 * 3);
  });
});

describe("assertAccess", () => {
  it("throws the same FORBIDDEN TRPCError controlPerms throws", () => {
    const rule: McpAccessRule = { mode: "any", permissions: ["EMAIL_PORTAL"] };

    expect(() => assertAccess(rule, grant())).toThrow(TRPCError);
    expect(() => assertAccess(rule, grant())).toThrow(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
    expect(() => assertAccess(rule, grant("EMAIL_PORTAL"))).not.toThrow();
    expect(() => assertAccess(rule, grant("IS_OFFICER"))).not.toThrow();
  });
});
