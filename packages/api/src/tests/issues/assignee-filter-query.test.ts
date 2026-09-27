import { describe, expect, it } from "vitest";

import { db } from "@forge/db/client";

import { assigneeFilterPredicate } from "../../routers/issues";

const ASSIGNEE_ID = "00000000-0000-4000-8000-000000000001";

describe("issue assignee filter query", () => {
  it("TC-013 uses an alias-safe assignee subquery for the relational query builder", () => {
    const compiled = db.query.Issue.findMany({
      where: assigneeFilterPredicate([ASSIGNEE_ID]),
      with: {
        team: true,
        teamVisibility: { with: { team: true } },
        userAssignments: { with: { user: { with: { member: true } } } },
      },
    }).toSQL();

    // The relational query builder aliases the root table, so the filter must
    // compare the aliased column at the top level.
    expect(compiled.sql).toContain(
      '"Issue"."id" in (select "issue_id" from "knight_hacks_issues_to_users_assignment"',
    );
    // A correlated subquery reaches for the physical table name, which is not in
    // scope under the alias. Postgres rejects it with "invalid reference to
    // FROM-clause entry for table \"knight_hacks_issue\"" and the workspace
    // renders the generic issues load failure instead of the filtered results.
    expect(compiled.sql).not.toContain(
      '"knight_hacks_issues_to_users_assignment"."issue_id" = "knight_hacks_issue"."id"',
    );
  });
});
