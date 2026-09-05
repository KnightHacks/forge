import type { PgTable } from "drizzle-orm/pg-core";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  GuestJudgeSession,
  Judge,
  JudgeDeliberationEntry,
  JudgeDeliberationSection,
  JudgingRoom,
  JudgingRoomAccessLink,
  JudgingRoomPresence,
  JudgingRubricItem,
  ProjectEvaluation,
  ProjectEvaluationRating,
  ProjectEvaluationResponse,
  ProjectEvaluationRevision,
  ProjectToChallenge,
} from "../schemas/knight-hacks";

function indexPredicate(table: PgTable, indexName: string) {
  const index = getTableConfig(table).indexes.find(
    (candidate) => candidate.config.name === indexName,
  );
  expect(index?.config.unique).toBe(true);
  expect(index?.config.where).toBeDefined();
  if (!index?.config.where) throw new Error(`Missing predicate: ${indexName}`);
  return new PgDialect().sqlToQuery(index.config.where).sql;
}

describe("judging room storage", () => {
  it("keeps room, judge, link, session, and presence as separate records", () => {
    expect(JudgingRoom.id).toBeDefined();
    expect(Judge.id).toBeDefined();
    expect(JudgingRoomAccessLink.id).toBeDefined();
    expect(GuestJudgeSession.id).toBeDefined();
    expect(JudgingRoomPresence.id).toBeDefined();
  });

  it("scopes a room challenge to its hackathon", () => {
    const foreignKeys = getTableConfig(JudgingRoom).foreignKeys.map((key) => {
      const reference = key.reference();
      return {
        columns: reference.columns.map((column) => column.name),
        foreignColumns: reference.foreignColumns.map((column) => column.name),
        name: key.getName(),
      };
    });

    expect(foreignKeys).toContainEqual({
      columns: ["challengeId", "hackathonId"],
      foreignColumns: ["id", "hackathonId"],
      name: "knight_hacks_judging_room_challenge_scope_fk",
    });
  });

  it("scopes guest sessions to both their access link and judge hackathon", () => {
    const foreignKeys = getTableConfig(GuestJudgeSession).foreignKeys.map(
      (key) => key.getName(),
    );
    expect(foreignKeys).toContain(
      "knight_hacks_guest_judge_session_access_link_scope_fk",
    );
    expect(foreignKeys).toContain(
      "knight_hacks_guest_judge_session_judge_scope_fk",
    );
  });

  it("enforces one active room presence and one active link", () => {
    expect(
      indexPredicate(
        JudgingRoomAccessLink,
        "knight_hacks_judging_room_access_link_active_room_unique",
      ),
    ).toBe('"knight_hacks_judging_room_access_link"."revokedAt" IS NULL');
    expect(
      indexPredicate(
        JudgingRoomPresence,
        "knight_hacks_judging_room_presence_active_judge_unique",
      ),
    ).toBe('"knight_hacks_judging_room_presence"."leftAt" IS NULL');
  });

  it("stores rubric, evaluations, revisions, and deliberation separately", () => {
    expect(JudgingRubricItem.id).toBeDefined();
    expect(ProjectEvaluation.id).toBeDefined();
    expect(ProjectEvaluationRating.value).toBeDefined();
    expect(ProjectEvaluationResponse.value).toBeDefined();
    expect(ProjectEvaluationRevision.revision).toBeDefined();
    expect(JudgeDeliberationSection.id).toBeDefined();
    expect(JudgeDeliberationEntry.id).toBeDefined();
  });

  it("retains a historical member judge when the auth account is deleted", () => {
    const userForeignKey = getTableConfig(Judge).foreignKeys.find((key) =>
      key.reference().columns.some((column) => column.name === "userId"),
    );

    expect(userForeignKey?.onDelete).toBe("set null");
    const identityCheck = getTableConfig(Judge).checks.find(
      (constraint) =>
        constraint.name === "knight_hacks_judge_kind_identity_check",
    );
    expect(identityCheck).toBeDefined();
  });

  it("enforces one evaluation per judge, project, and challenge", () => {
    const unique = getTableConfig(ProjectEvaluation).uniqueConstraints.map(
      (constraint) => constraint.name,
    );
    expect(unique).toContain(
      "knight_hacks_project_evaluation_judge_project_challenge_unique",
    );
  });

  it("requires the evaluated project to enter the selected challenge", () => {
    const membershipUnique = getTableConfig(
      ProjectToChallenge,
    ).uniqueConstraints.find(
      (constraint) =>
        constraint.name ===
        "knight_hacks_project_to_challenge_project_challenge_hackathon_unique",
    );
    expect(membershipUnique).toBeDefined();

    const membershipForeignKey = getTableConfig(
      ProjectEvaluation,
    ).foreignKeys.find(
      (key) =>
        key.getName() ===
        "knight_hacks_project_evaluation_project_challenge_scope_fk",
    );
    expect(membershipForeignKey).toBeDefined();
    const reference = membershipForeignKey?.reference();
    expect(reference?.columns.map((column) => column.name)).toEqual([
      "projectId",
      "challengeId",
      "hackathonId",
    ]);
    expect(reference?.foreignColumns.map((column) => column.name)).toEqual([
      "projectId",
      "challengeId",
      "hackathonId",
    ]);
  });

  it("checks rating values in the database", () => {
    const checks = getTableConfig(ProjectEvaluationRating).checks.map(
      (constraint) => constraint.name,
    );
    expect(checks).toContain(
      "knight_hacks_project_evaluation_rating_value_check",
    );
  });

  it("keeps every quantitative rubric item required", () => {
    const visibilityCheck = getTableConfig(JudgingRubricItem).checks.find(
      (constraint) =>
        constraint.name === "knight_hacks_judging_rubric_item_visibility_check",
    );
    expect(visibilityCheck).toBeDefined();
    if (!visibilityCheck) throw new Error("Missing rubric visibility check.");
    expect(new PgDialect().sqlToQuery(visibilityCheck.value).sql).toContain(
      '"knight_hacks_judging_rubric_item"."required" = true',
    );
  });
});
