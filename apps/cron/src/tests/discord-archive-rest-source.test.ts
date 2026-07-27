import type { APIChannel, APIMessage } from "discord-api-types/v10";
import {
  ChannelType,
  PermissionFlagsBits,
  Routes,
} from "discord-api-types/v10";
import { describe, expect, it, vi } from "vitest";

import {
  createDiscordArchiveRestSource,
  projectDiscordArchiveMessage,
} from "../discord-archive/rest-source";

const guildId = "111111111111111111";
const visibleChannelId = "222222222222222222";
const hiddenChannelId = "333333333333333333";
const botId = "444444444444444444";
const voiceChannelId = "888888888888888888";

function channel(id: string, input: Partial<APIChannel> = {}): APIChannel {
  return {
    guild_id: guildId,
    id,
    last_message_id: null,
    name: `channel-${id}`,
    nsfw: false,
    parent_id: null,
    permission_overwrites: [],
    position: 0,
    rate_limit_per_user: 0,
    topic: null,
    type: ChannelType.GuildText,
    ...input,
  } as APIChannel;
}

function message(): APIMessage {
  return {
    attachments: [
      {
        content_type: "text/plain",
        filename: "notes.txt",
        height: null,
        id: "555555555555555555",
        proxy_url: "https://cdn.discordapp.com/proxy/notes.txt",
        size: 12,
        url: "https://cdn.discordapp.com/notes.txt",
        width: null,
      },
    ],
    author: {
      avatar: null,
      discriminator: "0",
      global_name: "Archive Member",
      id: "666666666666666666",
      username: "archive-member",
    },
    channel_id: visibleChannelId,
    components: [],
    content: "hello archive",
    edited_timestamp: null,
    embeds: [],
    id: "777777777777777777",
    mention_everyone: false,
    mention_roles: [],
    mentions: [],
    pinned: false,
    timestamp: "2026-07-26T20:00:00.000Z",
    tts: false,
    type: 0,
  };
}

describe("Discord archive REST source", () => {
  it("projects bounded message content and attachment metadata", () => {
    const projected = projectDiscordArchiveMessage(guildId, message());

    expect(projected).toMatchObject({
      authorDiscordUserId: "666666666666666666",
      authorLabel: "Archive Member",
      channelId: visibleChannelId,
      content: "hello archive",
      guildId,
    });
    expect(projected.attachments).toEqual([
      expect.objectContaining({
        filename: "notes.txt",
        size: 12,
      }),
    ]);
  });

  it("discovers only message-bearing parents the bot can read", async () => {
    const requiredPermissions = (
      PermissionFlagsBits.ViewChannel | PermissionFlagsBits.ReadMessageHistory
    ).toString();
    const rest = {
      get: vi.fn(async (route: string) => {
        await Promise.resolve();
        if (route === Routes.guildChannels(guildId)) {
          return [
            channel(visibleChannelId),
            channel(voiceChannelId, { type: ChannelType.GuildVoice }),
            channel(hiddenChannelId, {
              permission_overwrites: [
                {
                  allow: "0",
                  deny: PermissionFlagsBits.ViewChannel.toString(),
                  id: guildId,
                  type: 0,
                },
              ],
            }),
          ];
        }
        if (route === Routes.guildActiveThreads(guildId)) {
          return { members: [], threads: [] };
        }
        if (route === Routes.user()) {
          return {
            avatar: null,
            discriminator: "0",
            global_name: "Archive",
            id: botId,
            username: "archive",
          };
        }
        if (route === Routes.guildMember(guildId, botId)) {
          return {
            avatar: null,
            communication_disabled_until: null,
            deaf: false,
            flags: 0,
            joined_at: "2026-07-26T00:00:00.000Z",
            mute: false,
            pending: false,
            roles: [],
            user: {
              avatar: null,
              discriminator: "0",
              global_name: "Archive",
              id: botId,
              username: "archive",
            },
          };
        }
        if (route === Routes.guildRoles(guildId)) {
          return [
            {
              color: 0,
              flags: 0,
              hoist: false,
              icon: null,
              id: guildId,
              managed: false,
              mentionable: false,
              name: "@everyone",
              permissions: requiredPermissions,
              position: 0,
              unicode_emoji: null,
            },
          ];
        }
        if (
          route === Routes.channelThreads(visibleChannelId, "public") ||
          route === Routes.channelJoinedArchivedThreads(visibleChannelId)
        ) {
          return { has_more: false, members: [], threads: [] };
        }
        throw new Error(`Unexpected route: ${route}`);
      }),
    };
    const source = createDiscordArchiveRestSource({
      guildId,
      includeArchivedThreads: true,
      rest,
    });

    const discovered = await source.discoverChannels(guildId);

    expect(discovered.map((item) => item.id)).toEqual([
      visibleChannelId,
      voiceChannelId,
    ]);
    expect(rest.get).not.toHaveBeenCalledWith(Routes.userGuildMember(guildId));
    expect(rest.get).not.toHaveBeenCalledWith(
      Routes.channelThreads(voiceChannelId, "public"),
      expect.anything(),
    );
  });

  it("returns an empty history page without requiring message guild fields", async () => {
    const rest = {
      get: vi.fn().mockResolvedValue([]),
    };
    const source = createDiscordArchiveRestSource({ guildId, rest });

    await expect(
      source.fetchMessages({ channelId: visibleChannelId, limit: 100 }),
    ).resolves.toEqual([]);
  });
});
