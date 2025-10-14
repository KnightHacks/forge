import { db } from "@forge/db/client";
import { Challenges } from "@forge/db/schemas/knight-hacks";

import { publicProcedure } from "../trpc";

export const challengeRouter = {
  list: publicProcedure.query(async () => {
    return await db.select().from(Challenges);
  }),
};
