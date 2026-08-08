import { describe, expect, it } from "vitest";

import { PERMISSIONS } from "@forge/consts";
import { db } from "@forge/db/client";
import { Issue } from "@forge/db/schemas/knight-hacks";

import { roleVisibilityPredicate } from "../../routers/issues";

const TEAM_ID = "00000000-0000-4000-8000-000000000001";

function permissionBits(...keys: PERMISSIONS.PermissionKey[]) {
  const bits = Array.from(
    { length: PERMISSIONS.PERMISSION_KEYS.length },
    () => "0",
  );
  for (const key of keys) {
    bits[PERMISSIONS.PERMISSION_DATA[key].idx] = "1";
  }
  return bits.join("");
}

describe("issue visibility query", () => {
  it("uses an alias-safe visibility subquery for non-officer roles", () => {
    const query = db.query.Issue.findMany({
      where: roleVisibilityPredicate([
        { id: TEAM_ID, permissions: permissionBits("READ_ISSUES") },
      ]),
      with: {
        team: true,
        teamVisibility: { with: { team: true } },
        userAssignments: { with: { user: { with: { member: true } } } },
      },
    });

    const compiled = query.toSQL();
    expect(compiled.sql).toContain(
      '"Issue"."id" in (select "issue_id" from "knight_hacks_issues_to_teams_visibility"',
    );
    expect(compiled.sql).not.toContain(
      '"knight_hacks_issues_to_teams_visibility"."issue_id" = "knight_hacks_issue"."id"',
    );
  });
});
