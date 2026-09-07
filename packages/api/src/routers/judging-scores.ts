import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";

import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNull,
  max,
  sql,
} from "@forge/db";
import { db } from "@forge/db/client";
import {
  Hackathon,
  HackathonJudgingConfiguration,
  Judge,
  JudgeDeliberationEntry,
  JudgeDeliberationSection,
  JudgingRubricItem,
  Project,
  ProjectChallenge,
  ProjectEvaluation,
  ProjectEvaluationDraft,
  ProjectEvaluationRating,
  ProjectEvaluationResponse,
  ProjectEvaluationRevision,
  ProjectToChallenge,
} from "@forge/db/schemas/knight-hacks";
import {
  judgingDeliberationEntrySchema,
  judgingDeliberationSectionCreateSchema,
  judgingDeliberationSectionIdSchema,
  judgingDeliberationSectionUpdateSchema,
  judgingEntryReorderSchema,
  judgingEvaluationIdSchema,
  judgingEvaluationSaveSchema,
  judgingHackathonIdSchema,
  judgingProjectDetailsSchema,
  judgingResultsVisibilitySchema,
  judgingRubricSaveSchema,
  judgingSectionReorderSchema,
  judgingStateUpdateSchema,
} from "@forge/validators";

import type { WriteDb } from "../utils/db";
import { judgeProcedure, permProcedure } from "../trpc";
import {
  captureAdminAuditActor,
  createAdminAuditEvent,
} from "../utils/audit/service";
import {
  evaluationTimingAccess,
  requireEvaluationTiming,
} from "../utils/judging-schedule/evaluation-access";
import {
  reconcileExpiredDraftsWithDb,
  reconcileExpiredJudgingDrafts,
} from "../utils/judging-schedule/reconcile";
import { writeEvaluation } from "../utils/judging/evaluation-write";
import {
  requireWritableJudging,
  resolveJudgeScope,
  resolveWritableJudge,
} from "../utils/judging/scope";
import {
  aggregateEvaluationMeans,
  canReadScopedResult,
  evaluationMean,
} from "../utils/judging/scoring";
import { resolveCurrentJudgeDisplayNames } from "../utils/member/display-name";
import { assertCanManageProjects } from "../utils/projects/access";

const workspaceInputSchema = judgingEvaluationSaveSchema.pick({
  challengeId: true,
  hackathonId: true,
});

const scoreInputSchema = workspaceInputSchema.extend({
  projectIds: judgingEvaluationSaveSchema.shape.projectId.array().max(100),
});

async function requireOwnedSection(
  tx: WriteDb,
  sectionId: string,
  judgeId: string,
) {
  const [section] = await tx
    .select()
    .from(JudgeDeliberationSection)
    .where(
      and(
        eq(JudgeDeliberationSection.id, sectionId),
        eq(JudgeDeliberationSection.judgeId, judgeId),
      ),
    )
    .limit(1);
  if (!section) throw new TRPCError({ code: "NOT_FOUND" });
  return section;
}

async function writeHackathonAudit(
  tx: WriteDb,
  input: {
    actionKey:
      | "judging.results_visibility.updated"
      | "judging.rubric.updated"
      | "judging.state.updated";
    actor: Awaited<ReturnType<typeof captureAdminAuditActor>>;
    hackathonId: string;
    label: string;
    metadata: Record<string, boolean | number | string>;
  },
) {
  await createAdminAuditEvent(
    {
      actionKey: input.actionKey,
      actor: input.actor,
      metadata: input.metadata,
      subjects: [
        {
          relation: "primary",
          targetId: input.hackathonId,
          targetLabel: input.label,
          targetType: "hackathon",
        },
      ],
    },
    tx,
  );
}

async function setTemporaryOrder(
  tx: WriteDb,
  table: typeof JudgeDeliberationSection | typeof JudgeDeliberationEntry,
  id: string,
  order: number,
) {
  await tx.update(table).set({ displayOrder: order }).where(eq(table.id, id));
}

