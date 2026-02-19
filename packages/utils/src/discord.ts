//
// Discord utils package. Holds all of the routes as well as the discord rest
// api client.
//

import type { APIGuildMember } from "discord-api-types/v10";
import { REST, Routes } from "discord.js";
import { and, desc, eq } from "drizzle-orm";

import type { Session } from "@forge/auth/server";
import { DISCORD } from "@forge/consts";
import { db } from "@forge/db/client";
import { Account } from "@forge/db/schemas/auth";

import { env } from "./env";

export const api = new REST({ version: "10" }).setToken(
  env.DISCORD_BOT_TOKEN,
);

export async function addRoleToMember(discordUserId: string, roleId: string) {
  await api.put(
    Routes.guildMemberRole(DISCORD.KNIGHTHACKS_GUILD, discordUserId, roleId),
  );
}

export async function removeRoleFromMember(
  discordUserId: string,
  roleId: string,
) {
  await api.delete(
    Routes.guildMemberRole(DISCORD.KNIGHTHACKS_GUILD, discordUserId, roleId),
  );
}

export async function addMemberToServer(
  discordUserId: string,
  accessToken: string,
): Promise<void> {
  try {
    await api.put(
      Routes.guildMember(DISCORD.KNIGHTHACKS_GUILD, discordUserId),
      {
        body: {
          access_token: accessToken,
        },
      },
    );

    console.log(`Added ${discordUserId} to the KH discord server`);
    return;
  } catch (error) {
    console.error(
      `Failed to add user ${discordUserId} to the KH discord server:`,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}

export async function handleDiscordOAuthCallback(
  discordUserId: string,
): Promise<void> {
  try {
    const user = await db.query.User.findFirst({
      where: (u, { eq }) => eq(u.discordUserId, discordUserId),
    });

    if (!user) {
      return;
    }

    const accounts = await db
      .select({ account: Account })
      .from(Account)
      .where(and(eq(Account.provider, "discord"), eq(Account.userId, user.id)))
      .orderBy(desc(Account.updatedAt))
      .limit(1);

    const account = accounts[0]?.account;
    const accessToken = account?.access_token;
    const scope = account?.scope;

    if (accessToken && scope?.includes("guilds.join")) {
      void addMemberToServer(discordUserId, accessToken);
    }
  } catch (error) {
    console.error(
      `Failed to handle Discord OAuth callback for ${discordUserId}:`,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}

export async function resolveDiscordUserId(
  username: string,
): Promise<string | null> {
  const q = username.trim().toLowerCase();
  const members = (await api.get(
    `${Routes.guildMembersSearch(DISCORD.KNIGHTHACKS_GUILD)}?query=${encodeURIComponent(q)}&limit=1`,
  )) as APIGuildMember[];
  return members[0]?.user.id ?? null;
}

// TODO: look into not using Session here so we can remove the auth import
//       which will let us clean up our imports.

export const isDiscordAdmin = async (user: Session["user"]) => {
  try {
    const guildMember = (await api.get(
      Routes.guildMember(DISCORD.KNIGHTHACKS_GUILD, user.discordUserId),
    )) as APIGuildMember;
    return guildMember.roles.includes(DISCORD.ADMIN_ROLE);
  } catch (err) {
    console.error("Error: ", err);
    return false;
  }
};

export const isDiscordMember = async (user: Session["user"]) => {
  try {
    await api.get(
      Routes.guildMember(DISCORD.KNIGHTHACKS_GUILD, user.discordUserId),
    );
    return true;
  } catch {
    return false;
  }
};

export async function isDiscordVIP(discordUserId: string) {
  const guildMember = (await api.get(
    Routes.guildMember(DISCORD.KNIGHTHACKS_GUILD, discordUserId),
  )) as APIGuildMember;
  return guildMember.roles.includes(DISCORD.VIP_ROLE);
}

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
  await api.post(Routes.channelMessages(DISCORD.LOG_CHANNEL), {
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
