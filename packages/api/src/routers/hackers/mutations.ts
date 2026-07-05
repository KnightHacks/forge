import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { HACKATHONS } from "@forge/consts";
import { and, eq, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { Session } from "@forge/db/schemas/auth";
import {
  Event,
  Hacker,
  HackerAttendee,
  HackerEventAttendee,
  InsertHackerSchema,
} from "@forge/db/schemas/knight-hacks";
import { sendHackathonEmail } from "@forge/email";
import { logger, permissions } from "@forge/utils";
import * as discord from "@forge/utils/discord";
import { hackerApplicationWireSchema } from "@forge/validators";

import { ensureUserQRCode } from "../../qr-code";
import {
  normalizeResumeObjectNameForPersistence,
  removeUnreferencedResumeObjectsForUser,
} from "../../resume-storage";
import { permProcedure, protectedProcedure } from "../../trpc";

export const hackerMutationRouter = {
  createHacker: protectedProcedure
    .input(hackerApplicationWireSchema.extend({ hackathonName: z.string() }))
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

      const now = new Date();

      if (now < hackathon.applicationOpen) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Applications are not open for this hackathon yet.",
        });
      }

      if (now > hackathon.applicationDeadline) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Applications are closed for this hackathon.",
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
        throw new TRPCError({
          code: "CONFLICT",
          message: "You already submitted an application for this hackathon.",
        });
      }

      try {
        const existingHackerProfile = await db
          .select({ id: Hacker.id })
          .from(Hacker)
          .where(eq(Hacker.userId, userId));

        if (existingHackerProfile.length === 0) {
          await ensureUserQRCode(userId);
        }
      } catch (error) {
        logger.warn("Error with generating QR code: ", error);
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
      const resumeUrl = await normalizeResumeObjectNameForPersistence(
        hackerData.resumeUrl,
        userId,
      );

      await db.transaction(async (tx) => {
        const [insertedHacker] = await tx
          .insert(Hacker)
          .values({
            ...hackerData,
            discordUser: ctx.session.user.name,
            userId,
            age: newAge,
            resumeUrl,
            phoneNumber:
              hackerData.phoneNumber === "" ? "" : hackerData.phoneNumber,
          })
          .returning({ id: Hacker.id });

        if (!insertedHacker) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create hacker.",
          });
        }

        await tx.insert(HackerAttendee).values({
          hackerId: insertedHacker.id,
          hackathonId: hackathon.id,
          status: "pending",
        });
      });

      await removeUnreferencedResumeObjectsForUser(userId);

      try {
        await sendHackathonEmail({
          from: "donotreply@knighthacks.org",
          hackathon: {
            applicationBackgroundKey: hackathon.applicationBackgroundKey,
            displayName: hackathon.displayName,
            emailTemplateKey: hackathon.emailTemplateEnabled
              ? hackathon.emailTemplateKey
              : null,
            routeName: hackathon.name,
            theme: hackathon.theme,
          },
          kind: "Apply",
          recipient: {
            name: hackerData.firstName,
            to: hackerData.email,
          },
        });
      } catch (error) {
        logger.warn("Failed to send hackathon application email:", error);
      }

      try {
        await discord.log({
          title: `Hacker Created for ${hackathon.displayName}`,
          message: `${hackerData.firstName} ${hackerData.lastName} has signed up for the upcoming hackathon: ${hackathon.name.toUpperCase()}!`,
          color: "tk_blue",
          userId: ctx.session.user.discordUserId,
        });
      } catch (error) {
        logger.warn("Failed to log hackathon application to Discord:", error);
      }
    }),

  updateHacker: permProcedure
    .input(
      InsertHackerSchema.omit({
        userId: true,
        age: true,
        discordUser: true,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      permissions.controlPerms.or(["EDIT_HACKERS"], ctx);

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

      const normalizedPhone = phoneNumber === "" ? "" : phoneNumber;

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
      const isResumeChanged =
        updateData.resumeUrl !== undefined &&
        updateData.resumeUrl !== hacker.resumeUrl;
      const resumeUrl =
        updateData.resumeUrl === undefined ||
        updateData.resumeUrl === hacker.resumeUrl
          ? undefined
          : await normalizeResumeObjectNameForPersistence(
              updateData.resumeUrl,
              hacker.userId,
            );

      await db
        .update(Hacker)
        .set({
          ...updateData,
          resumeUrl,
          dob: dob,
          age: newAge,
          phoneNumber: normalizedPhone,
        })
        .where(eq(Hacker.id, id));
      if (isResumeChanged) {
        await removeUnreferencedResumeObjectsForUser(hacker.userId);
      }

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

      if (hacker.phoneNumber !== normalizedPhone) {
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

      const hacker = await db.query.Hacker.findFirst({
        columns: { userId: true },
        where: (table, { eq }) => eq(table.id, input.id ?? ""),
      });

      await db.delete(Hacker).where(eq(Hacker.id, input.id));

      await discord.log({
        title: `Hacker Deleted for ${input.hackathonName}`,
        message: `Profile for ${input.firstName} ${input.lastName} has been deleted.`,
        color: "uhoh_red",
        userId: ctx.session.user.discordUserId,
      });

      if (hacker?.userId) {
        await db.delete(Session).where(eq(Session.userId, hacker.userId));
      }
    }),

  confirmHacker: protectedProcedure
    .input(
      z.object({
        id: z.string(), // This is the hacker ID
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!input.id) {
        throw new TRPCError({
          message: "Hacker ID is required to update a member!",
          code: "BAD_REQUEST",
        });
      }

      const hackerId = input.id;

      const hacker = await db.query.Hacker.findFirst({
        where: (t, { and, eq }) =>
          and(eq(t.id, hackerId), eq(t.userId, ctx.session.user.id)),
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

      try {
        await sendHackathonEmail({
          from: "donotreply@knighthacks.org",
          hackathon: {
            applicationBackgroundKey: hackathon.applicationBackgroundKey,
            displayName: hackathon.displayName,
            emailTemplateKey: hackathon.emailTemplateEnabled
              ? hackathon.emailTemplateKey
              : null,
            routeName: hackathon.name,
            theme: hackathon.theme,
          },
          kind: "Confirmation",
          recipient: {
            name: hacker.firstName,
            to: hacker.email,
          },
        });
      } catch (error) {
        logger.warn("Failed to send hackathon confirmation email:", error);
      }

      try {
        await discord.log({
          title: "Hacker Confirmed",
          message: `${hacker.firstName} ${hacker.lastName} has confirmed their attendance!`,
          color: "success_green",
          userId: ctx.session.user.discordUserId,
        });
      } catch (error) {
        logger.warn("Failed to log hacker confirmation to Discord:", error);
      }
    }),

  withdrawHacker: protectedProcedure
    .input(
      z.object({
        id: z.string(), // This is the hacker ID
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!input.id) {
        throw new TRPCError({
          message: "Hacker ID is required to update a member!",
          code: "BAD_REQUEST",
        });
      }

      const hackerId = input.id;

      const hacker = await db.query.Hacker.findFirst({
        where: (t, { and, eq }) =>
          and(eq(t.id, hackerId), eq(t.userId, ctx.session.user.id)),
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
          timeConfirmed: null,
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
      const hackathonId = event.hackathonId;
      if (!hackathonId) {
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
          points: HackerAttendee.points,
          hackerAttendeeId: HackerAttendee.id,
        })
        .from(Hacker)
        .innerJoin(HackerAttendee, eq(HackerAttendee.hackerId, Hacker.id))
        .where(
          and(
            eq(Hacker.userId, input.userId),
            eq(HackerAttendee.hackathonId, hackathonId),
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
        points: result.points,
        hackathonId,
        hackerId: hacker.id,
      };

      const eventTag = event.tag;

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
        const hackathon = await db.query.Hackathon.findFirst({
          columns: { name: true },
          where: (t, { eq }) => eq(t.id, hackathonId),
        });

        if (!hackathon) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Hackathon with ID ${hackathonId} not found.`,
          });
        }

        await db
          .update(HackerAttendee)
          .set({ status: "checkedin" })
          .where(eq(HackerAttendee.id, hackerAttendee.id));

        if (hackathon.name === HACKATHONS.BLOOMKNIGHTS.HACKATHON_NAME) {
          try {
            const discordId = await discord.resolveDiscordUserId(
              hacker.discordUser,
            );

            if (!discordId) {
              try {
                await discord.log({
                  title: "Discord role assign skipped",
                  message: `Could not resolve Discord ID for "${hacker.discordUser}".`,
                  color: "uhoh_red",
                  userId: ctx.session.user.discordUserId,
                });
              } catch (logError) {
                logger.error(
                  "Failed to log skipped BloomKnights role assignment:",
                  logError instanceof Error
                    ? logError.message
                    : "Unknown error",
                );
              }
            } else {
              await discord.addRoleToMember(
                discordId,
                HACKATHONS.BLOOMKNIGHTS.EVENT_ROLE_ID,
              );
              logger.log(
                `Assigned role ${HACKATHONS.BLOOMKNIGHTS.EVENT_ROLE_ID} to user ${discordId}`,
              );
            }
          } catch (e) {
            logger.error(
              "Failed to assign the BloomKnights role:",
              e instanceof Error ? e.message : "Unknown error",
            );
            try {
              await discord.log({
                title: "Discord role assign failed",
                message: `Failed to assign the BloomKnights role for "${hacker.discordUser}".`,
                color: "uhoh_red",
                userId: ctx.session.user.discordUserId,
              });
            } catch (logError) {
              logger.error(
                "Failed to log BloomKnights role assignment failure:",
                logError instanceof Error ? logError.message : "Unknown error",
              );
            }
          }
        }
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
          messageforHackers:
            "[ERROR]\nThe hacker has already checked into this event.",
          eventName: eventTag,
        };
      await db.insert(HackerEventAttendee).values({
        hackerAttId: hackerAttendee.id,
        eventId: input.eventId,
        hackathonId,
      });
      await db
        .update(HackerAttendee)
        .set({ points: sql`${HackerAttendee.points} + ${input.eventPoints}` })
        .where(eq(HackerAttendee.id, hackerAttendee.id));

      if (eventTag === "Check-in") {
        await discord.log({
          title: `Hacker Checked-In`,
          message: `${hacker.firstName} ${hacker.lastName} has been checked in to the hackathon.`,
          color: "success_green",
          userId: ctx.session.user.discordUserId,
        });
        return {
          message: `${hacker.firstName} ${hacker.lastName} has been checked in to this hackathon!`,
          firstName: hacker.firstName,
          lastName: hacker.lastName,
          messageforHackers: "Check their ID and give them their badge.",
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

      try {
        await discord.log({
          title: `Hacker Status Updated ${hackathon.displayName ? `for ${hackathon.displayName}` : ""}`,
          message: `Hacker status for ${hacker.firstName} ${hacker.lastName} has changed to ${input.status}!`,
          color: "tk_blue",
          userId: ctx.session.user.discordUserId,
        });
      } catch (error) {
        logger.warn("Failed to log hacker status update to Discord:", error);
      }
    }),
};
