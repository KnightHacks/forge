import type { GuildTextBasedChannel, Message } from "discord.js";
import { ChannelType } from "discord.js";

import type {
  DiscordArchiveChannelInput,
  DiscordArchiveMessageInput,
} from "@forge/validators";
import {
  discordArchiveChannelInputSchema,
  discordArchiveMessageInputSchema,
} from "@forge/validators";

export interface DiscordArchiveLiveStore {
  tombstoneLiveMessages(
    this: void,
    input: {
      channel: DiscordArchiveChannelInput;
      messageIds: string[];
      observedAt: Date;
    },
  ): Promise<void>;
  upsertLiveMessage(
    this: void,
    input: {
      channel: DiscordArchiveChannelInput;
      message: DiscordArchiveMessageInput;
      observedAt: Date;
    },
  ): Promise<void>;
}

function jsonObject(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Expected Discord metadata to be an object.");
  }
  return value as Record<string, unknown>;
}

function pollJson(message: Message<true>) {
  if (!message.poll) return null;
  return {
    allowMultiselect: message.poll.allowMultiselect,
    answers: [...message.poll.answers.values()].map((answer) => ({
      emoji: answer.emoji?.toString() ?? null,
      id: answer.id,
      text: answer.text,
      voteCount: answer.voteCount,
    })),
    expiresAt: message.poll.expiresAt?.toISOString() ?? null,
    layoutType: message.poll.layoutType,
    question: message.poll.question.text,
    resultsFinalized: message.poll.resultsFinalized,
  };
}

export function projectDiscordLiveChannel(
  channel: GuildTextBasedChannel,
): DiscordArchiveChannelInput {
  const thread = channel.isThread() ? channel : null;
  return discordArchiveChannelInputSchema.parse({
    archived: thread?.archived ?? false,
    discordUpdatedAt:
      thread?.archiveTimestamp !== null &&
      thread?.archiveTimestamp !== undefined
        ? new Date(thread.archiveTimestamp)
        : (channel.createdAt ?? new Date()),
    guildId: channel.guildId,
    id: channel.id,
    isPrivateThread: channel.type === ChannelType.PrivateThread,
    isThread: thread !== null,
    locked: thread?.locked ?? false,
    name: channel.name,
    parentId: channel.parentId,
    topic: "topic" in channel ? channel.topic : null,
    type: channel.type,
  });
}

export function projectDiscordLiveMessage(
  message: Message<true>,
): DiscordArchiveMessageInput {
  return discordArchiveMessageInputSchema.parse({
    applicationId: message.applicationId,
    attachments: [...message.attachments.values()].map((attachment) => ({
      contentType: attachment.contentType,
      filename: (attachment.name ?? attachment.id).slice(0, 255),
      height: attachment.height,
      id: attachment.id,
      size: attachment.size,
      url: attachment.url,
      width: attachment.width,
    })),
    authorAvatarUrl: message.author.displayAvatarURL(),
    authorDiscordUserId: message.author.id,
    authorIsBot: message.author.bot,
    authorLabel: (
      message.member?.displayName ??
      message.author.globalName ??
      message.author.username
    ).slice(0, 255),
    channelId: message.channelId,
    components: message.components.map((component) =>
      jsonObject(component.toJSON()),
    ),
    content: message.content.slice(0, 40_000),
    createdAt: message.createdAt,
    editedAt: message.editedAt,
    embeds: message.embeds.map((embed) => jsonObject(embed.toJSON())),
    flags: message.flags.bitfield.toString(),
    guildId: message.guildId,
    id: message.id,
    mentionEveryone: message.mentions.everyone,
    mentionedRoleIds: [...message.mentions.roles.keys()],
    mentionedUserIds: [...message.mentions.users.keys()],
    messageType: message.type,
    pinned: message.pinned,
    poll: pollJson(message),
    replyToMessageId: message.reference?.messageId ?? null,
    stickers: [...message.stickers.values()].map((sticker) =>
      jsonObject(sticker.toJSON()),
    ),
    webhookId: message.webhookId,
  });
}

export async function persistDiscordLiveMessage(input: {
  message: Message<true>;
  now?: () => Date;
  store: DiscordArchiveLiveStore;
}) {
  await input.store.upsertLiveMessage({
    channel: projectDiscordLiveChannel(input.message.channel),
    message: projectDiscordLiveMessage(input.message),
    observedAt: input.now?.() ?? new Date(),
  });
}

export async function persistDiscordLiveTombstones(input: {
  channel: GuildTextBasedChannel;
  messageIds: string[];
  now?: () => Date;
  store: DiscordArchiveLiveStore;
}) {
  await input.store.tombstoneLiveMessages({
    channel: projectDiscordLiveChannel(input.channel),
    messageIds: input.messageIds,
    observedAt: input.now?.() ?? new Date(),
  });
}
