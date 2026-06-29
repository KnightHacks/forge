import type { APIGuildMember, APIRole } from "discord-api-types/v10";

import type { Session } from "@forge/auth/server";
import { DISCORD } from "@forge/consts";
import { db } from "@forge/db/client";
import { Permissions, Roles } from "@forge/db/schemas/auth";

import type { RoleDiscordGateway } from "../../utils/roles/discord-gateway";

const missingDiscordRoleId = "990000000000009999";
const synchronizedDiscordRoleId = "990000000000000006";

const discordRoles = [
  {
    color: 0,
    id: DISCORD.KNIGHTHACKS_GUILD,
    managed: false,
    name: "@everyone",
    position: 0,
  },
  {
    color: 0x6d28d9,
    id: "990000000000000001",
    managed: false,
    name: "Role Management E2E",
    position: 100,
  },
  {
    color: 0x2563eb,
    id: "990000000000000002",
    managed: false,
    name: "Design E2E",
    position: 90,
  },
  {
    color: 0,
    id: "990000000000000003",
    managed: false,
    name: "Purple Cosmetic E2E",
    position: 80,
  },
  {
    color: 0,
    id: "990000000000000004",
    managed: true,
    name: "Managed Integration E2E",
    position: 70,
  },
  {
    color: 0x0ea5e9,
    id: "990000000000000005",
    managed: false,
    name: "Case Conflict E2E",
    position: 60,
  },
  {
    color: 0x16a34a,
    id: synchronizedDiscordRoleId,
    managed: false,
    name: "Synchronized Role E2E",
    position: 50,
  },
] as const;

async function getAssignmentRows() {
  return db
    .select({ roleId: Permissions.roleId, userId: Permissions.userId })
    .from(Permissions);
}

const roleManagementE2EDiscordGateway: RoleDiscordGateway = {
  getGuildMember(discordUserId, context) {
    if (
      discordUserId === "role-create-member-e2e" &&
      context.discordRoleId === "990000000000000002"
    ) {
      return { roles: [context.discordRoleId] } as APIGuildMember;
    }
    if (context.discordRoleId !== synchronizedDiscordRoleId) {
      return {
        roles: context.hasAssignment ? [context.discordRoleId] : [],
      } as APIGuildMember;
    }
    if (discordUserId.startsWith("role-sync-not-found-")) {
      throw Object.assign(new Error("Simulated missing Discord member."), {
        status: 404,
      });
    }
    if (discordUserId.startsWith("role-sync-error-")) {
      throw new Error("Simulated Discord member lookup failure.");
    }
    if (discordUserId.startsWith("role-sync-member-")) {
      return { roles: [context.discordRoleId] } as APIGuildMember;
    }
    if (discordUserId.startsWith("role-sync-absent-")) {
      return { roles: [] } as unknown as APIGuildMember;
    }
    return {
      roles: context.hasAssignment ? [context.discordRoleId] : [],
    } as APIGuildMember;
  },

  async getGuildRoles() {
    const linked = await db
      .select({
        discordRoleId: Roles.discordRoleId,
        name: Roles.name,
        teamHexcodeColor: Roles.teamHexcodeColor,
      })
      .from(Roles);
    const linkedRoles = linked
      .filter((role) => role.discordRoleId !== missingDiscordRoleId)
      .map((role, index) => ({
        color: role.teamHexcodeColor
          ? Number.parseInt(role.teamHexcodeColor.slice(1), 16)
          : 0,
        id: role.discordRoleId,
        managed: false,
        name: role.name,
        position: 50 - index,
      }));
    const byId = new Map(
      [...linkedRoles, ...discordRoles].map((role) => [role.id, role]),
    );
    return { available: true, roles: [...byId.values()] as APIRole[] };
  },

  async getRoleCounts() {
    const [roles, assignments] = await Promise.all([
      db
        .select({ id: Roles.id, discordRoleId: Roles.discordRoleId })
        .from(Roles),
      getAssignmentRows(),
    ]);
    const discordIdByRole = new Map(
      roles.map((role) => [role.id, role.discordRoleId]),
    );
    const usersByRole = new Map<string, Set<string>>();
    for (const assignment of assignments) {
      const discordRoleId = discordIdByRole.get(assignment.roleId);
      if (!discordRoleId) continue;
      const users = usersByRole.get(discordRoleId) ?? new Set<string>();
      users.add(assignment.userId);
      usersByRole.set(discordRoleId, users);
    }
    return Object.fromEntries(
      [...discordRoles, ...roles].map((role) => {
        const id = "discordRoleId" in role ? role.discordRoleId : role.id;
        return [id, usersByRole.get(id)?.size ?? 0];
      }),
    );
  },

  grantRole(discordUserId) {
    return discordUserId === "role-discord-fail-e2e"
      ? Promise.reject(new Error("Simulated Discord assignment failure."))
      : Promise.resolve();
  },

  revokeRole(discordUserId) {
    return discordUserId === "role-discord-fail-e2e"
      ? Promise.reject(new Error("Simulated Discord assignment failure."))
      : Promise.resolve();
  },
};

export function resolveRoleManagementDiscordOverride(session: Session) {
  return session.session.id.startsWith("e2e-session-") &&
    session.session.userAgent === "blade-playwright"
    ? roleManagementE2EDiscordGateway
    : null;
}
