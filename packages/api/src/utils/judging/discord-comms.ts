import { randomBytes } from "node:crypto";
import type { APIChannel, APIMessage } from "discord-api-types/v10";
import { ChannelType, Routes } from "discord-api-types/v10";

import { and, eq, isNull } from "@forge/db";
import { db } from "@forge/db/client";
import { User } from "@forge/db/schemas/auth";
import {
  HackathonJudgingConfiguration,
  Judge,
  JudgingRoom,
  JudgingRoomPresence,
} from "@forge/db/schemas/knight-hacks";
import * as discord from "@forge/utils/discord";
import { getKnightHacksGuildId } from "@forge/utils/discord-config";

const THREAD_NAME_LIMIT = 100;
const MESSAGE_LIMIT = 2_000;
const DISCORD_SNOWFLAKE = /^\d{17,20}$/;

export function judgingDiscordNonce() {
  return randomBytes(16).toString("base64url");
}

export type JudgingDiscordDeliveryStatus =
  | "delivered"
  | "failed"
  | "not_configured";

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
    roomName: string;
    threadId: string;
  }): Promise<void>;
  sendMessage(input: {
    message: JudgingDiscordMessage;
    threadId: string;
  }): Promise<void>;
}

export type JudgingRoomNotice =
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

function mentionLine(ids: readonly string[]) {
  return ids.length ? `${ids.map((id) => `<@${id}>`).join(" ")}\n` : "";
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
  notice: JudgingRoomNotice;
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
  async prepareRoomThread({ roomName, threadId }) {
    const channel = (await discord.api.get(
      Routes.channel(threadId),
    )) as APIChannel;
    if (
      channel.type !== ChannelType.PublicThread &&
      channel.type !== ChannelType.AnnouncementThread
    ) {
      throw new Error("The saved judging room thread is not usable.");
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

async function currentMemberDiscordIds(roomId: string) {
  const rows = await db
    .select({ discordUserId: User.discordUserId })
    .from(JudgingRoomPresence)
    .innerJoin(Judge, eq(Judge.id, JudgingRoomPresence.judgeId))
    .innerJoin(User, eq(User.id, Judge.userId))
    .where(
      and(
        eq(JudgingRoomPresence.roomId, roomId),
        eq(Judge.kind, "member"),
        isNull(JudgingRoomPresence.leftAt),
      ),
    );
  return validRecipientIds(rows.map((row) => row.discordUserId));
}

export async function ensureJudgingRoomThread(
  roomId: string,
  gateway: JudgingDiscordGateway = liveJudgingDiscordGateway,
) {
  const target = await roomDiscordTarget(roomId);
  if (!target?.channelId) return null;
  if (target.threadId) {
    try {
      await gateway.prepareRoomThread({
        roomName: target.roomName,
        threadId: target.threadId,
      });
      return target.threadId;
    } catch {
      // Recreate a deleted, inaccessible, or invalid saved thread below.
    }
  }
  const threadId = await gateway.createRoomThread({
    channelId: target.channelId,
    roomName: target.roomName,
    starter: starterMessage(target.roomName),
  });
  await db
    .update(JudgingRoom)
    .set({ discordThreadId: threadId })
    .where(eq(JudgingRoom.id, roomId));
  return threadId;
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
    await gateway.sendMessage({
      message: buildJudgingRoomMessage({
        notice,
        recipientIds,
        roomName: target.roomName,
      }),
      threadId,
    });
    return "delivered";
  } catch {
    return "failed";
  }
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
) {
  try {
    const [channel, guildId] = await Promise.all([
      gateway.getChannel(channelId),
      getKnightHacksGuildId(),
    ]);
    return (
      "guild_id" in channel &&
      channel.guild_id === guildId &&
      (channel.type === ChannelType.GuildText ||
        channel.type === ChannelType.GuildAnnouncement)
    );
  } catch {
    return false;
  }
}

export async function judgingDiscordGuildId() {
  try {
    return await getKnightHacksGuildId();
  } catch {
    return null;
  }
}

export async function provisionJudgingRoomThreads(hackathonId: string) {
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
      const threadId = await ensureJudgingRoomThread(room.id);
      if (threadId) provisionedCount += 1;
    } catch {
      failedRooms.push(room);
    }
  }
  return { failedRooms, provisionedCount };
}
