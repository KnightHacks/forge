import { randomBytes } from "node:crypto";
import type { APIChannel, APIMessage } from "discord-api-types/v10";
import { ChannelType, Routes } from "discord-api-types/v10";

import { and, eq, inArray, isNull } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, Roles, User } from "@forge/db/schemas/auth";
import {
  Hackathon,
  HackathonJudgingConfiguration,
  Judge,
  JudgingAnnouncement,
  JudgingRoom,
  JudgingRoomPresence,
} from "@forge/db/schemas/knight-hacks";
import * as discord from "@forge/utils/discord";
import { getKnightHacksGuildId } from "@forge/utils/discord-config";

import { roleHasPermission } from "../roles/management";

const THREAD_NAME_LIMIT = 100;
const MESSAGE_LIMIT = 2_000;
const MENTION_BATCH_SIZE = 75;
const DISCORD_SNOWFLAKE = /^\d{17,20}$/;
const roomThreadQueues = new Map<string, Promise<void>>();
const announcementQueues = new Map<string, Promise<void>>();

class UnusableJudgingRoomThreadError extends Error {}

async function runSerialized<T>(
  queues: Map<string, Promise<void>>,
  key: string,
  operation: () => Promise<T>,
) {
  const previous = queues.get(key) ?? Promise.resolve();
  let release: () => void = () => undefined;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tail = previous.catch(() => undefined).then(() => current);
  queues.set(key, tail);
  await previous.catch(() => undefined);
  try {
    return await operation();
  } finally {
    release();
    if (queues.get(key) === tail) queues.delete(key);
  }
}

function discordStatus(error: unknown) {
  if (typeof error !== "object" || error === null) return null;
  if ("status" in error && typeof error.status === "number") {
    return error.status;
  }
  if ("statusCode" in error && typeof error.statusCode === "number") {
    return error.statusCode;
  }
  return null;
}

function shouldReplaceRoomThread(error: unknown) {
  if (error instanceof UnusableJudgingRoomThreadError) return true;
  const status = discordStatus(error);
  return status === 403 || status === 404;
}

export function judgingDiscordNonce() {
  return randomBytes(16).toString("base64url");
}

export type JudgingDiscordDeliveryStatus =
  | "delivered"
  | "failed"
  | "not_configured"
  | "skipped";

export type JudgingAnnouncementDeliveryStatus =
  | JudgingDiscordDeliveryStatus
  | "superseded";

/** Serialize publication, clearing, and delivery without holding DB locks. */
export function serializeJudgingAnnouncement<T>(
  hackathonId: string,
  operation: () => Promise<T>,
) {
  return runSerialized(announcementQueues, hackathonId, operation);
}

export interface JudgingDiscordMessage {
  allowedMentions: {
    parse: [];
    users: string[];
  };
  content: string;
  file?: {
    data: Buffer;
    name: string;
  };
}

export interface JudgingDiscordGateway {
  createRoomThread(input: {
    channelId: string;
    roomName: string;
    starter: JudgingDiscordMessage;
  }): Promise<string>;
  getChannel(channelId: string): Promise<APIChannel>;
  listTextChannels(guildId: string): Promise<{ id: string; name: string }[]>;
  prepareRoomThread(input: {
    channelId: string;
    roomName: string;
    threadId: string;
  }): Promise<void>;
  sendMessage(input: {
    message: JudgingDiscordMessage;
    threadId: string;
  }): Promise<void>;
}

export type JudgingRoomNotice =
  | { kind: "announcement"; message: string; isUrgent: boolean }
  | { kind: "guest_joined"; guestName: string }
  | { kind: "member_joined"; discordUserId: string; memberName: string }
  | {
      kind: "qr";
      qrCodeUrl: string;
      reason: "generated" | "rotated" | "sent";
      url: string;
    }
  | { actorName: string; guestName: string; kind: "guest_revoked" }
  | {
      actorName: string;
      guestNames: string[];
      kind: "room_link_revoked";
    };

