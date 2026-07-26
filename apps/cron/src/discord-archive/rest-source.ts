import type {
  APIChannel,
  APIMessage,
  APIRole,
  RESTGetAPIChannelThreadsArchivedPublicResult,
  RESTGetAPIGuildChannelsResult,
  RESTGetAPIGuildRolesResult,
  RESTGetAPIGuildThreadsResult,
  RESTGetCurrentUserGuildMemberResult,
} from "discord-api-types/v10";
import {
  ChannelType,
  OverwriteType,
  PermissionFlagsBits,
  Routes,
} from "discord-api-types/v10";

import type {
  DiscordArchiveChannelInput,
  DiscordArchiveMessageInput,
} from "@forge/validators";
import {
  discordArchiveChannelInputSchema,
  discordArchiveMessageInputSchema,
} from "@forge/validators";

import type { DiscordArchiveMessageSource } from "./worker";

interface DiscordRestClient {
  get(route: string, options?: { query?: URLSearchParams }): Promise<unknown>;
}

interface RestSourceOptions {
  guildId: string;
  includeArchivedThreads?: boolean;
  rest: DiscordRestClient;
}

const MESSAGE_BEARING_CHANNEL_TYPES = new Set<ChannelType>([
  ChannelType.GuildText,
  ChannelType.GuildVoice,
  ChannelType.GuildAnnouncement,
  ChannelType.GuildStageVoice,
]);

const THREAD_PARENT_TYPES = new Set<ChannelType>([
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ChannelType.GuildForum,
  ChannelType.GuildMedia,
]);

const THREAD_TYPES = new Set<ChannelType>([
  ChannelType.AnnouncementThread,
  ChannelType.PublicThread,
  ChannelType.PrivateThread,
]);

function snowflakeCreatedAt(id: string) {
  const discordEpoch = 1_420_070_400_000n;
  return new Date(Number((BigInt(id) >> 22n) + discordEpoch));
}

function jsonObject(value: object): Record<string, unknown> {
  return value as Record<string, unknown>;
}

