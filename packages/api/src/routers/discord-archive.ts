import { discordArchiveHealthInputSchema } from "@forge/validators";

import { createTRPCRouter, permProcedure } from "../trpc";
import { assertCanReadDiscordArchiveHealth } from "../utils/discord-archive/access";
import { getDiscordArchiveHealth } from "../utils/discord-archive/health";

export const discordArchiveRouter = createTRPCRouter({
  /** Returns officer-only operational aggregates. Archived message content is never selected. */
  getHealth: permProcedure
    .input(discordArchiveHealthInputSchema)
    .query(async ({ ctx, input }) => {
      assertCanReadDiscordArchiveHealth(ctx);
      return getDiscordArchiveHealth(input);
    }),
});