function neutralizeMentions(value: string) {
  return value
    .replace(/<@&?/g, "<@​")
    .replace(/<!/g, "<!​")
    .replace(/@everyone/gi, "@​everyone")
    .replace(/@here/gi, "@​here");
}

function escapeMarkdown(value: string) {
  return neutralizeMentions(value).replace(/([\\`*_[\]{}()~|>])/g, "\\$1");
}

function escapedMarkdownTokens(value: string) {
  return Array.from(neutralizeMentions(value), (character) =>
    /[\\`*_[\]{}()~|>]/.test(character) ? `\\${character}` : character,
  );
}

function singleLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function judgingRoomThreadName(roomName: string) {
  const value = singleLine(neutralizeMentions(roomName)) || "Judging room";
  return Array.from(value).slice(0, THREAD_NAME_LIMIT).join("");
}

function validRecipientIds(ids: readonly string[]) {
  return [...new Set(ids.filter((id) => DISCORD_SNOWFLAKE.test(id)))].sort();
}

export function authorizedJudgingDiscordIds(
  rows: readonly { discordUserId: string; permissions: string }[],
  includeJudgeRole = true,
) {
  return validRecipientIds(
    rows
      .filter(
        (row) =>
          roleHasPermission(row.permissions, "IS_OFFICER") ||
          (includeJudgeRole && roleHasPermission(row.permissions, "IS_JUDGE")),
      )
      .map((row) => row.discordUserId),
  );
}

function mentionLine(ids: readonly string[]) {
  return ids.length ? `${ids.map((id) => `<@${id}>`).join(" ")}\n` : "";
}

export function withJudgingRecipientMentions(
  message: JudgingDiscordMessage,
  ids: readonly string[],
): JudgingDiscordMessage[] {
  const recipientIds = validRecipientIds(ids);
  const combined = `${mentionLine(recipientIds)}${message.content}`;
  if (recipientIds.length <= 100 && combined.length <= MESSAGE_LIMIT) {
    return [
      {
        ...message,
        allowedMentions: { parse: [], users: recipientIds },
        content: combined,
      },
    ];
  }

  const messages: JudgingDiscordMessage[] = [
    { ...message, allowedMentions: { parse: [], users: [] } },
  ];
  for (
    let index = 0;
    index < recipientIds.length;
    index += MENTION_BATCH_SIZE
  ) {
    const batch = recipientIds.slice(index, index + MENTION_BATCH_SIZE);
    messages.push({
      allowedMentions: { parse: [], users: batch },
      content: `${mentionLine(batch)}Assigned judges: review the judging update above.`,
    });
  }
  return messages;
}

export function buildJudgingAnnouncementMessages(input: {
  isUrgent: boolean;
  message: string;
  recipientIds: readonly string[];
  scopeLabel: string;
}): JudgingDiscordMessage[] {
  const title = input.isUrgent
    ? "**Urgent judging announcement**"
    : "**Judging announcement**";
  const scope = `**${escapeMarkdown(input.scopeLabel)}**`;
  const firstPrefix = `${title} for ${scope}\n`;
  const continuationPrefix = `${title} for ${scope} (continued)\n`;
  const tokens = escapedMarkdownTokens(input.message);
  const contents: string[] = [];
  let current = firstPrefix;

  for (const token of tokens) {
    if (current.length + token.length > MESSAGE_LIMIT) {
      contents.push(current);
      current = continuationPrefix;
    }
    current += token;
  }
  contents.push(current);

  const [firstContent, ...continuations] = contents;
  if (!firstContent) return [];
  const firstMessages = withJudgingRecipientMentions(
    {
      allowedMentions: { parse: [], users: [] },
      content: firstContent,
    },
    input.recipientIds,
  );
  const [canonical, ...mentionBatches] = firstMessages;
  if (!canonical) return [];
  return [
    canonical,
    ...continuations.map((content) => ({
      allowedMentions: { parse: [] as [], users: [] },
      content,
    })),
    ...mentionBatches,
  ];
}

function qrBuffer(dataUrl: string) {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match?.[1]) throw new Error("The judging QR image is invalid.");
  return Buffer.from(match[1], "base64");
}

