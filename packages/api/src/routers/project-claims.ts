import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";

import { and, asc, eq, gt, ilike, isNull, or } from "@forge/db";
import { db } from "@forge/db/client";
import { User } from "@forge/db/schemas/auth";
import {
  HackathonJudgingConfiguration,
  HackerProfile,
  JudgingSchedule,
  Project,
  ProjectClaim,
  ProjectClaimLink,
  ProjectMember,
} from "@forge/db/schemas/knight-hacks";
import { logger } from "@forge/utils";
import {
  projectClaimAdminActionSchema,
  projectClaimAdminReadSchema,
  projectClaimSettingsSchema,
} from "@forge/validators";

import { permProcedure } from "../trpc";
import { createAdminAuditEvent } from "../utils/audit/service";
import { lockScheduleHackathon } from "../utils/judging-schedule/source";
import { projectClaimDelivery } from "../utils/project-claims/claims";
import { assertCanManageProjects } from "../utils/projects/access";

export const projectClaimsRouter = {
  getClaimsAdmin: permProcedure
    .input(projectClaimAdminReadSchema)
    .query(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const pattern = `%${input.query.replace(/[\\%_]/g, "\\$&")}%`;
      const [configuration, members] = await Promise.all([
        db.query.HackathonJudgingConfiguration.findFirst({
          where: eq(
            HackathonJudgingConfiguration.hackathonId,
            input.hackathonId,
          ),
        }),
        db
          .select({
            id: ProjectMember.id,
            projectId: Project.id,
            projectTitle: Project.title,
            name: ProjectMember.name,
            email: ProjectMember.email,
            invited: ProjectMember.invitedUserId,
            userId: ProjectClaim.userId,
            firstName: HackerProfile.firstName,
            lastName: HackerProfile.lastName,
            discordUserId: User.discordUserId,
            discordUser: HackerProfile.discordUser,
            sentAt: ProjectClaimLink.sentAt,
            usedAt: ProjectClaimLink.consumedAt,
          })
          .from(ProjectMember)
          .innerJoin(Project, eq(Project.id, ProjectMember.projectId))
          .leftJoin(ProjectClaim, eq(ProjectClaim.memberId, ProjectMember.id))
          .leftJoin(
            HackerProfile,
            eq(HackerProfile.userId, ProjectClaim.userId),
          )
          .leftJoin(User, eq(User.id, ProjectClaim.userId))
          .leftJoin(
            ProjectClaimLink,
            eq(ProjectClaimLink.memberId, ProjectMember.id),
          )
          .where(
            and(
              eq(Project.hackathonId, input.hackathonId),
              isNull(Project.deletedAt),
              or(
                ilike(Project.title, pattern),
                ilike(ProjectMember.name, pattern),
                ilike(ProjectMember.email, pattern),
                ilike(HackerProfile.firstName, pattern),
                ilike(HackerProfile.lastName, pattern),
              ),
            ),
          )
          .orderBy(asc(Project.title), asc(ProjectMember.displayOrder))
          .limit(100),
      ]);
      return {
        published: configuration?.hackerSchedulePublished ?? false,
        emergency: configuration?.hackerScheduleEmergency ?? false,
        claimUrl: configuration?.projectClaimUrl ?? "",
        locked: !!configuration?.projectClaimsStartedAt,
        members,
      };
    }),
  setClaimSettings: permProcedure
    .input(projectClaimSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      return db.transaction(async (tx) => {
        await lockScheduleHackathon(tx, input.hackathonId);
        if (
          input.published &&
          !(await tx.query.JudgingSchedule.findFirst({
            columns: { id: true },
            where: eq(JudgingSchedule.hackathonId, input.hackathonId),
          }))
        )
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Save a schedule before opening it to hackers.",
          });
        const previous = await tx.query.HackathonJudgingConfiguration.findFirst(
          {
            columns: { projectClaimUrl: true },
            where: eq(
              HackathonJudgingConfiguration.hackathonId,
              input.hackathonId,
            ),
          },
        );
        const settings = {
          hackerSchedulePublished: input.published,
          hackerScheduleEmergency: input.emergency,
          projectClaimUrl: input.claimUrl,
        };
        await tx
          .insert(HackathonJudgingConfiguration)
          .values({ hackathonId: input.hackathonId, ...settings })
          .onConflictDoUpdate({
            target: HackathonJudgingConfiguration.hackathonId,
            set: settings,
          });
        await createAdminAuditEvent(
          {
            actor: ctx.session.user,
            actionKey: "project.claim.settings_updated",
            subjects: [
              {
                relation: "primary",
                targetType: "hackathon",
                targetId: input.hackathonId,
                targetLabel: "Hacker judging publication",
              },
            ],
            changes: [
              {
                field: "claimUrl",
                before: previous?.projectClaimUrl ?? null,
                after: input.claimUrl,
              },
            ],
            metadata: {
              published: input.published,
              emergency: input.emergency,
            },
          },
          tx,
        );
        return { success: true };
      });
    }),
  copyClaimLink: permProcedure
    .input(projectClaimAdminActionSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      if (!input.memberId)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Choose a recipient.",
        });
      const result = await projectClaimDelivery(
        input.hackathonId,
        input.memberId,
        false,
      );
      await createAdminAuditEvent({
        actor: ctx.session.user,
        actionKey: "project.claim.link_copied",
        subjects: [
          {
            relation: "primary",
            targetType: "project",
            targetId: result.projectId,
            targetLabel: "Project claim recipient",
          },
        ],
      });
      return result;
    }),
  sendClaimLinks: permProcedure
    .input(projectClaimAdminActionSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const members = await db
        .select({ id: ProjectMember.id })
        .from(ProjectMember)
        .innerJoin(Project, eq(Project.id, ProjectMember.projectId))
        .leftJoin(ProjectClaim, eq(ProjectClaim.memberId, ProjectMember.id))
        .leftJoin(
          ProjectClaimLink,
          eq(ProjectClaimLink.memberId, ProjectMember.id),
        )
        .where(
          and(
            eq(Project.hackathonId, input.hackathonId),
            isNull(Project.deletedAt),
            isNull(ProjectClaimLink.consumedAt),
            input.afterMemberId && !input.memberId
              ? gt(ProjectMember.id, input.afterMemberId)
              : undefined,
            input.memberId
              ? eq(ProjectMember.id, input.memberId)
              : isNull(ProjectClaimLink.sentAt),
          ),
        )
        .orderBy(asc(ProjectMember.id))
        .limit(6);
      const hasMore = members.length > 5;
      const batch = members.slice(0, 5);
      let sent = 0;
      let failed = 0;
      // Five concurrent deliveries per request; the client continues in bounded batches.
      const results = await Promise.allSettled(
        batch.map((member) =>
          projectClaimDelivery(input.hackathonId, member.id, true),
        ),
      );
      for (const result of results) {
        if (result.status === "fulfilled") sent++;
        else {
          failed++;
          logger.error("Project claim delivery failed", {
            code:
              result.reason instanceof TRPCError
                ? result.reason.code
                : "EMAIL_PROVIDER_FAILURE",
          });
        }
      }
      await createAdminAuditEvent({
        actor: ctx.session.user,
        actionKey: "project.claim.links_sent",
        subjects: [
          {
            relation: "primary",
            targetType: "hackathon",
            targetId: input.hackathonId,
            targetLabel: "Project claim delivery",
          },
        ],
        metadata: { sent, failed },
      });
      return {
        sent,
        failed,
        hasMore,
        nextMemberId: hasMore ? batch.at(-1)?.id : undefined,
      };
    }),
} satisfies TRPCRouterRecord;
