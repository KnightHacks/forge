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
}

type GroupedIssueReminders = Partial<
  Record<
    keyof typeof ISSUE_REMINDER_CHANNELS,
    Partial<Record<IssueReminderDay, IssueReminderTarget[]>>
  >
>;

const getIssueReminderDay = (
  date: Date,
  now = new Date(),
): IssueReminderDay | null => {
  const dueDate = new Date(date);
  dueDate.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const diffMs = dueDate.getTime() - today.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 14) return ISSUE_REMINDER_DAYS.Fourteen;
  if (diffDays === 7) return ISSUE_REMINDER_DAYS.Seven;
  if (diffDays === 3) return ISSUE_REMINDER_DAYS.Three;
  if (diffDays === 1) return ISSUE_REMINDER_DAYS.One;
  if (diffDays < 0) return ISSUE_REMINDER_DAYS.Overdue;
  return null;
};

const getIssueReminderChannel = (
  teamId: string,
): keyof typeof ISSUE_REMINDER_CHANNELS | null => {
  return ISSUE_TEAM_CHANNEL_MAP[teamId] ?? null;
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

const formatIssueReminder = (target: IssueReminderTarget): string => {
  const mentions = getIssueMentionTargets(target).join(", ");
  const issueUrl = getIssueUrl(target.issueId);
  return `- [${target.issueName}](${issueUrl}) ${mentions}`;
};

const formatChannelReminderMsg = (
  grouped: Partial<Record<IssueReminderDay, IssueReminderTarget[]>>,
): string | null => {
  const sections: string[] = [];
  for (const day of ISSUE_REMINDER_DAY_ORDER) {
    const targets = grouped[day];
    if (!targets || targets.length === 0) continue;
    const lines = targets.map(formatIssueReminder).join("\n");
    sections.push(`## ${ISSUE_REMINDER_DAY_LABELS[day]}\n${lines}`);
  }
  if (sections.length === 0) return null;
  return `# Issue Reminders\n${sections.join("\n\n")}`;
};

const getIssueUrl = (issueId: string): string => {
  return `${env.BLADE_URL.replace(/\/$/, "")}/issues/${issueId}`;
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
    const msg = formatChannelReminderMsg(groupedChannel);
    if (!msg) continue;

    // await new WebhookClient({
    //   url: ISSUE_REMINDER_WEBHOOK_URLS[channel],
    // }).send({ content: msg });
  }
});
