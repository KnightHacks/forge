import type { TRPCRouterRecord } from "@trpc/server";
import { Routes } from "discord-api-types/v10";
import { z } from "zod";

import { RECRUITING_CHANNEL, TEAM_MAP } from "@forge/consts/knight-hacks";

import { protectedProcedure } from "../trpc";
import { discord } from "../utils";

// Miscellaneous routes (primarily for form integrations)
export const miscRouter = {
  recruitingUpdate: protectedProcedure
    .meta({
      id: "recruitingUpdate",
      inputSchema: z.object({
        name: z.string().min(1),
        email: z.string().email(),
        major: z.string().min(1),
        gradTerm: z.string().min(1),
        gradYear: z.number().min(1),
        team: z.string().min(1),
      }),
    })
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        major: z.string().min(1),
        gradTerm: z.string().min(1),
        gradYear: z.number().min(1),
        team: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const team = TEAM_MAP.find((team) => team.team === input.team);
      if (!team) {
        throw new Error("Team not found");
      }

      const directorRole = team.director_role;

      // Convert hex color string to integer for Discord API
      const colorInt = parseInt(team.color.replace("#", ""), 16);

      await discord.post(Routes.channelMessages(RECRUITING_CHANNEL), {
        body: {
          content: `<@&${directorRole}> **New Applicant for ${team.team}!**`,
          embeds: [
            {
              title: `${input.name}'s Application`,
              description: `A new applicant is interested in joining the **${team.team}** team.\n\nPlease see details below:`,
              color: colorInt,
              fields: [
                {
                  name: "Name",
                  value: input.name,
                  inline: true,
                },
                {
                  name: "Email",
                  value: input.email,
                  inline: true,
                },
                {
                  name: "Major",
                  value: input.major,
                  inline: true,
                },
                {
                  name: "Grad Term",
                  value: input.gradTerm,
                  inline: true,
                },
                {
                  name: "Grad Year",
                  value: input.gradYear.toString(),
                  inline: true,
                },
                {
                  name: "Team",
                  value: team.team,
                  inline: true,
                },
              ],
              footer: {
                text: `Submitted at: ${new Date().toLocaleString()}`,
              },
              timestamp: new Date().toISOString(),
            },
          ],
        },
      });
    }),
} satisfies TRPCRouterRecord;
