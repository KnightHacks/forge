import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";

import { DISCORD } from "@forge/consts";
import * as discord from "@forge/utils/discord";

import { permProcedure } from "../trpc";

export const eventFeedbackRouter = {
  logHackathonFeedback: permProcedure
    .input(
      z.object({
        description: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await discord.log({
        message: `<@&${DISCORD.OFFICER_ROLE}> ${input.description}`,
        title: "Hackathon Issue",
        color: "uhoh_red",
        userId: ctx.session.user.discordUserId,
      });
    }),
} satisfies TRPCRouterRecord;
