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
  sql,
} from "@forge/db";
import { db } from "@forge/db/client";
import {
  Hackathon,
  Project,
  ProjectChallenge,
  ProjectMember,
  ProjectToChallenge,
} from "@forge/db/schemas/knight-hacks";
import {
  judgeProjectListInputSchema,
  projectIdSchema,
  projectListInputSchema,
  projectUpdateInputSchema,
} from "@forge/validators";

import { createTRPCRouter, permProcedure } from "../trpc";
import {
  captureAdminAuditActor,
  createAdminAuditEvent,
} from "../utils/audit/service";
import {
  assertCanManageProjects,
  assertCanViewProjects,
} from "../utils/projects/access";

function projectSort(
  sort: "participantCount" | "submittedAt" | "title",
  direction: "asc" | "desc",
) {
  const column =
    sort === "submittedAt"
      ? Project.submittedAt
      : sort === "participantCount"
        ? Project.participantCount
        : Project.title;
  return direction === "desc" ? desc(column) : asc(column);
}

const challengeOrder = [
  sql`CASE WHEN ${ProjectChallenge.label} = 'General' THEN 0 ELSE 1 END`,
  asc(ProjectChallenge.label),
] as const;

function projectWhere(input: {
  challengeIds: string[];
  deleted: "active" | "all" | "deleted";
  hackathonId: string;
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
              inArray(ProjectToChallenge.challengeId, input.challengeIds),
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
  );
}

async function relatedProjects(projectIds: string[]) {
  if (projectIds.length === 0) {
    return {
      challengesByProject: new Map<string, { id: string; label: string }[]>(),
      membersByProject: new Map<
        string,
        { email: string | null; id: string; name: string; order: number }[]
      >(),
    };
  }
  const [members, challengeRows] = await Promise.all([
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
  ]);
  const membersByProject = new Map<
    string,
    { email: string | null; id: string; name: string; order: number }[]
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
    { id: string; label: string }[]
  >();
  for (const row of challengeRows) {
    const list = challengesByProject.get(row.projectId) ?? [];
    list.push({ id: row.id, label: row.label });
    challengesByProject.set(row.projectId, list);
  }
  return { challengesByProject, membersByProject };
}

async function listProjects(input: {
  challengeIds: string[];
  deleted: "active" | "all" | "deleted";
  direction: "asc" | "desc";
  hackathonId: string;
  maxParticipants?: number;
  minParticipants?: number;
  page: number;
  pageSize: number;
  query: string;
  sort: "participantCount" | "submittedAt" | "title";
}) {
  const where = projectWhere(input);
  const [rows, [total], challenges] = await Promise.all([
    db
      .select()
      .from(Project)
      .where(where)
      .orderBy(projectSort(input.sort, input.direction), asc(Project.id))
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize),
    db.select({ value: count() }).from(Project).where(where),
    db
      .select({ id: ProjectChallenge.id, label: ProjectChallenge.label })
      .from(ProjectChallenge)
      .where(eq(ProjectChallenge.hackathonId, input.hackathonId))
      .orderBy(...challengeOrder),
  ]);
  const related = await relatedProjects(rows.map((row) => row.id));
  return {
    challenges,
    page: input.page,
    pageSize: input.pageSize,
    projects: rows.map((row) => ({
      ...row,
      challenges: related.challengesByProject.get(row.id) ?? [],
      members: related.membersByProject.get(row.id) ?? [],
    })),
    totalCount: total?.value ?? 0,
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
        projectCount: count(Project.id),
        startDate: Hackathon.startDate,
      })
      .from(Hackathon)
      .leftJoin(Project, eq(Project.hackathonId, Hackathon.id))
      .groupBy(Hackathon.id)
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

  listJudge: permProcedure
    .input(judgeProjectListInputSchema)
    .query(async ({ ctx, input }) => {
      assertCanViewProjects(ctx);
      const isOfficer = ctx.session.permissions.IS_OFFICER === true;
      if (input.hackathonId && !isOfficer) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const now = new Date();
      const selected = input.hackathonId
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
      return {
        hackathon: selected,
        ...(await listProjects({
          ...input,
          deleted: "active",
          hackathonId: selected.id,
        })),
      };
    }),

  getDetail: permProcedure
    .input(projectIdSchema)
    .query(async ({ ctx, input }) => {
      assertCanViewProjects(ctx);
      const project = await db.query.Project.findFirst({
        where: eq(Project.id, input.projectId),
        with: {
          challenges: { with: { challenge: true } },
          hackathon: true,
          members: { orderBy: asc(ProjectMember.displayOrder) },
        },
      });
      if (!project || project.deletedAt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found.",
        });
      }
      if (!ctx.session.permissions.IS_OFFICER) {
        const now = new Date();
        if (
          project.hackathon.startDate > now ||
          project.hackathon.endDate < now
        ) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found.",
          });
        }
      }
      return {
        ...project,
        challenges: project.challenges.map(({ challenge }) => challenge),
      };
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
        const [saved] = await tx
          .update(Project)
          .set({ deletedAt: new Date(), deletedByUserId: ctx.session.user.id })
          .where(eq(Project.id, input.projectId))
          .returning();
        if (!saved) throw new TRPCError({ code: "NOT_FOUND" });
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
