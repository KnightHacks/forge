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
        hackathonName: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      if (input.hackathonName == undefined) {
        const hackathon = await db.query.Hackathon.findFirst({
          where: (t, { gt }) => gt(t.endDate, new Date()),
        });

        if (!hackathon) {
          return null;
        }

        return hackathon;
      }

      return await db.query.Hackathon.findFirst({
        where: (t, { eq }) => eq(t.name, input.hackathonName ?? ""),
      });
    }),
} satisfies TRPCRouterRecord;
