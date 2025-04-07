import type { TRPCRouterRecord } from "@trpc/server";

import { db } from "@forge/db/client";

import { adminProcedure } from "../trpc";

export const hackathonRouter = {
  getHackathons: adminProcedure.query(async () => {
    return await db.query.Hackathon.findMany();
  }),
} satisfies TRPCRouterRecord;
