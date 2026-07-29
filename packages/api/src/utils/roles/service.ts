import type { APIGuildMember, APIRole } from "discord-api-types/v10";
import { TRPCError } from "@trpc/server";

import { eq, inArray, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, Roles, User } from "@forge/db/schemas/auth";
import {
  Event,
  EventFeedbackConfig,
  FormResponseRoles,
  FormSectionRoles,
  Issue,
  IssuesToTeamsVisibility,
  Member,
} from "@forge/db/schemas/knight-hacks";
import { getKnightHacksGuildId } from "@forge/utils/discord-config";

import type { RoleDiscordGateway } from "./discord-gateway";
import {
  isAdministrativePermissionString,
  isCosmeticPermissionString,
  permissionBitstringToKeys,
  retainsAssignedRoleAdministrator,
  retainsAssignedRoleAdministratorAfterRevocations,
  roleColorToHex,
} from "./management";

export async function getDiscordRole(
  gateway: RoleDiscordGateway,
  roleId: string,
) {
  const guildRoles = await gateway.getGuildRoles();
  if (!guildRoles.available) return null;
  return guildRoles.roles.find((role) => role.id === roleId) ?? null;
}

/**
 * `guildId` is a parameter rather than a lookup so this stays synchronous and
 * database-free, matching `filterDiscordRolesForLinking`. The guild's own ID
 * doubles as the `@everyone` role ID, which is never linkable.
 */
export function assertEligibleDiscordRole(
  role: APIRole | null,
  guildId: string,
) {
  if (!role) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "That Discord role could not be found.",
    });
  }
  if (role.id === guildId || role.managed) {
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

/**
 * Past events that stop being readable for feedback analytics and CSV export if
 * this role is excluded.
 *
 * Every clause is load bearing, and the number is deliberately smaller than
 * "events touching this role":
 *
 * - `hackathonId IS NULL` and the role membership are what `isQualifyingEvent`
 *   tests, so they are what excluding the role actually changes.
 * - `end_datetime <= now()` because the officer is warned about *past* events.
 * - the feedback-config join, because that row is what collection hangs off:
 *   no config, no form, no responses. Such an event has nothing to lose, and
 *   naming it inflates the number and makes the warning easier to dismiss.
 * - the no-other-excluded-role clause, because `isQualifyingEvent` fails on any
 *   protected role. An event already carrying a flagged role is already
 *   unreadable, so counting it would bill this toggle for a loss that has
 *   already happened.
 *
 * Lives here rather than in `buildLinkedRoleViews`, which runs a per-role
 * `await` inside a `map` and backs the roles *list* page — one query per linked
 * role, on every list render, for a number one dialog reads.
 */
export async function countFeedbackExclusionImpact(
  roleId: string,
  executor: DbExecutor = db,
) {
  const rows = await executor
    .select({ id: Event.id })
    .from(Event)
    .innerJoin(EventFeedbackConfig, eq(EventFeedbackConfig.eventId, Event.id))
    .where(
      sql`${Event.hackathonId} IS NULL
        AND ${roleId} = ANY(${Event.roles})
        AND ${Event.end_datetime} <= now()
        AND NOT EXISTS (
          SELECT 1 FROM ${Roles}
          WHERE ${Roles.eventFeedbackExcluded} = true
            AND ${Roles.id} <> ${roleId}
            AND ${Roles.id}::text = ANY(${Event.roles})
        )`,
    );

  return rows.length;
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
    await getKnightHacksGuildId(),
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
    db
      .select({
        discordUserId: User.discordUserId,
        id: User.id,
        memberId: Member.id,
        name: User.name,
      })
      .from(User)
      .leftJoin(Member, eq(Member.userId, User.id)),
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
  const results: {
    effect: "added" | "removed" | "unchanged";
    memberId: string | null;
    outcome: "failed_external" | "failed_internal" | "skipped" | "succeeded";
    userId: string;
    userLabel: string;
  }[] = [];
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
      if (isDiscordNotFound(error)) {
        summary.skipped += 1;
        results.push({
          effect: "unchanged",
          memberId: user.memberId,
          outcome: "skipped",
          userId: user.id,
          userLabel: user.name ?? user.discordUserId,
        });
      } else {
        summary.failed += 1;
        results.push({
          effect: "unchanged",
          memberId: user.memberId,
          outcome: "failed_external",
          userId: user.id,
          userLabel: user.name ?? user.discordUserId,
        });
      }
      continue;
    }

    try {
      if (member.roles.includes(role.discordRoleId)) {
        if (assignments.length === 0) {
          await db
            .insert(Permissions)
            .values({ roleId: role.id, userId: user.id });
          summary.added += 1;
          results.push({
            effect: "added",
            memberId: user.memberId,
            outcome: "succeeded",
            userId: user.id,
            userLabel: user.name ?? user.discordUserId,
          });
        } else {
          const duplicates = assignments.slice(1);
          if (duplicates.length > 0) {
            await db
              .delete(Permissions)
              .where(inArray(Permissions.id, duplicates));
            summary.removed += duplicates.length;
          }
          summary.unchanged += 1;
          results.push({
            effect: duplicates.length > 0 ? "removed" : "unchanged",
            memberId: user.memberId,
            outcome: duplicates.length > 0 ? "succeeded" : "skipped",
            userId: user.id,
            userLabel: user.name ?? user.discordUserId,
          });
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
          results.push({
            effect: "unchanged",
            memberId: user.memberId,
            outcome: "failed_internal",
            userId: user.id,
            userLabel: user.name ?? user.discordUserId,
          });
          continue;
        }
        await db
          .delete(Permissions)
          .where(inArray(Permissions.id, assignments));
        summary.removed += assignments.length;
        results.push({
          effect: "removed",
          memberId: user.memberId,
          outcome: "succeeded",
          userId: user.id,
          userLabel: user.name ?? user.discordUserId,
        });
      } else {
        summary.unchanged += 1;
        results.push({
          effect: "unchanged",
          memberId: user.memberId,
          outcome: "skipped",
          userId: user.id,
          userLabel: user.name ?? user.discordUserId,
        });
      }
    } catch {
      summary.failed += 1;
      results.push({
        effect: "unchanged",
        memberId: user.memberId,
        outcome: "failed_internal",
        userId: user.id,
        userLabel: user.name ?? user.discordUserId,
      });
    }
  }

  return {
    role: {
      discordRoleId: role.discordRoleId,
      id: role.id,
      name: liveRole.name,
      teamHexcodeColor: roleColorToHex(liveRole.color),
    },
    results,
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
        emailAudienceEnabled: role.emailAudienceEnabled,
        // Free: the select above already reads the whole row. The *count* of
        // affected past events is not here — see `countFeedbackExclusionImpact`.
        eventFeedbackExcluded: role.eventFeedbackExcluded,
        id: role.id,
        isCosmetic: isCosmeticPermissionString(role.permissions),
        isMissing: discordRoles.available && !live,
        issueReminderChannel: role.issueReminderChannel,
        issueRemindersEnabled: role.issueRemindersEnabled,
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
