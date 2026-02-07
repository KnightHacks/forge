import type { TRPCRouterRecord } from "@trpc/server";
import { Routes } from "discord-api-types/v10";
import { z } from "zod";

import { DISCORD } from "@forge/consts";

import { protectedProcedure } from "../trpc";
import { discord } from "../utils";

// Miscellaneous routes (primarily for form integrations)
export const miscRouter = {
  addRoleId: protectedProcedure
    .meta({
      id: "addRoleId",
      inputSchema: z.object({
        roleId: z.string(),
      }),
    })
    .input(
      z.object({
        roleId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!DISCORD.ALLOWED_FORM_ASSIGNABLE_DISC_ROLES.includes(input.roleId)) {
        throw new Error(
          `Roleid: ${input.roleId} is not assignable through forms for security purposes. Add to consts and make a PR if this is a mistake.`,
        );
      }

      try {
        const discId = ctx.session.user.discordUserId;
        await discord.put(
          Routes.guildMemberRole(
            DISCORD.KNIGHTHACKS_GUILD,
            discId,
            input.roleId,
          ),
        );
      } catch {
        throw new Error(
          `Could not assign role ${input.roleId} to user ${ctx.session.user.name}`,
        );
      }
    }),

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
      const team = DISCORD.TEAMS.find((team) => team.team === input.team);
      if (!team) {
        throw new Error("Team not found");
      }

      const directorRole = team.director_role;

      // Convert hex color string to integer for Discord API
      const colorInt = parseInt(team.color.replace("#", ""), 16);

      await discord.post(Routes.channelMessages(DISCORD.RECRUITING_CHANNEL), {
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
