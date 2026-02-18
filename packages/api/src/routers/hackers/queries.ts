import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { FORMS } from "@forge/consts";
import { and, count, desc, eq, gt, or, sum } from "@forge/db";
import { db } from "@forge/db/client";
import {
  Hacker,
  HACKER_CLASSES,
  HackerAttendee,
} from "@forge/db/schemas/knight-hacks";

import { permProcedure, protectedProcedure } from "../../trpc";
import { controlPerms, log } from "../../utils";

export const hackerQueryRouter = {
  getHacker: protectedProcedure
    .input(z.object({ hackathonName: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      let hackathon;

      if (input.hackathonName) {
        // If a hackathon name is provided, grab that hackathon
        hackathon = await db.query.Hackathon.findFirst({
          where: (t, { eq }) => eq(t.name, input.hackathonName ?? ""),
        });

        if (!hackathon) {
          throw new TRPCError({
            message: "Hackathon not found!",
            code: "NOT_FOUND",
          });
        }
      } else {
        // If not provided, grab a FUTURE hackathon with a start date CLOSEST to now
        const now = new Date();
        const futureHackathons = await db.query.Hackathon.findMany({
          where: (t, { gt }) => gt(t.endDate, now),
          orderBy: (t, { asc }) => [asc(t.startDate)],
          limit: 1,
        });
        hackathon = futureHackathons[0];

        if (!hackathon) {
          return null;
        }
      }

      // Find the hacker for the current user with their attendee info
      const rows = await db
        .select({
          id: Hacker.id,
          userId: Hacker.userId,
          firstName: Hacker.firstName,
          lastName: Hacker.lastName,
          gender: Hacker.gender,
          discordUser: Hacker.discordUser,
          age: Hacker.age,
          country: Hacker.country,
          email: Hacker.email,
          phoneNumber: Hacker.phoneNumber,
          school: Hacker.school,
          major: Hacker.major,
          levelOfStudy: Hacker.levelOfStudy,
          raceOrEthnicity: Hacker.raceOrEthnicity,
          shirtSize: Hacker.shirtSize,
          githubProfileUrl: Hacker.githubProfileUrl,
          linkedinProfileUrl: Hacker.linkedinProfileUrl,
          websiteUrl: Hacker.websiteUrl,
          resumeUrl: Hacker.resumeUrl,
          dob: Hacker.dob,
          gradDate: Hacker.gradDate,
          survey1: Hacker.survey1,
          survey2: Hacker.survey2,
          isFirstTime: Hacker.isFirstTime,
          foodAllergies: Hacker.foodAllergies,
          agreesToReceiveEmailsFromMLH: Hacker.agreesToReceiveEmailsFromMLH,
          agreesToMLHCodeOfConduct: Hacker.agreesToMLHCodeOfConduct,
          agreesToMLHDataSharing: Hacker.agreesToMLHDataSharing,
          dateCreated: Hacker.dateCreated,
          timeCreated: Hacker.timeCreated,
          status: HackerAttendee.status,
          class: HackerAttendee.class,
          points: HackerAttendee.points,
        })
        .from(Hacker)
        .innerJoin(HackerAttendee, eq(HackerAttendee.hackerId, Hacker.id))
        .where(
          and(
            eq(Hacker.userId, ctx.session.user.id),
            eq(HackerAttendee.hackathonId, hackathon.id),
          ),
        )
        .limit(1);

      const result = rows[0];

      if (!result) {
        return null;
      }

      // Return hacker with status from HackerAttendee
      return {
        ...result,
      };
    }),

  getHackers: permProcedure.input(z.string()).query(async ({ ctx, input }) => {
    // CHECKIN_HACK_EVENT is here because people trying to check-in
    // need to retrieve the member list for manual entry
    controlPerms.or(["READ_HACKERS", "CHECKIN_HACK_EVENT"], ctx);

    const hackers = await db
      .select({
        id: Hacker.id,
        userId: Hacker.userId,
        firstName: Hacker.firstName,
        lastName: Hacker.lastName,
        gender: Hacker.gender,
        discordUser: Hacker.discordUser,
        age: Hacker.age,
        country: Hacker.country,
        email: Hacker.email,
        phoneNumber: Hacker.phoneNumber,
        school: Hacker.school,
        major: Hacker.major,
        levelOfStudy: Hacker.levelOfStudy,
        raceOrEthnicity: Hacker.raceOrEthnicity,
        shirtSize: Hacker.shirtSize,
        githubProfileUrl: Hacker.githubProfileUrl,
        linkedinProfileUrl: Hacker.linkedinProfileUrl,
        websiteUrl: Hacker.websiteUrl,
        resumeUrl: Hacker.resumeUrl,
        dob: Hacker.dob,
        gradDate: Hacker.gradDate,
        survey1: Hacker.survey1,
        survey2: Hacker.survey2,
        isFirstTime: Hacker.isFirstTime,
        foodAllergies: Hacker.foodAllergies,
        agreesToReceiveEmailsFromMLH: Hacker.agreesToReceiveEmailsFromMLH,
        agreesToMLHCodeOfConduct: Hacker.agreesToMLHCodeOfConduct,
        agreesToMLHDataSharing: Hacker.agreesToMLHDataSharing,
        dateCreated: Hacker.dateCreated,
        timeCreated: Hacker.timeCreated,
        status: HackerAttendee.status, // Get hackathon-specific status from HackerAttendee
        timeApplied: HackerAttendee.timeApplied, // Get when they applied to this specific hackathon
        timeConfirmed: HackerAttendee.timeConfirmed, // Get when they confirmed attendance
      })
      .from(Hacker)
      .innerJoin(HackerAttendee, eq(Hacker.id, HackerAttendee.hackerId))
      .where(eq(HackerAttendee.hackathonId, input));

    if (hackers.length === 0) return null; // Can't return undefined in trpc
    return hackers;
  }),

  getAllHackers: permProcedure
    .input(z.object({ hackathonName: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      controlPerms.or(["READ_HACKERS", "CHECKIN_HACK_EVENT"], ctx);

      let hackathon;

      if (input.hackathonName) {
        // If a hackathon name is provided, grab that hackathon
        hackathon = await db.query.Hackathon.findFirst({
          where: (t, { eq }) => eq(t.name, input.hackathonName ?? ""),
        });

        if (!hackathon) {
          throw new TRPCError({
            message: "Hackathon not found!",
            code: "NOT_FOUND",
          });
        }
      } else {
        // If not provided, grab a FUTURE hackathon with a start date CLOSEST to now
        const now = new Date();
        const futureHackathons = await db.query.Hackathon.findMany({
          where: (t, { gt }) => gt(t.startDate, now),
          orderBy: (t, { asc }) => [asc(t.startDate)],
          limit: 1,
        });
        hackathon = futureHackathons[0];

        if (!hackathon) {
          return [];
        }
      }

      const hackers = await db
        .select({
          id: Hacker.id,
          userId: Hacker.userId,
          firstName: Hacker.firstName,
          lastName: Hacker.lastName,
          gender: Hacker.gender,
          discordUser: Hacker.discordUser,
          age: Hacker.age,
          country: Hacker.country,
          email: Hacker.email,
          phoneNumber: Hacker.phoneNumber,
          school: Hacker.school,
          major: Hacker.major,
          levelOfStudy: Hacker.levelOfStudy,
          raceOrEthnicity: Hacker.raceOrEthnicity,
          shirtSize: Hacker.shirtSize,
          githubProfileUrl: Hacker.githubProfileUrl,
          linkedinProfileUrl: Hacker.linkedinProfileUrl,
          websiteUrl: Hacker.websiteUrl,
          resumeUrl: Hacker.resumeUrl,
          dob: Hacker.dob,
          gradDate: Hacker.gradDate,
          survey1: Hacker.survey1,
          survey2: Hacker.survey2,
          isFirstTime: Hacker.isFirstTime,
          foodAllergies: Hacker.foodAllergies,
          agreesToReceiveEmailsFromMLH: Hacker.agreesToReceiveEmailsFromMLH,
          agreesToMLHCodeOfConduct: Hacker.agreesToMLHCodeOfConduct,
          agreesToMLHDataSharing: Hacker.agreesToMLHDataSharing,
          dateCreated: Hacker.dateCreated,
          timeCreated: Hacker.timeCreated,
          status: HackerAttendee.status, // Get status from HackerAttendee
        })
        .from(Hacker)
        .innerJoin(HackerAttendee, eq(Hacker.id, HackerAttendee.hackerId))
        .where(eq(HackerAttendee.hackathonId, hackathon.id));

      return hackers;
    }),

  getPointsByClass: protectedProcedure
    .input(z.object({ hackathonName: z.string().optional() }))
    .query(async ({ input }) => {
      let hackathon;
      const points: number[] = [];

      HACKER_CLASSES.forEach(() => {
        points.push(0);
      });

      if (input.hackathonName) {
        // If a hackathon name is provided, grab that hackathon
        hackathon = await db.query.Hackathon.findFirst({
          where: (t, { eq }) => eq(t.name, input.hackathonName ?? ""),
        });

        if (!hackathon) {
          return points;
        }
      } else {
        // If not provided, grab a FUTURE hackathon with a start date CLOSEST to now
        const now = new Date();
        const futureHackathons = await db.query.Hackathon.findMany({
          where: (t, { gt }) => gt(t.startDate, now),
          orderBy: (t, { asc }) => [asc(t.startDate)],
          limit: 1,
        });
        hackathon = futureHackathons[0];

        if (!hackathon) {
          return points;
        }
      }

      for (let i = 0; i < HACKER_CLASSES.length; i++) {
        const c = HACKER_CLASSES[i];
        const s = await db
          .select({
            sum: sum(HackerAttendee.points).mapWith(Number),
          })
          .from(HackerAttendee)
          .where(
            and(
              eq(HackerAttendee.hackathonId, hackathon.id),
              eq(HackerAttendee.class, c ?? "Alchemist"),
            ),
          );

        points[i] = s.at(0)?.sum ?? 0;
      }

      return points;
    }),

  getTopHackers: protectedProcedure
    .input(
      z.object({
        hackathonName: z.string().optional(),
        hPoints: z.number(),
        hClass: z.string(),
      }),
    )
    .query(async ({ input }) => {
      let hackathon;

      if (input.hackathonName) {
        // If a hackathon name is provided, grab that hackathon
        hackathon = await db.query.Hackathon.findFirst({
          where: (t, { eq }) => eq(t.name, input.hackathonName ?? ""),
        });

        if (!hackathon) {
          return { topA: [], topB: [], place: [0, 0, 0] };
        }
      } else {
        // If not provided, grab a FUTURE hackathon with a start date CLOSEST to now
        const now = new Date();
        const futureHackathons = await db.query.Hackathon.findMany({
          where: (t, { gt }) => gt(t.startDate, now),
          orderBy: (t, { asc }) => [asc(t.startDate)],
          limit: 1,
        });
        hackathon = futureHackathons[0];

        if (!hackathon) {
          return { topA: [], topB: [], place: [0, 0, 0] };
        }
      }

      // this code is going to start looking really stupid
      // but its all so that we dont have to send like half the DB of hackers to the client
      // and hopefully save performance

      const topA = await db
        .select({
          firstName: Hacker.firstName,
          lastName: Hacker.lastName,
          points: HackerAttendee.points,
          class: HackerAttendee.class,
          id: Hacker.id,
        })
        .from(HackerAttendee)
        .innerJoin(Hacker, eq(Hacker.id, HackerAttendee.hackerId))
        .where(
          and(
            eq(HackerAttendee.hackathonId, hackathon.id),
            or(
              eq(HackerAttendee.class, HACKER_CLASSES[0]),
              eq(HackerAttendee.class, HACKER_CLASSES[1]),
              eq(HackerAttendee.class, HACKER_CLASSES[2]),
            ),
          ),
        )
        .orderBy(desc(HackerAttendee.points))
        .limit(5);
      console.log(topA);

      const topB = await db
        .select({
          firstName: Hacker.firstName,
          lastName: Hacker.lastName,
          points: HackerAttendee.points,
          class: HackerAttendee.class,
          id: Hacker.id,
        })
        .from(HackerAttendee)
        .innerJoin(Hacker, eq(Hacker.id, HackerAttendee.hackerId))
        .where(
          and(
            eq(HackerAttendee.hackathonId, hackathon.id),
            or(
              eq(HackerAttendee.class, HACKER_CLASSES[3]),
              eq(HackerAttendee.class, HACKER_CLASSES[4]),
              eq(HackerAttendee.class, HACKER_CLASSES[5]),
            ),
          ),
        )
        .orderBy(desc(HackerAttendee.points))
        .limit(5);

      // stores your place in each sorted leaderboard
      // 0: team A, 2: overall, 3: team B

      let ind = 0;
      HACKER_CLASSES.forEach((v, i) => {
        if (v == input.hClass) ind = i;
      });

      const place = [
        ind >= 3
          ? -1
          : await db.$count(
              HackerAttendee,
              and(
                eq(HackerAttendee.hackathonId, hackathon.id),
                gt(HackerAttendee.points, input.hPoints),
                or(
                  eq(HackerAttendee.class, HACKER_CLASSES[0]),
                  eq(HackerAttendee.class, HACKER_CLASSES[1]),
                  eq(HackerAttendee.class, HACKER_CLASSES[2]),
                ),
              ),
            ),
        await db.$count(
          HackerAttendee,
          and(
            eq(HackerAttendee.hackathonId, hackathon.id),
            gt(HackerAttendee.points, input.hPoints),
          ),
        ),
        ind < 3
          ? -1
          : await db.$count(
              HackerAttendee,
              and(
                eq(HackerAttendee.hackathonId, hackathon.id),
                gt(HackerAttendee.points, input.hPoints),
                or(
                  eq(HackerAttendee.class, HACKER_CLASSES[3]),
                  eq(HackerAttendee.class, HACKER_CLASSES[4]),
                  eq(HackerAttendee.class, HACKER_CLASSES[5]),
                ),
              ),
            ),
      ];

      return { topA: topA, topB: topB, place: place };
    }),

  statusCountByHackathonId: permProcedure
    .input(z.string())
    .query(async ({ ctx, input: hackathonId }) => {
      controlPerms.or(["READ_HACK_DATA"], ctx);

      const results = await Promise.all(
        FORMS.HACKATHON_APPLICATION_STATES.map(async (s) => {
          const rows = await db
            .select({ count: count() })
            .from(HackerAttendee)
            .where(
              and(
                eq(HackerAttendee.hackathonId, hackathonId),
                eq(HackerAttendee.status, s),
              ),
            );
          return [s, Number(rows[0]?.count ?? 0)] as const;
        }),
      );

      const counts = Object.fromEntries(results) as Record<
        (typeof FORMS.HACKATHON_APPLICATION_STATES)[number],
        number
      >;

      // Apply soft blacklist: move blacklisted user from their original status to denied
      const blacklistedHackerId = "7f89fe4d-26f0-42fe-ac98-22d8f648d7a7";
      const blacklistedHacker = await db
        .select({ status: HackerAttendee.status })
        .from(HackerAttendee)
        .innerJoin(Hacker, eq(HackerAttendee.hackerId, Hacker.id))
        .where(
          and(
            eq(Hacker.id, blacklistedHackerId),
            eq(HackerAttendee.hackathonId, hackathonId),
          ),
        )
        .limit(1);

      if (blacklistedHacker.length > 0 && blacklistedHacker[0]) {
        const originalStatus = blacklistedHacker[0].status;
        if (counts[originalStatus] && counts[originalStatus] > 0) {
          counts[originalStatus] = counts[originalStatus] - 1;
        }
        counts.denied = counts.denied + 1;
      }

      return counts;
    }),

  giveHackerPoints: permProcedure
    .input(
      z.object({
        id: z.string(),
        hackathonName: z.string(),
        amount: z.number(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      controlPerms.or(["EDIT_HACKERS"], ctx);

      if (!input.id) {
        throw new TRPCError({
          message: "Hacker ID is required to update a member's status!",
          code: "BAD_REQUEST",
        });
      }

      const hacker = await db.query.Hacker.findFirst({
        where: (t, { eq }) => eq(t.id, input.id),
      });

      if (!hacker) {
        throw new TRPCError({
          message: "Hacker not found!",
          code: "NOT_FOUND",
        });
      }

      // Fetch the hackathon by name to get the ID
      const hackathon = await db.query.Hackathon.findFirst({
        where: (t, { eq }) => eq(t.name, input.hackathonName),
      });

      if (!hackathon) {
        throw new TRPCError({
          message: `Hackathon not found! - ${input.hackathonName}`,
          code: "NOT_FOUND",
        });
      }

      const attendee = await db.query.HackerAttendee.findFirst({
        where: (t, { eq, and }) =>
          and(eq(t.hackathonId, hackathon.id), eq(t.hackerId, hacker.id)),
      });

      if (!attendee) {
        throw new TRPCError({
          message: `Attendee not found for ${hacker.firstName} ${hacker.lastName}`,
          code: "NOT_FOUND",
        });
      }

      await db
        .update(HackerAttendee)
        .set({ points: attendee.points + input.amount })
        .where(
          and(
            eq(HackerAttendee.hackerId, input.id),
            eq(HackerAttendee.hackathonId, hackathon.id),
          ),
        );

      await log({
        title: `Gave Points`,
        message: `Gave ${input.amount} points to ${hacker.firstName} ${hacker.lastName} for ${hackathon.displayName}`,
        color: "tk_blue",
        userId: ctx.session.user.discordUserId,
      });
    }),

  updateHackerStatus: permProcedure
    .input(
      z.object({
        id: z.string(), // This is the hacker ID
        hackathonName: z.string(),
        status: z.enum([
          "pending",
          "accepted",
          "confirmed",
          "withdrawn",
          "denied",
          "waitlisted",
        ]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      controlPerms.or(["EDIT_HACKERS"], ctx);

      if (!input.id) {
        throw new TRPCError({
          message: "Hacker ID is required to update a member's status!",
          code: "BAD_REQUEST",
        });
      }

      const hacker = await db.query.Hacker.findFirst({
        where: (t, { eq }) => eq(t.id, input.id),
      });

      if (!hacker) {
        throw new TRPCError({
          message: "Hacker not found!",
          code: "NOT_FOUND",
        });
      }

      // Fetch the hackathon by name to get the ID
      const hackathon = await db.query.Hackathon.findFirst({
        where: (t, { eq }) => eq(t.displayName, input.hackathonName),
      });

      if (!hackathon) {
        throw new TRPCError({
          message: `Hackathon not found! - ${input.hackathonName}`,
          code: "NOT_FOUND",
        });
      }

      // Update status in HackerAttendee table
      await db
        .update(HackerAttendee)
        .set({ status: input.status })
        .where(
          and(
            eq(HackerAttendee.hackerId, input.id),
            eq(HackerAttendee.hackathonId, hackathon.id),
          ),
        );

      await log({
        title: `Hacker Status Updated ${hackathon.displayName ? `for ${hackathon.displayName}` : ""}`,
        message: `Hacker status for ${hacker.firstName} ${hacker.lastName} has changed to ${input.status}!`,
        color: "tk_blue",
        userId: ctx.session.user.discordUserId,
      });
    }),
};
