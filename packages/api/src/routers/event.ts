import type { TRPCRouterRecord } from "@trpc/server";

import { EVENT_POINTS } from "@forge/consts/knight-hacks";
import { desc, eq } from "@forge/db";
import { db } from "@forge/db/client";
import { Event, InsertEventSchema } from "@forge/db/schemas/knight-hacks";

import { adminProcedure } from "../trpc";

export const eventRouter = {
  getEvents: adminProcedure.query(async () => {
    return db.query.Event.findMany({
      orderBy: [desc(Event.datetime)],
    });
  }),
  createEvent: adminProcedure
    .input(InsertEventSchema.omit({ id: true }))
    .mutation(async ({ input }) => {
      await db.insert(Event).values({
        ...input,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
        points: EVENT_POINTS[input.tag],
      });
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
