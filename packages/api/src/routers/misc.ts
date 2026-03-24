import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { FORMS } from "@forge/consts";
import { logger } from "@forge/utils";
import * as discord from "@forge/utils/discord";

import { protectedProcedure } from "../trpc";

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
      if (!FORMS.ALLOWED_ASSIGNABLE_DISCORD_ROLES.includes(input.roleId)) {
        throw new TRPCError({
          message: `Roleid: ${input.roleId} is not assignable through forms for security purposes. Add to consts and make a PR if this is a mistake.`,
          code: "INTERNAL_SERVER_ERROR",
        });
      }

      try {
        const discId = ctx.session.user.discordUserId;
        await discord.addRoleToMember(discId, input.roleId);
      } catch (err) {
        throw new TRPCError({
          message: `Could not assign role ${input.roleId} to user ${ctx.session.user.name}`,
          cause: err,
          code: "INTERNAL_SERVER_ERROR",
        });
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
      try {
        await discord.sendRecruitingApplication(input.team, {
          email: input.email,
          gradTerm: input.gradTerm,
          gradYear: input.gradYear.toString(),
          major: input.major,
          name: input.name,
        });
      } catch (e) {
        logger.error(e);
        throw new TRPCError({
          message: "An error has occurred.",
          code: "INTERNAL_SERVER_ERROR",
          cause: e,
        });
      }
    }),
} satisfies TRPCRouterRecord;
