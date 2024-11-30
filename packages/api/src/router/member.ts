import type { TRPCRouterRecord } from "@trpc/server";

import { db } from "@blade/db/client";
import { InsertMemberSchema, Member } from "@blade/db/schemas/knight-hacks";

import { protectedProcedure } from "../trpc";

export const memberRouter = {
  createMember: protectedProcedure
    .input(InsertMemberSchema)
    .mutation(async ({ input }) => {
      await db.insert(Member).values(input);
    }),
} satisfies TRPCRouterRecord;
