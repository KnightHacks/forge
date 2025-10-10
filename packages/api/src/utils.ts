import type { APIGuildMember } from "discord-api-types/v10";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import { Resend } from "resend";
import Stripe from "stripe";

import type { Session } from "@forge/auth";
import {
  DEV_DISCORD_ADMIN_ROLE_ID,
  DEV_KNIGHTHACKS_GUILD_ID,
  DEV_KNIGHTHACKS_LOG_CHANNEL,
  IS_PROD,
  PROD_DISCORD_ADMIN_ROLE_ID,
  PROD_KNIGHTHACKS_GUILD_ID,
  PROD_KNIGHTHACKS_LOG_CHANNEL,
} from "@forge/consts/knight-hacks";

import { env } from "./env";

const DISCORD_ADMIN_ROLE_ID = IS_PROD
  ? (PROD_DISCORD_ADMIN_ROLE_ID as string)
  : (DEV_DISCORD_ADMIN_ROLE_ID as string);

const KNIGHTHACKS_GUILD_ID = IS_PROD
  ? (PROD_KNIGHTHACKS_GUILD_ID as string)
  : (DEV_KNIGHTHACKS_GUILD_ID as string);

const PROD_VIP_ID = "1423358570203844689";
const DEV_VIP_ID = "1423366084874080327";
const VIP_ID = IS_PROD ? (PROD_VIP_ID as string) : (DEV_VIP_ID as string);
export const discord = new REST({ version: "10" }).setToken(
  env.DISCORD_BOT_TOKEN,
);
const GUILD_ID = IS_PROD ? PROD_KNIGHTHACKS_GUILD_ID : DEV_KNIGHTHACKS_GUILD_ID;

export async function addRoleToMember(discordUserId: string, roleId: string) {
  await discord.put(Routes.guildMemberRole(GUILD_ID, discordUserId, roleId), {
    body: {},
  });
}

export async function resolveDiscordUserId(
  username: string,
): Promise<string | null> {
  const q = username.trim().toLowerCase();
  const members = (await discord.get(
    `${Routes.guildMembersSearch(GUILD_ID)}?query=${encodeURIComponent(q)}&limit=1`,
  )) as APIGuildMember[];
  return members[0]?.user.id ?? null;
}

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, { typescript: true });

// Initialize Resend
export const resend = new Resend(env.RESEND_API_KEY);

export const isDiscordAdmin = async (user: Session["user"]) => {
  try {
    const guildMember = (await discord.get(
      Routes.guildMember(KNIGHTHACKS_GUILD_ID, user.discordUserId),
    )) as APIGuildMember;
    return guildMember.roles.includes(DISCORD_ADMIN_ROLE_ID);
  } catch (err) {
    console.error("Error: ", err);
    return false;
  }
};

export const isDiscordMember = async (user: Session["user"]) => {
  try {
    await discord.get(
      Routes.guildMember(KNIGHTHACKS_GUILD_ID, user.discordUserId),
    );
    return true;
  } catch {
    return false;
  }
};

export async function isDiscordVIP(discordUserId: string) {
  const guildMember = (await discord.get(
    Routes.guildMember(GUILD_ID, discordUserId),
  )) as APIGuildMember;
  return guildMember.roles.includes(VIP_ID);
}

// Email sending utility function using Resend
export const sendEmail = async ({
  to,
  subject,
  html,
  from,
}: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}): Promise<{ success: true; messageId: string }> => {
  try {
    const { data, error } = await resend.emails.send({
      from: from || env.RESEND_FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return { success: true, messageId: data.id };
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error(
      `Failed to send email: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
};

const KNIGHTHACKS_LOG_CHANNEL =
  env.NODE_ENV === "production"
    ? (PROD_KNIGHTHACKS_LOG_CHANNEL as string)
    : (DEV_KNIGHTHACKS_LOG_CHANNEL as string);

export async function log({
  title,
  message,
  color,
  userId,
}: {
  title: string;
  message: string;
  color: "tk_blue" | "blade_purple" | "uhoh_red" | "success_green";
  userId: string;
}) {
  await discord.post(Routes.channelMessages(KNIGHTHACKS_LOG_CHANNEL), {
    body: {
      embeds: [
        {
          title: title,
          description: message + `\n\nUser: <@${userId}>`.toString(),
          color: {
            tk_blue: 0x1a73e8,
            blade_purple: 0xcca4f4,
            uhoh_red: 0xff0000,
            success_green: 0x00ff00,
          }[color],
          footer: {
            text: new Date().toLocaleString(),
          },
        },
      ],
    },
  });
}
