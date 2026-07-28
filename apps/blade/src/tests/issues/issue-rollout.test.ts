import { describe, expect, it } from "vitest";

import type { RouterOutputs } from "@forge/api";

import { canAccessIssues } from "~/lib/admin-access";

type EffectivePermissions = RouterOutputs["roles"]["getPermissions"];

function permissions(
  values: Partial<EffectivePermissions>,
): EffectivePermissions {
  return values as EffectivePermissions;
}

describe("Issues permission gate", () => {
  it("allows officers and explicitly authorized members without a rollout flag", () => {
    expect(canAccessIssues(permissions({ IS_OFFICER: true }))).toBe(true);
    expect(canAccessIssues(permissions({ EDIT_ISSUES: true }))).toBe(true);
    expect(canAccessIssues(permissions({ READ_ISSUES: true }))).toBe(true);
  });

  it("rejects members without an Issues permission", () => {
    expect(canAccessIssues(permissions({}))).toBe(false);
  });
});
