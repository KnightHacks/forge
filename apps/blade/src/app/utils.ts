import type { APIGuildMember } from "discord-api-types/v10";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";

import type { Session } from "@forge/auth";
import { env } from "@forge/api/env";
import {
  DISCORD_ADMIN_ROLE_ID,
  KNIGHTHACKS_GUILD_ID,
} from "@forge/consts/knight-hacks";

const discord = new REST({ version: "10" }).setToken(env.DISCORD_BOT_TOKEN);

export const isDiscordAdmin = async (user: Session["user"]) => {
  const guildMember = (await discord.get(
    Routes.guildMember(KNIGHTHACKS_GUILD_ID, user.discordUserId),
  )) as APIGuildMember;
  return guildMember.roles.includes(DISCORD_ADMIN_ROLE_ID);
};
