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
} from "@forge/validators";

import { protectedProcedure } from "../trpc";
import { createMemberProfile } from "../utils/member/profile";
import { updateMemberProfile } from "../utils/member/update";
import { removeProfilePictureObjectsForUser } from "../utils/profile-picture/storage";
import { removeUnreferencedResumeObjectsForUser } from "../utils/resume/storage";
import { adminMemberProcedures } from "./member-admin";

export const memberRouter = {
  ...adminMemberProcedures,
  getMember: protectedProcedure.query(async ({ ctx }) => {
    const member = await db.query.Member.findFirst({
      where: eq(Member.userId, ctx.session.user.id),
    });

    return member ?? null;
  }),

  createMember: protectedProcedure
    .input(memberSchema)
    .mutation(async ({ ctx, input }) => {
      return await createMemberProfile({
        database: db,
        input,
        session: ctx.session,
      });
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

  deleteMember: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    try {
      await db.transaction(async (tx) => {
        const existingMember = await tx.query.Member.findFirst({
          where: eq(Member.userId, userId),
          columns: {
            id: true,
          },
        });

        if (!existingMember) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Member profile does not exist.",
          });
        }

        await tx
          .delete(FormResponse)
          .where(
            and(
              eq(FormResponse.userId, userId),
              eq(FormResponse.form, MEMBER_SIGNUP_FORM_ID),
            ),
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
      });
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Member profile could not be deleted.",
      });
    }

    await Promise.all([
      removeProfilePictureObjectsForUser(userId),
      removeUnreferencedResumeObjectsForUser(userId),
    ]);

    return { deleted: true };
  }),
} satisfies TRPCRouterRecord;
