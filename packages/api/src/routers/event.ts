import type { TRPCRouterRecord } from "@trpc/server";
import type { APIExternalGuildScheduledEvent } from "discord-api-types/v10";
import type { calendar_v3 } from "googleapis";
import { TRPCError } from "@trpc/server";
import { Routes } from "discord-api-types/v10";
import { z } from "zod";

import { DISCORD, EVENTS } from "@forge/consts";
import { count, desc, eq, getTableColumns } from "@forge/db";
import { db } from "@forge/db/client";
import {
  Event,
  EventAttendee,
  Hacker,
  HackerAttendee,
  HackerEventAttendee,
  InsertEventSchema,
  Member,
} from "@forge/db/schemas/knight-hacks";

import { permProcedure, protectedProcedure, publicProcedure } from "../trpc";
import { calendar, controlPerms, createForm, discord, log } from "../utils";

export const eventRouter = {
  getEvents: publicProcedure.query(async () => {
    const events = await db
      .select({
        ...getTableColumns(Event),
        numAttended: count(EventAttendee.id),
        numHackerAttended: count(HackerEventAttendee.id),
      })
      .from(Event)
      .leftJoin(EventAttendee, eq(Event.id, EventAttendee.eventId))
      .leftJoin(HackerEventAttendee, eq(Event.id, HackerEventAttendee.eventId))
      .groupBy(Event.id)
      .orderBy(desc(Event.start_datetime));
    return events;
  }),
  getAttendees: permProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      controlPerms.or(["READ_CLUB_EVENT"], ctx);

      const attendees = await db
        .select({
          ...getTableColumns(Member),
        })
        .from(Event)
        .innerJoin(EventAttendee, eq(Event.id, EventAttendee.eventId))
        .innerJoin(Member, eq(EventAttendee.memberId, Member.id))
        .where(eq(Event.id, input))
        .orderBy(Member.firstName);
      return attendees;
    }),
  getHackerAttendees: permProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      controlPerms.or(["READ_HACK_EVENT"], ctx);

      const attendees = await db
        .select({
          ...getTableColumns(Hacker),
        })
        .from(Event)
        .innerJoin(
          HackerEventAttendee,
          eq(Event.id, HackerEventAttendee.eventId),
        )
        .innerJoin(
          HackerAttendee,
          eq(HackerEventAttendee.hackerAttId, HackerAttendee.id),
        )
        .innerJoin(Hacker, eq(Hacker.id, HackerAttendee.hackerId))
        .where(eq(Event.id, input))
        .orderBy(Hacker.firstName);
      return attendees;
    }),
  createEvent: permProcedure
    .input(
      InsertEventSchema.omit({ id: true, discordId: true, googleId: true }),
    )
    .mutation(async ({ input, ctx }) => {
      controlPerms.or(["EDIT_CLUB_EVENT", "EDIT_HACK_EVENT"], ctx);

      // Step 0: Convert provided start/end datetimes into Local Date objects
      const startDatetime = new Date(input.start_datetime);
      const endDatetime = new Date(input.end_datetime);

      // Construct local Date objects (year, month, date, hour, minute) to avoid UTC shifting
      const startLocalDate = new Date(
        startDatetime.getFullYear(),
        startDatetime.getMonth(),
        startDatetime.getDate(),
        startDatetime.getHours(),
        startDatetime.getMinutes(),
      );
      const endLocalDate = new Date(
        endDatetime.getFullYear(),
        endDatetime.getMonth(),
        endDatetime.getDate(),
        endDatetime.getHours(),
        endDatetime.getMinutes(),
      );

      // Convert these local Date objects to ISO strings for Discord & Google Calendar
      const startLocalIso = startLocalDate.toISOString();
      const endLocalIso = endLocalDate.toISOString();

      const formattedName =
        "[" + input.tag.toUpperCase().replace(" ", "-") + "] " + input.name;

      const hackDesc = input.hackathonName
        ? `### ⚔️ ${input.hackathonName} ⚔️\n\n`
        : "";

      const pointDesc = `\n\n**⭐ ${EVENTS.EVENT_POINTS[input.tag] || 0} Points**`;

      // Step 1: Create the event in Discord
      let discordEventId: string | undefined;
      try {
        const response = (await discord.post(
          Routes.guildScheduledEvents(DISCORD.KNIGHTHACKS_GUILD),
          {
            body: {
              description: hackDesc + input.description + pointDesc,
              name: formattedName,
              privacy_level: DISCORD.EVENT_PRIVACY_LEVEL,
              scheduled_start_time: startLocalIso, // Use ISO for Discord
              scheduled_end_time: endLocalIso, // Use ISO for Discord
              entity_type: DISCORD.EVENT_TYPE,
              entity_metadata: {
                location: input.location,
              },
            },
          },
        )) as APIExternalGuildScheduledEvent;
        discordEventId = response.id;
      } catch (error) {
        console.error(JSON.stringify(error, null, 2));
        throw new TRPCError({
          message: "Failed to create event in Discord",
          code: "BAD_REQUEST",
        });
      }

      // Step 2: Insert the event into the Google Calendar
      let googleEventId: string | undefined;
      try {
        const response = await calendar.events.insert({
          calendarId: EVENTS.GOOGLE_CALENDAR_ID,
          requestBody: {
            end: {
              dateTime: endLocalIso, // ISO for Google Calendar
              timeZone: EVENTS.CALENDAR_TIME_ZONE,
            },
            start: {
              dateTime: startLocalIso, // ISO for Google Calendar
              timeZone: EVENTS.CALENDAR_TIME_ZONE,
            },
            description: input.description,
            summary: formattedName,
            location: input.location,
          },
        } as calendar_v3.Params$Resource$Events$Insert);
        googleEventId = response.data.id ?? undefined;
      } catch (error) {
        console.error("ERROR MESSAGE:", JSON.stringify(error, null, 2));

        // Clean up the event in Discord if the Google Calendar event fails
        if (discordEventId) {
          try {
            await discord.delete(
              Routes.guildScheduledEvent(
                DISCORD.KNIGHTHACKS_GUILD,
                discordEventId,
              ),
            );
          } catch (cleanupErr) {
            console.error(JSON.stringify(cleanupErr, null, 2));
          }
        }

        throw new TRPCError({
          message: "Failed to create event in Google Calendar",
          code: "BAD_REQUEST",
        });
      }

      // Step 3: Insert the event into the database (using Date objects for timestamp columns)
      if (!discordEventId) {
        throw new TRPCError({
          message: "Failed to create event in Discord",
          code: "BAD_REQUEST",
        });
      }
      if (!googleEventId) {
        throw new TRPCError({
          message: "Failed to create event in Google Calendar (no google ID)",
          code: "BAD_REQUEST",
        });
      }

      try {
        // Step 3: Update the event in the database using Date objects
        const dayBeforeStart = new Date(startLocalDate);
        dayBeforeStart.setDate(dayBeforeStart.getDate() - 1);
        const dayBeforeEnd = new Date(endLocalDate);
        dayBeforeEnd.setDate(dayBeforeEnd.getDate() - 1);

        await db.insert(Event).values({
          ...input,
          start_datetime: dayBeforeStart,
          end_datetime: dayBeforeEnd,
          points: EVENTS.EVENT_POINTS[input.tag] || 0,
          discordId: discordEventId,
          googleId: googleEventId,
        });
      } catch (error) {
        console.error(JSON.stringify(error, null, 2));

        // Clean up the event in Discord if the database insert fails
        try {
          await discord.delete(
            Routes.guildScheduledEvent(
              DISCORD.KNIGHTHACKS_GUILD,
              discordEventId,
            ),
          );
        } catch (cleanupErr) {
          console.error(JSON.stringify(cleanupErr, null, 2));
        }

        // Clean up the event in Google Calendar if the database insert fails
        try {
          await calendar.events.delete({
            calendarId: EVENTS.GOOGLE_CALENDAR_ID,
            eventId: googleEventId,
          });
        } catch (cleanupErr) {
          console.error(JSON.stringify(cleanupErr, null, 2));
        }

        throw new TRPCError({
          message: "Failed to create event in the database",
          code: "BAD_REQUEST",
        });
      }

      // Step 4: Log the creation
      await log({
        title: "Event Created",
        message: `The event **${formattedName}** was created.`,
        color: "blade_purple",
        userId: ctx.session.user.discordUserId,
      });
    }),

  updateEvent: permProcedure
    .input(InsertEventSchema)
    .mutation(async ({ input, ctx }) => {
      controlPerms.or(["EDIT_CLUB_EVENT", "EDIT_HACK_EVENT"], ctx);

      if (!input.id) {
        throw new TRPCError({
          message: "Event ID is required to update an Event.",
          code: "BAD_REQUEST",
        });
      }

      const event = await db.query.Event.findFirst({
        where: (t, { eq }) => eq(t.id, input.id ?? ""),
      });

      if (!event) {
        throw new TRPCError({
          message: "Event not found.",
          code: "BAD_REQUEST",
        });
      }

      // Step 0: Convert provided start/end datetimes into Local Date objects
      const startDatetime = new Date(input.start_datetime);
      const endDatetime = new Date(input.end_datetime);

      const startLocalDate = new Date(
        startDatetime.getFullYear(),
        startDatetime.getMonth(),
        startDatetime.getDate(),
        startDatetime.getHours(),
        startDatetime.getMinutes(),
      );
      const endLocalDate = new Date(
        endDatetime.getFullYear(),
        endDatetime.getMonth(),
        endDatetime.getDate(),
        endDatetime.getHours(),
        endDatetime.getMinutes(),
      );

      // Convert to ISO for Discord & Google
      const startLocalIso = startLocalDate.toISOString();
      const endLocalIso = endLocalDate.toISOString();

      const formattedName =
        "[" + input.tag.toUpperCase().replace(" ", "-") + "] " + input.name;

      const hackDesc = input.hackathonName
        ? `### ⚔️ ${input.hackathonName} ⚔️\n\n`
        : "";

      const pointDesc = `\n\n**⭐ ${EVENTS.EVENT_POINTS[input.tag] || 0} Points**`;

      // Step 1: Update the event in Discord
      try {
        await discord.patch(
          Routes.guildScheduledEvent(
            DISCORD.KNIGHTHACKS_GUILD,
            input.discordId,
          ),
          {
            body: {
              description: hackDesc + input.description + pointDesc,
              name: formattedName,
              privacy_level: DISCORD.EVENT_PRIVACY_LEVEL,
              scheduled_start_time: startLocalIso,
              scheduled_end_time: endLocalIso,
              entity_type: DISCORD.EVENT_TYPE,
              entity_metadata: {
                location: input.location,
              },
            },
          },
        );
      } catch (error) {
        console.error(JSON.stringify(error, null, 2));
        throw new TRPCError({
          message: "Failed to update event in Discord",
          code: "BAD_REQUEST",
        });
      }

      // Step 2: Update the event in Google Calendar
      try {
        await calendar.events.update({
          calendarId: EVENTS.GOOGLE_CALENDAR_ID,
          eventId: input.googleId,
          requestBody: {
            end: {
              dateTime: endLocalIso,
              timeZone: EVENTS.CALENDAR_TIME_ZONE,
            },
            start: {
              dateTime: startLocalIso,
              timeZone: EVENTS.CALENDAR_TIME_ZONE,
            },
            description: input.description,
            summary: formattedName,
            location: input.location,
          },
        } as calendar_v3.Params$Resource$Events$Update);
      } catch (error) {
        console.error(JSON.stringify(error, null, 2));
        throw new TRPCError({
          message: "Failed to update event in Google Calendar",
          code: "BAD_REQUEST",
        });
      }

      // Create a record of changes for logging
      const updateData = { ...input };
      const changes = Object.keys(updateData).reduce(
        (acc, key) => {
          if (
            key !== "start_datetime" &&
            key !== "end_datetime" &&
            event[key as keyof typeof event] !==
              updateData[key as keyof typeof updateData]
          ) {
            acc[key] = {
              before: event[key as keyof typeof event],
              after: updateData[key as keyof typeof updateData],
            };
          }
          return acc;
        },
        {} as Record<
          string,
          {
            before: string | number | Date | boolean | null;
            after: string | number | Date | boolean | null | undefined;
          }
        >,
      );

      // Check if start_datetime / end_datetime changed
      if (String(event.start_datetime) !== String(input.start_datetime)) {
        changes.start_datetime = {
          before: event.start_datetime,
          after: input.start_datetime,
        };
      }
      if (String(event.end_datetime) !== String(input.end_datetime)) {
        changes.end_datetime = {
          before: event.end_datetime,
          after: input.end_datetime,
        };
      }

      // Format these changes into a string for logs
      const changesString = Object.entries(changes)
        .map(([key, value]) => {
          const before =
            value.before instanceof Date
              ? value.before.toLocaleString("en-US", {
                  dateStyle: "short",
                  timeStyle: "short",
                  hour12: true,
                })
              : String(value.before);
          const after =
            value.after instanceof Date
              ? value.after.toLocaleString("en-US", {
                  dateStyle: "short",
                  timeStyle: "short",
                  hour12: true,
                })
              : String(value.after);
          return `\n${key}\n **Before:** ${before} -> **After:** ${after}`;
        })
        .join("\n");

      const oldFormattedName = `[${event.tag.toUpperCase().replace(" ", "-")}] ${event.name}`;

      await log({
        title: "Event Updated",
        message: `Event **${oldFormattedName}** was updated.\n**Changes:**\n${changesString}`,
        color: "blade_purple",
        userId: ctx.session.user.discordUserId,
      });

      // Step 3: Update the event in the database using Date objects
      const dayBeforeStart = new Date(startLocalDate);
      dayBeforeStart.setDate(dayBeforeStart.getDate() - 1);
      const dayBeforeEnd = new Date(endLocalDate);
      dayBeforeEnd.setDate(dayBeforeEnd.getDate() - 1);

      await db
        .update(Event)
        .set({
          ...input,
          start_datetime: dayBeforeStart,
          end_datetime: dayBeforeEnd,
          points: input.hackathonId ? EVENTS.EVENT_POINTS[input.tag] || 0 : 0,
        })
        .where(eq(Event.id, input.id));
    }),
  deleteEvent: permProcedure
    .input(
      InsertEventSchema.pick({
        id: true,
        discordId: true,
        googleId: true,
        tag: true,
        name: true,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      controlPerms.or(["EDIT_CLUB_EVENT", "EDIT_HACK_EVENT"], ctx);

      if (!input.id) {
        throw new TRPCError({
          message: "Event ID is required to delete an Event.",
          code: "BAD_REQUEST",
        });
      }

      // Step 1: Delete the event in Discord
      try {
        await discord.delete(
          Routes.guildScheduledEvent(
            DISCORD.KNIGHTHACKS_GUILD,
            input.discordId,
          ),
        );
      } catch (error) {
        console.error(JSON.stringify(error, null, 2));
        throw new TRPCError({
          message: "Failed to delete event in Discord",
          code: "BAD_REQUEST",
        });
      }

      // Step 2: Delete the event in the Google Calendar
      try {
        await calendar.events.delete({
          calendarId: EVENTS.GOOGLE_CALENDAR_ID,
          eventId: input.googleId,
        } as calendar_v3.Params$Resource$Events$Delete);
      } catch (error) {
        console.error(JSON.stringify(error, null, 2));
        throw new TRPCError({
          message: "Failed to delete event in Google Calendar",
          code: "BAD_REQUEST",
        });
      }

      const formattedName = `[${input.tag.toUpperCase().replace(" ", "-")}] ${input.name}`;
      await log({
        title: "Event Deleted",
        message: `The event **${formattedName}** was deleted.`,
        color: "uhoh_red",
        userId: ctx.session.user.discordUserId,
      });

      // Step 3: Delete the event in the database
      await db.delete(Event).where(eq(Event.id, input.id));
    }),
  ensureForm: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
      }),
    )
    .mutation(async ({ input }) => {
      const event = await db.query.Event.findFirst({
        where: eq(Event.id, input.eventId),
      });

      if (!event)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Event with ID ${input.eventId} not found.`,
        });

      const formName = event.name + " Feedback Form";
      const formSlugName = formName.toLowerCase().replaceAll(" ", "-");

      const form = await db.query.FormsSchemas.findFirst({
        where: (t, { eq }) => eq(t.slugName, formSlugName),
      });

      if (form === undefined) {
        try {
          await createForm({
            formData: {
              name: formName,
              description: `Provide feedback for ${event.name} to help us make events better in the future!`,
              questions: [
                {
                  max: 10,
                  min: 0,
                  type: "LINEAR_SCALE",
                  order: 0,
                  optional: false,
                  question: "How would you rate the event overall?",
                },
                {
                  max: 10,
                  min: 0,
                  type: "LINEAR_SCALE",
                  order: 1,
                  optional: false,
                  question: "How much fun did you have?",
                },
                {
                  max: 10,
                  min: 0,
                  type: "LINEAR_SCALE",
                  order: 2,
                  optional: false,
                  question: "How much did you learn?",
                },
                {
                  type: "MULTIPLE_CHOICE",
                  order: 3,
                  options: [
                    "Discord",
                    "Instagram",
                    "Knightconnect",
                    "Word of Mouth",
                    "CECS Emailing List",
                    "Reddit",
                    "LinkedIn",
                    "Class Presentation",
                    "Another Club",
                  ],
                  optional: false,
                  question: "Where did you hear about us?",
                  allowOther: true,
                },
                {
                  type: "SHORT_ANSWER",
                  order: 4,
                  optional: true,
                  question:
                    "Do you have any additional feedback about this event?",
                },
              ],
            },
            allowEdit: false,
            allowResubmission: false,
            duesOnly: false,
            section: "Feedback",
          });
        } catch {
          throw new TRPCError({
            message: "Could not create form",
            code: "INTERNAL_SERVER_ERROR",
          });
        }
      }
    }),
} satisfies TRPCRouterRecord;
