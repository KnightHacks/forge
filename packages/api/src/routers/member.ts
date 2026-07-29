import { randomUUID } from "node:crypto";
import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";

import { and, eq } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, User } from "@forge/db/schemas/auth";
import { FormResponse, Member } from "@forge/db/schemas/knight-hacks";
import {
  MEMBER_SIGNUP_FORM_ID,
  memberSchema,
  memberUpdateSchema,
  updateGuildPreferencesSchema,
} from "@forge/validators";

import { protectedProcedure } from "../trpc";
import {
  loadMemberAuditIdentity,
  memberAuditSubject,
} from "../utils/audit/member-subject";
import {
  appendAdminAuditResults,
  createAdminAuditEvent,
} from "../utils/audit/service";
import { createMemberProfile } from "../utils/member/profile";
import { updateMemberProfile } from "../utils/member/update";
import { removeProfilePictureObjectsForUser } from "../utils/profile-picture/storage";
import { removeUnreferencedResumeObjectsForUser } from "../utils/resume/storage";

export const memberRouter = {
  getMember: protectedProcedure.query(async ({ ctx }) => {
    const member = await db.query.Member.findFirst({
      where: eq(Member.userId, ctx.session.user.id),
    });

    return member ?? null;
  }),

  createMember: protectedProcedure
    .input(memberSchema)
    .mutation(async ({ ctx, input }) => {
      return await db.transaction(
        async (tx) =>
          await createMemberProfile({
            database: tx,
            input,
            session: ctx.session,
          }),
      );
    }),

  updateMember: protectedProcedure
    .input(memberUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      return await updateMemberProfile({
        database: db,
        discordUser: ctx.session.user.name,
        input,
        userId: ctx.session.user.id,
      });
    }),

  updateGuildPreferences: protectedProcedure
    .input(updateGuildPreferencesSchema)
    .mutation(async ({ ctx, input }) => {
      const [member] = await db
        .update(Member)
        .set(input)
        .where(eq(Member.userId, ctx.session.user.id))
        .returning({
          guildOpportunityStatuses: Member.guildOpportunityStatuses,
          guildProfileVisible: Member.guildProfileVisible,
          guildResumeVisible: Member.guildResumeVisible,
        });

      if (!member) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Create a member profile before editing Guild preferences.",
        });
      }

      return member;
    }),

  deleteMember: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const operationId = randomUUID();
    let auditEventId: string;

    try {
      auditEventId = await db.transaction(async (tx) => {
        const existingMember = await loadMemberAuditIdentity(userId, tx);

        const deletedResponses = await tx
          .delete(FormResponse)
          .where(
            and(
              eq(FormResponse.userId, userId),
              eq(FormResponse.form, MEMBER_SIGNUP_FORM_ID),
            ),
          )
          .returning({ id: FormResponse.id });

        // Written before the deletes so the actor snapshot still resolves: the
        // actor here is the member deleting their own account, and the rows the
        // snapshot reads are about to be gone.
        const auditEvent = await createAdminAuditEvent(
          {
            actionKey: "member.profile.deleted",
            actor: ctx.session.user,
            metadata: {
              deletedObjectCount: deletedResponses.length + 3,
              deletedObjectTypes: [
                "member",
                "user",
                "permissions",
                ...(deletedResponses.length > 0 ? ["signup_response"] : []),
              ],
            },
            operationId,
            subjects: [memberAuditSubject(existingMember)],
          },
          tx,
        );

        await tx.delete(Member).where(eq(Member.userId, userId));
        await tx.delete(Permissions).where(eq(Permissions.userId, userId));

        const [deletedUser] = await tx
          .delete(User)
          .where(eq(User.id, userId))
          .returning({ id: User.id });

        if (!deletedUser) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Member account could not be deleted.",
          });
        }

        return auditEvent.id;
      });
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Member profile could not be deleted.",
      });
    }

    const [pictureCleanup, resumeCleanup] = await Promise.all([
      removeProfilePictureObjectsForUser(userId),
      removeUnreferencedResumeObjectsForUser(userId),
    ]);
    await appendAdminAuditResults({
      actionKey: "member.profile.deleted",
      eventId: auditEventId,
      results: [
        {
          resultOutcome: pictureCleanup,
          targetId: `profile-picture-cleanup:${userId}`,
          targetLabel: "Profile picture storage cleanup",
          targetType: "provider",
        },
        {
          resultOutcome: resumeCleanup,
          targetId: `resume-cleanup:${userId}`,
          targetLabel: "Résumé storage cleanup",
          targetType: "provider",
        },
      ],
    });

    return { deleted: true };
  }),
} satisfies TRPCRouterRecord;
