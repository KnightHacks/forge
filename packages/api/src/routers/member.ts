import type { TRPCRouterRecord } from "@trpc/server";

import { eq } from "@forge/db";
import { db } from "@forge/db/client";
import { Member } from "@forge/db/schemas/knight-hacks";
import { memberSchema } from "@forge/validators";

import { protectedProcedure } from "../trpc";
import { createMemberProfile } from "../utils/member/profile";

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
      return await createMemberProfile({
        database: db,
        input,
        session: ctx.session,
      });
    }),
} satisfies TRPCRouterRecord;
