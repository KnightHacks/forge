import type { APIGuildMember } from "discord-api-types/v10";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import { google } from "googleapis";
import Stripe from "stripe";

import type { Session } from "@forge/auth";
import {
  DEV_DISCORD_ADMIN_ROLE_ID,
  DEV_KNIGHTHACKS_GUILD_ID,
  GOOGLE_PERSONIFY_EMAIL,
  PROD_DISCORD_ADMIN_ROLE_ID,
  PROD_KNIGHTHACKS_GUILD_ID,
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
  const guildMember = (await discord.get(
    Routes.guildMember(KNIGHTHACKS_GUILD_ID, user.discordUserId),
  )) as APIGuildMember;
  return guildMember.roles.includes(DISCORD_ADMIN_ROLE_ID);
};

const GOOGLE_PRIVATE_KEY = Buffer.from(env.GOOGLE_PRIVATE_KEY_B64, "base64")
  .toString("utf-8")
  .replace(/\\n/g, "\n");

const auth = new google.auth.JWT(
  env.GOOGLE_CLIENT_EMAIL,
  undefined,
  GOOGLE_PRIVATE_KEY,
  ["https://www.googleapis.com/auth/calendar"],
  GOOGLE_PERSONIFY_EMAIL as string,
);

export const calendar = google.calendar({
  version: "v3",
  auth: auth,
});