export const judgingScoresRouter = {
  getWorkspace: judgeProcedure
    .input(workspaceInputSchema)
    .query(async ({ ctx, input }) => {
      const scope = await resolveJudgeScope(ctx.judgePrincipal, input);
      await reconcileExpiredJudgingDrafts(scope.hackathonId);
      const [config, rubric] = await Promise.all([
        db.query.HackathonJudgingConfiguration.findFirst({
          columns: {
            displayAllResultsToMembers: true,
            state: true,
          },
          where: eq(
            HackathonJudgingConfiguration.hackathonId,
            scope.hackathonId,
          ),
        }),
        db
          .select({
            description: JudgingRubricItem.description,
            guestVisibilityPolicy: JudgingRubricItem.guestVisibilityPolicy,
            id: JudgingRubricItem.id,
            kind: JudgingRubricItem.kind,
            label: JudgingRubricItem.label,
            memberVisibilityPolicy: JudgingRubricItem.memberVisibilityPolicy,
            required: JudgingRubricItem.required,
          })
          .from(JudgingRubricItem)
          .where(eq(JudgingRubricItem.hackathonId, scope.hackathonId))
          .orderBy(asc(JudgingRubricItem.displayOrder)),
      ]);
      return {
        challengeId: scope.challengeId,
        displayAllResults:
          scope.principalKind === "member" &&
          (config?.displayAllResultsToMembers ?? false),
        hackathonId: scope.hackathonId,
        principalKind: scope.principalKind,
        rubric,
        state: config?.state ?? ("draft" as const),
      };
    }),

  getProjectScores: judgeProcedure
    .input(scoreInputSchema)
    .query(async ({ ctx, input }) => {
      const scope = await resolveJudgeScope(ctx.judgePrincipal, input);
      await reconcileExpiredJudgingDrafts(scope.hackathonId);
      if (input.projectIds.length === 0) return [];
      const [config, evaluations, ratings] = await Promise.all([
        db.query.HackathonJudgingConfiguration.findFirst({
          columns: { displayAllResultsToMembers: true },
          where: eq(
            HackathonJudgingConfiguration.hackathonId,
            scope.hackathonId,
          ),
        }),
        db
          .select({
            challengeId: ProjectEvaluation.challengeId,
            id: ProjectEvaluation.id,
            judgeId: ProjectEvaluation.judgeId,
            projectId: ProjectEvaluation.projectId,
          })
          .from(ProjectEvaluation)
          .innerJoin(Project, eq(Project.id, ProjectEvaluation.projectId))
          .innerJoin(
            ProjectToChallenge,
            and(
              eq(ProjectToChallenge.projectId, ProjectEvaluation.projectId),
              eq(ProjectToChallenge.challengeId, scope.challengeId),
              eq(ProjectToChallenge.hackathonId, scope.hackathonId),
            ),
          )
          .where(
            and(
              eq(ProjectEvaluation.hackathonId, scope.hackathonId),
              eq(ProjectEvaluation.isComplete, true),
              inArray(ProjectEvaluation.projectId, input.projectIds),
              isNull(Project.deletedAt),
            ),
          ),
        db
          .select({
            evaluationId: ProjectEvaluationRating.evaluationId,
            value: ProjectEvaluationRating.value,
          })
          .from(ProjectEvaluationRating)
          .innerJoin(
            ProjectEvaluation,
            eq(ProjectEvaluation.id, ProjectEvaluationRating.evaluationId),
          )
          .innerJoin(Project, eq(Project.id, ProjectEvaluation.projectId))
          .innerJoin(
            ProjectToChallenge,
            and(
              eq(ProjectToChallenge.projectId, ProjectEvaluation.projectId),
              eq(ProjectToChallenge.challengeId, scope.challengeId),
              eq(ProjectToChallenge.hackathonId, scope.hackathonId),
            ),
          )
          .where(
            and(
              eq(ProjectEvaluationRating.hackathonId, scope.hackathonId),
              inArray(ProjectEvaluation.projectId, input.projectIds),
              isNull(Project.deletedAt),
            ),
          ),
      ]);
      const values = new Map<string, number[]>();
      for (const rating of ratings) {
        const list = values.get(rating.evaluationId) ?? [];
        list.push(rating.value);
        values.set(rating.evaluationId, list);
      }
      return input.projectIds.map((projectId) => {
        const projectEvaluations = evaluations.filter(
          (evaluation) => evaluation.projectId === projectId,
        );
        const scoped = projectEvaluations.filter(
          (evaluation) => evaluation.challengeId === scope.challengeId,
        );
        const hasOwnEvaluation =
          scope.judgeId !== null &&
          scoped.some((evaluation) => evaluation.judgeId === scope.judgeId);
        const canRead = canReadScopedResult({
          displayAllResultsToMembers:
            config?.displayAllResultsToMembers ?? false,
          hasOwnEvaluation,
          principalKind: scope.principalKind,
        });
        const scopedAggregate = aggregateEvaluationMeans(
          scoped.map((evaluation) => values.get(evaluation.id) ?? []),
        );
        const overallAggregate = aggregateEvaluationMeans(
          projectEvaluations.map(
            (evaluation) => values.get(evaluation.id) ?? [],
          ),
        );
        return {
          hasOwnEvaluation,
          overall:
            scope.principalKind === "member" ? overallAggregate : undefined,
          projectId,
          scoped: canRead ? scopedAggregate : { count: 0, value: null },
        };
      });
    }),

  getProjectJudgingDetails: judgeProcedure
    .input(judgingProjectDetailsSchema)
    .query(async ({ ctx, input }) => {
      const scope = await resolveJudgeScope(ctx.judgePrincipal, input);
      await reconcileExpiredJudgingDrafts(scope.hackathonId);
      const [project] = await db
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
          and(
            eq(Project.id, input.projectId),
            eq(Project.hackathonId, scope.hackathonId),
            isNull(Project.deletedAt),
          ),
        )
        .limit(1);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      const [config, evaluations] = await Promise.all([
        db.query.HackathonJudgingConfiguration.findFirst({
          columns: { displayAllResultsToMembers: true },
          where: eq(
            HackathonJudgingConfiguration.hackathonId,
            scope.hackathonId,
          ),
        }),
        db
          .select({
            displayName: Judge.displayName,
            id: ProjectEvaluation.id,
            judgeId: ProjectEvaluation.judgeId,
            kind: Judge.kind,
            userId: Judge.userId,
          })
          .from(ProjectEvaluation)
          .innerJoin(Judge, eq(Judge.id, ProjectEvaluation.judgeId))
          .where(
            and(
              eq(ProjectEvaluation.hackathonId, scope.hackathonId),
              eq(ProjectEvaluation.isComplete, true),
              eq(ProjectEvaluation.projectId, input.projectId),
              eq(ProjectEvaluation.challengeId, scope.challengeId),
            ),
          ),
      ]);
      const currentEvaluations =
        await resolveCurrentJudgeDisplayNames(evaluations);
      const hasOwnEvaluation =
        scope.judgeId !== null &&
        currentEvaluations.some(
          (evaluation) => evaluation.judgeId === scope.judgeId,
        );
      const canRead = canReadScopedResult({
        displayAllResultsToMembers: config?.displayAllResultsToMembers ?? false,
        hasOwnEvaluation,
        principalKind: scope.principalKind,
      });
      if (!canRead || evaluations.length === 0) {
        return {
          count: 0,
          feedback: [],
          feedbackPage: input.feedbackPage,
          feedbackPageSize: 25,
          feedbackTotal: 0,
          hasOwnEvaluation,
          value: null,
        };
      }

      const evaluationIds = currentEvaluations.map(
        (evaluation) => evaluation.id,
      );
      const [ratings, feedback, feedbackCount] = await Promise.all([
        db
          .select({
            evaluationId: ProjectEvaluationRating.evaluationId,
            value: ProjectEvaluationRating.value,
          })
          .from(ProjectEvaluationRating)
          .where(inArray(ProjectEvaluationRating.evaluationId, evaluationIds)),
        scope.principalKind === "member"
          ? db
              .select({
                evaluationId: ProjectEvaluationResponse.evaluationId,
                isPublic: ProjectEvaluationResponse.isPublic,
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
              .where(
                inArray(ProjectEvaluationResponse.evaluationId, evaluationIds),
              )
              .orderBy(
                asc(JudgingRubricItem.displayOrder),
                asc(ProjectEvaluationResponse.evaluationId),
              )
              .limit(25)
              .offset((input.feedbackPage - 1) * 25)
          : Promise.resolve([]),
        scope.principalKind === "member"
          ? db
              .select({ value: count() })
              .from(ProjectEvaluationResponse)
              .where(
                inArray(ProjectEvaluationResponse.evaluationId, evaluationIds),
              )
          : Promise.resolve([{ value: 0 }]),
      ]);
      const ratingValues = new Map<string, number[]>();
      for (const rating of ratings) {
        const values = ratingValues.get(rating.evaluationId) ?? [];
        values.push(rating.value);
        ratingValues.set(rating.evaluationId, values);
      }
      const judgeByEvaluation = new Map(
        currentEvaluations.map((evaluation) => [
          evaluation.id,
          evaluation.displayName,
        ]),
      );
      const aggregate = aggregateEvaluationMeans(
        currentEvaluations.map(
          (evaluation) => ratingValues.get(evaluation.id) ?? [],
        ),
      );
      return {
        ...aggregate,
        feedback: feedback.map((response) => ({
          judgeDisplayName:
            judgeByEvaluation.get(response.evaluationId) ?? "Judge",
          isPublic: response.isPublic,
          label: response.label,
          value: response.value,
        })),
        feedbackPage: input.feedbackPage,
        feedbackPageSize: 25,
        feedbackTotal: feedbackCount[0]?.value ?? 0,
        hasOwnEvaluation,
      };
    }),

  saveEvaluation: judgeProcedure
    .input(judgingEvaluationSaveSchema)
    .mutation(async ({ ctx, input }) => {
      const readScope = await resolveJudgeScope(ctx.judgePrincipal, input);
      await reconcileExpiredJudgingDrafts(readScope.hackathonId);
      const auditActor =
        ctx.judgePrincipal.kind === "member"
          ? await captureAdminAuditActor({
              id: ctx.judgePrincipal.userId,
              name: ctx.judgePrincipal.displayName,
            })
          : {
              id: ctx.judgePrincipal.guestSessionId,
              name: ctx.judgePrincipal.displayName,
              snapshot: {
                memberId: null,
                roleColor: null,
                roleLabel: "Guest judge",
              },
            };
      return db.transaction(async (tx) => {
        const scope = await resolveWritableJudge(tx, ctx.judgePrincipal, {
          challengeId: input.challengeId,
          hackathonId: input.hackathonId,
        });
        await requireWritableJudging(tx, scope.hackathonId);
        const timing = requireEvaluationTiming(
          await evaluationTimingAccess(tx, {
            ...scope,
            projectId: input.projectId,
          }),
        );
        const result = await writeEvaluation(tx, {
          ...input,
          ...scope,
          actor: auditActor,
          appointmentId: timing.appointmentId,
        });
        await tx
          .delete(ProjectEvaluationDraft)
          .where(
            and(
              eq(ProjectEvaluationDraft.judgeId, scope.judgeId),
              eq(ProjectEvaluationDraft.projectId, input.projectId),
              eq(ProjectEvaluationDraft.challengeId, scope.challengeId),
            ),
          );
        return result;
      });
    }),

  listMySubmissions: judgeProcedure
    .input(workspaceInputSchema)
    .query(async ({ ctx, input }) => {
      const scope = await resolveJudgeScope(ctx.judgePrincipal, input);
      await reconcileExpiredJudgingDrafts(scope.hackathonId);
      if (!scope.judgeId) return [];
      const evaluations = await db
        .select({
          challengeId: ProjectChallenge.id,
          challengeLabel: ProjectChallenge.label,
          createdAt: ProjectEvaluation.createdAt,
          id: ProjectEvaluation.id,
          projectAvailable:
            sql<boolean>`${Project.deletedAt} IS NULL AND ${ProjectToChallenge.projectId} IS NOT NULL`.as(
              "project_available",
            ),
          projectId: Project.id,
          projectTitle: Project.title,
          revision: ProjectEvaluation.revision,
          isComplete: ProjectEvaluation.isComplete,
          autoSubmittedAt: ProjectEvaluation.autoSubmittedAt,
          updatedAt: ProjectEvaluation.updatedAt,
        })
        .from(ProjectEvaluation)
        .innerJoin(Project, eq(Project.id, ProjectEvaluation.projectId))
        .innerJoin(
          ProjectChallenge,
          eq(ProjectChallenge.id, ProjectEvaluation.challengeId),
        )
        .leftJoin(
          ProjectToChallenge,
          and(
            eq(ProjectToChallenge.projectId, ProjectEvaluation.projectId),
            eq(ProjectToChallenge.challengeId, ProjectEvaluation.challengeId),
            eq(ProjectToChallenge.hackathonId, scope.hackathonId),
          ),
        )
        .where(
          and(
            eq(ProjectEvaluation.hackathonId, scope.hackathonId),
            eq(ProjectEvaluation.judgeId, scope.judgeId),
          ),
        )
        .orderBy(desc(ProjectEvaluation.updatedAt));
      if (evaluations.length === 0) return [];
      const ids = evaluations.map((evaluation) => evaluation.id);
      const [ratings, responses] = await Promise.all([
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
          .where(inArray(ProjectEvaluationRating.evaluationId, ids))
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
            eq(JudgingRubricItem.id, ProjectEvaluationResponse.rubricItemId),
          )
          .where(inArray(ProjectEvaluationResponse.evaluationId, ids))
          .orderBy(asc(JudgingRubricItem.displayOrder)),
      ]);
      return evaluations.map((evaluation) => {
        const ownRatings = ratings.filter(
          (rating) => rating.evaluationId === evaluation.id,
        );
        return {
          ...evaluation,
          ratings: ownRatings,
          responses: responses.filter(
            (response) => response.evaluationId === evaluation.id,
          ),
          score: evaluation.isComplete
            ? evaluationMean(ownRatings.map((rating) => rating.value))
            : null,
        };
      });
    }),

  listMyDeliberation: judgeProcedure
    .input(workspaceInputSchema)
    .query(async ({ ctx, input }) => {
      const scope = await resolveJudgeScope(ctx.judgePrincipal, input);
      await reconcileExpiredJudgingDrafts(scope.hackathonId);
      if (!scope.judgeId) return [];
      const sections = await db
        .select({
          id: JudgeDeliberationSection.id,
          name: JudgeDeliberationSection.name,
        })
        .from(JudgeDeliberationSection)
        .where(
          and(
            eq(JudgeDeliberationSection.hackathonId, scope.hackathonId),
            eq(JudgeDeliberationSection.judgeId, scope.judgeId),
          ),
        )
        .orderBy(asc(JudgeDeliberationSection.displayOrder));
      if (sections.length === 0) return [];
      const entries = await db
        .select({
          available: isNull(Project.deletedAt),
          id: JudgeDeliberationEntry.id,
          projectId: Project.id,
          sectionId: JudgeDeliberationEntry.sectionId,
          title: Project.title,
        })
        .from(JudgeDeliberationEntry)
        .innerJoin(Project, eq(Project.id, JudgeDeliberationEntry.projectId))
        .where(
          inArray(
            JudgeDeliberationEntry.sectionId,
            sections.map((section) => section.id),
          ),
        )
        .orderBy(asc(JudgeDeliberationEntry.displayOrder));
      return sections.map((section) => ({
        ...section,
        entries: entries.filter((entry) => entry.sectionId === section.id),
      }));
    }),

  createDeliberationSection: judgeProcedure
    .input(judgingDeliberationSectionCreateSchema)
    .mutation(async ({ ctx, input }) =>
      db.transaction(async (tx) => {
        const scope = await resolveWritableJudge(tx, ctx.judgePrincipal, input);
        await requireWritableJudging(tx, scope.hackathonId);
        const [last] = await tx
          .select({ value: max(JudgeDeliberationSection.displayOrder) })
          .from(JudgeDeliberationSection)
          .where(eq(JudgeDeliberationSection.judgeId, scope.judgeId));
        const [section] = await tx
          .insert(JudgeDeliberationSection)
          .values({
            displayOrder: (last?.value ?? -1) + 1,
            hackathonId: scope.hackathonId,
            judgeId: scope.judgeId,
            name: input.name,
          })
          .returning();
        return section;
      }),
    ),

  renameDeliberationSection: judgeProcedure
    .input(judgingDeliberationSectionUpdateSchema)
    .mutation(async ({ ctx, input }) =>
      db.transaction(async (tx) => {
        const scope = await resolveWritableJudge(tx, ctx.judgePrincipal, input);
        await requireWritableJudging(tx, scope.hackathonId);
        const section = await requireOwnedSection(
          tx,
          input.sectionId,
          scope.judgeId,
        );
        const [updated] = await tx
          .update(JudgeDeliberationSection)
          .set({ name: input.name })
          .where(eq(JudgeDeliberationSection.id, section.id))
          .returning();
        return updated;
      }),
    ),

  deleteDeliberationSection: judgeProcedure
    .input(judgingDeliberationSectionIdSchema)
    .mutation(async ({ ctx, input }) =>
      db.transaction(async (tx) => {
        const scope = await resolveWritableJudge(tx, ctx.judgePrincipal, input);
        await requireWritableJudging(tx, scope.hackathonId);
        const section = await requireOwnedSection(
          tx,
          input.sectionId,
          scope.judgeId,
        );
        await tx
          .delete(JudgeDeliberationSection)
          .where(eq(JudgeDeliberationSection.id, section.id));
        return { deleted: true };
      }),
    ),

  reorderDeliberationSections: judgeProcedure
    .input(judgingSectionReorderSchema)
    .mutation(async ({ ctx, input }) =>
      db.transaction(async (tx) => {
        const scope = await resolveWritableJudge(tx, ctx.judgePrincipal, input);
        await requireWritableJudging(tx, scope.hackathonId);
        const sections = await tx
          .select({ id: JudgeDeliberationSection.id })
          .from(JudgeDeliberationSection)
          .where(eq(JudgeDeliberationSection.judgeId, scope.judgeId))
          .for("update");
        if (
          sections.length !== input.ids.length ||
          sections.some((section) => !input.ids.includes(section.id))
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Section order is stale.",
          });
        }
        for (const [index, id] of input.ids.entries()) {
          await setTemporaryOrder(
            tx,
            JudgeDeliberationSection,
            id,
            index + 100000,
          );
        }
        for (const [index, id] of input.ids.entries()) {
          await setTemporaryOrder(tx, JudgeDeliberationSection, id, index);
        }
        return { reordered: true };
      }),
    ),

  addDeliberationProject: judgeProcedure
    .input(judgingDeliberationEntrySchema)
    .mutation(async ({ ctx, input }) =>
      db.transaction(async (tx) => {
        const scope = await resolveWritableJudge(tx, ctx.judgePrincipal, input);
        await requireWritableJudging(tx, scope.hackathonId);
        const section = await requireOwnedSection(
          tx,
          input.sectionId,
          scope.judgeId,
        );
        const [evaluation] = await tx
          .select({ projectId: ProjectEvaluation.projectId })
          .from(ProjectEvaluation)
          .innerJoin(Project, eq(Project.id, ProjectEvaluation.projectId))
          .where(
            and(
              eq(ProjectEvaluation.judgeId, scope.judgeId),
              eq(ProjectEvaluation.isComplete, true),
              eq(ProjectEvaluation.projectId, input.projectId),
              isNull(Project.deletedAt),
            ),
          )
          .limit(1);
        if (!evaluation) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Judge this project before adding it to deliberation.",
          });
        }
        const [last] = await tx
          .select({ value: max(JudgeDeliberationEntry.displayOrder) })
          .from(JudgeDeliberationEntry)
          .where(eq(JudgeDeliberationEntry.sectionId, section.id));
        const [entry] = await tx
          .insert(JudgeDeliberationEntry)
          .values({
            displayOrder: (last?.value ?? -1) + 1,
            hackathonId: section.hackathonId,
            projectId: input.projectId,
            sectionId: section.id,
          })
          .onConflictDoNothing()
          .returning();
        if (!entry) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "That project is already in this section.",
          });
        }
        return entry;
      }),
    ),

  removeDeliberationProject: judgeProcedure
    .input(judgingDeliberationEntrySchema)
    .mutation(async ({ ctx, input }) =>
      db.transaction(async (tx) => {
        const scope = await resolveWritableJudge(tx, ctx.judgePrincipal, input);
        await requireWritableJudging(tx, scope.hackathonId);
        const section = await requireOwnedSection(
          tx,
          input.sectionId,
          scope.judgeId,
        );
        const removed = await tx
          .delete(JudgeDeliberationEntry)
          .where(
            and(
              eq(JudgeDeliberationEntry.sectionId, section.id),
              eq(JudgeDeliberationEntry.projectId, input.projectId),
            ),
          )
          .returning({ id: JudgeDeliberationEntry.id });
        return { removed: removed.length > 0 };
      }),
    ),

  reorderDeliberationProjects: judgeProcedure
    .input(judgingEntryReorderSchema)
    .mutation(async ({ ctx, input }) =>
      db.transaction(async (tx) => {
        const scope = await resolveWritableJudge(tx, ctx.judgePrincipal, input);
        await requireWritableJudging(tx, scope.hackathonId);
        const section = await requireOwnedSection(
          tx,
          input.sectionId,
          scope.judgeId,
        );
        const entries = await tx
          .select({ id: JudgeDeliberationEntry.id })
          .from(JudgeDeliberationEntry)
          .where(eq(JudgeDeliberationEntry.sectionId, section.id))
          .for("update");
        if (
          entries.length !== input.ids.length ||
          entries.some((entry) => !input.ids.includes(entry.id))
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Project order is stale.",
          });
        }
        for (const [index, id] of input.ids.entries()) {
          await setTemporaryOrder(
            tx,
            JudgeDeliberationEntry,
            id,
            index + 100000,
          );
        }
        for (const [index, id] of input.ids.entries()) {
          await setTemporaryOrder(tx, JudgeDeliberationEntry, id, index);
        }
        return { reordered: true };
      }),
    ),

  saveRubric: permProcedure
    .input(judgingRubricSaveSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      if (
        input.items.some(
          (item) =>
            item.kind === "short_response" &&
            item.memberVisibilityPolicy !== "public",
        )
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Authenticated judge feedback is always shared with hackers.",
        });
      }
      const actor = await captureAdminAuditActor(ctx.session.user);
      return db.transaction(async (tx) => {
        const [hackathon] = await tx
          .select({ displayName: Hackathon.displayName, id: Hackathon.id })
          .from(Hackathon)
          .where(eq(Hackathon.id, input.hackathonId))
          .for("update")
          .limit(1);
        if (!hackathon) throw new TRPCError({ code: "NOT_FOUND" });
        const [evaluation, config] = await Promise.all([
          tx.query.ProjectEvaluation.findFirst({
            columns: { id: true },
            where: eq(ProjectEvaluation.hackathonId, input.hackathonId),
          }),
          tx.query.HackathonJudgingConfiguration.findFirst({
            columns: { state: true },
            where: eq(
              HackathonJudgingConfiguration.hackathonId,
              input.hackathonId,
            ),
          }),
        ]);
        if (evaluation || (config?.state ?? "draft") !== "draft") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "The rubric is locked after judging opens.",
          });
        }
        await tx
          .delete(JudgingRubricItem)
          .where(eq(JudgingRubricItem.hackathonId, input.hackathonId));
        if (input.items.length > 0) {
          await tx.insert(JudgingRubricItem).values(
            input.items.map((item, displayOrder) => ({
              ...item,
              displayOrder,
              hackathonId: input.hackathonId,
            })),
          );
        }
        await tx
          .insert(HackathonJudgingConfiguration)
          .values({ hackathonId: input.hackathonId })
          .onConflictDoNothing();
        await writeHackathonAudit(tx, {
          actionKey: "judging.rubric.updated",
          actor,
          hackathonId: hackathon.id,
          label: hackathon.displayName,
          metadata: { itemCount: input.items.length },
        });
        return { itemCount: input.items.length };
      });
    }),

  setJudgingState: permProcedure
    .input(judgingStateUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      return db.transaction(async (tx) => {
        const [hackathon] = await tx
          .select({ displayName: Hackathon.displayName, id: Hackathon.id })
          .from(Hackathon)
          .where(eq(Hackathon.id, input.hackathonId))
          .for("update")
          .limit(1);
        if (!hackathon) throw new TRPCError({ code: "NOT_FOUND" });
        const config = await tx.query.HackathonJudgingConfiguration.findFirst({
          columns: { state: true },
          where: eq(
            HackathonJudgingConfiguration.hackathonId,
            input.hackathonId,
          ),
        });
        await reconcileExpiredDraftsWithDb(tx, input.hackathonId);
        const current = config?.state ?? "draft";
        const hasEvaluation = await tx.query.ProjectEvaluation.findFirst({
          columns: { id: true },
          where: eq(ProjectEvaluation.hackathonId, input.hackathonId),
        });
        if (input.state === "draft" && hasEvaluation) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Judging cannot return to Draft after a score is saved.",
          });
        }
        if (input.state === "open") {
          const rating = await tx.query.JudgingRubricItem.findFirst({
            columns: { id: true },
            where: and(
              eq(JudgingRubricItem.hackathonId, input.hackathonId),
              eq(JudgingRubricItem.kind, "rating"),
            ),
          });
          if (!rating) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message:
                "Add at least one rating question before opening judging.",
            });
          }
        }
        if (
          !(
            current === input.state ||
            (current === "draft" && input.state === "open") ||
            (current === "open" && input.state === "closed") ||
            (current === "closed" && input.state === "open")
          )
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Invalid judging state change.",
          });
        }
        const now = new Date();
        await tx
          .insert(HackathonJudgingConfiguration)
          .values({
            closedAt: input.state === "closed" ? now : null,
            hackathonId: input.hackathonId,
            openedAt: input.state === "open" ? now : null,
            state: input.state,
          })
          .onConflictDoUpdate({
            set: {
              closedAt: input.state === "closed" ? now : null,
              openedAt:
                input.state === "open"
                  ? sql`COALESCE(${HackathonJudgingConfiguration.openedAt}, ${now})`
                  : HackathonJudgingConfiguration.openedAt,
              state: input.state,
            },
            target: HackathonJudgingConfiguration.hackathonId,
          });
        await writeHackathonAudit(tx, {
          actionKey: "judging.state.updated",
          actor,
          hackathonId: hackathon.id,
          label: hackathon.displayName,
          metadata: { fromState: current, toState: input.state },
        });
        return { state: input.state };
      });
    }),

  setDisplayAllResults: permProcedure
    .input(judgingResultsVisibilitySchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      return db.transaction(async (tx) => {
        const [hackathon] = await tx
          .select({ displayName: Hackathon.displayName, id: Hackathon.id })
          .from(Hackathon)
          .where(eq(Hackathon.id, input.hackathonId))
          .for("update")
          .limit(1);
        if (!hackathon) throw new TRPCError({ code: "NOT_FOUND" });
        await tx
          .insert(HackathonJudgingConfiguration)
          .values({
            displayAllResultsToMembers: input.displayAllResults,
            hackathonId: input.hackathonId,
          })
          .onConflictDoUpdate({
            set: { displayAllResultsToMembers: input.displayAllResults },
            target: HackathonJudgingConfiguration.hackathonId,
          });
        await writeHackathonAudit(tx, {
          actionKey: "judging.results_visibility.updated",
          actor,
          hackathonId: hackathon.id,
          label: hackathon.displayName,
          metadata: { displayAllResults: input.displayAllResults },
        });
        return { displayAllResults: input.displayAllResults };
      });
    }),

  listEvaluationAudit: permProcedure
    .input(judgingHackathonIdSchema)
    .query(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      await reconcileExpiredJudgingDrafts(input.hackathonId);
      const evaluations = await db
        .select({
          challengeLabel: ProjectChallenge.label,
          displayName: Judge.displayName,
          id: ProjectEvaluation.id,
          kind: Judge.kind,
          projectTitle: Project.title,
          revision: ProjectEvaluation.revision,
          updatedAt: ProjectEvaluation.updatedAt,
          userId: Judge.userId,
        })
        .from(ProjectEvaluation)
        .innerJoin(Project, eq(Project.id, ProjectEvaluation.projectId))
        .innerJoin(Judge, eq(Judge.id, ProjectEvaluation.judgeId))
        .innerJoin(
          ProjectChallenge,
          eq(ProjectChallenge.id, ProjectEvaluation.challengeId),
        )
        .where(eq(ProjectEvaluation.hackathonId, input.hackathonId))
        .orderBy(desc(ProjectEvaluation.updatedAt))
        .limit(500);
      return (await resolveCurrentJudgeDisplayNames(evaluations)).map(
        ({ displayName, kind: _kind, userId: _userId, ...evaluation }) => ({
          ...evaluation,
          judgeDisplayName: displayName,
        }),
      );
    }),

  getEvaluationRevisions: permProcedure
    .input(judgingEvaluationIdSchema)
    .query(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const [evaluation] = await db
        .select({
          challengeLabel: ProjectChallenge.label,
          displayName: Judge.displayName,
          hackathonId: ProjectEvaluation.hackathonId,
          id: ProjectEvaluation.id,
          kind: Judge.kind,
          projectTitle: Project.title,
          userId: Judge.userId,
        })
        .from(ProjectEvaluation)
        .innerJoin(Project, eq(Project.id, ProjectEvaluation.projectId))
        .innerJoin(Judge, eq(Judge.id, ProjectEvaluation.judgeId))
        .innerJoin(
          ProjectChallenge,
          eq(ProjectChallenge.id, ProjectEvaluation.challengeId),
        )
        .where(eq(ProjectEvaluation.id, input.evaluationId))
        .limit(1);
      if (!evaluation) throw new TRPCError({ code: "NOT_FOUND" });
      const [currentEvaluation] = await resolveCurrentJudgeDisplayNames([
        evaluation,
      ]);
      if (!currentEvaluation) throw new TRPCError({ code: "NOT_FOUND" });
      const [revisions, rubric] = await Promise.all([
        db
          .select({
            actorKind: ProjectEvaluationRevision.actorKind,
            createdAt: ProjectEvaluationRevision.createdAt,
            ratingAnswers: ProjectEvaluationRevision.ratingAnswers,
            responseAnswers: ProjectEvaluationRevision.responseAnswers,
            revision: ProjectEvaluationRevision.revision,
          })
          .from(ProjectEvaluationRevision)
          .where(eq(ProjectEvaluationRevision.evaluationId, input.evaluationId))
          .orderBy(desc(ProjectEvaluationRevision.revision)),
        db
          .select({ id: JudgingRubricItem.id, label: JudgingRubricItem.label })
          .from(JudgingRubricItem)
          .where(eq(JudgingRubricItem.hackathonId, evaluation.hackathonId)),
      ]);
      const {
        displayName,
        kind: _kind,
        userId: _userId,
        ...evaluationDetails
      } = currentEvaluation;
      return {
        evaluation: {
          ...evaluationDetails,
          judgeDisplayName: displayName,
        },
        revisions,
        rubric,
      };
    }),
} satisfies TRPCRouterRecord;
