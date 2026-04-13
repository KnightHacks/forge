import { Routes } from "discord-api-types/v10";
import { and, inArray, isNotNull, ne } from "drizzle-orm";

import { IS_PROD, ISSUE } from "@forge/consts";
import { db } from "@forge/db/client";
import { Roles } from "@forge/db/schemas/auth";
import { Issue } from "@forge/db/schemas/knight-hacks";
import { logger } from "@forge/utils";
import { api } from "@forge/utils/discord";

import { env } from "../env";
import { CronBuilder } from "../structs/CronBuilder";

const ISSUE_REMINDER_DAYS = {
  Fourteen: "Fourteen",
  Seven: "Seven",
  Three: "Three",
  One: "One",
  Overdue: "Overdue",
} as const;

const ISSUE_REMINDER_DAY_LABELS: Record<IssueReminderDay, string> = {
  Fourteen: "Due in 14 days",
  Seven: "Due in 7 days",
  Three: "Due in 3 days",
  One: "Due in 1 day",
  Overdue: "Overdue",
};

const ISSUE_REMINDER_DAY_ORDER: IssueReminderDay[] = [
  "Fourteen",
  "Seven",
  "Three",
  "One",
  "Overdue",
];

type IssueReminderDay =
  (typeof ISSUE_REMINDER_DAYS)[keyof typeof ISSUE_REMINDER_DAYS];

interface IssueReminderTarget {
  issueId: string;
  issueName: string;
  teamId: string;
  teamDiscordRoleId: string;
  assigneeDiscordUserIds: string[];
  discordChannelId: string;
  day: IssueReminderDay;
  overdueDays: number | null;
}

type GroupedIssueReminders = Partial<
  Record<string, Partial<Record<IssueReminderDay, IssueReminderTarget[]>>>
>;

const MAX_DISCORD_MESSAGE_LENGTH = 2000;
const ISSUE_REMINDER_TIMEZONE = "America/New_York";

const resolveDestinationChannelId = (roleChannelId: string): string => {
  if (!IS_PROD) return ISSUE.DEV_ISSUE_REMINDER_CHANNEL_ID;
  return roleChannelId || ISSUE.DEFAULT_ISSUE_REMINDER_CHANNEL_ID;
};

const getTimezoneMidnightTimestamp = (date: Date, timeZone: string): number => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return Date.UTC(year, month - 1, day);
};

const getIssueReminderDay = (
  date: Date,
  now = new Date(),
): IssueReminderDay | null => {
  const diffDays = getIssueReminderDiffDays(date, now);

  if (diffDays === 14) return ISSUE_REMINDER_DAYS.Fourteen;
  if (diffDays === 7) return ISSUE_REMINDER_DAYS.Seven;
  if (diffDays === 3) return ISSUE_REMINDER_DAYS.Three;
  if (diffDays === 1) return ISSUE_REMINDER_DAYS.One;
  if (diffDays < 0) return ISSUE_REMINDER_DAYS.Overdue;
  return null;
};

const getIssueReminderDiffDays = (date: Date, now = new Date()): number => {
  const diffMs =
    getTimezoneMidnightTimestamp(date, ISSUE_REMINDER_TIMEZONE) -
    getTimezoneMidnightTimestamp(now, ISSUE_REMINDER_TIMEZONE);
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
};

const buildIssueReminderTarget = (issue: {
  id: string;
  name: string;
  team: string;
  date: Date | null;
  teamDiscordRoleId: string;
  assigneeDiscordUserIds: string[];
  discordChannelId: string;
}): IssueReminderTarget | null => {
  if (!issue.date) return null;
  const day = getIssueReminderDay(issue.date);
  if (!day) return null;
  if (!issue.teamDiscordRoleId) return null;
  return {
    issueId: issue.id,
    issueName: issue.name,
    teamId: issue.team,
    teamDiscordRoleId: issue.teamDiscordRoleId,
    assigneeDiscordUserIds: issue.assigneeDiscordUserIds,
    discordChannelId: issue.discordChannelId,
    day,
    overdueDays:
      day === ISSUE_REMINDER_DAYS.Overdue
        ? Math.abs(getIssueReminderDiffDays(issue.date))
        : null,
  };
};

