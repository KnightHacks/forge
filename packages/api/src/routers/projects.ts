import { TRPCError } from "@trpc/server";

import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  not,
  sql,
} from "@forge/db";
import { db } from "@forge/db/client";
import {
  Hackathon,
  HackathonJudgingConfiguration,
  Judge,
  JudgingRoom,
  Project,
  ProjectChallenge,
  ProjectEvaluation,
  ProjectEvaluationRating,
  ProjectMember,
  ProjectToChallenge,
} from "@forge/db/schemas/knight-hacks";
import {
  judgeProjectListInputSchema,
  projectDropAllInputSchema,
  projectIdSchema,
  projectListInputSchema,
  projectUpdateInputSchema,
} from "@forge/validators";

import { createTRPCRouter, judgeProcedure, permProcedure } from "../trpc";
import {
  captureAdminAuditActor,
  createAdminAuditEvent,
} from "../utils/audit/service";
import { assertCanManageProjects } from "../utils/projects/access";
import { projectForJudge } from "../utils/projects/view";

function projectSort(
  sort:
    | "challengeRating"
    | "participantCount"
    | "rating"
    | "submittedAt"
    | "title",
  direction: "asc" | "desc",
  challengeId?: string,
) {
  if (sort === "challengeRating" || sort === "rating") {
    const challengeFilter =
      sort === "challengeRating" && challengeId
        ? sql`AND ${ProjectEvaluation.challengeId} = ${challengeId}`
        : sql``;
    const rating = sql<number | null>`(
      SELECT AVG(evaluation_mean)
      FROM (
        SELECT AVG(${ProjectEvaluationRating.value}::double precision) AS evaluation_mean
        FROM ${ProjectEvaluation}
        INNER JOIN ${ProjectEvaluationRating}
          ON ${ProjectEvaluationRating.evaluationId} = ${ProjectEvaluation.id}
        WHERE ${ProjectEvaluation.projectId} = ${Project.id}
          ${challengeFilter}
        GROUP BY ${ProjectEvaluation.id}
      ) project_evaluation_means
    )`;
    return [
      sql`${rating} IS NULL`,
      direction === "desc" ? desc(rating) : asc(rating),
    ] as const;
  }
  const column =
    sort === "submittedAt"
      ? Project.submittedAt
      : sort === "participantCount"
        ? Project.participantCount
        : Project.title;
  return [direction === "desc" ? desc(column) : asc(column)] as const;
}

const challengeOrder = [
  sql`CASE WHEN ${ProjectChallenge.label} = 'General' THEN 0 ELSE 1 END`,
  asc(ProjectChallenge.label),
] as const;

function projectWhere(input: {
  challengeIds: string[];
  deleted: "active" | "all" | "deleted";
  hackathonId: string;
  hideJudgedBy?: { challengeId: string; judgeId: string };
  maxParticipants?: number;
  minParticipants?: number;
  query: string;
}) {
  const challengeMatch = input.challengeIds.length
    ? exists(
        db
          .select({ one: sql`1` })
          .from(ProjectToChallenge)
          .where(
            and(
              eq(ProjectToChallenge.projectId, Project.id),
              eq(ProjectToChallenge.hackathonId, input.hackathonId),
              inArray(ProjectToChallenge.challengeId, input.challengeIds),
            ),
          ),
      )
    : undefined;
  const notPreviouslyJudged = input.hideJudgedBy
    ? not(
        exists(
          db
            .select({ one: sql`1` })
            .from(ProjectEvaluation)
            .where(
              and(
                eq(ProjectEvaluation.projectId, Project.id),
                eq(
                  ProjectEvaluation.challengeId,
                  input.hideJudgedBy.challengeId,
                ),
                eq(ProjectEvaluation.judgeId, input.hideJudgedBy.judgeId),
              ),
            ),
        ),
      )
    : undefined;
  return and(
    eq(Project.hackathonId, input.hackathonId),
    input.deleted === "active"
      ? isNull(Project.deletedAt)
      : input.deleted === "deleted"
        ? isNotNull(Project.deletedAt)
        : undefined,
    input.query ? ilike(Project.title, `%${input.query}%`) : undefined,
    input.minParticipants !== undefined
      ? gte(Project.participantCount, input.minParticipants)
      : undefined,
    input.maxParticipants !== undefined
      ? lte(Project.participantCount, input.maxParticipants)
      : undefined,
    challengeMatch,
    notPreviouslyJudged,
  );
}

