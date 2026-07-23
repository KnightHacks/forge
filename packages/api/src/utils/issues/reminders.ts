import {
  and,
  eq,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  or,
  sql,
} from "@forge/db";
import { db } from "@forge/db/client";
import { Roles } from "@forge/db/schemas/auth";
import { Issue, IssueReminderDelivery } from "@forge/db/schemas/knight-hacks";

const TIME_ZONE = "America/New_York";
const MESSAGE_LIMIT = 2_000;
const REMINDER_WINDOWS = new Map([
  [14, "14d"],
  [7, "7d"],
  [3, "3d"],
  [1, "1d"],
]);

export interface IssueReminderCandidate {
  archivedAt: Date | null;
  assigneeDiscordUserIds: string[];
  channelId: string;
  dueAt: Date | null;
  id: string;
  name: string;
  priority: "High" | "Highest" | "Low" | "Lowest" | "Medium";
  remindersEnabled: boolean;
  status: "Backlog" | "Finished" | "In Progress" | "Planning";
  teamDiscordRoleId: string;
  updatedAt: Date;
}

export interface IssueReminderTarget extends Omit<
  IssueReminderCandidate,
  "dueAt"
> {
  dueAt: Date;
  reminderKey: string;
}

function easternDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: TIME_ZONE,
    year: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function dateKeyDay(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1) / 86_400_000;
}

function reminderKey(dueAt: Date, now: Date) {
  const dueDay = dateKeyDay(easternDateKey(dueAt));
  const currentDay = dateKeyDay(easternDateKey(now));
  const difference = dueDay - currentDay;
  if (difference < 0) return `overdue:${easternDateKey(now)}`;
  return REMINDER_WINDOWS.get(difference) ?? null;
}

export function buildIssueReminderPlan(
  candidates: readonly IssueReminderCandidate[],
  now = new Date(),
) {
  return candidates.flatMap((candidate): IssueReminderTarget[] => {
    if (
      !candidate.dueAt ||
      candidate.archivedAt ||
      candidate.status === "Finished" ||
      !candidate.remindersEnabled
    ) {
      return [];
    }
    const key = reminderKey(candidate.dueAt, now);
    return key
      ? [{ ...candidate, dueAt: candidate.dueAt, reminderKey: key }]
      : [];
  });
}

export function issueReminderIdentity(target: IssueReminderTarget) {
  return `${target.id}:${target.dueAt.toISOString()}:${target.reminderKey}`;
}

export function sanitizeIssueReminderTitle(title: string) {
  return title
    .replace(/\r?\n+/g, " ")
    .replace(/<@&?/g, "<@\u200b")
    .replace(/<!/g, "<!\u200b")
    .replace(/@everyone/g, "@\u200beveryone")
    .replace(/@here/g, "@\u200bhere")
    .trim();
}

function dateTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: TIME_ZONE,
  }).format(date);
}

function targetLine(target: IssueReminderTarget, bladeUrl: string) {
  const mentions =
    target.assigneeDiscordUserIds.length > 0
      ? target.assigneeDiscordUserIds.map((id) => `<@${id}>`).join(", ")
      : `<@&${target.teamDiscordRoleId}>`;
  const url = `${bladeUrl.replace(/\/$/, "")}/admin/issues/${target.id}`;
  return `[${sanitizeIssueReminderTitle(target.name)}](<${url}>) · ${mentions} · ${target.priority} · Due ${dateTime(target.dueAt)}`;
}

function reminderHeading(key: string) {
  if (key.startsWith("overdue:")) return "Overdue";
  return `${key.replace("d", "")} day${key === "1d" ? "" : "s"}`;
}

export function splitIssueReminderMessages(
  targets: readonly IssueReminderTarget[],
  bladeUrl: string,
) {
  const chunks: { content: string; targets: IssueReminderTarget[] }[] = [];
  const ordered = [...targets].sort(
    (left, right) =>
      left.reminderKey.localeCompare(right.reminderKey) ||
      left.name.localeCompare(right.name),
  );
  let content = "## Issue reminders";
  let currentTargets: IssueReminderTarget[] = [];
  let section = "";

  for (const target of ordered) {
    const nextSection = reminderHeading(target.reminderKey);
    const header = nextSection === section ? "" : `\n\n### ${nextSection}`;
    const rawLine = targetLine(target, bladeUrl);
    const available = Math.max(
      1,
      MESSAGE_LIMIT - "## Issue reminders\n\n### Overdue\n".length,
    );
    const line =
      rawLine.length <= available
        ? rawLine
        : `${rawLine.slice(0, available - 1)}…`;
    const addition = `${header}\n${line}`;
    if (
      content.length + addition.length > MESSAGE_LIMIT &&
      currentTargets.length > 0
    ) {
      chunks.push({ content, targets: currentTargets });
      content = `## Issue reminders\n\n### ${nextSection}\n${line}`;
      currentTargets = [target];
      section = nextSection;
      continue;
    }
    content += addition;
    currentTargets.push(target);
    section = nextSection;
  }
  if (currentTargets.length > 0)
    chunks.push({ content, targets: currentTargets });
  return chunks;
}