const getIssueMentionTargets = (target: IssueReminderTarget): string[] => {
  if (target.assigneeDiscordUserIds.length > 0)
    return target.assigneeDiscordUserIds.map((id) => `<@${id}>`);
  return [`<@&${target.teamDiscordRoleId}>`];
};

const groupIssueReminderTargets = (
  targets: IssueReminderTarget[],
): GroupedIssueReminders => {
  const grouped: GroupedIssueReminders = {};
  for (const t of targets) {
    grouped[t.discordChannelId] ??= {};
    const channelGroup = grouped[t.discordChannelId];
    if (!channelGroup) continue;
    channelGroup[t.day] ??= [];
    const dayGroup = channelGroup[t.day];
    if (!dayGroup) continue;
    dayGroup.push(t);
  }
  return grouped;
};

const isIssueReminderTarget = (
  val: IssueReminderTarget | null,
): val is IssueReminderTarget => {
  return val !== null;
};

const sanitizeIssueReminderTitle = (title: string): string => {
  return title
    .replace(/\r?\n+/g, " ")
    .replace(/<@&?/g, "<@\u200b")
    .replace(/<!/g, "<!\u200b")
    .replace(/@everyone/g, "@\u200beveryone")
    .replace(/@here/g, "@\u200bhere")
    .trim();
};

const formatIssueReminder = (target: IssueReminderTarget): string => {
  const mentions = getIssueMentionTargets(target).join(", ");
  const issueUrl = getIssueUrl(target.issueId);
  const issueTitle = sanitizeIssueReminderTitle(target.issueName);
  const overdueSuffix =
    target.day === ISSUE_REMINDER_DAYS.Overdue && target.overdueDays !== null
      ? ` (${target.overdueDays} days)`
      : "";
  return `[${issueTitle}](<${issueUrl}>)${overdueSuffix} ${mentions}`;
};

const truncateReminderLine = (line: string, maxLength: number): string => {
  if (line.length <= maxLength) return line;
  if (maxLength <= 1) return "…";
  return `${line.slice(0, maxLength - 1)}…`;
};

const getIssueUrl = (issueId: string): string => {
  return `${env.BLADE_URL.replace(/\/$/, "")}/admin/issues/${issueId}`;
};

const getAllowedMentions = (
  targets: IssueReminderTarget[],
): {
  parse: [];
  users?: string[];
  roles?: string[];
} => {
  const userIds = [
    ...new Set(targets.flatMap((target) => target.assigneeDiscordUserIds)),
  ];
  const roleIds =
    userIds.length === 0
      ? [...new Set(targets.map((target) => target.teamDiscordRoleId))]
      : [];

  return {
    parse: [],
    ...(userIds.length > 0 ? { users: userIds } : {}),
    ...(roleIds.length > 0 ? { roles: roleIds } : {}),
  };
};

