import type { APIGuildMember, APIRole } from "discord-api-types/v10";
import { TRPCError } from "@trpc/server";

import { DISCORD } from "@forge/consts";
import { eq, inArray, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, Roles, User } from "@forge/db/schemas/auth";
import {
  Event,
  FormResponseRoles,
  FormSectionRoles,
  Issue,
  IssuesToTeamsVisibility,
} from "@forge/db/schemas/knight-hacks";

import type { RoleDiscordGateway } from "./discord-gateway";
import {
  isAdministrativePermissionString,
  isCosmeticPermissionString,
  permissionBitstringToKeys,
  retainsAssignedRoleAdministrator,
  retainsAssignedRoleAdministratorAfterRevocations,
} from "./management";

export function roleColorToHex(color: number) {
  if (color <= 0) return null;
  return `#${color.toString(16).padStart(6, "0")}`;
}

export async function getDiscordRole(
  gateway: RoleDiscordGateway,
  roleId: string,
) {
  const guildRoles = await gateway.getGuildRoles();
  if (!guildRoles.available) return null;
  return guildRoles.roles.find((role) => role.id === roleId) ?? null;
}

export function assertEligibleDiscordRole(role: APIRole | null) {
  if (!role) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "That Discord role could not be found.",
    });
  }
  if (role.id === DISCORD.KNIGHTHACKS_GUILD || role.managed) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "That Discord role cannot be linked in Blade.",
    });
  }
  return role;
}

type DbExecutor =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function getDependencyCounts(
  roleId: string,
  executor: DbExecutor = db,
) {
  const [eventRows, formResponses, formSections, issues, issueVisibility] =
    await Promise.all([
      executor
        .select({ hackathonId: Event.hackathonId, id: Event.id })
        .from(Event)
        .where(sql`${roleId} = ANY(${Event.roles})`),
      executor
        .select({ roleId: FormResponseRoles.roleId })
        .from(FormResponseRoles)
        .where(eq(FormResponseRoles.roleId, roleId)),
      executor
        .select({ roleId: FormSectionRoles.roleId })
        .from(FormSectionRoles)
        .where(eq(FormSectionRoles.roleId, roleId)),
      executor
        .select({ roleId: Issue.team })
        .from(Issue)
        .where(eq(Issue.team, roleId)),
      executor
        .select({ roleId: IssuesToTeamsVisibility.teamId })
        .from(IssuesToTeamsVisibility)
        .where(eq(IssuesToTeamsVisibility.teamId, roleId)),
    ]);
  return {
    events: eventRows.length,
    eventBlockers: eventRows.map((event) => ({
      eventId: event.id,
      kind: event.hackathonId
        ? ("hackathon_maintenance" as const)
        : ("club" as const),
    })),
    formResponses: formResponses.length,
    formSections: formSections.length,
    issueVisibility: issueVisibility.length,
    issues: issues.length,
    total:
      eventRows.length +
      formResponses.length +
      formSections.length +
      issues.length +
      issueVisibility.length,
  };
}

export async function getAssignmentRows() {
  return db
    .select({
      id: Permissions.id,
      roleId: Permissions.roleId,
      userId: Permissions.userId,
    })
    .from(Permissions);
}

export async function retainsAdministratorAfter(
  roleId: string,
  nextPermissions: string | null,
) {
  const [roles, assignments] = await Promise.all([
    db.select({ id: Roles.id, permissions: Roles.permissions }).from(Roles),
    getAssignmentRows(),
  ]);
  return retainsAssignedRoleAdministrator({
    assignments,
    nextPermissionsByRole: new Map([[roleId, nextPermissions]]),
    roles,
  });
}

async function retainsAdministratorAfterAssignmentRevocation(
  roleId: string,
  userId: string,
) {
  const [roles, assignments] = await Promise.all([
    db.select({ id: Roles.id, permissions: Roles.permissions }).from(Roles),
    getAssignmentRows(),
  ]);
  return retainsAssignedRoleAdministratorAfterRevocations({
    assignments,
    revokedRoleIds: new Set([roleId]),
    revokedUserIds: new Set([userId]),
    roles,
  });
}

export async function assertUniqueDiscordRole(
  role: APIRole,
  excludingId?: string,
) {
  const rows = await db.select().from(Roles);
  const duplicateId = rows.find(
    (row) => row.discordRoleId === role.id && row.id !== excludingId,
  );
  if (duplicateId) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "That Discord role is already linked.",
    });
  }
  const normalizedName = role.name.trim().toLocaleLowerCase("en-US");
  const duplicateName = rows.find(
    (row) =>
      row.id !== excludingId &&
      row.name.trim().toLocaleLowerCase("en-US") === normalizedName,
  );
  if (duplicateName) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "A linked role already uses that Discord role name.",
    });
  }
}

