import type {
  APIComponentInContainer,
  APIEmbed,
  APIMessageTopLevelComponent,
  APITextDisplayComponent,
} from "discord-api-types/v10";
import { ComponentType, SeparatorSpacingSize } from "discord-api-types/v10";

import { EVENTS } from "@forge/consts";
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
import { getKnightHacksGuildId } from "@forge/utils/discord-config";

const MESSAGE_LIMIT = 2_000;
const COMPONENT_TEXT_LIMIT = 2_000;
const COMPONENT_MESSAGE_TEXT_LIMIT = 6_000;
const CONTAINER_CHILD_LIMIT = 10;
const MESSAGE_COMPONENT_LIMIT = 40;
const MAX_ALLOWED_MENTION_IDS = 100;
const TARGET_TITLE_LIMIT = 180;
const TARGET_BLOCK_LIMIT = 900;
const REMINDER_WINDOWS = new Map([
  [14, "14d"],
  [7, "7d"],
  [3, "3d"],
  [1, "1d"],
]);

export interface IssueReminderCandidate {
  archivedAt: Date | null;
  assigneeDiscordUserIds: string[];
  assigneeNames: string[];
  channelId: string;
  discordThreadUrl?: string | null;
  dueAt: Date | null;
  id: string;
  name: string;
  priority: "High" | "Highest" | "Low" | "Lowest" | "Medium";
  remindersEnabled: boolean;
  status: "Backlog" | "Finished" | "In Progress" | "Planning";
  teamColor: string | null;
  teamDiscordRoleId: string;
  teamName: string;
  updatedAt: Date;
}

export interface IssueReminderTarget extends Omit<
  IssueReminderCandidate,
  "dueAt"
> {
  dueAt: Date;
  reminderKey: string;
}

export interface IssueReminderMessage {
  components: APIMessageTopLevelComponent[];
  content: string;
  embeds: APIEmbed[];
  targets: IssueReminderTarget[];
}

function easternDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: EVENTS.CALENDAR_TIME_ZONE,
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

function shortDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "numeric",
    timeZone: EVENTS.CALENDAR_TIME_ZONE,
  }).format(date);
}

function targetUrl(target: IssueReminderTarget, bladeUrl: string) {
  return `${bladeUrl.replace(/\/$/, "")}/admin/issues/${target.id}`;
}

function truncate(value: string, limit: number) {
  if (limit <= 0) return "";
  if (limit === 1) return value.length <= limit ? value : "…";
  return value.length <= limit ? value : `${value.slice(0, limit - 1)}…`;
}

