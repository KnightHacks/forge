import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { count, desc, eq, getTableColumns } from "@forge/db";
import { db } from "@forge/db/client";
import {
  Hackathon,
  Hacker,
  HackerAttendee,
} from "@forge/db/schemas/knight-hacks";

import { adminProcedure, protectedProcedure, publicProcedure } from "../trpc";
import { log } from "../utils";

export const hackathonRouter = {
  getHackathons: publicProcedure.query(async () => {
    return await db.query.Hackathon.findMany();
  }),

  getPreviousHacker: protectedProcedure.query(async ({ ctx }) => {
    // Get the most recent hacker profile for this user
    const hacker = await db.query.Hacker.findFirst({
      where: (t, { eq }) => eq(t.userId, ctx.session.user.id),
    });

    return hacker ?? null;
  }),

  getHackathon: publicProcedure
    .input(
      z.object({
        hackathonName: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      if (input.hackathonName == undefined) {
        const hackathon = await db.query.Hackathon.findFirst({
          where: (t, { gt }) => gt(t.endDate, new Date()),
        });

        if (!hackathon) {
          return null;
        }

        return hackathon;
      }

      return await db.query.Hackathon.findFirst({
        where: (t, { eq }) => eq(t.name, input.hackathonName ?? ""),
      });
    }),

  getPastHackathons: protectedProcedure.query(async ({ ctx }) => {
    // Get each hackathon and numAttended
    const hackathonsSubQuery = db
      .select({
        id: Hackathon.id,
        numAttended: count(HackerAttendee.id).as("numAttended"),
      })
      .from(Hackathon)
      .leftJoin(HackerAttendee, eq(Hackathon.id, HackerAttendee.hackathonId))
      .groupBy(Hackathon.id)
      .as("hackathonsSubQuery");

    const hackathons = await db
      .select({
        ...getTableColumns(Hackathon),
        numAttended: hackathonsSubQuery.numAttended,
      })
      .from(Hackathon)
      .leftJoin(HackerAttendee, eq(Hackathon.id, HackerAttendee.hackathonId))
      .leftJoin(Hacker, eq(HackerAttendee.hackerId, Hacker.id))
      .leftJoin(hackathonsSubQuery, eq(hackathonsSubQuery.id, Hackathon.id)) // Add numAttended to each corresponding event
      .where(eq(Hacker.userId, ctx.session.user.id))
      .orderBy(desc(Hackathon.startDate));
    return hackathons;
  }),

  hackathonCheckIn: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        hackathonId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const hacker = await db.query.Hacker.findFirst({
        where: (t, { eq }) => eq(t.userId, input.userId),
      });

      const hackathon = await db.query.Hackathon.findFirst({
        where: (t, { eq }) => eq(t.id, input.hackathonId),
      });

      if (!hacker || !hackathon) {
        return;
      }

      // Get the hacker's status for this specific hackathon
      const hackerAttendee = await db.query.HackerAttendee.findFirst({
        where: (t, { and, eq }) =>
          and(eq(t.hackerId, hacker.id), eq(t.hackathonId, input.hackathonId)),
      });

      if (!hackerAttendee) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `${hacker.firstName} ${hacker.lastName} is not registered for this hackathon`,
        });
      }

      if (hackerAttendee.status !== "confirmed") {
        throw new TRPCError({
          code: "CONFLICT",
          message: `${hacker.firstName} ${hacker.lastName} has not confirmed for this hackathon`,
        });
      }

      // Update the status to indicate they're checked in
      // You might want to add a "checked-in" status to HACKATHON_APPLICATION_STATES
      // For now, we'll just log the check-in without changing status
      await log({
        title: "Hacker Checked-In",
        message: `${hacker.firstName} ${hacker.lastName} has been checked in to Hackathon: ${hackathon.name}`,
        color: "success_green",
        userId: ctx.session.user.discordUserId,
      });

      return {
        message: `${hacker.firstName} ${hacker.lastName} has been checked in to this Hackathon!`,
      };
    }),
} satisfies TRPCRouterRecord;
