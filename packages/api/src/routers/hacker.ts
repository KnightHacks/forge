import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import QRCode from "qrcode";
import { z } from "zod";

import type { HackerClass} from "@forge/db/schemas/knight-hacks";
import {
  BUCKET_NAME,
  CLASS_ROLE_ID,
  HACKATHON_APPLICATION_STATES,
  KH_EVENT_ROLE_ID,
  KNIGHTHACKS_S3_BUCKET_REGION,
} from "@forge/consts/knight-hacks";
import { and, count, eq, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { Session } from "@forge/db/schemas/auth";
import {
  AssignedClassCheckinSchema,
  Event,
  Hacker,
  HACKER_CLASSES,
  HackerAttendee,
  HackerEventAttendee,
  InsertHackerSchema,
} from "@forge/db/schemas/knight-hacks";

import { minioClient } from "../minio/minio-client";
import { adminProcedure, protectedProcedure } from "../trpc";
import {
  addRoleToMember,
  isDiscordVIP,
  log,
  resolveDiscordUserId,
} from "../utils";

export const hackerRouter = {
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
          where: (t, { gt }) => gt(t.startDate, now),
          orderBy: (t, { asc }) => [asc(t.startDate)],
          limit: 1,
        });
        hackathon = futureHackathons[0];

        if (!hackathon) {
          return null;
        }
      }

      // Find the hacker for the current user
      const hacker = await db.query.Hacker.findFirst({
        where: (t, { eq }) => eq(t.userId, ctx.session.user.id),
      });

      if (!hacker) {
        return null;
      }

      // Check if the hacker is registered for this specific hackathon
      const hackerAttendee = await db.query.HackerAttendee.findFirst({
        where: (t, { and, eq }) =>
          and(eq(t.hackerId, hacker.id), eq(t.hackathonId, hackathon.id)),
      });

      if (!hackerAttendee) {
        return null;
      }

      // Return hacker with status from HackerAttendee
      return {
        ...hacker,
        status: hackerAttendee.status,
      };
    }),

  getHackers: adminProcedure.input(z.string()).query(async ({ input }) => {
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

  getAllHackers: adminProcedure
    .input(z.object({ hackathonName: z.string().optional() }))
    .query(async ({ input }) => {
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

  createHacker: protectedProcedure
    .input(
      z.object({
        ...InsertHackerSchema.omit({
          userId: true,
          age: true,
          discordUser: true,
        }).shape,
        hackathonName: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      const { hackathonName, ...hackerData } = input;

      const hackathon = await db.query.Hackathon.findFirst({
        where: (t, { eq }) => eq(t.name, hackathonName),
      });

      if (!hackathon) {
        throw new TRPCError({
          message: "Hackathon not found!",
          code: "NOT_FOUND",
        });
      }

      const existingHacker = await db
        .select()
        .from(Hacker)
        .innerJoin(HackerAttendee, eq(Hacker.id, HackerAttendee.hackerId))
        .where(
          and(
            eq(Hacker.userId, userId),
            eq(HackerAttendee.hackathonId, hackathon.id),
          ),
        );

      if (existingHacker.length > 0) {
        throw new Error(
          "Hacker already exists for this user in this hackathon.",
        );
      }

      // Generate QR code for first-time hacker registration
      try {
        const existingHackerProfile = await db
          .select({ id: Hacker.id })
          .from(Hacker)
          .where(eq(Hacker.userId, userId));

        if (existingHackerProfile.length === 0) {
          const objectName = `qr-code-${userId}.png`;
          const bucketExists = await minioClient.bucketExists(BUCKET_NAME);
          if (!bucketExists) {
            await minioClient.makeBucket(
              BUCKET_NAME,
              KNIGHTHACKS_S3_BUCKET_REGION,
            );
          }
          const qrData = `user:${userId}`;
          const qrBuffer = await QRCode.toBuffer(qrData, { type: "png" });
          await minioClient.putObject(
            BUCKET_NAME,
            objectName,
            qrBuffer,
            qrBuffer.length,
            { "Content-Type": "image/png" },
          );
        }
      } catch (error) {
        console.error("Error with generating QR code: ", error);
      }

      const today = new Date();
      const birthDate = new Date(hackerData.dob);
      const hasBirthdayPassed =
        birthDate.getMonth() < today.getMonth() ||
        (birthDate.getMonth() === today.getMonth() &&
          birthDate.getDate() <= today.getDate());
      const newAge = hasBirthdayPassed
        ? today.getFullYear() - birthDate.getFullYear()
        : today.getFullYear() - birthDate.getFullYear() - 1;

      await db.insert(Hacker).values({
        ...hackerData,
        discordUser: ctx.session.user.name ?? "",
        userId,
        age: newAge,
        phoneNumber:
          hackerData.phoneNumber === "" ? null : hackerData.phoneNumber,
      });

      const insertedHacker = await db.query.Hacker.findFirst({
        where: (t, { eq }) => eq(t.userId, userId),
      });

      await db.insert(HackerAttendee).values({
        hackerId: insertedHacker?.id ?? "",
        hackathonId: hackathon.id,
        status: "pending",
      });

      await log({
        title: `Hacker Created for ${hackathon.displayName}`,
        message: `${hackerData.firstName} ${hackerData.lastName} has signed up for the upcoming hackathon: ${hackathon.name.toUpperCase()}!`,
        color: "tk_blue",
        userId: ctx.session.user.discordUserId,
      });
    }),

  updateHacker: protectedProcedure
    .input(
      InsertHackerSchema.omit({
        userId: true,
        age: true,
        discordUser: true,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!input.id) {
        throw new TRPCError({
          message: "Hacker ID is required to update a member!",
          code: "BAD_REQUEST",
        });
      }

      const { id, dob, phoneNumber, ...updateData } = input;

      const hacker = await db.query.Hacker.findFirst({
        where: (t, { eq }) => eq(t.id, id),
      });

      if (!hacker) {
        throw new TRPCError({
          message: "Hacker not found!",
          code: "NOT_FOUND",
        });
      }

      const normalizedPhone = phoneNumber === "" ? null : phoneNumber;

      // Check if the age has been updated
      const today = new Date();
      const birthDate = new Date(dob);
      const hasBirthdayPassed =
        birthDate.getMonth() < today.getMonth() ||
        (birthDate.getMonth() === today.getMonth() &&
          birthDate.getDate() <= today.getDate());
      const newAge = hasBirthdayPassed
        ? today.getFullYear() - birthDate.getFullYear()
        : today.getFullYear() - birthDate.getFullYear() - 1;

      await db
        .update(Hacker)
        .set({
          ...updateData,
          resumeUrl: updateData.resumeUrl,
          dob: dob,
          age: newAge,
          phoneNumber: normalizedPhone,
        })
        .where(eq(Hacker.userId, ctx.session.user.id));

      // Create a log of the changes for logger
      const changes = Object.keys(updateData).reduce(
        (acc, key) => {
          if (
            hacker[key as keyof typeof hacker] !==
            updateData[key as keyof typeof updateData]
          ) {
            acc[key] = {
              before: hacker[key as keyof typeof hacker],
              after: updateData[key as keyof typeof updateData],
            };
          }
          return acc;
        },
        {} as Record<
          string,
          {
            before: string | number | boolean | null;
            after: string | boolean | null | undefined;
          }
        >,
      );

      if ((hacker.phoneNumber ?? "") !== (normalizedPhone ?? "")) {
        changes.phoneNumber = {
          before: hacker.phoneNumber,
          after: normalizedPhone,
        };
      }

      // Convert the changes object to a string for the log
      const changesString = Object.entries(changes)
        .map(([key, value]) => {
          return `\n${key}\n **Before:** ${value.before} -> **After:** ${value.after}`;
        })
        .join("\n");

      // Log the changes
      await log({
        title: "Hacker Updated",
        message: `Blade profile for ${hacker.firstName} ${hacker.lastName} has been updated.
            \n**Changes:**\n${changesString}`,
        color: "tk_blue",
        userId: ctx.session.user.discordUserId,
      });
    }),

  updateHackerStatus: adminProcedure
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
  deleteHacker: adminProcedure
    .input(
      InsertHackerSchema.pick({
        id: true,
        firstName: true,
        lastName: true,
      }).extend({
        hackathonName: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!input.id) {
        throw new TRPCError({
          message: "Hacker ID is required to delete a member!",
          code: "BAD_REQUEST",
        });
      }

      await db.delete(Hacker).where(eq(Hacker.id, input.id));

      await log({
        title: `Hacker Deleted for ${input.hackathonName}`,
        message: `Profile for ${input.firstName} ${input.lastName} has been deleted.`,
        color: "uhoh_red",
        userId: ctx.session.user.discordUserId,
      });

      if (ctx.session.user.id) {
        await db.delete(Session).where(eq(Session.userId, ctx.session.user.id));
      }
    }),

  confirmHacker: protectedProcedure
    .input(
      z.object({
        id: z.string(), // This is the hacker ID
      }),
    )
    .mutation(async ({ input }) => {
      if (!input.id) {
        throw new TRPCError({
          message: "Hacker ID is required to update a member!",
          code: "BAD_REQUEST",
        });
      }

      const hackerId = input.id;

      const hacker = await db.query.Hacker.findFirst({
        where: (t, { eq }) => eq(t.id, hackerId),
      });

      if (!hacker) {
        throw new TRPCError({
          message: "Hacker not found!",
          code: "NOT_FOUND",
        });
      }

      // Find the FUTURE hackathon with a start date CLOSEST to now (same logic as getHacker)
      const now = new Date();
      const futureHackathons = await db.query.Hackathon.findMany({
        where: (t, { gt }) => gt(t.startDate, now),
        orderBy: (t, { asc }) => [asc(t.startDate)],
        limit: 1,
      });
      const hackathon = futureHackathons[0];

      if (!hackathon) {
        throw new TRPCError({
          message: "No upcoming hackathon found!",
          code: "NOT_FOUND",
        });
      }

      // Get the current status from HackerAttendee
      const hackerAttendee = await db.query.HackerAttendee.findFirst({
        where: (t, { and, eq }) =>
          and(eq(t.hackerId, hackerId), eq(t.hackathonId, hackathon.id)),
      });

      if (!hackerAttendee) {
        throw new TRPCError({
          message: "Hacker is not registered for this hackathon!",
          code: "NOT_FOUND",
        });
      }

      if (hackerAttendee.status === "confirmed") {
        throw new TRPCError({
          message: "Hacker has already been confirmed!",
          code: "UNAUTHORIZED",
        });
      } else if (hackerAttendee.status !== "accepted") {
        throw new TRPCError({
          message: "Hacker has not been accepted!",
          code: "UNAUTHORIZED",
        });
      }

      await db
        .update(HackerAttendee)
        .set({
          status: "confirmed",
          timeConfirmed: new Date(),
        })
        .where(
          and(
            eq(HackerAttendee.hackerId, hackerId),
            eq(HackerAttendee.hackathonId, hackathon.id),
          ),
        );

      await log({
        title: "Hacker Confirmed",
        message: `${hacker.firstName} ${hacker.lastName} has confirmed their attendance!`,
        color: "success_green",
        userId: hacker.userId,
      });
    }),

  withdrawHacker: protectedProcedure
    .input(
      z.object({
        id: z.string(), // This is the hacker ID
      }),
    )
    .mutation(async ({ input }) => {
      if (!input.id) {
        throw new TRPCError({
          message: "Hacker ID is required to update a member!",
          code: "BAD_REQUEST",
        });
      }

      const hackerId = input.id;

      const hacker = await db.query.Hacker.findFirst({
        where: (t, { eq }) => eq(t.id, hackerId),
      });

      if (!hacker) {
        throw new TRPCError({
          message: "Hacker not found!",
          code: "NOT_FOUND",
        });
      }

      // Find the FUTURE hackathon with a start date CLOSEST to now (same logic as getHacker)
      const now = new Date();
      const futureHackathons = await db.query.Hackathon.findMany({
        where: (t, { gt }) => gt(t.startDate, now),
        orderBy: (t, { asc }) => [asc(t.startDate)],
        limit: 1,
      });
      const hackathon = futureHackathons[0];

      if (!hackathon) {
        throw new TRPCError({
          message: "No upcoming hackathon found!",
          code: "NOT_FOUND",
        });
      }

      // Get the current status from HackerAttendee
      const hackerAttendee = await db.query.HackerAttendee.findFirst({
        where: (t, { and, eq }) =>
          and(eq(t.hackerId, hackerId), eq(t.hackathonId, hackathon.id)),
      });

      if (!hackerAttendee) {
        throw new TRPCError({
          message: "Hacker is not registered for this hackathon!",
          code: "NOT_FOUND",
        });
      }

      if (hackerAttendee.status !== "confirmed") {
        throw new TRPCError({
          message: "Hacker is not confirmed!",
          code: "UNAUTHORIZED",
        });
      }

      await db
        .update(HackerAttendee)
        .set({
          status: "withdrawn",
          timeConfirmed: undefined,
        })
        .where(
          and(
            eq(HackerAttendee.hackerId, hackerId),
            eq(HackerAttendee.hackathonId, hackathon.id),
          ),
        );
    }),
  statusCountByHackathonId: adminProcedure
    .input(z.string())
    .query(async ({ input: hackathonId }) => {
      const results = await Promise.all(
        HACKATHON_APPLICATION_STATES.map(async (s) => {
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
        (typeof HACKATHON_APPLICATION_STATES)[number],
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
        // Remove from original status count
        if (counts[originalStatus] && counts[originalStatus] > 0) {
          counts[originalStatus] = counts[originalStatus] - 1;
        }
        // Add to denied count
        counts.denied = counts.denied + 1;
      }

      return counts;
    }),

  eventCheckIn: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        eventId: z.string().uuid(),
        eventPoints: z.number(),
        hackathonId: z.string().uuid(),
        assignedClassCheckin: AssignedClassCheckinSchema,
        repeatedCheckin: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const hacker = await db.query.Hacker.findFirst({
        where: (t, { eq }) => eq(t.userId, input.userId),
      });
      if (!hacker)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Hacker with User ID ${input.userId} not found.`,
        });

      const event = await db.query.Event.findFirst({
        where: eq(Event.id, input.eventId),
      });
      
      if (!event)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Event with ID ${input.eventId} not found.`,
        });
      if (!event.hackathonId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: `Event with ID ${input.eventId} is not a hackathon event.`,
        });
      }
      const eventTag = event.tag;
      const hackerAttendee = await db.query.HackerAttendee.findFirst({
        where: (t, { and, eq }) =>
          and(
            eq(t.hackerId, hacker.id),
            eq(t.hackathonId, event.hackathonId ?? ""),
          ),
      });

      if (!hackerAttendee) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `${hacker.firstName} ${hacker.lastName} is not registered for this hackathon`,
        });
      }

      let assignedClass: HackerClass | null = hackerAttendee.class ?? null;

      if (
        hackerAttendee.status !== "confirmed" &&
        hackerAttendee.status !== "checkedin"
      ) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `${hacker.firstName} ${hacker.lastName} has not confirmed for this hackathon`,
        });
      }
      if (eventTag !== "Check-in" && hackerAttendee.status !== "checkedin") {
        throw new TRPCError({
          code: "CONFLICT",
          message: `${hacker.firstName} ${hacker.lastName} has not checked in for this hackathon`,
        });
      }
      const discordId = await resolveDiscordUserId(hacker.discordUser);
      const isVIP = discordId ? await isDiscordVIP(discordId) : false;

      if (hackerAttendee.status === "confirmed" && eventTag === "Check-in") {
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

          let pick: HackerClass;
          if (isVIP) {
            pick = "VIP";
          } else {
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

            pick =
              candidates[Math.floor(Math.random() * candidates.length)] ??
              HACKER_CLASSES[0];
          }
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
            console.log(
              `Assigned role ${KH_EVENT_ROLE_ID} to user ${discordId}`,
            );
            // VIP will already be given the discord role ahead of time, so no need to assign again
            if (assignedClass && !isVIP) {
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
          message: `${hacker.firstName} ${hacker.lastName} has been checked in to Hackathon ${
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
          color: "text-[#4ade80]",
          messageforHackers: "Check ID, and send them to correct lanyard area",
          status: "success",
        };
      }
      if (
        input.assignedClassCheckin !== "All" &&
        hackerAttendee.class !== input.assignedClassCheckin &&
        !isVIP
      ) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: `Only ${input.assignedClassCheckin} hackers can check in. Hacker has class ${hackerAttendee.class}.`,
        });
      }
      const duplicates = await db
        .select({ id: HackerEventAttendee.id })
        .from(HackerEventAttendee)
        .where(
          and(
            eq(HackerEventAttendee.hackerAttId, hackerAttendee.id),
            eq(HackerEventAttendee.eventId, input.eventId),
          ),
        );
      if (duplicates.length > 0 && !input.repeatedCheckin)
        throw new TRPCError({
          code: "CONFLICT",
          message: `${hacker.firstName} ${hacker.lastName} is already checked in for the event.`,
        });
      await db.insert(HackerEventAttendee).values({
        hackerAttId: hackerAttendee.id,
        eventId: input.eventId,
        hackathonId: event.hackathonId,
      });
      await db
        .update(HackerAttendee)
        .set({ points: sql`${HackerAttendee.points} + ${input.eventPoints}` })
        .where(eq(HackerAttendee.id, hackerAttendee.id));
      await log({
        title: "Hacker Checked-In",
        message: `Hacker ${hacker.firstName} ${hacker.lastName} has been checked in to event ${eventTag}.`,
        color: "success_green",
        userId: ctx.session.user.discordUserId,
      });
      return {
        message: `Hacker ${hacker.firstName} ${hacker.lastName} has been checked in to this event!`,
        firstName: hacker.firstName,
        lastName: hacker.lastName,
        class: assignedClass,
        color: "text-[#4ade80]",
        messageforHackers: "Check their badge and send them to event area",
        fastPass: isVIP,
        eventName: eventTag,
      };
    }),
} satisfies TRPCRouterRecord;