async function relatedProjects(projectIds: string[]) {
  if (projectIds.length === 0) {
    return {
      challengesByProject: new Map<
        string,
        { evaluationCount: number; id: string; label: string }[]
      >(),
      membersByProject: new Map<
        string,
        { email: string; id: string; name: string; order: number }[]
      >(),
    };
  }
  const [members, challengeRows, evaluationCounts] = await Promise.all([
    db
      .select({
        email: ProjectMember.email,
        id: ProjectMember.id,
        name: ProjectMember.name,
        order: ProjectMember.displayOrder,
        projectId: ProjectMember.projectId,
      })
      .from(ProjectMember)
      .where(inArray(ProjectMember.projectId, projectIds))
      .orderBy(asc(ProjectMember.displayOrder)),
    db
      .select({
        id: ProjectChallenge.id,
        label: ProjectChallenge.label,
        projectId: ProjectToChallenge.projectId,
      })
      .from(ProjectToChallenge)
      .innerJoin(
        ProjectChallenge,
        eq(ProjectChallenge.id, ProjectToChallenge.challengeId),
      )
      .where(inArray(ProjectToChallenge.projectId, projectIds))
      .orderBy(...challengeOrder),
    db
      .select({
        challengeId: ProjectEvaluation.challengeId,
        projectId: ProjectEvaluation.projectId,
        value: count(),
      })
      .from(ProjectEvaluation)
      .where(inArray(ProjectEvaluation.projectId, projectIds))
      .groupBy(ProjectEvaluation.projectId, ProjectEvaluation.challengeId),
  ]);
  const membersByProject = new Map<
    string,
    { email: string; id: string; name: string; order: number }[]
  >();
  for (const member of members) {
    const list = membersByProject.get(member.projectId) ?? [];
    list.push({
      email: member.email,
      id: member.id,
      name: member.name,
      order: member.order,
    });
    membersByProject.set(member.projectId, list);
  }
  const challengesByProject = new Map<
    string,
    { evaluationCount: number; id: string; label: string }[]
  >();
  const evaluationCountByScope = new Map(
    evaluationCounts.map((row) => [
      `${row.projectId}:${row.challengeId}`,
      row.value,
    ]),
  );
  for (const row of challengeRows) {
    const list = challengesByProject.get(row.projectId) ?? [];
    list.push({
      evaluationCount:
        evaluationCountByScope.get(`${row.projectId}:${row.id}`) ?? 0,
      id: row.id,
      label: row.label,
    });
    challengesByProject.set(row.projectId, list);
  }
  return { challengesByProject, membersByProject };
}

async function listProjects(input: {
  challengeIds: string[];
  deleted: "active" | "all" | "deleted";
  direction: "asc" | "desc";
  hackathonId: string;
  hideJudgedBy?: { challengeId: string; judgeId: string };
  maxParticipants?: number;
  minParticipants?: number;
  page: number;
  pageSize: number;
  query: string;
  sort:
    | "challengeRating"
    | "participantCount"
    | "rating"
    | "submittedAt"
    | "title";
}) {
  const where = projectWhere(input);
  const [[total], challenges] = await Promise.all([
    db.select({ value: count() }).from(Project).where(where),
    db
      .select({ id: ProjectChallenge.id, label: ProjectChallenge.label })
      .from(ProjectChallenge)
      .where(eq(ProjectChallenge.hackathonId, input.hackathonId))
      .orderBy(...challengeOrder),
  ]);
  const totalCount = total?.value ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / input.pageSize));
  const page = Math.min(input.page, pageCount);
  const rows = await db
    .select()
    .from(Project)
    .where(where)
    .orderBy(
      ...projectSort(input.sort, input.direction, input.challengeIds[0]),
      asc(Project.id),
    )
    .limit(input.pageSize)
    .offset((page - 1) * input.pageSize);
  const related = await relatedProjects(rows.map((row) => row.id));
  return {
    challenges,
    page,
    pageSize: input.pageSize,
    projects: rows.map((row) => ({
      ...row,
      challenges: related.challengesByProject.get(row.id) ?? [],
      members: related.membersByProject.get(row.id) ?? [],
    })),
    totalCount,
  };
}

