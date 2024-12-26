import type { TRPCRouterRecord } from "@trpc/server";

import { EVENT_POINTS } from "@forge/consts/knight-hacks";
import { desc } from "@forge/db";
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
} satisfies TRPCRouterRecord;
