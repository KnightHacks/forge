import { WebhookClient } from "discord.js";
import { and, inArray, isNotNull, ne } from "drizzle-orm";

import { db } from "@forge/db/client";
import { Roles } from "@forge/db/schemas/auth";
import { Issue } from "@forge/db/schemas/knight-hacks";
import { logger } from "@forge/utils";

import { env } from "../env";
import { CronBuilder } from "../structs/CronBuilder";

const ISSUE_REMINDER_WEBHOOK_URLS = {
  Teams: env.DISCORD_WEBHOOK_ISSUE_TEAMS,
  Directors: env.DISCORD_WEBHOOK_ISSUE_DIRECTORS,
  Design: env.DISCORD_WEBHOOK_ISSUE_DESIGN,
  HackOrg: env.DISCORD_WEBHOOK_ISSUE_HACKORG,
} as const;

const ISSUE_REMINDER_CHANNELS = {
  Teams: "Teams",
  Directors: "Directors",
  Design: "Design",
  HackOrg: "HackOrg",
} as const;

const ISSUE_TEAM_CHANNEL_MAP: Record<
  string,
  keyof typeof ISSUE_REMINDER_CHANNELS
> = {
  "16ced653-dafd-46bc-a6ef-8f4fba6a6b46": "Teams",
  "f4f544bf-7c69-43c1-b4b4-0585e73268a7": "Teams",
  "9fc780ed-3c84-4e9a-bd10-b5c2be51f5a8": "Teams",
  "b86a437b-0789-4ec4-8011-5ddde24865dc": "Directors",
  "3b03b15d-4368-49e6-86c9-48c11775430b": "Design",
  "110f5d0c-3299-46f6-b057-ae2ce28d4778": "HackOrg",
};

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
  channel: keyof typeof ISSUE_REMINDER_CHANNELS;
  day: IssueReminderDay;
  overdueDays: number | null;
}

type GroupedIssueReminders = Partial<
  Record<
    keyof typeof ISSUE_REMINDER_CHANNELS,
    Partial<Record<IssueReminderDay, IssueReminderTarget[]>>
  >
>;

const MAX_DISCORD_MESSAGE_LENGTH = 2000;
const ISSUE_REMINDER_TIMEZONE = "America/New_York";

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

const getIssueReminderChannel = (
  teamId: string,
): keyof typeof ISSUE_REMINDER_CHANNELS | null => {
  const channel = ISSUE_TEAM_CHANNEL_MAP[teamId] ?? null;
  if (!channel) {
    logger.warn(
      `Skipping issue reminder: no channel mapping for team ${teamId}.`,
    );
  }
  return channel;
};

const buildIssueReminderTarget = (issue: {
  id: string;
  name: string;
  team: string;
  date: Date | null;
  teamDiscordRoleId: string;
  assigneeDiscordUserIds: string[];
}): IssueReminderTarget | null => {
  if (!issue.date) return null;
  const channel = getIssueReminderChannel(issue.team);
  if (!channel) return null;
  const day = getIssueReminderDay(issue.date);
  if (!day) return null;
  if (!issue.teamDiscordRoleId) return null;
  return {
    issueId: issue.id,
    issueName: issue.name,
    teamId: issue.team,
    teamDiscordRoleId: issue.teamDiscordRoleId,
    assigneeDiscordUserIds: issue.assigneeDiscordUserIds,
    channel,
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
    grouped[t.channel] ??= {};
    const channelGroup = grouped[t.channel];
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
  return `- [${issueTitle}](<${issueUrl}>)${overdueSuffix} ${mentions}`;
};

const truncateReminderLine = (line: string, maxLength: number): string => {
  if (line.length <= maxLength) return line;
  if (maxLength <= 1) return "…";
  return `${line.slice(0, maxLength - 1)}…`;
};

const getIssueUrl = (issueId: string): string => {
  return `${env.BLADE_URL.replace(/\/$/, "")}/issues/${issueId}`;
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
    const nextContent = `${currentContent}\n\n${sectionContent}`;

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
  channel: keyof typeof ISSUE_REMINDER_CHANNELS,
  webhookUrl: string,
  chunk: { content: string; targets: IssueReminderTarget[] },
) => {
  const webhook = new WebhookClient({ url: webhookUrl });
  try {
    await webhook.send({
      content: chunk.content,
      allowedMentions: getAllowedMentions(chunk.targets),
    });
  } catch (error) {
    logger.error(`Failed sending issue reminder chunk for ${channel}.`, error);
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
    })
    .from(Roles)
    .where(inArray(Roles.id, teamIds));

  const roleDiscordIdByTeamId: Record<string, string> = {};
  for (const r of roles) {
    roleDiscordIdByTeamId[r.id] = r.discordRoleId;
  }
  const reminderTargets = issues
    .map((issue) =>
      buildIssueReminderTarget({
        id: issue.id,
        name: issue.name,
        team: issue.team,
        date: issue.date,
        teamDiscordRoleId: roleDiscordIdByTeamId[issue.team] ?? "",
        assigneeDiscordUserIds: issue.userAssignments.map(
          (assignment) => assignment.user.discordUserId,
        ),
      }),
    )
    .filter(isIssueReminderTarget);

  const groupedReminders = groupIssueReminderTargets(reminderTargets);
  for (const channel of Object.keys(
    ISSUE_REMINDER_CHANNELS,
  ) as (keyof typeof ISSUE_REMINDER_CHANNELS)[]) {
    const groupedChannel = groupedReminders[channel];
    if (!groupedChannel) continue;

    if (!ISSUE_REMINDER_WEBHOOK_URLS[channel]) {
      logger.warn(
        `Skipping issue reminders for ${channel}: webhook URL is not configured.`,
      );
      continue;
    }

    const chunks = splitChannelReminderMessages(groupedChannel);
    if (chunks.length === 0) continue;

    for (const chunk of chunks) {
      await sendIssueReminderChunk(
        channel,
        ISSUE_REMINDER_WEBHOOK_URLS[channel],
        chunk,
      );
    }
  }
});
