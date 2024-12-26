import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { APIExternalGuildScheduledEvent, Routes } from "discord-api-types/v10";

import { EVENT_POINTS, KNIGHTHACKS_GUILD_ID } from "@forge/consts/knight-hacks";
import { desc, eq } from "@forge/db";
import { db } from "@forge/db/client";
import { Event, InsertEventSchema } from "@forge/db/schemas/knight-hacks";

import { adminProcedure } from "../trpc";
import { discord } from "../utils";

export const eventRouter = {
  getEvents: adminProcedure.query(async () => {
    return db.query.Event.findMany({
      orderBy: [desc(Event.start_datetime)],
    });
  }),
  createEvent: adminProcedure
    .input(InsertEventSchema.omit({ id: true, discordId: true }))
    .mutation(async ({ input }) => {
      // Step 1: Make the event in Discord
      let eventId;
      try {
        const startDatetime = new Date(input.start_datetime);
        const startIsoTimestamp = startDatetime.toISOString();
        const endDatetime = new Date(input.end_datetime);
        const endIsoTimestamp = endDatetime.toISOString();

        const response = (await discord.post(
          Routes.guildScheduledEvents(KNIGHTHACKS_GUILD_ID),
          {
            body: {
              description: input.description,
              name: "[" + input.tag.toUpperCase() + "] " + input.name,
              privacy_level: 2,
              scheduled_start_time: startIsoTimestamp,
              scheduled_end_time: endIsoTimestamp,
              entity_type: 3,
              entity_metadata: {
                location: input.location,
              },
            },
          },
        )) as APIExternalGuildScheduledEvent;
        eventId = response.id;
        console.log(JSON.stringify(response, null, 2));
      } catch (error) {
        console.error(JSON.stringify(error, null, 2));
        throw new TRPCError({
          message: "Failed to create event in Discord",
          code: "BAD_REQUEST",
        });
      }

      // Step 2: Insert the event into the database with the discord id.
      if (!eventId) {
        throw new TRPCError({
          message: "Failed to create event in Discord",
          code: "BAD_REQUEST",
        });
      }

      await db.insert(Event).values({
        ...input,
        points: EVENT_POINTS[input.tag] || 0,
        discordId: eventId,
      });
    }),
  updateEvent: adminProcedure
    .input(InsertEventSchema)
    .mutation(async ({ input }) => {
      if (!input.id) {
        throw new TRPCError({
          message: "Event ID is required to update an Event.",
          code: "BAD_REQUEST",
        });
      }

      // Step 1: Update the event in Discord
      try {
        await discord.patch(
          Routes.guildScheduledEvent(KNIGHTHACKS_GUILD_ID, input.discordId),
          {
            body: {
              description: input.description,
              name: "[" + input.tag.toUpperCase() + "] " + input.name,
              privacy_level: 2,
              scheduled_start_time: new Date(
                input.start_datetime,
              ).toISOString(),
              scheduled_end_time: new Date(input.end_datetime).toISOString(),
              entity_type: 3,
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

      // Step 2: Update the event in the database
      await db.update(Event).set(input).where(eq(Event.id, input.id));
    }),
  deleteEvent: adminProcedure
    .input(InsertEventSchema.pick({ id: true, discordId: true }))
    .mutation(async ({ input }) => {
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

      // Step 2: Delete the event in the database
      await db.delete(Event).where(eq(Event.id, input.id));
    }),
} satisfies TRPCRouterRecord;
