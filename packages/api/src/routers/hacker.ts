import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";

import { and, eq, exists } from "@forge/db";
import { db } from "@forge/db/client";
import { Hacker, HackerAttendee } from "@forge/db/schemas/knight-hacks";

import { adminProcedure, protectedProcedure } from "../trpc";

export const hackerRouter = {
  getHacker: protectedProcedure.query(async ({ ctx }) => {
    const hacker = await db
      .select()
      .from(Hacker)
      .where(eq(Hacker.userId, ctx.session.user.id));

    if (hacker.length === 0) return null; // Can't return undefined in trpc
    return hacker[hacker.length - 1];
  }),
  
  getHackers: adminProcedure.input(z.string()).query(async ({ input }) => {
    const hackers = await db
      .select()
      .from(Hacker)
      .where(
        exists(
          db
            .select()
            .from(HackerAttendee)
            .where(and(
              eq(HackerAttendee.hackathonId, input), eq(HackerAttendee.hackerId, Hacker.id)
            ))
        )
      );

    if (hackers.length === 0) return null; // Can't return undefined in trpc
    return hackers;
  }),
} satisfies TRPCRouterRecord;
