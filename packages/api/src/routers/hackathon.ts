import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";


import { and, count, desc, eq, getTableColumns, lt} from "@forge/db";
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

<<<<<<< HEAD
  getNumConfirmed: protectedProcedure
=======
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

      let assignedClass: HackerClass | null = hackerAttendee.class ?? null;
      if (hackerAttendee.status !== "confirmed") {
        if (hackerAttendee.status !== "checkedin") {
          throw new TRPCError({
            code: "CONFLICT",
            message: `${hacker.firstName} ${hacker.lastName} has not confirmed for this hackathon`,
          });
        }
        if (hackerAttendee.allowedRepeatCheckIn) {
          await db
            .update(HackerAttendee)
            .set({ allowedRepeatCheckIn: false })
            .where(
              and(
                eq(HackerAttendee.hackerId, hacker.id),
                eq(HackerAttendee.hackathonId, input.hackathonId),
              ),
            );
          return {
            message: `${hacker.firstName} ${hacker.lastName} checked in for the event`,
            firstName: hacker.firstName,
            lastName: hacker.lastName,
            class: assignedClass,
            messageforHackers: " ",
          };
        }
        await log({
          title: `Hacker Checked-In attempt failed`,
          message: `${hacker.firstName} ${hacker.lastName} has attempted check in but either role has not been called or already checked in once`,
          color: "uhoh_red",
          userId: ctx.session.user.discordUserId,
        });
        return {
          message: `${hacker.firstName} ${hacker.lastName} already checked in`,
          firstName: hacker.firstName,
          lastName: hacker.lastName,
          class: `already checked in or they don't have the correct role, this is their role: ${hackerAttendee.status} please check if this matches with the role that was called`,
          messageforHackers: " ",
        };
      }

      await db.transaction(async (tx) => {
        const doesHackerHaveClass = await tx.query.HackerAttendee.findFirst({
          where: (t, { and, eq }) =>
            and(
              eq(t.hackerId, hacker.id),
              eq(t.hackathonId, input.hackathonId),
            ),
        });

        if (
          doesHackerHaveClass?.class &&
          doesHackerHaveClass.class in HACKER_CLASSES
        ) {
          assignedClass = doesHackerHaveClass.class;
          return;
        }

        const totalHackerinClass = await Promise.all(
          HACKER_CLASSES.map(async (cls) => {
            const rows = await tx
              .select({ c: count() })
              .from(HackerAttendee)
              .where(
                and(
                  eq(HackerAttendee.hackathonId, input.hackathonId),
                  eq(HackerAttendee.class, cls),
                ),
              );
            return { cls, count: Number(rows[0]?.c ?? 0) } as const;
          }),
        );

        const leastPopulatedClass = Math.min(
          ...totalHackerinClass.map((c) => c.count),
        );
        const candidates = totalHackerinClass
          .filter((c) => c.count === leastPopulatedClass)
          .map((c) => c.cls);

        const pick: HackerClass =
          candidates[Math.floor(Math.random() * candidates.length)] ??
          HACKER_CLASSES[0];

        await tx
          .update(HackerAttendee)
          .set({ class: pick, status: "checkedin" })
          .where(
            and(
              eq(HackerAttendee.hackerId, hacker.id),
              eq(HackerAttendee.hackathonId, input.hackathonId),
            ),
          );

        assignedClass = pick;
      });

      const discordId = await resolveDiscordUserId(hacker.discordUser);
      if (!discordId) {
        await log({
          title: "Discord role assign skipped",
          message: `Could not resolve Discord ID for "${hacker.discordUser}".`,
          color: "uhoh_red",
          userId: ctx.session.user.discordUserId,
        });
      } else {
        try {
          await addRoleToMember(discordId, KH_EVENT_ROLE_ID);
          console.log(`Assigned role ${KH_EVENT_ROLE_ID} to user ${discordId}`);

          if (assignedClass) {
            await addRoleToMember(discordId, CLASS_ROLE_ID[assignedClass]);
          }
        } catch (e) {
          await log({
            title: "Discord role assign failed",
            message: `Failed to assign Discord roles for "${hacker.discordUser}".`,
            color: "uhoh_red",
            userId: ctx.session.user.discordUserId,
          });
          console.error(
            "Failed to assign Discord roles:",
            (e as Error).message,
          );
        }
      }
      await log({
        title: `Hacker Checked-In`,
        message: `${hacker.firstName} ${hacker.lastName} has been checked in to Hackathon: ${hackathon.name} ${
          assignedClass ? ` (Class: ${assignedClass}).` : ""
        }`,
        color: "success_green",
        userId: ctx.session.user.discordUserId,
      });
      return {
        message: `${hacker.firstName} ${hacker.lastName} has been checked in to this Hackathon!${
          assignedClass ? ` Assigned class: ${assignedClass}.` : ""
        }`,
        firstName: hacker.firstName,
        lastName: hacker.lastName,
        class: assignedClass,
        messageforHackers:
          "Make sure that the hacker's name matches their Blade's first name and last name, and send them to the proper line to get their lanyards.",
      };
    }),

  setAllowedRepeatCheckIn: adminProcedure
>>>>>>> f7d7ecf9 (added some small changes to text when checked in to the hackathon)
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
