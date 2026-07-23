import { describe, expect, it } from "vitest";

import type { RouterOutputs } from "@forge/api";

import { canAccessIssues } from "~/app/_components/admin/access";

type EffectivePermissions = RouterOutputs["roles"]["getPermissions"];

function permissions(
  values: Partial<EffectivePermissions>,
): EffectivePermissions {
  return values as EffectivePermissions;
}

describe("Issues rollout gate", () => {
  it("TC-MIG-004 keeps the route unavailable while rollout is disabled", () => {
    expect(canAccessIssues(permissions({ IS_OFFICER: true }), false)).toBe(
      false,
    );
    expect(canAccessIssues(permissions({ EDIT_ISSUES: true }), false)).toBe(
      false,
    );
  });

  it("allows authorized members only after rollout is enabled", () => {
    expect(canAccessIssues(permissions({ READ_ISSUES: true }), true)).toBe(
      true,
    );
    expect(canAccessIssues(permissions({}), true)).toBe(false);
  });
});
