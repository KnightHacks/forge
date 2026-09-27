import type { TRPCRouterRecord } from "@trpc/server";
import { Routes } from "discord-api-types/v10";
import { z } from "zod";

import { eq } from "@forge/db";
import { db } from "@forge/db/client";
import { Roles } from "@forge/db/schemas/auth";
import * as discord from "@forge/utils/discord";
import { getDiscordConfigId } from "@forge/utils/discord-config";

import type { FormCallbackRegistration } from "./callbacks";
import { createTRPCRouter, formCallbackProcedure } from "../../trpc";
import { liveRoleDiscordGateway } from "../roles/discord-gateway";
import {
  assertAllowedFormCallbackDiscordRole,
  formCallbackDeliveryNonce,
} from "./callback-policy";

const discordSnowflake = z.string().regex(/^\d{17,20}$/, "Enter a Discord ID.");

const assignDiscordRoleInput = z.object({
  discordUserId: discordSnowflake,
  roleId: discordSnowflake,
});

const assignDiscordRoleRegistration = {
  description:
    "Assign an approved Discord role to the member who submitted the form.",
  inputSchema: assignDiscordRoleInput,
  inputs: {
    discordUserId: {
      allowedSources: ["respondent"],
      description:
        "The Discord account linked to the submitted Member profile.",
      label: "Discord User ID",
      respondentValues: ["discord_user_id"],
    },
    roleId: {
      allowedSources: ["fixed"],
      description: "The Discord role every respondent should receive.",
      label: "Discord Role ID",
      placeholder: "123456789012345678",
    },
  },
  label: "Assign Discord role",
  requiredPermission: "ASSIGN_ROLES",
  slug: "discord.assign-role",
} as const satisfies FormCallbackRegistration<typeof assignDiscordRoleInput>;

const recruitingInput = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().email().max(320),
  major: z.string().trim().min(1).max(255),
  gradTerm: z.string().trim().min(1).max(40),
  gradYear: z.coerce.number().int().min(2000).max(2200),
  team: z.string().trim().min(1).max(100),
});

const recruitingRegistration = {
  description:
    "Post a structured applicant summary and notify the selected team's director.",
  inputSchema: recruitingInput,
  inputs: {
    name: {
      description: "Applicant name shown in the announcement.",
      label: "Name",
      questionTypes: ["short_text"],
      respondentValues: ["respondent_name"],
    },
    email: {
      description: "Applicant email shown in the announcement.",
      fixedInputType: "email",
      label: "Email",
      questionTypes: ["email", "short_text"],
      respondentValues: ["respondent_email"],
    },
    major: {
      allowedSources: ["question", "fixed"],
      description: "Applicant's academic major.",
      label: "Major",
      questionTypes: ["dropdown", "multiple_choice", "short_text"],
    },
    gradTerm: {
      allowedSources: ["question", "fixed"],
      description: "Applicant's graduation term, such as Spring or Fall.",
      label: "Graduation term",
      questionTypes: ["dropdown", "multiple_choice", "short_text"],
    },
    gradYear: {
      allowedSources: ["question", "fixed"],
      description: "Applicant's four-digit graduation year.",
      fixedInputType: "number",
      label: "Graduation year",
      placeholder: "2028",
      questionTypes: ["dropdown", "multiple_choice", "number", "short_text"],
    },
    team: {
      allowedSources: ["question", "fixed"],
      description: "Team used to choose the director mention and embed color.",
      label: "Team",
      placeholder: "Outreach",
      questionTypes: ["dropdown", "multiple_choice", "short_text"],
    },
  },
  label: "Notify recruiting",
  requiredPermission: "EDIT_FORMS",
  slug: "recruiting.notify",
} as const satisfies FormCallbackRegistration<typeof recruitingInput>;

const recruitingTeams = {
  design: {
    label: "Design",
  },
  development: {
    label: "Development",
  },
  outreach: {
    label: "Outreach",
  },
  projectsmentorship: {
    label: "Projects/Mentorship",
  },
  sponsorship: {
    label: "Sponsorship",
  },
  workshops: {
    label: "Workshops",
  },
} as const;

function recruitingTeam(value: string) {
  const key = value.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const teams: Readonly<Record<string, { label: string }>> = recruitingTeams;
  const team = teams[key];
  if (!team) throw new Error(`Recruiting team is not configured: ${value}`);
  return { key: key as keyof typeof recruitingTeams, ...team };
}

function recruitingDirectorRoleId(team: keyof typeof recruitingTeams) {
  switch (team) {
    case "outreach":
      return getDiscordConfigId("outreach_director_role");
    case "design":
      return getDiscordConfigId("design_director_role");
    case "development":
      return getDiscordConfigId("development_director_role");
    case "sponsorship":
      return getDiscordConfigId("sponsorship_director_role");
    case "workshops":
      return getDiscordConfigId("workshops_director_role");
    case "projectsmentorship":
      return getDiscordConfigId("projects_mentorship_director_role");
  }
}

async function recruitingTeamColor(discordRoleId: string) {
  const role = await db.query.Roles.findFirst({
    columns: { teamHexcodeColor: true },
    where: eq(Roles.discordRoleId, discordRoleId),
  });
  const color = role?.teamHexcodeColor;
  if (!color || !/^#[0-9a-f]{6}$/i.test(color)) {
    throw new Error("The recruiting director role has no valid team color.");
  }
  return Number.parseInt(color.slice(1), 16);
}

export const formCallbackProcedures = {
  assignRespondentDiscordRole: formCallbackProcedure
    .meta({ formCallback: assignDiscordRoleRegistration })
    .input(assignDiscordRoleInput)
    .mutation(async ({ input }) => {
      assertAllowedFormCallbackDiscordRole(input.roleId);
      await liveRoleDiscordGateway.grantRole(input.discordUserId, input.roleId);
    }),

  notifyRecruiting: formCallbackProcedure
    .meta({ formCallback: recruitingRegistration })
    .input(recruitingInput)
    .mutation(async ({ ctx, input }) => {
      const team = recruitingTeam(input.team);
      const [channelId, directorRoleId] = await Promise.all([
        getDiscordConfigId("recruiting_channel"),
        recruitingDirectorRoleId(team.key),
      ]);
      const color = await recruitingTeamColor(directorRoleId);
      const submittedAt = new Date();
      await discord.api.post(Routes.channelMessages(channelId), {
        body: {
          allowed_mentions: { parse: [], roles: [directorRoleId] },
          content: `<@&${directorRoleId}> **New Applicant for ${team.label}!**`,
          embeds: [
            {
              color,
              description: `A new applicant is interested in joining the **${team.label}** team.\n\nPlease see details below:`,
              fields: [
                { inline: true, name: "Name", value: input.name },
                { inline: true, name: "Email", value: input.email },
                { inline: true, name: "Major", value: input.major },
                { inline: true, name: "Grad Term", value: input.gradTerm },
                {
                  inline: true,
                  name: "Grad Year",
                  value: String(input.gradYear),
                },
                { inline: true, name: "Team", value: team.label },
              ],
              footer: {
                text: `Submitted at: ${submittedAt.toLocaleString()}`,
              },
              timestamp: submittedAt.toISOString(),
              title: `${input.name}'s Application`,
            },
          ],
          enforce_nonce: true,
          nonce: formCallbackDeliveryNonce(ctx.formCallback.executionId),
        },
      });
    }),
} satisfies TRPCRouterRecord;

export const formCallbackRouter = createTRPCRouter(formCallbackProcedures);