const formatIssueReminderEmbedDescription = (content: string): string => {
  return content
    .replace(/^# Issue Reminders\n?/, "")
    .replace(/^## (.+)$/gm, "**$1**")
    .trim();
};

const splitChannelReminderMessages = (
  grouped: Partial<Record<IssueReminderDay, IssueReminderTarget[]>>,
): { content: string; targets: IssueReminderTarget[] }[] => {
  const chunks: { content: string; targets: IssueReminderTarget[] }[] = [];
  let currentContent = "# Issue Reminders";
  let currentTargets: IssueReminderTarget[] = [];

  for (const day of ISSUE_REMINDER_DAY_ORDER) {
    const targets = grouped[day];
    if (!targets || targets.length === 0) continue;

    const sectionLines = targets.map(formatIssueReminder);
    const sectionContent = `## ${ISSUE_REMINDER_DAY_LABELS[day]}\n${sectionLines.join("\n")}`;
    const nextContent = `${currentContent}\n${sectionContent}`;

    if (nextContent.length <= MAX_DISCORD_MESSAGE_LENGTH) {
      currentContent = nextContent;
      currentTargets.push(...targets);
      continue;
    }

    if (currentTargets.length > 0) {
      chunks.push({ content: currentContent, targets: currentTargets });
    }

    let sectionChunkContent = `# Issue Reminders\n\n## ${ISSUE_REMINDER_DAY_LABELS[day]}`;
    let sectionChunkTargets: IssueReminderTarget[] = [];
    const sectionHeaderLength = `${sectionChunkContent}\n`.length;

    for (let index = 0; index < sectionLines.length; index++) {
      const line = truncateReminderLine(
        sectionLines[index] ?? "",
        MAX_DISCORD_MESSAGE_LENGTH - sectionHeaderLength,
      );
      const target = targets[index];
      if (!target) continue;
      const nextSectionChunkContent = `${sectionChunkContent}\n${line}`;
      if (nextSectionChunkContent.length > MAX_DISCORD_MESSAGE_LENGTH) {
        if (sectionChunkTargets.length > 0) {
          chunks.push({
            content: sectionChunkContent,
            targets: sectionChunkTargets,
          });
        }

        sectionChunkContent = `# Issue Reminders\n\n## ${ISSUE_REMINDER_DAY_LABELS[day]}\n${line}`;
        sectionChunkTargets = [target];
        continue;
      }

      sectionChunkContent = nextSectionChunkContent;
      sectionChunkTargets.push(target);
    }

    currentContent = sectionChunkContent;
    currentTargets = sectionChunkTargets;
  }

  if (currentTargets.length > 0) {
    chunks.push({ content: currentContent, targets: currentTargets });
  }

  return chunks;
};

const sendIssueReminderChunk = async (
  channelId: string,
  chunk: { content: string; targets: IssueReminderTarget[] },
) => {
  try {
    await api.post(Routes.channelMessages(channelId), {
      body: {
        embeds: [
          {
            title: "Issue Reminders",
            description: formatIssueReminderEmbedDescription(chunk.content),
            color: 0xcca4f4,
          },
        ],
        allowed_mentions: getAllowedMentions(chunk.targets),
      },
    });
  } catch (error) {
    logger.error(
      `Failed sending issue reminder chunk for channel ${channelId}.`,
      error,
    );
  }
};

export const issueReminders = new CronBuilder({
  name: "issue-reminders",
  color: 2,
}).addCron("0 9 * * *", async () => {
  const issues = await db.query.Issue.findMany({
    where: and(isNotNull(Issue.date), ne(Issue.status, "FINISHED")),
    with: {
      userAssignments: {
        with: {
          user: true,
        },
      },
    },
  });
  if (issues.length === 0) return;

  const teamIds = [...new Set(issues.map((issue) => issue.team))];
  const roles = await db
    .select({
      id: Roles.id,
      discordRoleId: Roles.discordRoleId,
      issueReminderChannel: Roles.issueReminderChannel,
    })
    .from(Roles)
    .where(inArray(Roles.id, teamIds));

  const roleDataByTeamId: Record<
    string,
    {
      discordRoleId: string;
      issueReminderChannel: string;
    }
  > = {};
  for (const r of roles) {
    roleDataByTeamId[r.id] = {
      discordRoleId: r.discordRoleId,
      issueReminderChannel: r.issueReminderChannel,
    };
  }
  const reminderTargets = issues
    .map((issue) => {
      const role = roleDataByTeamId[issue.team];
      if (!role) {
        logger.warn(
          `Skipping issue reminder: no role row for team ${issue.team}.`,
        );
        return null;
      }
      const discordChannelId = resolveDestinationChannelId(
        role.issueReminderChannel,
      );
      return buildIssueReminderTarget({
        id: issue.id,
        name: issue.name,
        team: issue.team,
        date: issue.date,
        teamDiscordRoleId: role.discordRoleId,
        assigneeDiscordUserIds: issue.userAssignments.map(
          (assignment) => assignment.user.discordUserId,
        ),
        discordChannelId,
      });
    })
    .filter(isIssueReminderTarget);

  const groupedReminders = groupIssueReminderTargets(reminderTargets);
  for (const [channelId, groupedChannel] of Object.entries(groupedReminders)) {
    if (!groupedChannel) continue;

    const chunks = splitChannelReminderMessages(groupedChannel);
    if (chunks.length === 0) continue;

    for (const chunk of chunks) {
      await sendIssueReminderChunk(channelId, chunk);
    }
  }
});
