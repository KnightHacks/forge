import { z } from "zod";

import { db } from "@forge/db/client";

import { publicProcedure } from "../trpc";

export const challengeRouter = {
  list: publicProcedure
    .input(z.object({ hackathonId: z.string() }))
    .query(async ({ input }) => {
      const challenges = db.query.Challenges.findMany({
        where: (t, { eq }) => eq(t.hackathonId, input.hackathonId),
      });
      return challenges;
    }),
};
