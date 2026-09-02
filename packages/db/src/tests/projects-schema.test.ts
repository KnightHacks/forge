import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { ProjectMember, ProjectToChallenge } from "../schemas/knight-hacks";

describe("project inventory storage", () => {
  it("scopes every project challenge link to one hackathon", () => {
    const foreignKeys = getTableConfig(ProjectToChallenge).foreignKeys.map(
      (foreignKey) => {
        const reference = foreignKey.reference();
        return {
          columns: reference.columns.map((column) => column.name),
          foreignColumns: reference.foreignColumns.map((column) => column.name),
          name: foreignKey.getName(),
        };
      },
    );

    expect(foreignKeys).toHaveLength(2);
    expect(foreignKeys).toEqual(
      expect.arrayContaining([
        {
          columns: ["projectId", "hackathonId"],
          foreignColumns: ["id", "hackathonId"],
          name: "knight_hacks_project_to_challenge_project_scope_fk",
        },
        {
          columns: ["challengeId", "hackathonId"],
          foreignColumns: ["id", "hackathonId"],
          name: "knight_hacks_project_to_challenge_challenge_scope_fk",
        },
      ]),
    );
  });

  it("requires an email for stored project members", () => {
    expect(ProjectMember.email.notNull).toBe(true);
  });
});