function avatarUrl(message: APIMessage) {
  if (!message.author.avatar) return null;
  const extension = message.author.avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.${extension}`;
}

export function projectDiscordArchiveMessage(
  guildId: string,
  message: APIMessage,
): DiscordArchiveMessageInput {
  return discordArchiveMessageInputSchema.parse({
    applicationId: message.application_id ?? null,
    attachments: message.attachments.map((attachment) => ({
      contentType: attachment.content_type ?? null,
      filename: attachment.filename.slice(0, 255),
      height: attachment.height ?? null,
      id: attachment.id,
      size: attachment.size,
      url: attachment.url,
      width: attachment.width ?? null,
    })),
    authorAvatarUrl: avatarUrl(message),
    authorDiscordUserId: message.author.id,
    authorIsBot: message.author.bot ?? false,
    authorLabel: (message.author.global_name ?? message.author.username).slice(
      0,
      255,
    ),
    channelId: message.channel_id,
    components: (message.components ?? []).map(jsonObject),
    content: message.content.slice(0, 40_000),
    createdAt: new Date(message.timestamp),
    editedAt: message.edited_timestamp
      ? new Date(message.edited_timestamp)
      : null,
    embeds: message.embeds.map(jsonObject),
    flags: String(message.flags ?? 0),
    guildId,
    id: message.id,
    mentionEveryone: message.mention_everyone,
    mentionedRoleIds: message.mention_roles,
    mentionedUserIds: message.mentions.map((user) => user.id),
    messageType: message.type,
    pinned: message.pinned,
    poll: message.poll ? jsonObject(message.poll) : null,
    replyToMessageId: message.message_reference?.message_id ?? null,
    stickers: (message.sticker_items ?? message.stickers ?? []).map(jsonObject),
    webhookId: message.webhook_id ?? null,
  });
}

export function projectDiscordArchiveChannel(
  guildId: string,
  channel: APIChannel,
): DiscordArchiveChannelInput {
  const isThread = THREAD_TYPES.has(channel.type);
  const threadMetadata =
    isThread && "thread_metadata" in channel
      ? channel.thread_metadata
      : undefined;

  return discordArchiveChannelInputSchema.parse({
    archived: threadMetadata?.archived ?? false,
    discordUpdatedAt: threadMetadata?.archive_timestamp
      ? new Date(threadMetadata.archive_timestamp)
      : snowflakeCreatedAt(channel.id),
    guildId,
    id: channel.id,
    isPrivateThread: channel.type === ChannelType.PrivateThread,
    isThread,
    locked: threadMetadata?.locked ?? false,
    name:
      "name" in channel && typeof channel.name === "string"
        ? channel.name
        : `channel-${channel.id}`,
    parentId:
      "parent_id" in channel && typeof channel.parent_id === "string"
        ? channel.parent_id
        : null,
    topic:
      "topic" in channel && typeof channel.topic === "string"
        ? channel.topic
        : null,
    type: channel.type,
  });
}

function hasPermission(permissions: bigint, permission: bigint) {
  return (
    (permissions & PermissionFlagsBits.Administrator) !== 0n ||
    (permissions & permission) === permission
  );
}

function channelPermissions(
  guildId: string,
  channel: APIChannel,
  member: RESTGetCurrentUserGuildMemberResult,
  roles: RESTGetAPIGuildRolesResult,
) {
  const memberRoleIds = new Set([guildId, ...member.roles]);
  let permissions = roles.reduce(
    (result, role) =>
      memberRoleIds.has(role.id) ? result | BigInt(role.permissions) : result,
    0n,
  );

  if ((permissions & PermissionFlagsBits.Administrator) !== 0n) {
    return permissions;
  }

  if (!("permission_overwrites" in channel)) return permissions;

  const overwrites = channel.permission_overwrites ?? [];
  const everyone = overwrites.find(
    (overwrite) =>
      overwrite.type === OverwriteType.Role && overwrite.id === guildId,
  );
  if (everyone) {
    permissions &= ~BigInt(everyone.deny);
    permissions |= BigInt(everyone.allow);
  }

  let roleAllow = 0n;
  let roleDeny = 0n;
  for (const overwrite of overwrites) {
    if (
      overwrite.type === OverwriteType.Role &&
      memberRoleIds.has(overwrite.id)
    ) {
      roleAllow |= BigInt(overwrite.allow);
      roleDeny |= BigInt(overwrite.deny);
    }
  }
  permissions &= ~roleDeny;
  permissions |= roleAllow;

  const memberOverwrite = overwrites.find(
    (overwrite) =>
      overwrite.type === OverwriteType.Member &&
      overwrite.id === member.user.id,
  );
  if (memberOverwrite) {
    permissions &= ~BigInt(memberOverwrite.deny);
    permissions |= BigInt(memberOverwrite.allow);
  }

  return permissions;
}

export function canArchiveParentChannel(
  guildId: string,
  channel: APIChannel,
  member: RESTGetCurrentUserGuildMemberResult,
  roles: APIRole[],
) {
  const permissions = channelPermissions(guildId, channel, member, roles);
  return (
    hasPermission(permissions, PermissionFlagsBits.ViewChannel) &&
    hasPermission(permissions, PermissionFlagsBits.ReadMessageHistory)
  );
}

function isThread(channel: APIChannel) {
  return THREAD_TYPES.has(channel.type);
}

function archiveCursor(threads: APIChannel[]) {
  const timestamps = threads.flatMap((thread) =>
    isThread(thread) &&
    "thread_metadata" in thread &&
    thread.thread_metadata?.archive_timestamp
      ? [thread.thread_metadata.archive_timestamp]
      : [],
  );
  return timestamps.sort()[0];
}

async function listArchivedThreads(
  rest: DiscordRestClient,
  parentId: string,
  visibility: "joined-private" | "public",
) {
  const threads: APIChannel[] = [];
  let before: string | undefined;

  for (;;) {
    const query = new URLSearchParams({ limit: "100" });
    if (before) query.set("before", before);
    const route =
      visibility === "public"
        ? Routes.channelThreads(parentId, "public")
        : Routes.channelJoinedArchivedThreads(parentId);
    const result = (await rest.get(route, {
      query,
    })) as RESTGetAPIChannelThreadsArchivedPublicResult;

    threads.push(...result.threads);
    if (!result.has_more || result.threads.length === 0) break;

    const nextBefore = archiveCursor(result.threads);
    if (!nextBefore || nextBefore === before) break;
    before = nextBefore;
  }

  return threads;
}

function uniqueChannels(channels: APIChannel[]) {
  return [
    ...new Map(channels.map((channel) => [channel.id, channel])).values(),
  ];
}

export function createDiscordArchiveRestSource({
  guildId: configuredGuildId,
  includeArchivedThreads = false,
  rest,
}: RestSourceOptions): DiscordArchiveMessageSource {
  return {
    async discoverChannels(guildId) {
      if (guildId !== configuredGuildId) {
        throw new Error("Discord archive source received an unexpected guild.");
      }
      const [guildChannelResult, activeThreads, member, roles] =
        await Promise.all([
          rest.get(
            Routes.guildChannels(guildId),
          ) as Promise<RESTGetAPIGuildChannelsResult>,
          rest.get(
            Routes.guildActiveThreads(guildId),
          ) as Promise<RESTGetAPIGuildThreadsResult>,
          rest.get(
            Routes.userGuildMember(guildId),
          ) as Promise<RESTGetCurrentUserGuildMemberResult>,
          rest.get(
            Routes.guildRoles(guildId),
          ) as Promise<RESTGetAPIGuildRolesResult>,
        ]);
      const guildChannels = guildChannelResult as unknown as APIChannel[];

      const visibleParents = guildChannels.filter(
        (channel) =>
          (MESSAGE_BEARING_CHANNEL_TYPES.has(channel.type) ||
            THREAD_PARENT_TYPES.has(channel.type)) &&
          canArchiveParentChannel(guildId, channel, member, roles),
      );
      const messageBearingParents = visibleParents.filter((channel) =>
        MESSAGE_BEARING_CHANNEL_TYPES.has(channel.type),
      );
      const visibleParentIds = new Set(
        visibleParents.map((channel) => channel.id),
      );
      const accessibleActiveThreads = activeThreads.threads.filter(
        (thread) =>
          isThread(thread) &&
          "parent_id" in thread &&
          typeof thread.parent_id === "string" &&
          visibleParentIds.has(thread.parent_id),
      );

      const archivedThreads: APIChannel[] = [];
      if (includeArchivedThreads) {
        for (const parent of visibleParents) {
          archivedThreads.push(
            ...(await listArchivedThreads(rest, parent.id, "public")),
          );
          if (parent.type === ChannelType.GuildText) {
            archivedThreads.push(
              ...(await listArchivedThreads(rest, parent.id, "joined-private")),
            );
          }
        }
      }

      return uniqueChannels([
        ...messageBearingParents,
        ...accessibleActiveThreads,
        ...archivedThreads,
      ]).map((channel) => projectDiscordArchiveChannel(guildId, channel));
    },

    async fetchMessages({ before, channelId, limit }) {
      const query = new URLSearchParams({ limit: String(limit) });
      if (before) query.set("before", before);
      const messages = (await rest.get(Routes.channelMessages(channelId), {
        query,
      })) as APIMessage[];
      return messages.map((message) =>
        projectDiscordArchiveMessage(configuredGuildId, message),
      );
    },
  };
}
