import type { TRPCRouterRecord } from "@trpc/server";
import type { APIExternalGuildScheduledEvent } from "discord-api-types/v10";
import type { calendar_v3 } from "googleapis";
import { TRPCError } from "@trpc/server";
import { Routes } from "discord-api-types/v10";
import { z } from "zod";

import { DISCORD, EVENTS } from "@forge/consts";
import {
  and,
  count,
  desc,
  eq,
  getTableColumns,
  gt,
  inArray,
  isNull,
  lt,
} from "@forge/db";
import { db } from "@forge/db/client";
import {
  Event,
  EventAttendee,
  FormResponse,
  FormsSchemas,
  Hacker,
  HackerAttendee,
  HackerEventAttendee,
  InsertEventSchema,
  Member,
} from "@forge/db/schemas/knight-hacks";
import { logger, permissions } from "@forge/utils";
import * as discord from "@forge/utils/discord";
import * as forms from "@forge/utils/forms";
import * as google from "@forge/utils/google";

import { permProcedure, protectedProcedure, publicProcedure } from "../trpc";

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

    const formSlugs = events.map((e) =>
      (e.name + " Feedback Form").toLowerCase().replaceAll(" ", "-"),
    );

    const forms = await db
      .select()
      .from(FormsSchemas)
      .where(inArray(FormsSchemas.slugName, formSlugs));

    if (forms.length === 0) {
      return events.map((event) => ({
        ...event,
        averageRating: null,
        feedbackCount: 0,
        formSlug: null,
      }));
    }

    const responses = await db
      .select()
      .from(FormResponse)
      .where(
        inArray(
          FormResponse.form,
          forms.map((f) => f.id),
        ),
      );

    const formIdToSlug = new Map<string, string>();
    const formIdToEventName = new Map<string, string>();
    for (const f of forms) {
      const eventName = f.name.replace(" Feedback Form", "");
      formIdToSlug.set(f.id, f.slugName);
      formIdToEventName.set(f.id, eventName);
    }

    const eventRatings = new Map<
      string,
      { total: number; count: number; formSlug: string }
    >();

    for (const response of responses) {
      const eventName = formIdToEventName.get(response.form);
      if (!eventName) continue;

      const data = response.responseData as {
        "How would you rate the event overall?": number;
      };

      const rating = data["How would you rate the event overall?"];
      if (typeof rating !== "number") continue;

      const formSlug = formIdToSlug.get(response.form);
      if (!formSlug) continue;

      if (!eventRatings.has(eventName)) {
        eventRatings.set(eventName, { total: 0, count: 0, formSlug });
      }

      const current = eventRatings.get(eventName);
      if (current) {
        current.total += rating;
        current.count += 1;
      }
    }

    return events.map((event) => {
      const rating = eventRatings.get(event.name);
      return {
        ...event,
        averageRating: rating ? rating.total / rating.count : null,
        feedbackCount: rating?.count ?? 0,
        formSlug: rating?.formSlug ?? null,
      };
    });
  }),
  getAttendees: permProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      permissions.controlPerms.or(["READ_CLUB_EVENT"], ctx);

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
      permissions.controlPerms.or(["READ_HACK_EVENT"], ctx);

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
      InsertEventSchema.omit({
        id: true,
        discordId: true,
        googleId: true,
      }).extend({
        roles: z.array(z.string()).default([]),
        isOperationsCalendar: z.boolean().default(false),
        discordChannelId: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      permissions.controlPerms.or(["EDIT_CLUB_EVENT", "EDIT_HACK_EVENT"], ctx);

      if (input.isOperationsCalendar && !input.discordChannelId) {
        throw new TRPCError({
          message: "Discord Channel ID is required for internal events.",
          code: "BAD_REQUEST",
        });
      }

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

      const startLocalIso = startLocalDate.toISOString();
      const endLocalIso = endLocalDate.toISOString();

      const formattedName =
        "[" + input.tag.toUpperCase().replace(" ", "-") + "] " + input.name;

      const hackDesc = input.hackathonName
        ? `### ⚔️ ${input.hackathonName} ⚔️\n\n`
        : "";

      const pointDesc = `\n\n**⭐ ${EVENTS.EVENT_POINTS[input.tag] || 0} Points**`;

      const isInternalEvent = input.isOperationsCalendar;

      const finalDescription = isInternalEvent
        ? `${hackDesc}${input.description}\n\n📍 **Location:** ${input.location}${pointDesc}`
        : `${hackDesc}${input.description}${pointDesc}`;

      let discordEventId: string | undefined;
      try {
        const response = (await discord.api.post(
          Routes.guildScheduledEvents(DISCORD.KNIGHTHACKS_GUILD),
          {
            body: {
              description: finalDescription,
              name: formattedName,
              privacy_level: DISCORD.EVENT_PRIVACY_LEVEL,
              scheduled_start_time: startLocalIso,
              scheduled_end_time: endLocalIso,

              entity_type: isInternalEvent ? 2 : DISCORD.EVENT_TYPE,

              channel_id: isInternalEvent ? input.discordChannelId : undefined,

              entity_metadata: isInternalEvent
                ? undefined
                : {
                    location: input.location,
                  },
            },
          },
        )) as APIExternalGuildScheduledEvent;
        discordEventId = response.id;
      } catch (error) {
        logger.error(JSON.stringify(error, null, 2));
        throw new TRPCError({
          message: "Failed to create event in Discord",
          code: "BAD_REQUEST",
        });
      }

      let googleEventId: string | undefined;
      try {
        const response = await google.calendar.events.insert({
          calendarId: input.isOperationsCalendar
            ? EVENTS.DEV_GOOGLE_CALENDAR_ID
            : EVENTS.GOOGLE_CALENDAR_ID,
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
        } as calendar_v3.Params$Resource$Events$Insert);
        googleEventId = response.data.id ?? undefined;
      } catch (error) {
        logger.error("ERROR MESSAGE:", JSON.stringify(error, null, 2));

        if (discordEventId) {
          try {
            await discord.api.delete(
              Routes.guildScheduledEvent(
                DISCORD.KNIGHTHACKS_GUILD,
                discordEventId,
              ),
            );
          } catch (cleanupErr) {
            logger.error(JSON.stringify(cleanupErr, null, 2));
          }
        }

        throw new TRPCError({
          message: "Failed to create event in Google Calendar",
          code: "BAD_REQUEST",
        });
      }

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
        logger.error(JSON.stringify(error, null, 2));

        try {
          await discord.api.delete(
            Routes.guildScheduledEvent(
              DISCORD.KNIGHTHACKS_GUILD,
              discordEventId,
            ),
          );
        } catch (cleanupErr) {
          logger.error(JSON.stringify(cleanupErr, null, 2));
        }

        try {
          await google.calendar.events.delete({
            calendarId: input.isOperationsCalendar
              ? EVENTS.DEV_GOOGLE_CALENDAR_ID
              : EVENTS.GOOGLE_CALENDAR_ID,
            eventId: googleEventId,
          });
        } catch (cleanupErr) {
          logger.error(JSON.stringify(cleanupErr, null, 2));
        }

        throw new TRPCError({
          message: "Failed to create event in the database",
          code: "BAD_REQUEST",
        });
      }

      await discord.log({
        title: "Event Created",
        message: `The event **${formattedName}** was created.`,
        color: "blade_purple",
        userId: ctx.session.user.discordUserId,
      });
    }),

  updateEvent: permProcedure
    .input(
      InsertEventSchema.omit({
        discordId: true,
        googleId: true,
      }).extend({
        roles: z.array(z.string()).optional(),
        isOperationsCalendar: z.boolean().optional(),
        discordChannelId: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      permissions.controlPerms.or(["EDIT_CLUB_EVENT", "EDIT_HACK_EVENT"], ctx);

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

      const willBeInternal =
        input.isOperationsCalendar ?? event.isOperationsCalendar;
      const channelId = input.discordChannelId ?? event.discordChannelId;
      if (willBeInternal && !channelId) {
        throw new TRPCError({
          message: "Discord Channel ID is required for internal events.",
          code: "BAD_REQUEST",
        });
      }

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

      const startLocalIso = startLocalDate.toISOString();
      const endLocalIso = endLocalDate.toISOString();

      const formattedName =
        "[" + input.tag.toUpperCase().replace(" ", "-") + "] " + input.name;

      const hackDesc = input.hackathonName
        ? `### ⚔️ ${input.hackathonName} ⚔️\n\n`
        : "";

      const pointDesc = `\n\n**⭐ ${EVENTS.EVENT_POINTS[input.tag] || 0} Points**`;

      const isInternalEvent =
        input.isOperationsCalendar ?? event.isOperationsCalendar;

      const finalDescription = isInternalEvent
        ? `${hackDesc}${input.description}\n\n📍 **Location:** ${input.location}${pointDesc}`
        : `${hackDesc}${input.description}${pointDesc}`;

      const sourceCalendarId = event.isOperationsCalendar
        ? EVENTS.DEV_GOOGLE_CALENDAR_ID
        : EVENTS.GOOGLE_CALENDAR_ID;

      const targetCalendarId =
        (input.isOperationsCalendar ?? event.isOperationsCalendar)
          ? EVENTS.DEV_GOOGLE_CALENDAR_ID
          : EVENTS.GOOGLE_CALENDAR_ID;

      try {
        await discord.api.patch(
          Routes.guildScheduledEvent(
            DISCORD.KNIGHTHACKS_GUILD,
            event.discordId,
          ),
          {
            body: {
              description: finalDescription,
              name: formattedName,
              privacy_level: DISCORD.EVENT_PRIVACY_LEVEL,
              scheduled_start_time: startLocalIso,
              scheduled_end_time: endLocalIso,

              entity_type: isInternalEvent ? 2 : DISCORD.EVENT_TYPE,

              channel_id: isInternalEvent
                ? (input.discordChannelId ?? event.discordChannelId)
                : null,

              entity_metadata: isInternalEvent
                ? null
                : {
                    location: input.location,
                  },
            },
          },
        );
      } catch (error) {
        logger.error(JSON.stringify(error, null, 2));
        throw new TRPCError({
          message: "Failed to update event in Discord",
          code: "BAD_REQUEST",
        });
      }

      let newGoogleId = event.googleId;

      try {
        const calendarRequestBody = {
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
        };

        if (sourceCalendarId === targetCalendarId) {
          await google.calendar.events.update({
            calendarId: sourceCalendarId,
            eventId: event.googleId,
            requestBody: calendarRequestBody,
          });
        } else {
          const created = await google.calendar.events.insert({
            calendarId: targetCalendarId,
            requestBody: calendarRequestBody,
          });

          try {
            await google.calendar.events.delete({
              calendarId: sourceCalendarId,
              eventId: event.googleId,
            });
          } catch (deleteError) {
            logger.error(
              "Failed to delete old calendar event. Rolling back new event creation...",
            );
            try {
              if (created.data.id) {
                await google.calendar.events.delete({
                  calendarId: targetCalendarId,
                  eventId: created.data.id,
                });
              }
            } catch (rollbackError) {
              logger.error(
                "CRITICAL: Failed to rollback newly created calendar event",
                rollbackError,
              );
            }

            throw deleteError;
          }

          if (created.data.id) {
            newGoogleId = created.data.id;
          }
        }
      } catch (error) {
        logger.error(JSON.stringify(error, null, 2));
        throw new TRPCError({
          message: "Failed to update event in Google Calendar",
          code: "BAD_REQUEST",
        });
      }

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
            before: string | number | Date | boolean | string[] | null;
            after:
              | string
              | number
              | Date
              | boolean
              | string[]
              | null
              | undefined;
          }
        >,
      );

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

      await discord.log({
        title: "Event Updated",
        message: `Event **${oldFormattedName}** was updated.\n**Changes:**\n${changesString}`,
        color: "blade_purple",
        userId: ctx.session.user.discordUserId,
      });

      const dayBeforeStart = new Date(startLocalDate);
      dayBeforeStart.setDate(dayBeforeStart.getDate() - 1);
      const dayBeforeEnd = new Date(endLocalDate);
      dayBeforeEnd.setDate(dayBeforeEnd.getDate() - 1);

      const { id: _id, ...mutableInput } = input;

      await db
        .update(Event)
        .set({
          ...mutableInput,
          googleId: newGoogleId,
          roles: input.roles ?? event.roles,
          isOperationsCalendar:
            input.isOperationsCalendar ?? event.isOperationsCalendar,
          discordChannelId: input.discordChannelId ?? event.discordChannelId,

          start_datetime: dayBeforeStart,
          end_datetime: dayBeforeEnd,
          points:
            input.points !== undefined
              ? input.points
              : input.hackathonId
                ? EVENTS.EVENT_POINTS[input.tag] || 0
                : (event.points ?? 0),
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
      permissions.controlPerms.or(["EDIT_CLUB_EVENT", "EDIT_HACK_EVENT"], ctx);

      const eventRecord = await db.query.Event.findFirst({
        where: (t, { eq }) => eq(t.id, input.id ?? ""),
      });

      if (!eventRecord) {
        throw new TRPCError({
          message: "Event not found.",
          code: "BAD_REQUEST",
        });
      }

      if (!input.id) {
        throw new TRPCError({
          message: "Event ID is required to delete an Event.",
          code: "BAD_REQUEST",
        });
      }

      try {
        await discord.api.delete(
          Routes.guildScheduledEvent(
            DISCORD.KNIGHTHACKS_GUILD,
            eventRecord.discordId,
          ),
        );
      } catch (error) {
        logger.error(JSON.stringify(error, null, 2));
        throw new TRPCError({
          message: "Failed to delete event in Discord",
          code: "BAD_REQUEST",
        });
      }

      try {
        await google.calendar.events.delete({
          calendarId: eventRecord.isOperationsCalendar
            ? EVENTS.DEV_GOOGLE_CALENDAR_ID
            : EVENTS.GOOGLE_CALENDAR_ID,
          eventId: eventRecord.googleId,
        } as calendar_v3.Params$Resource$Events$Delete);
      } catch (error) {
        logger.error(JSON.stringify(error, null, 2));
        throw new TRPCError({
          message: "Failed to delete event in Google Calendar",
          code: "BAD_REQUEST",
        });
      }

      const formattedName = `[${input.tag.toUpperCase().replace(" ", "-")}] ${input.name}`;
      await discord.log({
        title: "Event Deleted",
        message: `The event **${formattedName}** was deleted.`,
        color: "uhoh_red",
        userId: ctx.session.user.discordUserId,
      });

      await db.delete(Event).where(eq(Event.id, input.id));
    }),

  ensureForm: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
      }),
    )
    .query(async ({ input }) => {
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

      if (form) return form;

      try {
        return await forms.createForm({
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
                type: "CHECKBOXES",
                order: 3,
                options: [],
                optional: false,
                question: "Where did you hear this event?",
                allowOther: true,
                optionsConst: "EVENT_FEEDBACK_HEARD",
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
    }),

  getFeedback: permProcedure
    .input(
      z.object({
        startDate: z.date().nullable(),
        endDate: z.date().nullable(),
        includeHackathons: z.boolean(),
      }),
    )
    .query(async ({ ctx, input }) => {
      permissions.controlPerms.or(["READ_CLUB_EVENT"], ctx);

      const conditions = [];

      const isUsableDate = (d: Date | null): d is Date =>
        d instanceof Date && Math.abs(d.getTime()) < 8640000000000000;

      if (isUsableDate(input.startDate) && isUsableDate(input.endDate)) {
        conditions.push(gt(Event.start_datetime, input.startDate));
        conditions.push(lt(Event.start_datetime, input.endDate));
      }

      if (!input.includeHackathons) {
        conditions.push(isNull(Event.hackathonId));
      }

      const events = await db
        .select()
        .from(Event)
        .where(conditions.length ? and(...conditions) : undefined);

      if (events.length === 0) {
        return [];
      }

      const forms = await db
        .select()
        .from(FormsSchemas)
        .where(
          inArray(
            FormsSchemas.slugName,
            events.map((e) =>
              (e.name + " Feedback Form").toLowerCase().replaceAll(" ", "-"),
            ),
          ),
        );

      if (forms.length === 0) {
        return [];
      }

      const responses = await db
        .select()
        .from(FormResponse)
        .where(
          inArray(
            FormResponse.form,
            forms.map((f) => f.id),
          ),
        );

      const feedback: { event: string; howHear: string; rating: number }[] = [];

      const formIdToEvent = new Map<string, string>();

      for (const f of forms) {
        const eventName = f.name.replace(" Feedback Form", "");
        formIdToEvent.set(f.id, eventName);
      }

      for (const r of responses) {
        const data = r.responseData as {
          "Where did you hear about us?": string;
          "How would you rate the event overall?": number;
        };

        feedback.push({
          event: formIdToEvent.get(r.form) ?? "",
          howHear: data["Where did you hear about us?"],
          rating: data["How would you rate the event overall?"],
        });
      }

      return feedback;
    }),
} satisfies TRPCRouterRecord;
