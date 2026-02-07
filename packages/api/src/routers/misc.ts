import type { TRPCRouterRecord } from "@trpc/server";
import { Routes } from "discord-api-types/v10";
import { z } from "zod";

import {
  ALLOWED_FORM_ASSIGNABLE_DISC_ROLES,
  RECRUITING_CHANNEL,
  TEAM_MAP,
} from "@forge/consts/knight-hacks";

import { protectedProcedure } from "../trpc";
import { discord, KNIGHTHACKS_GUILD_ID, sendEmail } from "../utils";

export interface FundingRequestInput {
  team: string;
  amount: number;
  dateNeeded: Date | string;
  importance: number;
  deadlineType?: string;
  description?: string;
  itemization?: string;
}

export function generateListmonkData(
  input: FundingRequestInput,
): Record<string, string> {
  // Format text for HTML display (convert newlines to <br> tags)
  const formatText = (text: string | null | undefined): string => {
    if (!text) return "N/A";
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
      .replace(/\n/g, "<br>");
  };

  // Format date as MM/DD
  const formatDate = (date: Date | string): string => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    return `${month}/${day}`;
  };

  // Format amount with thousand separators
  const formatAmount = (amount: number): string => {
    return amount.toLocaleString();
  };

  // Format submission timestamp
  const formatSubmittedAt = (): string => {
    return new Date().toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return {
    team: input.team,
    amount: formatAmount(input.amount),
    dateNeeded: formatDate(input.dateNeeded),
    importance: input.importance.toString(),
    deadlineType: input.deadlineType ?? "N/A",
    description: formatText(input.description),
    itemization: formatText(input.itemization),
    submittedAt: formatSubmittedAt(),
  };
}

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
      if (!ALLOWED_FORM_ASSIGNABLE_DISC_ROLES.includes(input.roleId)) {
        throw new Error(
          `Roleid: ${input.roleId} is not assignable through forms for security purposes. Add to consts and make a PR if this is a mistake.`,
        );
      }

      try {
        const discId = ctx.session.user.discordUserId;
        await discord.put(
          Routes.guildMemberRole(KNIGHTHACKS_GUILD_ID, discId, input.roleId),
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

  fundingRequest: protectedProcedure
    .meta({
      id: "fundingRequest",
      inputSchema: z.object({
        team: z.string().min(1),
        description: z.string(),
        amount: z.number(),
        itemization: z.string(),
        importance: z.number(),
        dateNeeded: z.string(),
        deadlineType: z.string(),
      }),
    })
    .input(
      z.object({
        team: z.string().min(1),
        description: z.string(),
        amount: z.number(),
        itemization: z.string(),
        importance: z.number(),
        dateNeeded: z.string(),
        deadlineType: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const dateObj =
        typeof input.dateNeeded === "string"
          ? new Date(input.dateNeeded)
          : input.dateNeeded;
      const formattedDate = `${String(dateObj.getMonth() + 1).padStart(2, "0")}/${String(dateObj.getDate()).padStart(2, "0")}`;
      const data = generateListmonkData(input);

      await sendEmail({
        to: ["treasurer@knighthacks.org", "exec@knighthacks.org"],
        subject: `KHFR - $${input.amount.toLocaleString()} | ${formattedDate} | ${input.team}`,
        template_id: 12,
        from: "Funding Requests <funding-requests@knighthacks.org>",
        data: data,
      });
    }),
} satisfies TRPCRouterRecord;