export function issueReminderAllowedMentions(
  targets: readonly IssueReminderTarget[],
) {
  const users = [
    ...new Set(targets.flatMap((target) => target.assigneeDiscordUserIds)),
  ];
  const roles = [
    ...new Set(
      targets
        .filter((target) => target.assigneeDiscordUserIds.length === 0)
        .map((target) => target.teamDiscordRoleId),
    ),
  ];
  return {
    parse: [] as string[],
    ...(roles.length > 0 && { roles }),
    ...(users.length > 0 && { users }),
  };
}

export type IssueReminderSender = (message: {
  allowedMentions: ReturnType<typeof issueReminderAllowedMentions>;
  channelId: string;
  content: string;
}) => Promise<void>;

function allowedMentionsFromContent(content: string) {
  const users = [...content.matchAll(/<@(\d{17,20})>/g)].flatMap((match) =>
    match[1] ? [match[1]] : [],
  );
  const roles = [...content.matchAll(/<@&(\d{17,20})>/g)].flatMap((match) =>
    match[1] ? [match[1]] : [],
  );
  return {
    parse: [] as string[],
    ...(roles.length > 0 && { roles: [...new Set(roles)] }),
    ...(users.length > 0 && { users: [...new Set(users)] }),
  };
}

async function retryStoredDeliveries(send: IssueReminderSender, now: Date) {
  const stale = new Date(now.getTime() - 15 * 60_000);
  const rows = await db
    .select()
    .from(IssueReminderDelivery)
    .where(
      and(
        ne(IssueReminderDelivery.status, "delivered"),
        lt(IssueReminderDelivery.attemptCount, 5),
        or(
          isNull(IssueReminderDelivery.nextAttemptAt),
          lte(IssueReminderDelivery.nextAttemptAt, now),
        ),
        or(
          isNull(IssueReminderDelivery.lockedAt),
          lt(IssueReminderDelivery.lockedAt, stale),
        ),
      ),
    )
    .limit(100);
  let retried = 0;
  for (const row of rows) {
    const [locked] = await db
      .update(IssueReminderDelivery)
      .set({
        attemptCount: sql`${IssueReminderDelivery.attemptCount} + 1`,
        lockedAt: now,
        status: "sending",
      })
      .where(
        and(
          eq(IssueReminderDelivery.id, row.id),
          ne(IssueReminderDelivery.status, "delivered"),
          eq(IssueReminderDelivery.attemptCount, row.attemptCount),
        ),
      )
      .returning({ id: IssueReminderDelivery.id });
    if (!locked) continue;
    retried += 1;
    try {
      await send({
        allowedMentions: allowedMentionsFromContent(row.contentSnapshot),
        channelId: row.destinationSnapshot,
        content: row.contentSnapshot,
      });
      await db
        .update(IssueReminderDelivery)
        .set({
          deliveredAt: new Date(),
          lastError: null,
          lockedAt: null,
          status: "delivered",
        })
        .where(eq(IssueReminderDelivery.id, row.id));
    } catch (error) {
      await db
        .update(IssueReminderDelivery)
        .set({
          lastError:
            error instanceof Error
              ? error.message.slice(0, 2_000)
              : "Unknown Discord delivery error.",
          lockedAt: null,
          nextAttemptAt: new Date(now.getTime() + 5 * 60_000),
          status: "failed",
        })
        .where(eq(IssueReminderDelivery.id, row.id));
    }
  }
  return retried;
}

