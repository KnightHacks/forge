import type { TRPCRouterRecord } from "@trpc/server";
import { db } from "@forge/db/client";
import { InsertMemberSchema, Member } from "@forge/db/schemas/knight-hacks";

import { protectedProcedure } from "../trpc";

export const memberRouter = {
  createMember: protectedProcedure
    .input(InsertMemberSchema.omit({ userId: true }))
    .mutation(async ({ input, ctx }) => {
      await db.insert(Member).values({
        ...input,
        userId: ctx.session.user.id,
      });
    }),
} satisfies TRPCRouterRecord;
