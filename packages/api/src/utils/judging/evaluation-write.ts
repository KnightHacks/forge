import { TRPCError } from "@trpc/server";

import { and, asc, eq, isNull, sql } from "@forge/db";
import {
  HackathonJudgingConfiguration,
  JudgingAppointment,
  JudgingRubricItem,
  JudgingSchedule,
  Project,
  ProjectEvaluation,
  ProjectEvaluationRating,
  ProjectEvaluationResponse,
  ProjectEvaluationRevision,
  ProjectToChallenge,
} from "@forge/db/schemas/knight-hacks";

import type { AuditActor } from "../audit/service";
import type { WriteDb } from "../db";
import { createAdminAuditEvent } from "../audit/service";
import { evaluationMean, resolveResponseVisibility } from "./scoring";

export interface EvaluationAnswers {
  ratings: { itemId: string; value: number }[];
  responses: { itemId: string; value: string; isPublic?: boolean }[];
}

export async function prepareEvaluationAnswers(
  tx: WriteDb,
  hackathonId: string,
  principalKind: "guest" | "member",
  answers: EvaluationAnswers,
) {
  const rubric = await tx
    .select()
    .from(JudgingRubricItem)
    .where(eq(JudgingRubricItem.hackathonId, hackathonId))
    .orderBy(asc(JudgingRubricItem.displayOrder));
  const ratings = rubric.filter((item) => item.kind === "rating");
  const responses = rubric.filter((item) => item.kind === "short_response");
  if (ratings.length === 0)
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "This hackathon does not have a judging rubric.",
    });
  if (
    new Set(answers.ratings.map((answer) => answer.itemId)).size !==
      answers.ratings.length ||
    new Set(answers.responses.map((answer) => answer.itemId)).size !==
      answers.responses.length ||
    answers.ratings.some(
      (answer) =>
        !ratings.some((item) => item.id === answer.itemId) ||
        !Number.isInteger(answer.value) ||
        answer.value < 1 ||
        answer.value > 5,
    ) ||
    answers.responses.some(
      (answer) => !responses.some((item) => item.id === answer.itemId),
    )
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Your answers do not match the active rubric.",
    });
  }
  const isComplete =
    ratings.every((item) =>
      answers.ratings.some((answer) => answer.itemId === item.id),
    ) &&
    responses.every(
      (item) =>
        !item.required ||
        answers.responses.some(
          (answer) =>
            answer.itemId === item.id && answer.value.trim().length > 0,
        ),
    );
  const resolvedResponses = answers.responses.map((answer) => {
    const item = responses.find((item) => item.id === answer.itemId);
    const policy =
      principalKind === "guest"
        ? item?.guestVisibilityPolicy
        : item?.memberVisibilityPolicy;
    if (!policy) throw new TRPCError({ code: "BAD_REQUEST" });
    return {
      ...answer,
      value: answer.value.trim(),
      isPublic: resolveResponseVisibility(policy, answer.isPublic),
    };
  });
  return { isComplete, ratings: answers.ratings, responses: resolvedResponses };
}

