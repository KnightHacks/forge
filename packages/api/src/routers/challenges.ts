import { db } from "@forge/db/client";
import { Challenges } from "@forge/db/schemas/knight-hacks";
import { publicProcedure } from "../trpc";

export const ChallengeRouter = {
    list: publicProcedure.query(async () => {
        return await db.select().from(Challenges);
    }),
}