function isDiscordNotFound(error: unknown) {
  return (error as { status?: number } | null)?.status === 404;
}

export async function syncLinkedRole(
  role: typeof Roles.$inferSelect,
  gateway: RoleDiscordGateway,
) {
  const liveRole = assertEligibleDiscordRole(
    await getDiscordRole(gateway, role.discordRoleId),
  );
  await assertUniqueDiscordRole(liveRole, role.id);
  await db
    .update(Roles)
    .set({
      name: liveRole.name,
      teamHexcodeColor: roleColorToHex(liveRole.color),
    })
    .where(eq(Roles.id, role.id));

  const [users, assignmentRows] = await Promise.all([
    db.select().from(User),
    db
      .select({ id: Permissions.id, userId: Permissions.userId })
      .from(Permissions)
      .where(eq(Permissions.roleId, role.id)),
  ]);
  const assignmentsByUser = new Map<string, string[]>();
  for (const row of assignmentRows) {
    const existing = assignmentsByUser.get(row.userId) ?? [];
    existing.push(row.id);
    assignmentsByUser.set(row.userId, existing);
  }

  const summary = {
    added: 0,
    checked: 0,
    failed: 0,
    removed: 0,
    skipped: 0,
    unchanged: 0,
  };
  for (const user of users) {
    const assignments = assignmentsByUser.get(user.id) ?? [];
    let member: APIGuildMember;
    try {
      member = await gateway.getGuildMember(user.discordUserId, {
        discordRoleId: role.discordRoleId,
        hasAssignment: assignments.length > 0,
      });
      summary.checked += 1;
    } catch (error) {
      if (isDiscordNotFound(error)) summary.skipped += 1;
      else summary.failed += 1;
      continue;
    }

    try {
      if (member.roles.includes(role.discordRoleId)) {
        if (assignments.length === 0) {
          await db
            .insert(Permissions)
            .values({ roleId: role.id, userId: user.id });
          summary.added += 1;
        } else {
          const duplicates = assignments.slice(1);
          if (duplicates.length > 0) {
            await db
              .delete(Permissions)
              .where(inArray(Permissions.id, duplicates));
            summary.removed += duplicates.length;
          }
          summary.unchanged += 1;
        }
      } else if (assignments.length > 0) {
        if (
          isAdministrativePermissionString(role.permissions) &&
          !(await retainsAdministratorAfterAssignmentRevocation(
            role.id,
            user.id,
          ))
        ) {
          summary.failed += 1;
          continue;
        }
        await db
          .delete(Permissions)
          .where(inArray(Permissions.id, assignments));
        summary.removed += assignments.length;
      } else {
        summary.unchanged += 1;
      }
    } catch {
      summary.failed += 1;
    }
  }

  return {
    role: {
      discordRoleId: role.discordRoleId,
      id: role.id,
      name: liveRole.name,
      teamHexcodeColor: roleColorToHex(liveRole.color),
    },
    summary,
  };
}

export async function buildLinkedRoleViews(
  includeDependencies: boolean,
  gateway: RoleDiscordGateway,
) {
  const [roleRows, assignmentRows, discordRoles, memberCounts] =
    await Promise.all([
      db.select().from(Roles),
      getAssignmentRows(),
      gateway.getGuildRoles(),
      gateway.getRoleCounts(),
    ]);
  const liveById = new Map(discordRoles.roles.map((role) => [role.id, role]));
  const assignmentsByRole = new Map<string, Set<string>>();
  for (const assignment of assignmentRows) {
    const users = assignmentsByRole.get(assignment.roleId) ?? new Set<string>();
    users.add(assignment.userId);
    assignmentsByRole.set(assignment.roleId, users);
  }

  const views = await Promise.all(
    roleRows.map(async (role) => {
      const live = liveById.get(role.discordRoleId);
      const dependencies = includeDependencies
        ? await getDependencyCounts(role.id)
        : null;
      return {
        assignmentCount: assignmentsByRole.get(role.id)?.size ?? 0,
        dependencies,
        dependencyCount: dependencies?.total ?? 0,
        discordRoleId: role.discordRoleId,
        id: role.id,
        isCosmetic: isCosmeticPermissionString(role.permissions),
        isMissing: discordRoles.available && !live,
        memberCount: memberCounts?.[role.discordRoleId] ?? null,
        name: live?.name ?? role.name,
        permissions: permissionBitstringToKeys(role.permissions),
        position: live?.position ?? -1,
        storedName: role.name,
        syncState: discordRoles.available
          ? live
            ? "available"
            : "missing"
          : "unavailable",
        teamHexcodeColor: live
          ? roleColorToHex(live.color)
          : role.teamHexcodeColor,
      };
    }),
  );
  return views.sort(
    (left, right) =>
      right.position - left.position || left.name.localeCompare(right.name),
  );
}
