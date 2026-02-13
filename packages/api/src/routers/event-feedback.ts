import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";

import { DISCORD } from "@forge/consts";

import { permProcedure } from "../trpc";
import { log } from "../utils";

export const eventFeedbackRouter = {
  logHackathonFeedback: permProcedure
    .input(
      z.object({
        description: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await log({
        message: `<@&${DISCORD.OFFICER_ROLE}> ${input.description}`,
        title: "Hackathon Issue",
        color: "uhoh_red",
        userId: ctx.session.user.discordUserId,
      });
    }),
} satisfies TRPCRouterRecord;
