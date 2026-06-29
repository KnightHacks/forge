import type { APIGuildMember, APIRole } from "discord-api-types/v10";
import { Routes } from "discord-api-types/v10";

import type { Session } from "@forge/auth/server";
import { DISCORD } from "@forge/consts";
import * as discord from "@forge/utils/discord";

import { nodeEnv } from "../../env";

export interface RoleDiscordGateway {
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
}

let roleCountCache:
  | { counts: Record<string, number>; expiresAt: number }
  | undefined;

const liveRoleDiscordGateway: RoleDiscordGateway = {
  async getGuildMember(discordUserId) {
    return (await discord.api.get(
      Routes.guildMember(DISCORD.KNIGHTHACKS_GUILD, discordUserId),
    )) as APIGuildMember;
  },

  async getGuildRoles() {
    try {
      return {
        available: true,
        roles: (await discord.api.get(
          Routes.guildRoles(DISCORD.KNIGHTHACKS_GUILD),
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
      const usersByRole = new Map<string, Set<string>>();
      let after: string | undefined;
      for (let page = 0; page < 100; page += 1) {
        const params = new URLSearchParams({ limit: "1000" });
        if (after) params.set("after", after);
        const members = (await discord.api.get(
          `${Routes.guildMembers(DISCORD.KNIGHTHACKS_GUILD)}?${params.toString()}`,
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
