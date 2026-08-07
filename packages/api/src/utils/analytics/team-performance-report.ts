import type { TeamPerformanceReportInput } from "@forge/validators";
import { EVENTS } from "@forge/consts";
import { and, eq, gte, inArray, isNull, lt, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, User } from "@forge/db/schemas/auth";
import { DiscordArchiveMessage } from "@forge/db/schemas/discord";
import {
  Event,
  EventAttendee,
  Issue,
  IssuesToUsersAssignment,
  Member,
} from "@forge/db/schemas/knight-hacks";
import { getKnightHacksGuildId } from "@forge/utils/discord-config";

import { dateInCalendarTimeZone } from "../discord/engagement";
import { calculateActivityStreaks } from "../discord/streaks";
import {
  getClubRoleBuckets,
  loadClubTeamConfig,
} from "../guild/club-team-config";
import { resolveAnalyticsPeriod } from "./report";

const TEAM_PERFORMANCE_METRIC_VERSION = "team-performance-v1";

interface IssueMetricRow extends Record<string, unknown> {
  assignedCount: number;
  finishedCount: number;
  openCount: number;
  overdueCount: number;
  userId: string;
}

interface DiscordMetricRow extends Record<string, unknown> {
  activeChannelCount: number;
  activeDayCount: number;
  discordUserId: string;
  lastMessageAt: Date | string | null;
  messageCount: number;
}

interface DiscordActivityRow extends Record<string, unknown> {
  date: string;
  discordUserId: string;
}

interface EventMetricRow extends Record<string, unknown> {
  checkInCount: number;
  distinctEventCount: number;
  lastEventAt: Date | string | null;
  memberId: string;
  pointsAwarded: number;
}

function dateOrNull(value: Date | string | null) {
  if (value === null) return null;
  return value instanceof Date ? value : new Date(value);
}

export async function listTeamPerformanceOptions() {
  const config = await loadClubTeamConfig();
  const teamDefinitions = config.teams.filter((team) => team.kind === "team");
  const teamRoleIds = new Map(
    teamDefinitions.map((team) => [
      team.slug,
      [...config.rolesById.values()]
        .filter((role) =>
          getClubRoleBuckets(config, role).some(
            (bucket) => bucket.teamSlug === team.slug,
          ),
        )
        .map((role) => role.roleId),
    ]),
  );
  const allRoleIds = [...new Set([...teamRoleIds.values()].flat())];
  const permissionRows =
    allRoleIds.length === 0
      ? []
      : await db
          .selectDistinct({
            roleId: Permissions.roleId,
            userId: Permissions.userId,
          })
          .from(Permissions)
          .where(inArray(Permissions.roleId, allRoleIds));

  return {
    defaultTeamSlug: teamDefinitions[0]?.slug ?? null,
    options: teamDefinitions.map((team) => {
      const roleIds = new Set(teamRoleIds.get(team.slug) ?? []);
      return {
        heading: team.heading,
        id: team.slug,
        label: team.label,
        memberCount: new Set(
          permissionRows
            .filter((row) => roleIds.has(row.roleId))
            .map((row) => row.userId),
        ).size,
      };
    }),
  };
}