async function activeHackathon(now: Date) {
  const [hackathon] = await db
    .select({
      displayName: Hackathon.displayName,
      endDate: Hackathon.endDate,
      id: Hackathon.id,
      startDate: Hackathon.startDate,
    })
    .from(Hackathon)
    .where(and(lte(Hackathon.startDate, now), gte(Hackathon.endDate, now)))
    .orderBy(desc(Hackathon.startDate), asc(Hackathon.id))
    .limit(1);
  return hackathon ?? null;
}

async function upcomingHackathon(now: Date) {
  const [hackathon] = await db
    .select({
      displayName: Hackathon.displayName,
      endDate: Hackathon.endDate,
      id: Hackathon.id,
      startDate: Hackathon.startDate,
    })
    .from(Hackathon)
    .where(gte(Hackathon.startDate, now))
    .orderBy(asc(Hackathon.startDate), asc(Hackathon.id))
    .limit(1);
  return hackathon ?? null;
}

export const projectsRouter = createTRPCRouter({
  listAdminHackathons: permProcedure.query(async ({ ctx }) => {
    assertCanManageProjects(ctx);
    return db
      .select({
        displayName: Hackathon.displayName,
        endDate: Hackathon.endDate,
        id: Hackathon.id,
        inventoryLockedAt:
          HackathonJudgingConfiguration.projectInventoryLockedAt,
        projectCount: count(Project.id),
        startDate: Hackathon.startDate,
      })
      .from(Hackathon)
      .leftJoin(Project, eq(Project.hackathonId, Hackathon.id))
      .leftJoin(
        HackathonJudgingConfiguration,
        eq(HackathonJudgingConfiguration.hackathonId, Hackathon.id),
      )
      .groupBy(
        Hackathon.id,
        HackathonJudgingConfiguration.projectInventoryLockedAt,
      )
      .orderBy(desc(Hackathon.startDate));
  }),

  listAdmin: permProcedure
    .input(projectListInputSchema)
    .query(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const [hackathon] = await db
        .select({ displayName: Hackathon.displayName, id: Hackathon.id })
        .from(Hackathon)
        .where(eq(Hackathon.id, input.hackathonId))
        .limit(1);
      if (!hackathon) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Hackathon not found.",
        });
      }
      return { hackathon, ...(await listProjects(input)) };
    }),

  listJudge: judgeProcedure
    .input(judgeProjectListInputSchema)
    .query(async ({ ctx, input }) => {
      const guestPrincipal =
        ctx.judgePrincipal.kind === "guest" ? ctx.judgePrincipal : null;
      const isGuest = guestPrincipal !== null;
      const isOfficer =
        ctx.judgePrincipal.kind === "member" &&
        ctx.judgePrincipal.isOfficer === true;
      if (input.hackathonId && !isOfficer) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (
        isGuest &&
        (input.sort === "challengeRating" || input.sort === "rating")
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const now = new Date();
      const selected = isGuest
        ? await db.query.Hackathon.findFirst({
            columns: {
              displayName: true,
              endDate: true,
              id: true,
              startDate: true,
            },
            where: and(
              eq(Hackathon.id, guestPrincipal.hackathonId),
              lte(Hackathon.startDate, now),
              gte(Hackathon.endDate, now),
            ),
          })
        : input.hackathonId
          ? await db.query.Hackathon.findFirst({
              columns: {
                displayName: true,
                endDate: true,
                id: true,
                startDate: true,
              },
              where: eq(Hackathon.id, input.hackathonId),
            })
          : ((await activeHackathon(now)) ??
            (isOfficer ? await upcomingHackathon(now) : null));
      if (!selected)
        return {
          hackathon: null,
          page: input.page,
          pageSize: input.pageSize,
          projects: [],
          totalCount: 0,
          challenges: [],
        };
      if (input.sort === "challengeRating") {
        const config = await db.query.HackathonJudgingConfiguration.findFirst({
          columns: { displayAllResultsToMembers: true },
          where: eq(HackathonJudgingConfiguration.hackathonId, selected.id),
        });
        if (!config?.displayAllResultsToMembers) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }
      const judgeId =
        ctx.judgePrincipal.kind === "guest"
          ? ctx.judgePrincipal.judgeId
          : (
              await db.query.Judge.findFirst({
                columns: { id: true },
                where: and(
                  eq(Judge.hackathonId, selected.id),
                  eq(Judge.userId, ctx.judgePrincipal.userId),
                ),
              })
            )?.id;
      const listed = await listProjects({
        ...input,
        challengeIds: guestPrincipal
          ? [guestPrincipal.challengeId]
          : input.challengeIds,
        deleted: "active",
        hackathonId: selected.id,
        hideJudgedBy:
          !input.includeJudged && judgeId
            ? {
                challengeId:
                  guestPrincipal?.challengeId ??
                  input.challengeIds[0] ??
                  (
                    await db.query.ProjectChallenge.findFirst({
                      columns: { id: true },
                      where: and(
                        eq(ProjectChallenge.hackathonId, selected.id),
                        eq(ProjectChallenge.label, "General"),
                      ),
                    })
                  )?.id ??
                  "00000000-0000-0000-0000-000000000000",
                judgeId,
              }
            : undefined,
      });
      return {
        hackathon: selected,
        ...listed,
        challenges: guestPrincipal
          ? listed.challenges.filter(
              (challenge) => challenge.id === guestPrincipal.challengeId,
            )
          : listed.challenges,
        projects: listed.projects.map((project) => {
          const judgeProject = projectForJudge(project);
          return guestPrincipal
            ? { ...judgeProject, challenges: [] }
            : judgeProject;
        }),
      };
    }),

  dropAll: permProcedure
    .input(projectDropAllInputSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const auditActor = await captureAdminAuditActor(ctx.session.user);
      return db.transaction(async (tx) => {
        const [hackathon] = await tx
          .select({ displayName: Hackathon.displayName, id: Hackathon.id })
          .from(Hackathon)
          .where(eq(Hackathon.id, input.hackathonId))
          .for("update")
          .limit(1);
        if (!hackathon) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Hackathon not found.",
          });
        }
        const [lock, activeRoom] = await Promise.all([
          tx.query.HackathonJudgingConfiguration.findFirst({
            columns: { projectInventoryLockedAt: true },
            where: eq(HackathonJudgingConfiguration.hackathonId, hackathon.id),
          }),
          tx.query.JudgingRoom.findFirst({
            columns: { name: true },
            where: and(
              eq(JudgingRoom.hackathonId, hackathon.id),
              isNull(JudgingRoom.archivedAt),
            ),
          }),
        ]);
        if (lock?.projectInventoryLockedAt) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "The judging inventory is locked. Use the confirmed full replacement import instead.",
          });
        }
        if (activeRoom) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Archive ${activeRoom.name} and every other judging room before dropping the project inventory.`,
          });
        }
        if (input.confirmation !== hackathon.displayName) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "The confirmation does not match the hackathon name.",
          });
        }

        const [inventory] = await tx
          .select({ projectCount: count() })
          .from(Project)
          .where(eq(Project.hackathonId, hackathon.id));
        const projectCount = inventory?.projectCount ?? 0;

        await tx.delete(Project).where(eq(Project.hackathonId, hackathon.id));
        await tx
          .delete(ProjectChallenge)
          .where(eq(ProjectChallenge.hackathonId, hackathon.id));

        await createAdminAuditEvent(
          {
            actionKey: "project.inventory_dropped",
            actor: auditActor,
            metadata: { projectCount },
            subjects: [
              {
                relation: "primary",
                targetId: hackathon.id,
                targetLabel: hackathon.displayName,
                targetType: "hackathon",
              },
            ],
          },
          tx,
        );

        return { hackathonId: hackathon.id, projectCount };
      });
    }),

  update: permProcedure
    .input(projectUpdateInputSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const auditActor = await captureAdminAuditActor(ctx.session.user);
      return db.transaction(async (tx) => {
        const [existing] = await tx
          .select()
          .from(Project)
          .where(eq(Project.id, input.projectId))
          .for("update")
          .limit(1);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
        if (existing.deletedAt) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Restore the project before editing it.",
          });
        }
        const challengeRows = await tx
          .select({ id: ProjectChallenge.id, label: ProjectChallenge.label })
          .from(ProjectChallenge)
          .where(
            and(
              eq(ProjectChallenge.hackathonId, existing.hackathonId),
              inArray(ProjectChallenge.id, input.challengeIds),
            ),
          );
        if (challengeRows.length !== new Set(input.challengeIds).size) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid challenge selection.",
          });
        }
        if (!challengeRows.some((challenge) => challenge.label === "General")) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Every project must retain the General challenge.",
          });
        }
        const [saved] = await tx
          .update(Project)
          .set({
            demoLinks: input.demoLinks,
            description: input.description,
            participantCount: input.participantCount,
            prizeCategories: challengeRows
              .filter((challenge) => challenge.label !== "General")
              .map((challenge) => challenge.label),
            submissionUrl: input.submissionUrl,
            technologies: input.technologies,
            title: input.title,
            universities: input.universities,
            videoUrl: input.videoUrl,
          })
          .where(eq(Project.id, existing.id))
          .returning();
        await tx
          .delete(ProjectMember)
          .where(eq(ProjectMember.projectId, existing.id));
        await tx.insert(ProjectMember).values(
          input.members.map((member, index) => ({
            ...member,
            displayOrder: index,
            projectId: existing.id,
          })),
        );
        await tx
          .delete(ProjectToChallenge)
          .where(eq(ProjectToChallenge.projectId, existing.id));
        await tx.insert(ProjectToChallenge).values(
          Array.from(new Set(input.challengeIds)).map((challengeId) => ({
            challengeId,
            hackathonId: existing.hackathonId,
            projectId: existing.id,
          })),
        );
        await createAdminAuditEvent(
          {
            actionKey: "project.updated",
            actor: auditActor,
            metadata: { changedFields: ["project", "members", "challenges"] },
            subjects: [
              {
                relation: "primary",
                targetId: existing.id,
                targetLabel: input.title,
                targetType: "project",
              },
            ],
          },
          tx,
        );
        return saved;
      });
    }),

  delete: permProcedure
    .input(projectIdSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const auditActor = await captureAdminAuditActor(ctx.session.user);
      return db.transaction(async (tx) => {
        const [project] = await tx
          .select()
          .from(Project)
          .where(eq(Project.id, input.projectId))
          .for("update")
          .limit(1);
        if (!project) throw new TRPCError({ code: "NOT_FOUND" });
        if (project.deletedAt) return project;

        const [saved] = await tx
          .update(Project)
          .set({ deletedAt: new Date(), deletedByUserId: ctx.session.user.id })
          .where(
            and(eq(Project.id, input.projectId), isNull(Project.deletedAt)),
          )
          .returning();
        if (!saved) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Project state changed while it was being deleted.",
          });
        }
        await createAdminAuditEvent(
          {
            actionKey: "project.deleted",
            actor: auditActor,
            subjects: [
              {
                relation: "primary",
                targetId: saved.id,
                targetLabel: saved.title,
                targetType: "project",
              },
            ],
          },
          tx,
        );
        return saved;
      });
    }),

  restore: permProcedure
    .input(projectIdSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const auditActor = await captureAdminAuditActor(ctx.session.user);
      return db.transaction(async (tx) => {
        const [project] = await tx
          .select({ id: Project.id, title: Project.title })
          .from(Project)
          .where(
            and(eq(Project.id, input.projectId), isNotNull(Project.deletedAt)),
          )
          .for("update")
          .limit(1);
        if (!project) throw new TRPCError({ code: "NOT_FOUND" });
        const [association] = await tx
          .select({ challengeId: ProjectToChallenge.challengeId })
          .from(ProjectToChallenge)
          .where(eq(ProjectToChallenge.projectId, project.id))
          .limit(1);
        if (!association) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Project challenges are missing.",
          });
        }
        const [saved] = await tx
          .update(Project)
          .set({ deletedAt: null, deletedByUserId: null })
          .where(eq(Project.id, project.id))
          .returning();
        await createAdminAuditEvent(
          {
            actionKey: "project.restored",
            actor: auditActor,
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
        return saved;
      });
    }),
});
