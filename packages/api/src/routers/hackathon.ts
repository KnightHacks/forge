import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";

import { db } from "@forge/db/client";

import { adminProcedure, publicProcedure } from "../trpc";

export const hackathonRouter = {
  getHackathons: adminProcedure.query(async () => {
    return await db.query.Hackathon.findMany();
  }),
  getHackathon: publicProcedure
    .input(
      z.object({
        hackathonName: z.string(),
      }),
    )
    .query(async ({ input }) => {
      return await db.query.Hackathon.findFirst({
        where: (t, { eq }) => eq(t.name, input.hackathonName),
      });
    }),
} satisfies TRPCRouterRecord;