/** Caller holds the hackathon lock and has already enforced identity and timing. */
export async function writeEvaluation(
  tx: WriteDb,
  input: EvaluationAnswers & {
    hackathonId: string;
    projectId: string;
    challengeId: string;
    judgeId: string;
    principalKind: "guest" | "member";
    actor: AuditActor;
    appointmentId: string | null;
    autoSubmittedAt?: Date;
    expectedRevision?: number;
  },
) {
  const [project] = await tx
    .select({ id: Project.id, title: Project.title })
    .from(Project)
    .innerJoin(
      ProjectToChallenge,
      and(
        eq(ProjectToChallenge.projectId, Project.id),
        eq(ProjectToChallenge.challengeId, input.challengeId),
        eq(ProjectToChallenge.hackathonId, input.hackathonId),
      ),
    )
    .where(
      and(
        eq(Project.id, input.projectId),
        eq(Project.hackathonId, input.hackathonId),
        isNull(Project.deletedAt),
      ),
    )
    .limit(1);
  if (!project) throw new TRPCError({ code: "NOT_FOUND" });
  const answers = await prepareEvaluationAnswers(
    tx,
    input.hackathonId,
    input.principalKind,
    input,
  );
  if (!answers.isComplete && !input.autoSubmittedAt)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Complete the required answers before submitting.",
    });
  const [existing] = await tx
    .select()
    .from(ProjectEvaluation)
    .where(
      and(
        eq(ProjectEvaluation.judgeId, input.judgeId),
        eq(ProjectEvaluation.projectId, input.projectId),
        eq(ProjectEvaluation.challengeId, input.challengeId),
      ),
    )
    .for("update")
    .limit(1);
  if (
    input.expectedRevision !== undefined &&
    (existing?.revision ?? 0) !== input.expectedRevision
  )
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "This submission changed in another window. Reload its latest answers.",
    });
  const revision = (existing?.revision ?? 0) + 1;
  const now = input.autoSubmittedAt ?? new Date();
  const [evaluation] = existing
    ? await tx
        .update(ProjectEvaluation)
        .set({ revision, isComplete: answers.isComplete, updatedAt: now })
        .where(eq(ProjectEvaluation.id, existing.id))
        .returning()
    : await tx
        .insert(ProjectEvaluation)
        .values({
          challengeId: input.challengeId,
          hackathonId: input.hackathonId,
          judgeId: input.judgeId,
          projectId: input.projectId,
          revision,
          isComplete: answers.isComplete,
          appointmentId: input.appointmentId,
          autoSubmittedAt: input.autoSubmittedAt ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
  if (!evaluation) throw new Error("Evaluation was not saved.");
  if (existing) {
    await tx
      .delete(ProjectEvaluationRating)
      .where(eq(ProjectEvaluationRating.evaluationId, evaluation.id));
    await tx
      .delete(ProjectEvaluationResponse)
      .where(eq(ProjectEvaluationResponse.evaluationId, evaluation.id));
  }
  if (answers.ratings.length)
    await tx.insert(ProjectEvaluationRating).values(
      answers.ratings.map((answer) => ({
        evaluationId: evaluation.id,
        hackathonId: input.hackathonId,
        rubricItemId: answer.itemId,
        value: answer.value,
      })),
    );
  if (answers.responses.length)
    await tx.insert(ProjectEvaluationResponse).values(
      answers.responses.map((answer) => ({
        evaluationId: evaluation.id,
        hackathonId: input.hackathonId,
        rubricItemId: answer.itemId,
        value: answer.value,
        isPublic: answer.isPublic,
      })),
    );
  await tx.insert(ProjectEvaluationRevision).values({
    actorKind: input.principalKind,
    evaluationId: evaluation.id,
    hackathonId: input.hackathonId,
    ratingAnswers: answers.ratings,
    responseAnswers: answers.responses,
    revision,
    createdAt: now,
  });
  await createAdminAuditEvent(
    {
      actionKey: "judging.evaluation.saved",
      actor: input.actor,
      occurredAt: now,
      metadata: {
        actorKind: input.principalKind,
        challengeId: input.challengeId,
        evaluationId: evaluation.id,
        hackathonId: input.hackathonId,
        judgeId: input.judgeId,
        projectId: project.id,
        revision,
      },
      subjects: [
        {
          relation: "primary",
          targetId: project.id,
          targetLabel: project.title,
          targetType: "project",
        },
      ],
    },
    tx,
  );
  await tx
    .insert(HackathonJudgingConfiguration)
    .values({ hackathonId: input.hackathonId, projectInventoryLockedAt: now })
    .onConflictDoUpdate({
      set: {
        projectInventoryLockedAt: sql`COALESCE(${HackathonJudgingConfiguration.projectInventoryLockedAt}, ${now})`,
      },
      target: HackathonJudgingConfiguration.hackathonId,
    });
  if (evaluation.appointmentId) {
    const appointment = await tx.query.JudgingAppointment.findFirst({
      where: eq(JudgingAppointment.id, evaluation.appointmentId),
    });
    if (!appointment)
      throw new Error("Scheduled evaluation lost its appointment.");
    await tx
      .update(JudgingSchedule)
      .set({
        firstResultAt: sql`COALESCE(${JudgingSchedule.firstResultAt}, ${now})`,
      })
      .where(eq(JudgingSchedule.id, appointment.scheduleId));
  }
  return {
    evaluationId: evaluation.id,
    revision,
    isComplete: answers.isComplete,
    score: answers.isComplete
      ? evaluationMean(answers.ratings.map((answer) => answer.value))
      : null,
  };
}
