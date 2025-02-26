import type { TRPCRouterRecord } from "@trpc/server";
import type { APIExternalGuildScheduledEvent } from "discord-api-types/v10";
import type { calendar_v3 } from "googleapis";
import { TRPCError } from "@trpc/server";
import { Routes } from "discord-api-types/v10";
import { z } from "zod";

import {
  CALENDAR_TIME_ZONE,
  DEV_GOOGLE_CALENDAR_ID,
  DEV_KNIGHTHACKS_GUILD_ID,
  DISCORD_EVENT_PRIVACY_LEVEL,
  DISCORD_EVENT_TYPE,
  EVENT_POINTS,
  PROD_GOOGLE_CALENDAR_ID,
  PROD_KNIGHTHACKS_GUILD_ID,
} from "@forge/consts/knight-hacks";
import { count, desc, eq, getTableColumns } from "@forge/db";
import { db } from "@forge/db/client";
import {
  Event,
  EventAttendee,
  InsertEventSchema,
  Member,
} from "@forge/db/schemas/knight-hacks";

import { env } from "../env";
import { adminProcedure, publicProcedure } from "../trpc";
import { calendar, discord, log } from "../utils";

const GOOGLE_CALENDAR_ID =
  env.NODE_ENV === "production"
    ? (PROD_GOOGLE_CALENDAR_ID as string)
    : (DEV_GOOGLE_CALENDAR_ID as string);
const KNIGHTHACKS_GUILD_ID =
  env.NODE_ENV === "production"
    ? (PROD_KNIGHTHACKS_GUILD_ID as string)
    : (DEV_KNIGHTHACKS_GUILD_ID as string);

export const eventRouter = {
  getEvents: publicProcedure.query(async () => {
    const events = await db
      .select({
        ...getTableColumns(Event),
        numAttended: count(EventAttendee.id),
      })
      .from(Event)
      .leftJoin(EventAttendee, eq(Event.id, EventAttendee.eventId))
      .groupBy(Event.id)
      .orderBy(desc(Event.start_datetime));
    return events;
  }),
  getAttendees: adminProcedure.input(z.string()).query(async ({ input }) => {
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
  createEvent: adminProcedure
    .input(
      InsertEventSchema.omit({ id: true, discordId: true, googleId: true }),
    )
    .mutation(async ({ input, ctx }) => {
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

      // Step 1: Create the event in Discord
      let discordEventId: string | undefined;
      try {
        const response = (await discord.post(
          Routes.guildScheduledEvents(KNIGHTHACKS_GUILD_ID),
          {
            body: {
              description: input.description,
              name: formattedName,
              privacy_level: DISCORD_EVENT_PRIVACY_LEVEL,
              scheduled_start_time: startLocalIso, // Use ISO for Discord
              scheduled_end_time: endLocalIso, // Use ISO for Discord
              entity_type: DISCORD_EVENT_TYPE,
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
          calendarId: GOOGLE_CALENDAR_ID,
          requestBody: {
            end: {
              dateTime: endLocalIso, // ISO for Google Calendar
              timeZone: CALENDAR_TIME_ZONE,
            },
            start: {
              dateTime: startLocalIso, // ISO for Google Calendar
              timeZone: CALENDAR_TIME_ZONE,
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
              Routes.guildScheduledEvent(KNIGHTHACKS_GUILD_ID, discordEventId),
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
          points: EVENT_POINTS[input.tag] || 0,
          discordId: discordEventId,
          googleId: googleEventId,
        });
      } catch (error) {
        console.error(JSON.stringify(error, null, 2));

        // Clean up the event in Discord if the database insert fails
        try {
          await discord.delete(
            Routes.guildScheduledEvent(KNIGHTHACKS_GUILD_ID, discordEventId),
          );
        } catch (cleanupErr) {
          console.error(JSON.stringify(cleanupErr, null, 2));
        }

        // Clean up the event in Google Calendar if the database insert fails
        try {
          await calendar.events.delete({
            calendarId: GOOGLE_CALENDAR_ID,
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

  updateEvent: adminProcedure
    .input(InsertEventSchema)
    .mutation(async ({ input, ctx }) => {
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

      // Step 1: Update the event in Discord
      try {
        await discord.patch(
          Routes.guildScheduledEvent(KNIGHTHACKS_GUILD_ID, input.discordId),
          {
            body: {
              description: input.description,
              name: formattedName,
              privacy_level: DISCORD_EVENT_PRIVACY_LEVEL,
              scheduled_start_time: startLocalIso,
              scheduled_end_time: endLocalIso,
              entity_type: DISCORD_EVENT_TYPE,
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
          calendarId: GOOGLE_CALENDAR_ID,
          eventId: input.googleId,
          requestBody: {
            end: {
              dateTime: endLocalIso,
              timeZone: CALENDAR_TIME_ZONE,
            },
            start: {
              dateTime: startLocalIso,
              timeZone: CALENDAR_TIME_ZONE,
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
        })
        .where(eq(Event.id, input.id));
    }),
  deleteEvent: adminProcedure
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
      if (!input.id) {
        throw new TRPCError({
          message: "Event ID is required to delete an Event.",
          code: "BAD_REQUEST",
        });
      }

      // Step 1: Delete the event in Discord
      try {
        await discord.delete(
          Routes.guildScheduledEvent(KNIGHTHACKS_GUILD_ID, input.discordId),
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
          calendarId: GOOGLE_CALENDAR_ID,
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
} satisfies TRPCRouterRecord;