function escapeMarkdown(value: string) {
  return sanitizeIssueReminderTitle(value).replace(
    /([\\`*_[\]{}()~|>])/g,
    "\\$1",
  );
}

function targetAudienceNames(target: IssueReminderTarget) {
  if (target.assigneeDiscordUserIds.length === 0) {
    return escapeMarkdown(target.teamName);
  }
  const names = [...new Set(target.assigneeNames.map((name) => name.trim()))]
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
  if (names.length > 0) return names.map(escapeMarkdown).join(", ");
  const noun =
    target.assigneeDiscordUserIds.length === 1 ? "member" : "members";
  return `${target.assigneeDiscordUserIds.length} assigned ${noun}`;
}

function priorityOrder(priority: IssueReminderTarget["priority"]) {
  return {
    Highest: 0,
    High: 1,
    Medium: 2,
    Low: 3,
    Lowest: 4,
  }[priority];
}

function priorityMarks(priority: IssueReminderTarget["priority"]) {
  return {
    Highest: "!!!!",
    High: "!!!",
    Medium: "!!",
    Low: "!",
    Lowest: "!",
  }[priority];
}

function targetBlock(target: IssueReminderTarget, bladeUrl: string) {
  const url = targetUrl(target, bladeUrl);
  const title = escapeMarkdown(truncate(target.name, TARGET_TITLE_LIMIT));
  const discussion = target.discordThreadUrl
    ? ` · [Discuss](<${target.discordThreadUrl}>)`
    : "";
  const heading = `**(${priorityMarks(target.priority)}) [${title} (${shortDate(target.dueAt)})](<${url}>)**${discussion}`;
  const audience = truncate(
    targetAudienceNames(target),
    TARGET_BLOCK_LIMIT - heading.length - 4,
  );
  return `${heading}\n-# ${audience}`;
}

function reminderHeading(key: string) {
  if (key === "overdue" || key.startsWith("overdue:")) return "Overdue";
  return `Due in ${key.replace("d", "")} day${key === "1d" ? "" : "s"}`;
}

function reminderMarker(key: string) {
  if (key === "overdue" || key.startsWith("overdue:")) return "🔴";
  return (
    {
      "1d": "🟠",
      "3d": "🟡",
      "7d": "🟢",
      "14d": "🔵",
    }[key] ?? "⚪"
  );
}

function reminderOrder(key: string) {
  if (key === "overdue" || key.startsWith("overdue:")) return 0;
  return (
    {
      "1d": 1,
      "3d": 2,
      "7d": 3,
      "14d": 4,
    }[key] ?? 5
  );
}

function roleColor(color: string | null) {
  if (!color || !/^#[\da-f]{6}$/i.test(color)) return undefined;
  const value = Number.parseInt(color.slice(1), 16);
  return value > 0 ? value : undefined;
}

function reminderAudience(targets: readonly IssueReminderTarget[]) {
  const users = [
    ...new Set(targets.flatMap((target) => target.assigneeDiscordUserIds)),
  ].sort();
  const roles = [
    ...new Set(
      targets
        .filter((target) => target.assigneeDiscordUserIds.length === 0)
        .map((target) => target.teamDiscordRoleId),
    ),
  ].sort();
  return { roles, users };
}

function reminderTextDisplays(
  targets: readonly IssueReminderTarget[],
  bladeUrl: string,
): APITextDisplayComponent[] {
  const displays: APITextDisplayComponent[] = [];
  let currentKey = "";
  let currentTargets: IssueReminderTarget[] = [];

  const flush = () => {
    if (currentTargets.length === 0) return;
    const heading = `${reminderMarker(currentKey)} ${reminderHeading(currentKey).toUpperCase()} · ${currentTargets.length} ${currentTargets.length === 1 ? "TASK" : "TASKS"}`;
    let content = `### ${heading}`;
    let continuation = 0;
    for (const target of currentTargets) {
      const block = targetBlock(target, bladeUrl);
      const addition = `\n\n${block}`;
      if (
        content !== `### ${heading}` &&
        content.length + addition.length > COMPONENT_TEXT_LIMIT
      ) {
        displays.push({ content, type: ComponentType.TextDisplay });
        continuation += 1;
        content = `### ${reminderMarker(currentKey)} ${reminderHeading(currentKey).toUpperCase()} · CONTINUED ${continuation}\n\n${block}`;
        continue;
      }
      content += addition;
    }
    displays.push({ content, type: ComponentType.TextDisplay });
    currentTargets = [];
  };

  for (const target of targets) {
    const key = target.reminderKey.startsWith("overdue:")
      ? "overdue"
      : target.reminderKey;
    if (currentTargets.length > 0 && currentKey !== key) {
      flush();
    }
    currentKey = key;
    currentTargets.push(target);
  }
  flush();
  return displays;
}

function reminderComponents(
  targets: readonly IssueReminderTarget[],
  bladeUrl: string,
): APIMessageTopLevelComponent[] {
  const firstTarget = targets[0];
  const children: APIComponentInContainer[] = [
    {
      content: `## ${escapeMarkdown(firstTarget?.teamName ?? "Team")} · Issue reminders`,
      type: ComponentType.TextDisplay,
    },
  ];
  for (const display of reminderTextDisplays(targets, bladeUrl)) {
    if (children.length > 1) {
      children.push({
        divider: true,
        spacing: SeparatorSpacingSize.Small,
        type: ComponentType.Separator,
      });
    }
    children.push(display);
  }
  const color = roleColor(firstTarget?.teamColor ?? null);
  return [
    {
      ...(color !== undefined && { accent_color: color }),
      components: children,
      type: ComponentType.Container,
    },
  ];
}

function componentCount(components: readonly APIMessageTopLevelComponent[]) {
  return components.reduce((total, component) => {
    if (component.type === ComponentType.Container) {
      return total + 1 + component.components.length;
    }
    if (component.type === ComponentType.Section) {
      return total + 2 + component.components.length;
    }
    return total + 1;
  }, 0);
}

function componentText(
  components: readonly APIMessageTopLevelComponent[],
): string[] {
  return components.flatMap((component) => {
    if (component.type === ComponentType.TextDisplay) {
      return [component.content];
    }
    if (component.type === ComponentType.Container) {
      return component.components.flatMap((child) =>
        child.type === ComponentType.TextDisplay ? [child.content] : [],
      );
    }
    if (component.type === ComponentType.Section) {
      return component.components.map((child) => child.content);
    }
    return [];
  });
}

function buildReminderMessage(
  targets: readonly IssueReminderTarget[],
  bladeUrl: string,
): IssueReminderMessage {
  const { roles, users } = reminderAudience(targets);
  return {
    components: reminderComponents(targets, bladeUrl),
    content: `cc: ${[
      ...users.map((id) => `<@${id}>`),
      ...roles.map((id) => `<@&${id}>`),
    ].join(" ")}`,
    embeds: [],
    targets: [...targets],
  };
}

function messageFitsDiscord(message: IssueReminderMessage) {
  const { roles, users } = reminderAudience(message.targets);
  const [container] = message.components;
  const text = componentText(message.components);
  return (
    message.content.length <= MESSAGE_LIMIT &&
    users.length <= MAX_ALLOWED_MENTION_IDS &&
    roles.length <= MAX_ALLOWED_MENTION_IDS &&
    message.embeds.length === 0 &&
    message.components.length === 1 &&
    container?.type === ComponentType.Container &&
    container.components.length <= CONTAINER_CHILD_LIMIT &&
    componentCount(message.components) + 1 <= MESSAGE_COMPONENT_LIMIT &&
    text.every((value) => value.length <= COMPONENT_TEXT_LIMIT) &&
    text.reduce((total, value) => total + value.length, 0) +
      message.content.length <=
      COMPONENT_MESSAGE_TEXT_LIMIT
  );
}

export function splitIssueReminderMessages(
  targets: readonly IssueReminderTarget[],
  bladeUrl: string,
) {
  const chunks: IssueReminderMessage[] = [];
  const ordered = [...targets].sort(
    (left, right) =>
      left.channelId.localeCompare(right.channelId) ||
      left.teamName.localeCompare(right.teamName) ||
      left.teamDiscordRoleId.localeCompare(right.teamDiscordRoleId) ||
      reminderOrder(left.reminderKey) - reminderOrder(right.reminderKey) ||
      left.reminderKey.localeCompare(right.reminderKey) ||
      priorityOrder(left.priority) - priorityOrder(right.priority) ||
      left.dueAt.getTime() - right.dueAt.getTime() ||
      left.name.localeCompare(right.name) ||
      left.id.localeCompare(right.id),
  );
  let currentTargets: IssueReminderTarget[] = [];

  for (const target of ordered) {
    const firstTarget = currentTargets.at(0);
    if (
      firstTarget &&
      (firstTarget.channelId !== target.channelId ||
        firstTarget.teamDiscordRoleId !== target.teamDiscordRoleId)
    ) {
      chunks.push(buildReminderMessage(currentTargets, bladeUrl));
      currentTargets = [target];
      continue;
    }
    const candidateTargets = [...currentTargets, target];
    const candidate = buildReminderMessage(candidateTargets, bladeUrl);
    if (currentTargets.length > 0 && !messageFitsDiscord(candidate)) {
      chunks.push(buildReminderMessage(currentTargets, bladeUrl));
      currentTargets = [target];
      continue;
    }
    currentTargets = candidateTargets;
  }
  if (currentTargets.length > 0)
    chunks.push(buildReminderMessage(currentTargets, bladeUrl));
  return chunks;
}

export function issueReminderAllowedMentions(
  targets: readonly IssueReminderTarget[],
) {
  const { roles, users } = reminderAudience(targets);
  return {
    parse: [] as string[],
    ...(roles.length > 0 && { roles }),
    ...(users.length > 0 && { users }),
  };
}

export type IssueReminderSender = (message: {
  allowedMentions: ReturnType<typeof issueReminderAllowedMentions>;
  channelId: string;
  components: APIMessageTopLevelComponent[];
  content: string;
  embeds: APIEmbed[];
}) => Promise<void>;

export function serializeIssueReminderSnapshot(
  message: Pick<IssueReminderMessage, "components" | "content" | "embeds">,
) {
  return JSON.stringify({
    components: message.components,
    content: message.content,
    embeds: message.embeds,
    version: 2,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isApiEmbed(value: unknown): value is APIEmbed {
  return isRecord(value);
}

function isApiMessageTopLevelComponent(
  value: unknown,
): value is APIMessageTopLevelComponent {
  return isRecord(value) && typeof value.type === "number";
}

export function deserializeIssueReminderSnapshot(snapshot: string): {
  components: APIMessageTopLevelComponent[];
  content: string;
  embeds: APIEmbed[];
} {
  try {
    const parsed: unknown = JSON.parse(snapshot);
    if (
      isRecord(parsed) &&
      parsed.version === 2 &&
      Array.isArray(parsed.components) &&
      parsed.components.every(isApiMessageTopLevelComponent) &&
      typeof parsed.content === "string" &&
      Array.isArray(parsed.embeds) &&
      parsed.embeds.every(isApiEmbed)
    ) {
      return {
        components: parsed.components,
        content: parsed.content,
        embeds: parsed.embeds,
      };
    }
    if (
      isRecord(parsed) &&
      parsed.version === 1 &&
      typeof parsed.content === "string" &&
      Array.isArray(parsed.embeds) &&
      parsed.embeds.every(isApiEmbed)
    ) {
      return {
        components: [],
        content: parsed.content,
        embeds: parsed.embeds,
      };
    }
  } catch {
    // Deliveries created before embed snapshots contain ordinary message text.
  }
  return { components: [], content: snapshot, embeds: [] };
}

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
      const message = deserializeIssueReminderSnapshot(row.contentSnapshot);
      await send({
        allowedMentions: allowedMentionsFromContent(message.content),
        channelId: row.destinationSnapshot,
        components: message.components,
        content: message.content,
        embeds: message.embeds,
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
    with: {
      userAssignments: { with: { user: { with: { member: true } } } },
    },
  });
  if (issues.length === 0) return [];
  let discordGuildId: string | null = null;
  if (issues.some((issue) => issue.discordThreadId)) {
    try {
      discordGuildId = await getKnightHacksGuildId();
    } catch {
      // A missing Discord configuration must not suppress the canonical Blade
      // reminder. It only removes the optional discussion link.
    }
  }
  const roles = await db
    .select({
      channelId: Roles.issueReminderChannel,
      discordRoleId: Roles.discordRoleId,
      enabled: Roles.issueRemindersEnabled,
      id: Roles.id,
      teamColor: Roles.teamHexcodeColor,
      teamName: Roles.name,
    })
    .from(Roles)
    .where(inArray(Roles.id, [...new Set(issues.map((issue) => issue.team))]));
  const byId = new Map(roles.map((role) => [role.id, role]));
  return issues.flatMap((issue) => {
    const role = byId.get(issue.team);
    if (!role || !issue.dueAt) return [];
    const assignees = issue.userAssignments
      .map(({ user }) => {
        const memberName = user.member?.firstName.trim();
        return {
          discordUserId: user.discordUserId,
          name: memberName?.length ? memberName : (user.name?.trim() ?? ""),
        };
      })
      .sort(
        (left, right) =>
          left.name.localeCompare(right.name) ||
          left.discordUserId.localeCompare(right.discordUserId),
      );
    return [
      {
        archivedAt: issue.archivedAt,
        assigneeDiscordUserIds: assignees.map(
          (assignee) => assignee.discordUserId,
        ),
        assigneeNames: assignees.map((assignee) => assignee.name),
        channelId: role.channelId,
        discordThreadUrl:
          discordGuildId && issue.discordThreadId
            ? `https://discord.com/channels/${discordGuildId}/${issue.discordThreadId}`
            : null,
        dueAt: issue.dueAt,
        id: issue.id,
        name: issue.name,
        priority: issue.priority,
        remindersEnabled: role.enabled,
        status: issue.status,
        teamColor: role.teamColor,
        teamDiscordRoleId: role.discordRoleId,
        teamName: role.teamName,
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
    const [message] = splitIssueReminderMessages([target], bladeUrl);
    if (!message) continue;
    const deliveryId = await acquireTarget(
      target,
      now,
      serializeIssueReminderSnapshot(message),
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
            contentSnapshot: serializeIssueReminderSnapshot(chunk),
            destinationSnapshot: channelId,
          })
          .where(inArray(IssueReminderDelivery.id, deliveryIds));
        await send({
          allowedMentions: issueReminderAllowedMentions(chunk.targets),
          channelId,
          components: chunk.components,
          content: chunk.content,
          embeds: chunk.embeds,
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
