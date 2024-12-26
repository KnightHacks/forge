import type { TRPCRouterRecord } from "@trpc/server";
import { Routes } from "discord-api-types/v10";

import { EVENT_POINTS, KNIGHTHACKS_GUILD_ID } from "@forge/consts/knight-hacks";
import { desc, eq } from "@forge/db";
import { db } from "@forge/db/client";
import { Event, InsertEventSchema } from "@forge/db/schemas/knight-hacks";

import { adminProcedure } from "../trpc";
import { discord } from "../utils";

export const eventRouter = {
  getEvents: adminProcedure.query(async () => {
    return db.query.Event.findMany({
      orderBy: [desc(Event.datetime)],
    });
  }),
  createEvent: adminProcedure
    .input(InsertEventSchema.omit({ id: true }))
    .mutation(async ({ input }) => {
      // Step 1: Insert the event into the database
      await db.insert(Event).values({
        ...input,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
        points: EVENT_POINTS[input.tag],
      });

      // Step 2: Make the event in Discord
      try {
        const datetime = new Date(input.datetime);
        const isoTimestamp = datetime.toISOString();

        const response = await discord.post(
          Routes.guildScheduledEvents(KNIGHTHACKS_GUILD_ID),
          {
            body: {
              description: input.description,
              name: input.name,
              privacy_level: 2,
              scheduled_start_time: isoTimestamp,
              entity_type: 3,
            },
          },
        );
        console.log("SUCCESSFULLY CREATED EVENT IN DISCORD", response);
      } catch (error) {
        console.error(error);
      }
    }),
  updateEvent: adminProcedure
    .input(InsertEventSchema)
    .mutation(async ({ input }) => {
      if (!input.id) {
        throw new Error("Event ID is required to update an event");
      }
      await db.update(Event).set(input).where(eq(Event.id, input.id));
    }),
  deleteEvent: adminProcedure
    .input(InsertEventSchema.pick({ id: true }))
    .mutation(async ({ input }) => {
      if (!input.id) {
        throw new Error("Event ID is required to delete an event");
      }
      await db.delete(Event).where(eq(Event.id, input.id));
    }),
} satisfies TRPCRouterRecord;