async function loadCandidates(): Promise<IssueReminderCandidate[]> {
  const issues = await db.query.Issue.findMany({
    where: and(
      isNotNull(Issue.dueAt),
      isNull(Issue.archivedAt),
      ne(Issue.status, "Finished"),
    ),
    with: { userAssignments: { with: { user: true } } },
  });
  if (issues.length === 0) return [];
  const roles = await db
    .select({
      channelId: Roles.issueReminderChannel,
      discordRoleId: Roles.discordRoleId,
      enabled: Roles.issueRemindersEnabled,
      id: Roles.id,
    })
    .from(Roles)
    .where(inArray(Roles.id, [...new Set(issues.map((issue) => issue.team))]));
  const byId = new Map(roles.map((role) => [role.id, role]));
  return issues.flatMap((issue) => {
    const role = byId.get(issue.team);
    if (!role || !issue.dueAt) return [];
    return [
      {
        archivedAt: issue.archivedAt,
        assigneeDiscordUserIds: issue.userAssignments.map(
          ({ user }) => user.discordUserId,
        ),
        channelId: role.channelId,
        dueAt: issue.dueAt,
        id: issue.id,
        name: issue.name,
        priority: issue.priority,
        remindersEnabled: role.enabled,
        status: issue.status,
        teamDiscordRoleId: role.discordRoleId,
        updatedAt: issue.updatedAt,
      },
    ];
  });
}

async function acquireTarget(
  target: IssueReminderTarget,
  now: Date,
  contentSnapshot: string,
) {
  await db
    .insert(IssueReminderDelivery)
    .values({
      contentSnapshot,
      destinationSnapshot: target.channelId,
      dueAt: target.dueAt,
      issueId: target.id,
      reminderKey: target.reminderKey,
    })
    .onConflictDoNothing();
  const stale = new Date(now.getTime() - 15 * 60_000);
  const [locked] = await db
    .update(IssueReminderDelivery)
    .set({
      attemptCount: sql`${IssueReminderDelivery.attemptCount} + 1`,
      destinationSnapshot: target.channelId,
      lockedAt: now,
      status: "sending",
    })
    .where(
      and(
        eq(IssueReminderDelivery.issueId, target.id),
        eq(IssueReminderDelivery.dueAt, target.dueAt),
        eq(IssueReminderDelivery.reminderKey, target.reminderKey),
        ne(IssueReminderDelivery.status, "delivered"),
        lt(IssueReminderDelivery.attemptCount, 5),
        or(
          isNull(IssueReminderDelivery.nextAttemptAt),
          lte(IssueReminderDelivery.nextAttemptAt, now),
        ),
        or(
          isNull(IssueReminderDelivery.lockedAt),
          lt(IssueReminderDelivery.lockedAt, stale),
        ),
      ),
    )
    .returning({ id: IssueReminderDelivery.id });
  return locked?.id ?? null;
}

export async function deliverIssueReminders({
  bladeUrl,
  now = new Date(),
  send,
}: {
  bladeUrl: string;
  now?: Date;
  send: IssueReminderSender;
}) {
  const retriedTargets = await retryStoredDeliveries(send, now);
  const planned = buildIssueReminderPlan(await loadCandidates(), now);
  const acquired: { deliveryId: string; target: IssueReminderTarget }[] = [];
  for (const target of planned) {
    const deliveryId = await acquireTarget(
      target,
      now,
      `## Issue reminder\n${targetLine(target, bladeUrl)}`,
    );
    if (deliveryId) acquired.push({ deliveryId, target });
  }
  const byChannel = new Map<
    string,
    { deliveryId: string; target: IssueReminderTarget }[]
  >();
  for (const item of acquired) {
    byChannel.set(item.target.channelId, [
      ...(byChannel.get(item.target.channelId) ?? []),
      item,
    ]);
  }
  for (const [channelId, channelTargets] of byChannel) {
    for (const chunk of splitIssueReminderMessages(
      channelTargets.map(({ target }) => target),
      bladeUrl,
    )) {
      const deliveryIds = channelTargets
        .filter(({ target }) => chunk.targets.includes(target))
        .map(({ deliveryId }) => deliveryId);
      try {
        await db
          .update(IssueReminderDelivery)
          .set({
            contentSnapshot: chunk.content,
            destinationSnapshot: channelId,
          })
          .where(inArray(IssueReminderDelivery.id, deliveryIds));
        await send({
          allowedMentions: issueReminderAllowedMentions(chunk.targets),
          channelId,
          content: chunk.content,
        });
        await db
          .update(IssueReminderDelivery)
          .set({
            deliveredAt: new Date(),
            lastError: null,
            lockedAt: null,
            status: "delivered",
          })
          .where(inArray(IssueReminderDelivery.id, deliveryIds));
      } catch (error) {
        await db
          .update(IssueReminderDelivery)
          .set({
            lastError:
              error instanceof Error
                ? error.message.slice(0, 2_000)
                : "Unknown Discord delivery error.",
            lockedAt: null,
            nextAttemptAt: new Date(now.getTime() + 5 * 60_000),
            status: "failed",
          })
          .where(inArray(IssueReminderDelivery.id, deliveryIds));
      }
    }
  }
  return {
    deliveredTargets: acquired.length,
    plannedTargets: planned.length,
    retriedTargets,
  };
}
