import type { TRPCRouterRecord } from "@trpc/server";

import { eq } from "@forge/db";
import { db } from "@forge/db/client";
import { Hacker } from "@forge/db/schemas/knight-hacks";

import { protectedProcedure } from "../trpc";

export const hackerRouter = {
  getHacker: protectedProcedure.query(async ({ ctx }) => {
    const hacker = await db
      .select()
      .from(Hacker)
      .where(eq(Hacker.userId, ctx.session.user.id));

    if (hacker.length === 0) return null; // Can't return undefined in trpc
    return hacker[hacker.length - 1];
  }),
} satisfies TRPCRouterRecord;
