import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  ProjectChallenge,
  ProjectMember,
  ProjectToChallenge,
} from "../schemas/knight-hacks";

describe("project inventory storage", () => {
  it("keeps collapsed parents inside the child's hackathon", () => {
    const parent = getTableConfig(ProjectChallenge).foreignKeys.find(
      (key) => key.getName() === "project_challenge_parent_scope_fk",
    );
    expect(parent?.reference().columns.map((column) => column.name)).toEqual([
      "parentId",
      "hackathonId",
    ]);
    expect(
      parent?.reference().foreignColumns.map((column) => column.name),
    ).toEqual(["id", "hackathonId"]);
    expect(
      getTableConfig(ProjectChallenge).checks.map(
        (constraint) => constraint.name,
      ),
    ).toEqual(
      expect.arrayContaining([
        "project_challenge_not_self",
        "project_challenge_root_general",
      ]),
    );
  });

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