export async function getTeamPerformanceReport(
  input: TeamPerformanceReportInput,
  now = new Date(),
) {
  const [config, guildId] = await Promise.all([
    loadClubTeamConfig(),
    getKnightHacksGuildId(),
  ]);
  const team = config.teams.find(
    (candidate) =>
      candidate.kind === "team" && candidate.slug === input.teamSlug,
  );
  if (!team) return null;

  const teamRoles = [...config.rolesById.values()].filter((role) =>
    getClubRoleBuckets(config, role).some(
      (bucket) => bucket.teamSlug === team.slug,
    ),
  );
  const roleIds = teamRoles.map((role) => role.roleId);
  const period = resolveAnalyticsPeriod(input.period, now);
  const overdueAt =
    period.observationEnd.getTime() < now.getTime()
      ? period.observationEnd
      : now;
  const rosterRows =
    roleIds.length === 0
      ? []
      : await db
          .selectDistinct({
            discordUser: Member.discordUser,
            discordUserId: User.discordUserId,
            firstName: Member.firstName,
            lastName: Member.lastName,
            memberId: Member.id,
            roleId: Permissions.roleId,
            userDisplayName: User.name,
            userId: User.id,
          })
          .from(Permissions)
          .innerJoin(User, eq(User.id, Permissions.userId))
          .leftJoin(Member, eq(Member.userId, User.id))
          .where(inArray(Permissions.roleId, roleIds));
  const userIds = [...new Set(rosterRows.map((row) => row.userId))];
  const discordUserIds = [
    ...new Set(
      rosterRows
        .map((row) => row.discordUserId)
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  const memberIds = [
    ...new Set(
      rosterRows
        .map((row) => row.memberId)
        .filter((value): value is string => value !== null),
    ),
  ];
  const discordPeriodConditions = [
    eq(DiscordArchiveMessage.guildId, guildId),
    period.start
      ? gte(DiscordArchiveMessage.createdAt, period.start)
      : undefined,
    lt(DiscordArchiveMessage.createdAt, period.observationEnd),
    isNull(DiscordArchiveMessage.deletedAt),
    eq(DiscordArchiveMessage.authorIsBot, false),
    isNull(DiscordArchiveMessage.webhookId),
    isNull(DiscordArchiveMessage.applicationId),
    eq(DiscordArchiveMessage.messageType, 0),
  ];

  const [issueResult, discordResult, discordActivityResult, eventResult] =
    await Promise.all([
      userIds.length === 0 || roleIds.length === 0
        ? Promise.resolve({ rows: [] as IssueMetricRow[] })
        : db.execute<IssueMetricRow>(sql`
            select
              count(distinct ${Issue.id})::int as "assignedCount",
              count(distinct ${Issue.id}) filter (where ${Issue.status} = 'Finished')::int
                as "finishedCount",
              count(distinct ${Issue.id}) filter (where ${Issue.status} <> 'Finished')::int
                as "openCount",
              count(distinct ${Issue.id}) filter (
                where ${Issue.status} <> 'Finished' and ${Issue.dueAt} < ${overdueAt}
              )::int as "overdueCount",
              ${IssuesToUsersAssignment.userId} as "userId"
            from ${IssuesToUsersAssignment}
            inner join ${Issue}
              on ${Issue.id} = ${IssuesToUsersAssignment.issueId}
            where ${inArray(IssuesToUsersAssignment.userId, userIds)}
              and ${inArray(Issue.team, roleIds)}
              ${period.start ? sql`and ${Issue.createdAt} >= ${period.start}` : sql``}
              and ${Issue.createdAt} < ${period.observationEnd}
            group by ${IssuesToUsersAssignment.userId}
          `),
      discordUserIds.length === 0
        ? Promise.resolve({ rows: [] as DiscordMetricRow[] })
        : db.execute<DiscordMetricRow>(sql`
            select
              count(distinct ${DiscordArchiveMessage.channelId})::int
                as "activeChannelCount",
              count(distinct (${DiscordArchiveMessage.createdAt} at time zone ${EVENTS.CALENDAR_TIME_ZONE})::date)::int
                as "activeDayCount",
              ${DiscordArchiveMessage.authorDiscordUserId} as "discordUserId",
              max(${DiscordArchiveMessage.createdAt}) as "lastMessageAt",
              count(*)::int as "messageCount"
            from ${DiscordArchiveMessage}
            where ${and(
              ...discordPeriodConditions,
              inArray(
                DiscordArchiveMessage.authorDiscordUserId,
                discordUserIds,
              ),
            )}
            group by ${DiscordArchiveMessage.authorDiscordUserId}
          `),
      discordUserIds.length === 0
        ? Promise.resolve({ rows: [] as DiscordActivityRow[] })
        : db.execute<DiscordActivityRow>(sql`
            select distinct
              to_char(
                ${DiscordArchiveMessage.createdAt} at time zone ${EVENTS.CALENDAR_TIME_ZONE},
                'YYYY-MM-DD'
              ) as date,
              ${DiscordArchiveMessage.authorDiscordUserId} as "discordUserId"
            from ${DiscordArchiveMessage}
            where ${and(
              ...discordPeriodConditions,
              inArray(
                DiscordArchiveMessage.authorDiscordUserId,
                discordUserIds,
              ),
            )}
          `),
      memberIds.length === 0
        ? Promise.resolve({ rows: [] as EventMetricRow[] })
        : db.execute<EventMetricRow>(sql`
            select
              count(${EventAttendee.id})::int as "checkInCount",
              count(distinct ${Event.id})::int as "distinctEventCount",
              max(${Event.start_datetime}) as "lastEventAt",
              ${EventAttendee.memberId} as "memberId",
              coalesce(sum(${EventAttendee.pointsAwarded}), 0)::int as "pointsAwarded"
            from ${EventAttendee}
            inner join ${Event} on ${Event.id} = ${EventAttendee.eventId}
            where ${inArray(EventAttendee.memberId, memberIds)}
              and ${Event.hackathonId} is null
              ${period.start ? sql`and ${Event.start_datetime} >= ${period.start}` : sql``}
              and ${Event.start_datetime} < ${period.observationEnd}
            group by ${EventAttendee.memberId}
          `),
    ]);

  const issuesByUser = new Map(
    issueResult.rows.map((row) => [row.userId, row]),
  );
  const discordByUser = new Map(
    discordResult.rows.map((row) => [row.discordUserId, row]),
  );
  const activityByUser = new Map<string, string[]>();
  for (const row of discordActivityResult.rows) {
    activityByUser.set(row.discordUserId, [
      ...(activityByUser.get(row.discordUserId) ?? []),
      row.date,
    ]);
  }
  const eventsByMember = new Map(
    eventResult.rows.map((row) => [row.memberId, row]),
  );
  const roleById = new Map(teamRoles.map((role) => [role.roleId, role]));
  const observationDate = dateInCalendarTimeZone(
    new Date(period.observationEnd.getTime() - 1),
  );
  const rosterByUser = new Map<string, typeof rosterRows>();
  for (const row of rosterRows) {
    rosterByUser.set(row.userId, [
      ...(rosterByUser.get(row.userId) ?? []),
      row,
    ]);
  }

  const members = [...rosterByUser.entries()]
    .map(([userId, rows]) => {
      const person = rows[0];
      if (!person) return null;
      const issue = issuesByUser.get(userId);
      const discord = discordByUser.get(person.discordUserId);
      const event = person.memberId
        ? eventsByMember.get(person.memberId)
        : undefined;
      const streaks = calculateActivityStreaks(
        activityByUser.get(person.discordUserId) ?? [],
        observationDate,
      );
      const roles = [...new Set(rows.map((row) => row.roleId))].flatMap(
        (roleId) => {
          const role = roleById.get(roleId);
          if (!role) return [];
          const bucket = getClubRoleBuckets(config, role).find(
            (candidate) => candidate.teamSlug === team.slug,
          );
          return bucket
            ? [{ id: role.roleId, label: bucket.teamRole, name: role.roleName }]
            : [];
        },
      );

      return {
        discord: {
          activeChannelCount: discord?.activeChannelCount ?? 0,
          activeDayCount: discord?.activeDayCount ?? 0,
          ...streaks,
          lastMessageAt: dateOrNull(discord?.lastMessageAt ?? null),
          messageCount: discord?.messageCount ?? 0,
        },
        discordUser: person.discordUser,
        events: {
          checkInCount: event?.checkInCount ?? 0,
          distinctEventCount: event?.distinctEventCount ?? 0,
          lastEventAt: dateOrNull(event?.lastEventAt ?? null),
          pointsAwarded: event?.pointsAwarded ?? 0,
        },
        issues: {
          assignedCount: issue?.assignedCount ?? 0,
          finishedCount: issue?.finishedCount ?? 0,
          openCount: issue?.openCount ?? 0,
          overdueCount: issue?.overdueCount ?? 0,
        },
        memberId: person.memberId,
        name:
          [person.firstName, person.lastName].filter(Boolean).join(" ") ||
          person.userDisplayName ||
          "Unknown member",
        roles,
        userId,
      };
    })
    .filter((member): member is NonNullable<typeof member> => member !== null)
    .sort(
      (left, right) =>
        right.issues.assignedCount - left.issues.assignedCount ||
        right.discord.activeDayCount - left.discord.activeDayCount ||
        right.events.distinctEventCount - left.events.distinctEventCount ||
        left.name.localeCompare(right.name),
    );

  return {
    members,
    metadata: {
      generatedAt: now,
      metricVersion: TEAM_PERFORMANCE_METRIC_VERSION,
      period: {
        kind: period.kind,
        label: period.label,
        observationEnd: period.observationEnd,
        start: period.start,
      },
      team: {
        heading: team.heading,
        id: team.slug,
        label: team.label,
      },
    },
    summary: {
      assignedIssueCount: members.reduce(
        (total, member) => total + member.issues.assignedCount,
        0,
      ),
      discordParticipantCount: members.filter(
        (member) => member.discord.messageCount > 0,
      ).length,
      distinctEventAttendanceCount: members.reduce(
        (total, member) => total + member.events.distinctEventCount,
        0,
      ),
      memberCount: members.length,
    },
  };
}