function qrFilename(roomName: string) {
  const stem = singleLine(roomName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${stem || "judging-room"}-qr.png`;
}

export function buildJudgingRoomMessage(input: {
  notice: Exclude<JudgingRoomNotice, { kind: "announcement" }>;
  recipientIds: readonly string[];
  roomName: string;
}): JudgingDiscordMessage {
  const recipientIds =
    input.notice.kind === "member_joined"
      ? validRecipientIds([input.notice.discordUserId])
      : validRecipientIds(input.recipientIds);
  const room = escapeMarkdown(input.roomName);
  let content: string;
  let file: JudgingDiscordMessage["file"];

  switch (input.notice.kind) {
    case "member_joined":
      content = `${mentionLine(recipientIds)}${escapeMarkdown(input.notice.memberName)} joined **${room}** in Blade.`;
      break;
    case "guest_joined":
      content = `${mentionLine(recipientIds)}**${escapeMarkdown(input.notice.guestName)}** signed in as a guest judge for **${room}**.`;
      break;
    case "qr": {
      const action = {
        generated: "A guest judging QR is ready",
        rotated: "Guest judging access was rotated",
        sent: "Here is the current guest judging QR",
      }[input.notice.reason];
      content = `${mentionLine(recipientIds)}${action} for **${room}**.\n<${input.notice.url}>`;
      file = {
        data: qrBuffer(input.notice.qrCodeUrl),
        name: qrFilename(input.roomName),
      };
      break;
    }
    case "guest_revoked":
      content = `${mentionLine(recipientIds)}**${escapeMarkdown(input.notice.actorName)}** revoked guest access for **${escapeMarkdown(input.notice.guestName)}** in **${room}**.`;
      break;
    case "room_link_revoked": {
      const guests = input.notice.guestNames
        .slice(0, 20)
        .map((name) => `**${escapeMarkdown(name)}**`)
        .join(", ");
      const suffix = guests
        ? ` Affected guests: ${guests}.`
        : " No active named guest sessions were present.";
      content = `${mentionLine(recipientIds)}**${escapeMarkdown(input.notice.actorName)}** revoked the guest judging QR for **${room}**.${suffix}`;
      break;
    }
  }

  if (content.length > MESSAGE_LIMIT) {
    content = `${content.slice(0, MESSAGE_LIMIT - 1).trimEnd()}…`;
  }
  return {
    allowedMentions: { parse: [], users: recipientIds },
    content,
    ...(file && { file }),
  };
}

export function buildJudgingRoomMessages(input: {
  notice: JudgingRoomNotice;
  recipientIds: readonly string[];
  roomName: string;
}) {
  const { notice } = input;
  if (notice.kind === "announcement") {
    return buildJudgingAnnouncementMessages({
      isUrgent: notice.isUrgent,
      message: notice.message,
      recipientIds: input.recipientIds,
      scopeLabel: input.roomName,
    });
  }
  if (notice.kind === "member_joined") {
    return [buildJudgingRoomMessage({ ...input, notice })];
  }
  const canonical = buildJudgingRoomMessage({
    ...input,
    notice,
    recipientIds: [],
  });
  return withJudgingRecipientMentions(canonical, input.recipientIds);
}

export const liveJudgingDiscordGateway: JudgingDiscordGateway = {
  async createRoomThread({ channelId, roomName, starter }) {
    const created = (await discord.api.post(Routes.channelMessages(channelId), {
      body: {
        allowed_mentions: starter.allowedMentions,
        content: starter.content,
        enforce_nonce: true,
        nonce: judgingDiscordNonce(),
      },
    })) as APIMessage;
    const thread = (await discord.api.post(
      Routes.threads(channelId, created.id),
      {
        body: { name: judgingRoomThreadName(roomName) },
      },
    )) as APIChannel;
    return thread.id;
  },
  async getChannel(channelId) {
    return (await discord.api.get(Routes.channel(channelId))) as APIChannel;
  },
  async listTextChannels(guildId) {
    const channels = (await discord.api.get(
      Routes.guildChannels(guildId),
    )) as APIChannel[];
    return channels
      .filter(
        (channel) =>
          "guild_id" in channel &&
          channel.guild_id === guildId &&
          "name" in channel &&
          (channel.type === ChannelType.GuildText ||
            channel.type === ChannelType.GuildAnnouncement),
      )
      .map((channel) => ({ id: channel.id, name: channel.name ?? channel.id }))
      .sort((left, right) => left.name.localeCompare(right.name));
  },
  async prepareRoomThread({ channelId, roomName, threadId }) {
    const channel = (await discord.api.get(
      Routes.channel(threadId),
    )) as APIChannel;
    if (
      channel.type !== ChannelType.PublicThread &&
      channel.type !== ChannelType.AnnouncementThread
    ) {
      throw new UnusableJudgingRoomThreadError(
        "The saved judging room thread is not usable.",
      );
    }
    if (!("parent_id" in channel) || channel.parent_id !== channelId) {
      throw new UnusableJudgingRoomThreadError(
        "The saved judging room thread has the wrong parent.",
      );
    }
    await discord.api.patch(Routes.channel(threadId), {
      body: { archived: false, name: judgingRoomThreadName(roomName) },
    });
  },
  async sendMessage({ message, threadId }) {
    await discord.api.post(Routes.channelMessages(threadId), {
      body: {
        allowed_mentions: message.allowedMentions,
        content: message.content,
        enforce_nonce: true,
        nonce: judgingDiscordNonce(),
      },
      ...(message.file && {
        files: [{ data: message.file.data, name: message.file.name }],
      }),
    });
  },
};

function starterMessage(roomName: string): JudgingDiscordMessage {
  return {
    allowedMentions: { parse: [], users: [] },
    content: `Judging communications for **${escapeMarkdown(roomName)}**. Blade posts room arrivals and guest-access updates here.`,
  };
}

async function roomDiscordTarget(roomId: string) {
  const [target] = await db
    .select({
      channelId: HackathonJudgingConfiguration.judgingCommsChannelId,
      roomName: JudgingRoom.name,
      threadId: JudgingRoom.discordThreadId,
    })
    .from(JudgingRoom)
    .leftJoin(
      HackathonJudgingConfiguration,
      eq(HackathonJudgingConfiguration.hackathonId, JudgingRoom.hackathonId),
    )
    .where(and(eq(JudgingRoom.id, roomId), isNull(JudgingRoom.archivedAt)))
    .limit(1);
  return target ?? null;
}

async function currentAuthorizedDiscordIds(input: {
  includeJudgeRole: boolean;
  userIds?: readonly string[];
}) {
  if (input.userIds?.length === 0) return [];
  const rows = await db
    .select({
      discordUserId: User.discordUserId,
      permissions: Roles.permissions,
    })
    .from(Permissions)
    .innerJoin(Roles, eq(Roles.id, Permissions.roleId))
    .innerJoin(User, eq(User.id, Permissions.userId))
    .where(
      input.userIds
        ? inArray(Permissions.userId, [...input.userIds])
        : undefined,
    );
  return authorizedJudgingDiscordIds(rows, input.includeJudgeRole);
}

function isHackathonActive(startDate: Date, endDate: Date) {
  const now = Date.now();
  return startDate.getTime() <= now && endDate.getTime() >= now;
}

async function currentMemberDiscordIds(roomId: string) {
  const rows = await db
    .select({
      endDate: Hackathon.endDate,
      startDate: Hackathon.startDate,
      userId: Judge.userId,
    })
    .from(JudgingRoomPresence)
    .innerJoin(Judge, eq(Judge.id, JudgingRoomPresence.judgeId))
    .innerJoin(JudgingRoom, eq(JudgingRoom.id, JudgingRoomPresence.roomId))
    .innerJoin(Hackathon, eq(Hackathon.id, JudgingRoom.hackathonId))
    .where(
      and(
        eq(JudgingRoomPresence.roomId, roomId),
        eq(Judge.kind, "member"),
        isNull(JudgingRoomPresence.leftAt),
      ),
    );
  return currentAuthorizedDiscordIds({
    includeJudgeRole:
      !!rows[0] && isHackathonActive(rows[0].startDate, rows[0].endDate),
    userIds: rows
      .map((row) => row.userId)
      .filter((id): id is string => id !== null),
  });
}

async function hackathonMemberDiscordIds(hackathonId: string) {
  const [hackathon] = await db
    .select({ endDate: Hackathon.endDate, startDate: Hackathon.startDate })
    .from(Hackathon)
    .where(eq(Hackathon.id, hackathonId))
    .limit(1);
  if (!hackathon) return [];
  return currentAuthorizedDiscordIds({
    includeJudgeRole: isHackathonActive(hackathon.startDate, hackathon.endDate),
  });
}

export async function ensureJudgingRoomThread(
  roomId: string,
  gateway: JudgingDiscordGateway = liveJudgingDiscordGateway,
) {
  return runSerialized(roomThreadQueues, roomId, async () => {
    const target = await roomDiscordTarget(roomId);
    if (!target?.channelId) return null;

    if (target.threadId) {
      try {
        await gateway.prepareRoomThread({
          channelId: target.channelId,
          roomName: target.roomName,
          threadId: target.threadId,
        });
        return target.threadId;
      } catch (error) {
        if (!shouldReplaceRoomThread(error)) throw error;
      }
    }
    const threadId = await gateway.createRoomThread({
      channelId: target.channelId,
      roomName: target.roomName,
      starter: starterMessage(target.roomName),
    });
    return db.transaction(async (tx) => {
      const [current] = await tx
        .select({
          hackathonId: JudgingRoom.hackathonId,
          threadId: JudgingRoom.discordThreadId,
        })
        .from(JudgingRoom)
        .where(and(eq(JudgingRoom.id, roomId), isNull(JudgingRoom.archivedAt)))
        .for("update")
        .limit(1);
      if (!current) return null;
      const [configuration] = await tx
        .select({
          channelId: HackathonJudgingConfiguration.judgingCommsChannelId,
        })
        .from(HackathonJudgingConfiguration)
        .where(
          eq(HackathonJudgingConfiguration.hackathonId, current.hackathonId),
        )
        .limit(1);
      if (configuration?.channelId !== target.channelId) return null;
      if (current.threadId && current.threadId !== target.threadId) {
        return current.threadId;
      }
      await tx
        .update(JudgingRoom)
        .set({ discordThreadId: threadId })
        .where(eq(JudgingRoom.id, roomId));
      return threadId;
    });
  });
}

export async function deliverJudgingRoomNotice(
  roomId: string,
  notice: JudgingRoomNotice,
  gateway: JudgingDiscordGateway = liveJudgingDiscordGateway,
): Promise<JudgingDiscordDeliveryStatus> {
  try {
    const target = await roomDiscordTarget(roomId);
    if (!target?.channelId) return "not_configured";
    const threadId = await ensureJudgingRoomThread(roomId, gateway);
    if (!threadId) return "not_configured";
    const recipientIds =
      notice.kind === "member_joined"
        ? [notice.discordUserId]
        : await currentMemberDiscordIds(roomId);
    const messages = buildJudgingRoomMessages({
      notice,
      recipientIds,
      roomName: target.roomName,
    });
    for (const message of messages) {
      await gateway.sendMessage({ message, threadId });
    }
    return "delivered";
  } catch {
    return "failed";
  }
}

export async function deliverJudgingAnnouncement(
  input: {
    hackathonId: string;
    isUrgent: boolean;
    message: string;
    roomId: string | null;
  },
  gateway: JudgingDiscordGateway = liveJudgingDiscordGateway,
): Promise<JudgingDiscordDeliveryStatus> {
  if (input.roomId) {
    return deliverJudgingRoomNotice(
      input.roomId,
      {
        isUrgent: input.isUrgent,
        kind: "announcement",
        message: input.message,
      },
      gateway,
    );
  }

  try {
    const [configuration] = await db
      .select({
        channelId: HackathonJudgingConfiguration.judgingCommsChannelId,
      })
      .from(HackathonJudgingConfiguration)
      .where(eq(HackathonJudgingConfiguration.hackathonId, input.hackathonId))
      .limit(1);
    if (!configuration?.channelId) return "not_configured";
    const recipientIds = await hackathonMemberDiscordIds(input.hackathonId);
    const messages = buildJudgingAnnouncementMessages({
      isUrgent: input.isUrgent,
      message: input.message,
      recipientIds,
      scopeLabel: "all judging rooms",
    });
    for (const message of messages) {
      await gateway.sendMessage({
        message,
        threadId: configuration.channelId,
      });
    }
    return "delivered";
  } catch {
    return "failed";
  }
}

/** Verify that a queued announcement is still current before delivery. */
export async function deliverCurrentJudgingAnnouncement(
  input: {
    announcementId: string;
    hackathonId: string;
    isUrgent: boolean;
    message: string;
    roomId: string | null;
  },
  gateway: JudgingDiscordGateway = liveJudgingDiscordGateway,
): Promise<JudgingAnnouncementDeliveryStatus> {
  const [current] = await db
    .select({ id: JudgingAnnouncement.id })
    .from(JudgingAnnouncement)
    .where(
      and(
        eq(JudgingAnnouncement.id, input.announcementId),
        eq(JudgingAnnouncement.hackathonId, input.hackathonId),
        isNull(JudgingAnnouncement.clearedAt),
      ),
    )
    .limit(1);
  if (!current) return "superseded";

  return deliverJudgingAnnouncement(input, gateway);
}

export async function listJudgingDiscordChannels(
  gateway: JudgingDiscordGateway = liveJudgingDiscordGateway,
) {
  const guildId = await getKnightHacksGuildId();
  return gateway.listTextChannels(guildId);
}

export async function validateJudgingDiscordChannel(
  channelId: string,
  gateway: JudgingDiscordGateway = liveJudgingDiscordGateway,
): Promise<"invalid" | "unavailable" | "valid"> {
  try {
    const [channel, guildId] = await Promise.all([
      gateway.getChannel(channelId),
      getKnightHacksGuildId(),
    ]);
    return "guild_id" in channel &&
      channel.guild_id === guildId &&
      (channel.type === ChannelType.GuildText ||
        channel.type === ChannelType.GuildAnnouncement)
      ? "valid"
      : "invalid";
  } catch {
    return "unavailable";
  }
}

export async function judgingDiscordGuildId() {
  try {
    return await getKnightHacksGuildId();
  } catch {
    return null;
  }
}

export async function provisionJudgingRoomThreads(
  hackathonId: string,
  gateway: JudgingDiscordGateway = liveJudgingDiscordGateway,
) {
  const rooms = await db
    .select({ id: JudgingRoom.id, name: JudgingRoom.name })
    .from(JudgingRoom)
    .where(
      and(
        eq(JudgingRoom.hackathonId, hackathonId),
        isNull(JudgingRoom.archivedAt),
      ),
    );
  const failedRooms: { id: string; name: string }[] = [];
  let provisionedCount = 0;
  for (const room of rooms) {
    try {
      const threadId = await ensureJudgingRoomThread(room.id, gateway);
      if (threadId) provisionedCount += 1;
    } catch {
      failedRooms.push(room);
    }
  }
  return { failedRooms, provisionedCount };
}
