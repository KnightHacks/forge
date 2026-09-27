import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";

import { and, eq, isNull } from "@forge/db";
import { db } from "@forge/db/client";
import {
  HackathonJudgingConfiguration,
  Project,
  ProjectEvaluationDraft,
  ProjectToChallenge,
} from "@forge/db/schemas/knight-hacks";
import {
  judgingEvaluationDraftSchema,
  judgingEvaluationEditorSchema,
} from "@forge/validators";

import { judgeProcedure } from "../trpc";
import {
  evaluationTimingAccess,
  requireEvaluationTiming,
} from "../utils/judging-schedule/evaluation-access";
import { reconcileExpiredJudgingDrafts } from "../utils/judging-schedule/reconcile";
import { prepareEvaluationAnswers } from "../utils/judging/evaluation-write";
import {
  requireWritableJudging,
  resolveJudgeScope,
  resolveWritableJudge,
} from "../utils/judging/scope";

export const judgingDraftsRouter = {
  getEvaluationEditor: judgeProcedure
    .input(judgingEvaluationEditorSchema)
    .query(async ({ ctx, input }) => {
      const scope = await resolveJudgeScope(ctx.judgePrincipal, input);
      await reconcileExpiredJudgingDrafts(scope.hackathonId);
      const timing = await evaluationTimingAccess(db, {
        ...scope,
        projectId: input.projectId,
      });
      const config = await db.query.HackathonJudgingConfiguration.findFirst({
        where: eq(HackathonJudgingConfiguration.hackathonId, scope.hackathonId),
      });
      const draft = scope.judgeId
        ? await db.query.ProjectEvaluationDraft.findFirst({
            where: and(
              eq(ProjectEvaluationDraft.judgeId, scope.judgeId),
              eq(ProjectEvaluationDraft.projectId, input.projectId),
              eq(ProjectEvaluationDraft.challengeId, scope.challengeId),
            ),
          })
        : undefined;
      return {
        ...timing,
        canEdit: timing.canEdit && config?.state === "open",
        reason:
          config?.state === "open"
            ? timing.reason
            : "Judging is not open. Saved work is read-only.",
        draft: draft
          ? {
              ratings: draft.ratings,
              responses: draft.responses,
              revision: draft.revision,
              updatedAt: draft.updatedAt,
            }
          : null,
      };
    }),

  saveEvaluationDraft: judgeProcedure
    .input(judgingEvaluationDraftSchema)
    .mutation(async ({ ctx, input }) => {
      const readScope = await resolveJudgeScope(ctx.judgePrincipal, input);
      await reconcileExpiredJudgingDrafts(readScope.hackathonId);
      return db.transaction(async (tx) => {
        const scope = await resolveWritableJudge(tx, ctx.judgePrincipal, input);
        await requireWritableJudging(tx, scope.hackathonId);
        const timing = requireEvaluationTiming(
          await evaluationTimingAccess(tx, {
            ...scope,
            projectId: input.projectId,
          }),
        );
        const [project] = await tx
          .select({ id: Project.id })
          .from(Project)
          .innerJoin(
            ProjectToChallenge,
            and(
              eq(ProjectToChallenge.projectId, Project.id),
              eq(ProjectToChallenge.challengeId, scope.challengeId),
              eq(ProjectToChallenge.hackathonId, scope.hackathonId),
            ),
          )
          .where(
            and(eq(Project.id, input.projectId), isNull(Project.deletedAt)),
          )
          .limit(1);
        if (!project) throw new TRPCError({ code: "NOT_FOUND" });
        const answers = await prepareEvaluationAnswers(
          tx,
          scope.hackathonId,
          scope.principalKind,
          input,
        );
        const [existing] = await tx
          .select()
          .from(ProjectEvaluationDraft)
          .where(
            and(
              eq(ProjectEvaluationDraft.judgeId, scope.judgeId),
              eq(ProjectEvaluationDraft.projectId, input.projectId),
              eq(ProjectEvaluationDraft.challengeId, scope.challengeId),
            ),
          )
          .for("update")
          .limit(1);
        if (
          (existing?.revision ?? 0) !== input.expectedDraftRevision ||
          (input.expectedRevision !== undefined &&
            timing.evaluationRevision !== input.expectedRevision)
        )
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "Your saved answers changed in another window. Reload before continuing.",
          });
        const values = {
          hackathonId: scope.hackathonId,
          challengeId: scope.challengeId,
          projectId: input.projectId,
          judgeId: scope.judgeId,
          appointmentId: timing.appointmentId,
          evaluationId: timing.evaluationId,
          baseEvaluationRevision: timing.evaluationRevision,
          ratings: answers.ratings,
          responses: answers.responses,
          deadlineAt: timing.evaluationId ? null : timing.deadlineAt,
          reconciliationFailedAt: null,
          reconciliationErrorCode: null,
          revision: (existing?.revision ?? 0) + 1,
          updatedAt: new Date(),
        };
        const [saved] = existing
          ? await tx
              .update(ProjectEvaluationDraft)
              .set(values)
              .where(eq(ProjectEvaluationDraft.id, existing.id))
              .returning()
          : await tx.insert(ProjectEvaluationDraft).values(values).returning();
        if (!saved) throw new Error("Draft was not saved.");
        return {
          revision: saved.revision,
          updatedAt: saved.updatedAt,
          deadlineAt: saved.deadlineAt,
        };
      });
    }),
} satisfies TRPCRouterRecord;
