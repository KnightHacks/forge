import { TRPCError } from "@trpc/server";

import { and, eq, inArray, sql } from "@forge/db";
import {
  JudgingSchedule,
  Project,
  ProjectChallenge,
  ProjectEvaluation,
  ProjectEvaluationDraft,
  ProjectToChallenge,
} from "@forge/db/schemas/knight-hacks";

import type { WriteDb } from "../db";

/** Caller holds the hackathon lock used by schedule Save. */
export async function assertJudgingSetupEditable(
  tx: WriteDb,
  hackathonId: string,
) {
  const schedule = await tx.query.JudgingSchedule.findFirst({
    columns: { id: true },
    where: eq(JudgingSchedule.hackathonId, hackathonId),
  });
  if (schedule)
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "A saved schedule locks judging setup. Drop the eligible schedule before making changes.",
    });
}

export async function assertChallengeSetupEditable(
  tx: WriteDb,
  hackathonId: string,
) {
  await assertJudgingSetupEditable(tx, hackathonId);
  const [evaluation, draft] = await Promise.all([
    tx.query.ProjectEvaluation.findFirst({
      columns: { id: true },
      where: eq(ProjectEvaluation.hackathonId, hackathonId),
    }),
    tx.query.ProjectEvaluationDraft.findFirst({
      columns: { id: true },
      where: eq(ProjectEvaluationDraft.hackathonId, hackathonId),
    }),
  ]);
  if (evaluation || draft)
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Challenge setup is locked because judging feedback has started.",
    });
}

export interface ChallengeConfiguration {
  id: string;
  parentId: string | null;
  isGroup: boolean;
  isGeneral: boolean;
  isScheduled: boolean;
}

export function validateChallengeGrouping(
  challenges: ChallengeConfiguration[],
  challengeId: string,
  parentId: string | null,
) {
  const challenge = challenges.find((item) => item.id === challengeId);
  if (!challenge)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Challenge not found in this hackathon.",
    });
  if (parentId === null) return;
  const parent = challenges.find((item) => item.id === parentId);
  if (
    !parent ||
    !parent.isGroup ||
    challenge.isGroup ||
    parent.id === challenge.id ||
    parent.parentId !== null ||
    challenge.isGeneral ||
    challenges.some((item) => item.parentId === challenge.id)
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Choose a judging group in this hackathon. Groups cannot be collapsed.",
    });
  }
}

/** Explicit opt-ins survive regrouping; derived parent links exist for evaluation FKs. */
export async function rebuildParentMemberships(
  tx: WriteDb,
  hackathonId: string,
  projectIds?: string[],
) {
  if (projectIds?.length === 0) return;
  const scope = and(
    eq(ProjectToChallenge.hackathonId, hackathonId),
    projectIds ? inArray(ProjectToChallenge.projectId, projectIds) : undefined,
  );
  await tx
    .delete(ProjectToChallenge)
    .where(and(scope, eq(ProjectToChallenge.isOptIn, false)));
  const optIns = await tx
    .select({
      projectId: ProjectToChallenge.projectId,
      parentId: ProjectChallenge.parentId,
    })
    .from(ProjectToChallenge)
    .innerJoin(
      ProjectChallenge,
      eq(ProjectChallenge.id, ProjectToChallenge.challengeId),
    )
    .where(scope);
  const parents = new Map<
    string,
    {
      projectId: string;
      challengeId: string;
      hackathonId: string;
      isOptIn: boolean;
    }
  >();
  for (const item of optIns) {
    if (item.parentId)
      parents.set(`${item.projectId}:${item.parentId}`, {
        projectId: item.projectId,
        challengeId: item.parentId,
        hackathonId,
        isOptIn: false,
      });
  }
  const everyProjectGroups = await tx
    .select({ id: ProjectChallenge.id })
    .from(ProjectChallenge)
    .where(
      and(
        eq(ProjectChallenge.hackathonId, hackathonId),
        eq(ProjectChallenge.isGroup, true),
        eq(ProjectChallenge.isGeneral, true),
      ),
    );
  if (everyProjectGroups.length) {
    const projects = await tx
      .select({ id: Project.id })
      .from(Project)
      .where(
        and(
          eq(Project.hackathonId, hackathonId),
          projectIds ? inArray(Project.id, projectIds) : undefined,
        ),
      );
    for (const project of projects)
      for (const group of everyProjectGroups)
        parents.set(`${project.id}:${group.id}`, {
          projectId: project.id,
          challengeId: group.id,
          hackathonId,
          isOptIn: false,
        });
  }
  if (parents.size)
    await tx
      .insert(ProjectToChallenge)
      .values([...parents.values()])
      .onConflictDoNothing();
}

export const challengeSelection = {
  id: ProjectChallenge.id,
  label: ProjectChallenge.label,
  parentId: ProjectChallenge.parentId,
  isGroup: ProjectChallenge.isGroup,
  isMlhImportDefault: sql<boolean>`coalesce(${ProjectChallenge.importLabelMatch} = 'MLH', false)`,
  isGeneral: ProjectChallenge.isGeneral,
  isScheduled: ProjectChallenge.isScheduled,
};

/** Prefer an every-project scope, then a stable standalone scope when none exists. */
export function defaultJudgingChallenge<
  T extends {
    id: string;
    label: string;
    parentId: string | null;
    isGeneral: boolean;
  },
>(challenges: T[]): T | undefined {
  return challenges
    .filter((challenge) => !challenge.parentId)
    .sort(
      (a, b) =>
        Number(b.isGeneral) - Number(a.isGeneral) ||
        a.label.localeCompare(b.label) ||
        a.id.localeCompare(b.id),
    )[0];
}
