import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";

import { and, count, desc, eq, getTableColumns, lt } from "@forge/db";
import { db } from "@forge/db/client";
import {
  Hackathon,
  Hacker,
  HackerAttendee,
} from "@forge/db/schemas/knight-hacks";

import { protectedProcedure, publicProcedure } from "../trpc";

export const hackathonRouter = {
  getHackathons: publicProcedure.query(async () => {
    return await db.query.Hackathon.findMany();
  }),

  getCurrentHackathon: publicProcedure.query(async () => {
    // Find first hackathon that hasnt ended yet
    // this is kinda breaking stuff honestly
    return await db.query.Hackathon.findFirst({
      orderBy: (t, { asc }) => asc(t.endDate),
      where: (t, { and, gte, lte }) =>
        and(gte(t.endDate, new Date()), lte(t.applicationOpen, new Date())),
    });
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

  getHackathonById: publicProcedure
    .input(z.string())
    .query(async ({ input }) => {
      return await db.query.Hackathon.findFirst({
        where: (t, { eq }) => eq(t.id, input),
      });
    }),

  getPastHackathons: protectedProcedure.query(async ({ ctx }) => {
    // Subquery: each hackathon with number attended
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
      .leftJoin(hackathonsSubQuery, eq(hackathonsSubQuery.id, Hackathon.id))
      .where(
        and(
          eq(Hacker.userId, ctx.session.user.id),
          lt(Hackathon.endDate, new Date()), // Only past hackathons
        ),
      )
      .orderBy(desc(Hackathon.startDate));

    return hackathons;
  }),

  getNumConfirmed: protectedProcedure
    .input(
      z.object({
        hackathonId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const hackers = await db.query.HackerAttendee.findMany({
        where: (t, { eq, and }) =>
          and(eq(t.hackathonId, input.hackathonId), eq(t.status, "confirmed")),
      });

      return hackers.length;
    }),
} satisfies TRPCRouterRecord;
