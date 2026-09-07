import type {
  APIChannel,
  APIGuildMember,
  APIRole,
  APIUser,
} from "discord-api-types/v10";
import { ChannelType, Routes } from "discord-api-types/v10";

import type { Session } from "@forge/auth/server";
import * as discord from "@forge/utils/discord";
import { getKnightHacksGuildId } from "@forge/utils/discord-config";

import { nodeEnv } from "../../env";
import { canSendToChannel } from "./channel-permissions";

interface ChannelOptions {
  requireSendPermission?: boolean;
}

export interface RoleDiscordGateway {
  getGuildTextChannels?: (
    options?: ChannelOptions,
  ) => Promise<{ id: string; name: string }[]>;
  getGuildMember: (
    discordUserId: string,
    context: { discordRoleId: string; hasAssignment: boolean },
  ) => APIGuildMember | Promise<APIGuildMember>;
  getGuildRoles: () => Promise<{
    available: boolean;
    roles: APIRole[];
  }>;
  getRoleCounts: () => Promise<Record<string, number> | null>;
  grantRole: (discordUserId: string, discordRoleId: string) => Promise<void>;
  revokeRole: (discordUserId: string, discordRoleId: string) => Promise<void>;
  validateTextChannel?: (
    channelId: string,
    options?: ChannelOptions,
  ) => Promise<boolean>;
}

async function botChannelPermissions(guildId: string) {
  const [user, roles] = await Promise.all([
    discord.api.get(Routes.user()) as Promise<APIUser>,
    discord.api.get(Routes.guildRoles(guildId)) as Promise<APIRole[]>,
  ]);
  // The OAuth current-user guild-member endpoint does not accept bot tokens.
  const member = (await discord.api.get(
    Routes.guildMember(guildId, user.id),
  )) as APIGuildMember;
  return { member, roles };
}

let roleCountCache:
  | { counts: Record<string, number>; expiresAt: number }
  | undefined;

export const liveRoleDiscordGateway: RoleDiscordGateway = {
  async getGuildTextChannels(options) {
    const guildId = await getKnightHacksGuildId();
    const channels = (await discord.api.get(
      Routes.guildChannels(guildId),
    )) as APIChannel[];
    const posting = options?.requireSendPermission
      ? await botChannelPermissions(guildId)
      : null;
    return channels
      .filter(
        (channel) =>
          "guild_id" in channel &&
          channel.guild_id === guildId &&
          "name" in channel &&
          (channel.type === ChannelType.GuildText ||
            channel.type === ChannelType.GuildAnnouncement) &&
          (!posting ||
            canSendToChannel(guildId, channel, posting.member, posting.roles)),
      )
      .map((channel) => ({ id: channel.id, name: channel.name ?? channel.id }))
      .sort((left, right) => left.name.localeCompare(right.name));
  },
  async getGuildMember(discordUserId) {
    return (await discord.api.get(
      Routes.guildMember(await getKnightHacksGuildId(), discordUserId),
    )) as APIGuildMember;
  },

  async getGuildRoles() {
    try {
      return {
        available: true,
        roles: (await discord.api.get(
          Routes.guildRoles(await getKnightHacksGuildId()),
        )) as APIRole[],
      };
    } catch {
      return { available: false, roles: [] };
    }
  },

  async getRoleCounts() {
    if (roleCountCache && roleCountCache.expiresAt > Date.now()) {
      return roleCountCache.counts;
    }
    try {
      const guildId = await getKnightHacksGuildId();
      const usersByRole = new Map<string, Set<string>>();
      let after: string | undefined;
      for (let page = 0; page < 100; page += 1) {
        const params = new URLSearchParams({ limit: "1000" });
        if (after) params.set("after", after);
        const members = (await discord.api.get(
          `${Routes.guildMembers(guildId)}?${params.toString()}`,
        )) as APIGuildMember[];
        for (const member of members) {
          const userId = member.user.id;
          for (const roleId of member.roles) {
            const users = usersByRole.get(roleId) ?? new Set<string>();
            users.add(userId);
            usersByRole.set(roleId, users);
          }
        }
        if (members.length < 1000) break;
        after = members.at(-1)?.user.id;
        if (!after) break;
      }
      const counts = Object.fromEntries(
        [...usersByRole].map(([roleId, users]) => [roleId, users.size]),
      );
      roleCountCache = { counts, expiresAt: Date.now() + 60_000 };
      return counts;
    } catch {
      return null;
    }
  },

  grantRole: discord.addRoleToMember,
  revokeRole: discord.removeRoleFromMember,
  async validateTextChannel(channelId, options) {
    try {
      const channel = (await discord.api.get(
        Routes.channel(channelId),
      )) as APIChannel;
      const guildId = await getKnightHacksGuildId();
      const valid =
        "guild_id" in channel &&
        channel.guild_id === guildId &&
        (channel.type === ChannelType.GuildText ||
          channel.type === ChannelType.GuildAnnouncement);
      if (!valid || !options?.requireSendPermission) return valid;
      const posting = await botChannelPermissions(guildId);
      return canSendToChannel(guildId, channel, posting.member, posting.roles);
    } catch {
      return false;
    }
  },
};

export async function resolveRoleDiscordGateway(
  session: Session,
): Promise<RoleDiscordGateway> {
  if (nodeEnv !== "production") {
    const { resolveRoleManagementDiscordOverride } =
      await import("../../tests/support/role-management-discord");
    const override = resolveRoleManagementDiscordOverride(session);
    if (override) return override;
  }
  return liveRoleDiscordGateway;
}
