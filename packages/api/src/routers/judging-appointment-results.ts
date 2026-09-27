import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";

import { and, asc, eq, isNull, ne, or } from "@forge/db";
import { db } from "@forge/db/client";
import {
  Judge,
  JudgingAppointment,
  JudgingRubricItem,
  ProjectEvaluation,
  ProjectEvaluationDraft,
  ProjectEvaluationRating,
  ProjectEvaluationResponse,
} from "@forge/db/schemas/knight-hacks";
import { judgingAppointmentIdSchema } from "@forge/validators";

import { permProcedure } from "../trpc";
import { aggregateEvaluationMeans } from "../utils/judging/scoring";
import { resolveCurrentJudgeDisplayNames } from "../utils/member/display-name";
import { assertCanManageProjects } from "../utils/projects/access";

export const judgingAppointmentResultsRouter = {
  getAppointmentResults: permProcedure
    .input(judgingAppointmentIdSchema)
    .query(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const appointment = await db.query.JudgingAppointment.findFirst({
        columns: {
          challengeId: true,
          id: true,
          projectId: true,
        },
        where: and(
          eq(JudgingAppointment.id, input.appointmentId),
          eq(JudgingAppointment.hackathonId, input.hackathonId),
        ),
      });
      if (!appointment) throw new TRPCError({ code: "NOT_FOUND" });

      const [evaluations, drafts, otherCompleteEvaluations] = await Promise.all(
        [
          db
            .select({
              displayName: Judge.displayName,
              id: ProjectEvaluation.id,
              isComplete: ProjectEvaluation.isComplete,
              judgeId: Judge.id,
              kind: Judge.kind,
              updatedAt: ProjectEvaluation.updatedAt,
              userId: Judge.userId,
            })
            .from(ProjectEvaluation)
            .innerJoin(Judge, eq(Judge.id, ProjectEvaluation.judgeId))
            .where(
              and(
                eq(ProjectEvaluation.hackathonId, input.hackathonId),
                eq(ProjectEvaluation.appointmentId, appointment.id),
              ),
            ),
          db
            .select({
              displayName: Judge.displayName,
              judgeId: Judge.id,
              kind: Judge.kind,
              updatedAt: ProjectEvaluationDraft.updatedAt,
              userId: Judge.userId,
            })
            .from(ProjectEvaluationDraft)
            .innerJoin(Judge, eq(Judge.id, ProjectEvaluationDraft.judgeId))
            .where(
              and(
                eq(ProjectEvaluationDraft.hackathonId, input.hackathonId),
                eq(ProjectEvaluationDraft.appointmentId, appointment.id),
              ),
            ),
          db
            .select({ id: ProjectEvaluation.id })
            .from(ProjectEvaluation)
            .where(
              and(
                eq(ProjectEvaluation.hackathonId, input.hackathonId),
                eq(ProjectEvaluation.projectId, appointment.projectId),
                eq(ProjectEvaluation.challengeId, appointment.challengeId),
                eq(ProjectEvaluation.isComplete, true),
                or(
                  isNull(ProjectEvaluation.appointmentId),
                  ne(ProjectEvaluation.appointmentId, appointment.id),
                ),
              ),
            )
            .limit(1),
        ],
      );

      const namedEvaluations =
        await resolveCurrentJudgeDisplayNames(evaluations);
      const namedDrafts = await resolveCurrentJudgeDisplayNames(drafts);
      const completeEvaluationIds = namedEvaluations
        .filter((evaluation) => evaluation.isComplete)
        .map((evaluation) => evaluation.id);
      const [ratings, responses] = completeEvaluationIds.length
        ? await Promise.all([
            db
              .select({
                evaluationId: ProjectEvaluationRating.evaluationId,
                itemId: JudgingRubricItem.id,
                label: JudgingRubricItem.label,
                value: ProjectEvaluationRating.value,
              })
              .from(ProjectEvaluationRating)
              .innerJoin(
                JudgingRubricItem,
                eq(JudgingRubricItem.id, ProjectEvaluationRating.rubricItemId),
              )
              .innerJoin(
                ProjectEvaluation,
                eq(ProjectEvaluation.id, ProjectEvaluationRating.evaluationId),
              )
              .where(
                and(
                  eq(ProjectEvaluation.appointmentId, appointment.id),
                  eq(ProjectEvaluation.isComplete, true),
                  eq(ProjectEvaluation.hackathonId, input.hackathonId),
                  eq(ProjectEvaluationRating.hackathonId, input.hackathonId),
                ),
              )
              .orderBy(asc(JudgingRubricItem.displayOrder)),
            db
              .select({
                evaluationId: ProjectEvaluationResponse.evaluationId,
                isPublic: ProjectEvaluationResponse.isPublic,
                itemId: JudgingRubricItem.id,
                label: JudgingRubricItem.label,
                value: ProjectEvaluationResponse.value,
              })
              .from(ProjectEvaluationResponse)
              .innerJoin(
                JudgingRubricItem,
                eq(
                  JudgingRubricItem.id,
                  ProjectEvaluationResponse.rubricItemId,
                ),
              )
              .innerJoin(
                ProjectEvaluation,
                eq(
                  ProjectEvaluation.id,
                  ProjectEvaluationResponse.evaluationId,
                ),
              )
              .where(
                and(
                  eq(ProjectEvaluation.appointmentId, appointment.id),
                  eq(ProjectEvaluation.isComplete, true),
                  eq(ProjectEvaluation.hackathonId, input.hackathonId),
                  eq(ProjectEvaluationResponse.hackathonId, input.hackathonId),
                ),
              )
              .orderBy(asc(JudgingRubricItem.displayOrder)),
          ])
        : [[], []];

      const evaluationJudges = namedEvaluations.map((evaluation) => ({
        id: evaluation.judgeId,
        evaluationId: evaluation.id,
        displayName: evaluation.displayName,
        kind: evaluation.kind,
        status: evaluation.isComplete
          ? ("complete" as const)
          : ("partial" as const),
        updatedAt: evaluation.updatedAt,
        ratings: evaluation.isComplete
          ? ratings.filter((rating) => rating.evaluationId === evaluation.id)
          : [],
        responses: evaluation.isComplete
          ? responses.filter(
              (response) => response.evaluationId === evaluation.id,
            )
          : [],
      }));
      const evaluationJudgeIds = new Set(
        evaluationJudges.map((judge) => judge.id),
      );
      const judges = [
        ...evaluationJudges,
        ...namedDrafts
          .filter((draft) => !evaluationJudgeIds.has(draft.judgeId))
          .map((draft) => ({
            id: draft.judgeId,
            evaluationId: null,
            displayName: draft.displayName,
            kind: draft.kind,
            status: "partial",
            updatedAt: draft.updatedAt,
            ratings: [],
            responses: [],
          })),
      ];
      judges.sort((left, right) =>
        left.displayName.localeCompare(right.displayName),
      );

      const completeJudges = judges.filter(
        (judge) => judge.status === "complete",
      );
      const aggregate = aggregateEvaluationMeans(
        completeJudges.map((judge) =>
          judge.ratings.map((rating) => rating.value),
        ),
      );
      return {
        average: aggregate.value,
        completeJudgeCount: completeJudges.length,
        hasOtherSessionResults: otherCompleteEvaluations.length > 0,
        judges,
      };
    }),
} satisfies TRPCRouterRecord;
