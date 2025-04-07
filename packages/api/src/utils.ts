import type { APIGuildMember } from "discord-api-types/v10";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import { google } from "googleapis";
import Stripe from "stripe";

import type { Session } from "@forge/auth";
import {
  DEV_DISCORD_ADMIN_ROLE_ID,
  DEV_KNIGHTHACKS_GUILD_ID,
  DEV_KNIGHTHACKS_LOG_CHANNEL,
  GOOGLE_PERSONIFY_EMAIL,
  PROD_DISCORD_ADMIN_ROLE_ID,
  PROD_KNIGHTHACKS_GUILD_ID,
  PROD_KNIGHTHACKS_LOG_CHANNEL,
} from "@forge/consts/knight-hacks";

import { env } from "./env";

const DISCORD_ADMIN_ROLE_ID =
  env.NODE_ENV === "production"
    ? (PROD_DISCORD_ADMIN_ROLE_ID as string)
    : (DEV_DISCORD_ADMIN_ROLE_ID as string);

const KNIGHTHACKS_GUILD_ID =
  env.NODE_ENV === "production"
    ? (PROD_KNIGHTHACKS_GUILD_ID as string)
    : (DEV_KNIGHTHACKS_GUILD_ID as string);

export const discord = new REST({ version: "10" }).setToken(
  env.DISCORD_BOT_TOKEN,
);

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, { typescript: true });

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

const GOOGLE_PRIVATE_KEY = Buffer.from(env.GOOGLE_PRIVATE_KEY_B64, "base64")
  .toString("utf-8")
  .replace(/\\n/g, "\n");

const gapiCalendar = "https://www.googleapis.com/auth/calendar";
const gapiGmail = "https://www.googleapis.com/auth/gmail.send";

const auth = new google.auth.JWT(
  env.GOOGLE_CLIENT_EMAIL,
  undefined,
  GOOGLE_PRIVATE_KEY,
  [gapiCalendar, gapiGmail],
  GOOGLE_PERSONIFY_EMAIL as string,
);

export const gmail = google.gmail({
  version: "v1",
  auth: auth,
});

export const calendar = google.calendar({
  version: "v3",
  auth: auth,
});

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
