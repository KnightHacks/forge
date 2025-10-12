import type { APIGuildMember } from "discord-api-types/v10";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import { google } from "googleapis";
import Stripe from "stripe";

import type { Session } from "@forge/auth";
import type { PermissionIndex } from "@forge/consts/knight-hacks";
import {
  DEV_DISCORD_ADMIN_ROLE_ID,
  DEV_KNIGHTHACKS_GUILD_ID,
  DEV_KNIGHTHACKS_LOG_CHANNEL,
  GOOGLE_PERSONIFY_EMAIL,
  IS_PROD,
  PERMISSIONS,
  PROD_DISCORD_ADMIN_ROLE_ID,
  PROD_KNIGHTHACKS_GUILD_ID,
  PROD_KNIGHTHACKS_LOG_CHANNEL,
  ROLE_PERMISSIONS,
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

export const hasPermission = (
  userPermissions: string,
  permission: PermissionIndex,
): boolean => {
  const permissionBit = userPermissions[permission];
  return permissionBit === "1";
};

export const getUserPermissions = async (
  user: Session["user"],
): Promise<string> => {
  try {
    const guildMember = (await discord.get(
      Routes.guildMember(KNIGHTHACKS_GUILD_ID, user.discordUserId),
    )) as APIGuildMember;

    const userPermissionArray = new Array(Object.keys(PERMISSIONS).length).fill(
      "0",
    );

    for (const roleId of guildMember.roles) {
      if (roleId in ROLE_PERMISSIONS) {
        const permissionIndex = (ROLE_PERMISSIONS as Record<string, number>)[
          roleId
        ];
        if (permissionIndex !== undefined) {
          userPermissionArray[permissionIndex] = "1";
        }
      }
    }

    return userPermissionArray.join("");
  } catch (err) {
    console.error("Error getting user permissions: ", err);
    return "0".repeat(Object.keys(PERMISSIONS).length);
  }
};

export const userHasPermission = async (
  user: Session["user"],
  permission: PermissionIndex,
): Promise<boolean> => {
  const userPermissions = await getUserPermissions(user);

  if (hasPermission(userPermissions, PERMISSIONS.FULL_ADMIN)) {
    return true;
  }

  return hasPermission(userPermissions, permission);
};

export const userHasFullAdmin = async (
  user: Session["user"],
): Promise<boolean> => {
  return userHasPermission(user, PERMISSIONS.FULL_ADMIN);
};

export const userHasCheckIn = async (
  user: Session["user"],
): Promise<boolean> => {
  return userHasPermission(user, PERMISSIONS.CHECK_IN);
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

const GOOGLE_PRIVATE_KEY = Buffer.from(env.GOOGLE_PRIVATE_KEY_B64, "base64")
  .toString("utf-8")
  .replace(/\\n/g, "\n");

const gapiCalendar = "https://www.googleapis.com/auth/calendar";
const gapiGmailSend = "https://www.googleapis.com/auth/gmail.send";
const gapiGmailSettingsSharing =
  "https://www.googleapis.com/auth/gmail.settings.sharing";

const auth = new google.auth.JWT(
  env.GOOGLE_CLIENT_EMAIL,
  undefined,
  GOOGLE_PRIVATE_KEY,
  [gapiCalendar, gapiGmailSend, gapiGmailSettingsSharing],
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
