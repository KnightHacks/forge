import { TRPCError } from "@trpc/server";
import QRCode from "qrcode";
import { z } from "zod";

import type { HackerClass } from "@forge/db/schemas/knight-hacks";
import { HACKATHONS, MINIO } from "@forge/consts";
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
import { logger, permissions } from "@forge/utils";
import * as discord from "@forge/utils/discord";

import { minioClient } from "../../minio/minio-client";
import { permProcedure, protectedProcedure } from "../../trpc";

export const hackerMutationRouter = {
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

      try {
        const existingHackerProfile = await db
          .select({ id: Hacker.id })
          .from(Hacker)
          .where(eq(Hacker.userId, userId));

        if (existingHackerProfile.length === 0) {
          const objectName = `qr-code-${userId}.png`;
          const bucketExists = await minioClient.bucketExists(
            MINIO.QR_BUCKET_NAME,
          );
          if (!bucketExists) {
            await minioClient.makeBucket(
              MINIO.QR_BUCKET_NAME,
              MINIO.BUCKET_REGION,
            );
          }
          const qrData = `user:${userId}`;
          const qrBuffer = await QRCode.toBuffer(qrData, { type: "png" });
          await minioClient.putObject(
            MINIO.QR_BUCKET_NAME,
            objectName,
            qrBuffer,
            qrBuffer.length,
            { "Content-Type": "image/png" },
          );
        }
      } catch (error) {
        logger.error("Error with generating QR code: ", error);
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
        discordUser: ctx.session.user.name,
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

      await discord.log({
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
      await discord.log({
        title: "Hacker Updated",
        message: `Blade profile for ${hacker.firstName} ${hacker.lastName} has been updated.
\n**Changes:**\n${changesString}`,
        color: "tk_blue",
        userId: ctx.session.user.discordUserId,
      });
    }),

  deleteHacker: permProcedure
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
      permissions.controlPerms.or(["EDIT_HACKERS"], ctx);

      if (!input.id) {
        throw new TRPCError({
          message: "Hacker ID is required to delete a member!",
          code: "BAD_REQUEST",
        });
      }

      await db.delete(Hacker).where(eq(Hacker.id, input.id));

      await discord.log({
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

      await discord.log({
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

  eventCheckIn: permProcedure
    .input(
      z.object({
        userId: z.string(),
        eventId: z.string().uuid(),
        eventPoints: z.number(),
        hackathonId: z.string().uuid(),
        assignedClassCheckin: z.string().superRefine((v, ctx) => {
          //Idk man leave me alone
          if (
            !(
              AssignedClassCheckinSchema.options as unknown as string[]
            ).includes(v)
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Invalid assignedClassCheckin",
            });
          }
        }),
        repeatedCheckin: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      permissions.controlPerms.or(["CHECKIN_HACK_EVENT", "EDIT_HACKERS"], ctx);

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

      // Find hacker with matching attendee
      const rows = await db
        .select({
          id: Hacker.id,
          userId: Hacker.userId,
          firstName: Hacker.firstName,
          lastName: Hacker.lastName,
          discordUser: Hacker.discordUser,
          status: HackerAttendee.status,
          class: HackerAttendee.class,
          points: HackerAttendee.points,
          hackerAttendeeId: HackerAttendee.id,
        })
        .from(Hacker)
        .innerJoin(HackerAttendee, eq(HackerAttendee.hackerId, Hacker.id))
        .where(
          and(
            eq(Hacker.userId, input.userId),
            eq(HackerAttendee.hackathonId, event.hackathonId),
          ),
        )
        .limit(1);

      const result = rows[0];

      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Hacker with User ID ${input.userId} not found or not registered for this hackathon.`,
        });
      }

      const hacker = result;
      const hackerAttendee = {
        id: result.hackerAttendeeId,
        status: result.status,
        class: result.class,
        points: result.points,
        hackathonId: event.hackathonId,
        hackerId: hacker.id,
      };

      const eventTag = event.tag;
      const discordId = await discord.resolveDiscordUserId(hacker.discordUser);
      const isVIP = discordId ? await discord.isDiscordVIP(discordId) : false;

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

      if (hackerAttendee.status === "confirmed" && eventTag === "Check-in") {
        await db.transaction(async (tx) => {
          // Use the already fetched hackerAttendee data instead of querying again
          if (hackerAttendee.class && hackerAttendee.class in HACKER_CLASSES) {
            assignedClass = hackerAttendee.class;
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

        if (!discordId) {
          await discord.log({
            title: "Discord role assign skipped",
            message: `Could not resolve Discord ID for "${hacker.discordUser}".`,
            color: "uhoh_red",
            userId: ctx.session.user.discordUserId,
          });
        } else {
          try {
            await discord.addRoleToMember(
              discordId,
              HACKATHONS.KNIGHT_HACKS_8.KH_EVENT_ROLE_ID,
            );
            logger.log(
              `Assigned role ${HACKATHONS.KNIGHT_HACKS_8.KH_EVENT_ROLE_ID} to user ${discordId}`,
            );
            // VIP will already be given the discord role ahead of time, so no need to assign again
            if (assignedClass) {
              await discord.addRoleToMember(
                discordId,
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                HACKATHONS.KNIGHT_HACKS_8.CLASS_ROLE_ID[
                  assignedClass as HACKATHONS.KNIGHT_HACKS_8.AssignableHackerClass
                ] ?? "",
              );
            }
          } catch (e) {
            await discord.log({
              title: "Discord role assign failed",
              message: `Failed to assign Discord roles for "${hacker.discordUser}".`,
              color: "uhoh_red",
              userId: ctx.session.user.discordUserId,
            });
            logger.error(
              "Failed to assign Discord roles:",
              (e as Error).message,
            );
          }
        }
      }
      if (
        input.assignedClassCheckin !== "All" &&
        hackerAttendee.class !== input.assignedClassCheckin &&
        !isVIP
      ) {
        return {
          message: `Hacker ${hacker.firstName} ${hacker.lastName} has already checked into this event!`,
          firstName: hacker.firstName,
          lastName: hacker.lastName,
          class: assignedClass,
          messageforHackers: `[ERROR]\nOnly ${input.assignedClassCheckin} hackers can check in. Hacker has class ${hackerAttendee.class}`,
          eventName: eventTag,
        };
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
        return {
          message: `Hacker ${hacker.firstName} ${hacker.lastName} has already checked into this event!`,
          firstName: hacker.firstName,
          lastName: hacker.lastName,
          class: assignedClass,
          messageforHackers:
            "[ERROR]\nThe hacker has already checked into this event.",
          eventName: eventTag,
        };
      await db.insert(HackerEventAttendee).values({
        hackerAttId: hackerAttendee.id,
        eventId: input.eventId,
        hackathonId: event.hackathonId,
      });
      await db
        .update(HackerAttendee)
        .set({ points: sql`${HackerAttendee.points} + ${input.eventPoints}` })
        .where(eq(HackerAttendee.id, hackerAttendee.id));

      if (eventTag === "Check-in") {
        await discord.log({
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
          messageforHackers: "Check ID, and send them to correct lanyard area",
          eventName: eventTag,
        };
      }
      await discord.log({
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
        messageforHackers: "Check their badge and send them to event area",
        eventName: eventTag,
      };
    }),
  giveHackerPoints: permProcedure
    .input(
      z.object({
        id: z.string(),
        hackathonName: z.string(),
        amount: z.number().int().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      permissions.controlPerms.or(["EDIT_HACKERS"], ctx);

      if (!input.id) {
        throw new TRPCError({
          message: "Hacker ID is required to give points!",
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
        .set({ points: sql`${HackerAttendee.points} + ${input.amount}` })
        .where(
          and(
            eq(HackerAttendee.hackerId, input.id),
            eq(HackerAttendee.hackathonId, hackathon.id),
          ),
        );

      await discord.log({
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
      permissions.controlPerms.or(["EDIT_HACKERS"], ctx);

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

      await discord.log({
        title: `Hacker Status Updated ${hackathon.displayName ? `for ${hackathon.displayName}` : ""}`,
        message: `Hacker status for ${hacker.firstName} ${hacker.lastName} has changed to ${input.status}!`,
        color: "tk_blue",
        userId: ctx.session.user.discordUserId,
      });
    }),
};
