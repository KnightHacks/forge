import type {
  GuildTextBasedChannel,
  Message,
  PartialMessage,
} from "discord.js";
import {
  ChannelType,
  Collection,
  GatewayIntentBits,
  Partials,
} from "discord.js";
import { describe, expect, it, vi } from "vitest";

import type { DiscordArchiveLiveStore } from "../discord-archive/live";
import {
  createDiscordArchiveGatewayHandlers,
  discordArchiveClientOptions,
  safelyHandleDiscordArchiveEvent,
} from "../discord-archive/gateway";
import { projectDiscordLiveMessage } from "../discord-archive/live";

const guildId = "111111111111111111";
const otherGuildId = "222222222222222222";
const channelId = "333333333333333333";
const messageId = "444444444444444444";
const authorId = "555555555555555555";
const webhookId = "666666666666666666";
const applicationId = "777777777777777777";

function store(): DiscordArchiveLiveStore {
  return {
    tombstoneLiveMessages: vi.fn(() => Promise.resolve()),
    upsertLiveMessage: vi.fn(() => Promise.resolve()),
  };
}

function channel(configuredGuildId = guildId): GuildTextBasedChannel {
  return {
    archived: false,
    archiveTimestamp: null,
    createdAt: new Date("2026-07-26T22:00:00.000Z"),
    guildId: configuredGuildId,
    id: channelId,
    isThread: () => false,
    locked: false,
    name: "archive-tests",
    parentId: null,
    topic: null,
    type: ChannelType.GuildText,
  } as unknown as GuildTextBasedChannel;
}

function eventMessage(input: {
  configuredGuildId: string | null;
  id?: string;
  partial?: boolean;
}) {
  const inGuild = input.configuredGuildId !== null;
  return {
    channel: channel(input.configuredGuildId ?? otherGuildId),
    fetch: vi.fn(),
    guildId: input.configuredGuildId,
    id: input.id ?? messageId,
    inGuild: () => inGuild,
    partial: input.partial ?? false,
  };
}

function projectedMessageFixture(): Message<true> {
  return {
    applicationId,
    attachments: new Collection(),
    author: {
      bot: true,
      displayAvatarURL: () => "https://cdn.discordapp.com/avatar.png",
      globalName: "Archive bot",
      id: authorId,
      username: "archive-bot",
    },
    channelId,
    components: [],
    content: "bounded fixture",
    createdAt: new Date("2026-07-26T22:00:00.000Z"),
    editedAt: null,
    embeds: [],
    flags: { bitfield: 0n },
    guildId,
    id: messageId,
    member: null,
    mentions: {
      everyone: false,
      roles: new Collection(),
      users: new Collection(),
    },
    pinned: false,
    poll: null,
    reference: null,
    stickers: new Collection(),
    type: 7,
    webhookId,
  } as unknown as Message<true>;
}

describe("Discord archive Gateway", () => {
  it("uses only guild message intents and uncached message partials", () => {
    expect(discordArchiveClientOptions.intents).toEqual([
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ]);
    expect(discordArchiveClientOptions.intents).not.toContain(
      GatewayIntentBits.DirectMessages,
    );
    expect(discordArchiveClientOptions.partials).toEqual([
      Partials.Channel,
      Partials.Message,
    ]);
  });

  it("accepts only configured-guild creates and rejects DMs", async () => {
    const persistMessage = vi.fn(() => Promise.resolve());
    const handlers = createDiscordArchiveGatewayHandlers({
      guildId,
      persistence: {
        persistMessage,
        persistTombstones: vi.fn(() => Promise.resolve()),
      },
      store: store(),
    });
    const accepted = eventMessage({ configuredGuildId: guildId });

    await handlers.messageCreate(accepted as unknown as Message<true>);
    await handlers.messageCreate(
      eventMessage({
        configuredGuildId: otherGuildId,
      }) as unknown as Message<true>,
    );
    await handlers.messageCreate(
      eventMessage({
        configuredGuildId: null,
      }) as unknown as Parameters<typeof handlers.messageCreate>[0],
    );

    expect(persistMessage).toHaveBeenCalledTimes(1);
    expect(persistMessage).toHaveBeenCalledWith(
      expect.objectContaining({ message: accepted }),
    );
  });

  it("hydrates partial edits before storing the replacement state", async () => {
    const persistMessage = vi.fn(() => Promise.resolve());
    const hydrated = eventMessage({ configuredGuildId: guildId });
    const partial = eventMessage({
      configuredGuildId: guildId,
      partial: true,
    });
    partial.fetch.mockResolvedValue(hydrated);
    const handlers = createDiscordArchiveGatewayHandlers({
      guildId,
      persistence: {
        persistMessage,
        persistTombstones: vi.fn(() => Promise.resolve()),
      },
      store: store(),
    });

    await handlers.messageUpdate(partial as unknown as PartialMessage<true>);

    expect(partial.fetch).toHaveBeenCalledOnce();
    expect(persistMessage).toHaveBeenCalledWith(
      expect.objectContaining({ message: hydrated }),
    );
  });

  it("tombstones cached, uncached, and bulk-deleted message IDs", async () => {
    const persistTombstones = vi.fn(() => Promise.resolve());
    const handlers = createDiscordArchiveGatewayHandlers({
      guildId,
      persistence: {
        persistMessage: vi.fn(() => Promise.resolve()),
        persistTombstones,
      },
      store: store(),
    });
    const cached = eventMessage({ configuredGuildId: guildId });
    const uncached = eventMessage({
      configuredGuildId: guildId,
      id: "888888888888888888",
      partial: true,
    });
    const bulk = new Collection<string, Message<true> | PartialMessage<true>>([
      [messageId, cached as unknown as Message<true>],
      [uncached.id, uncached as unknown as PartialMessage<true>],
    ]);

    await handlers.messageDelete(cached as unknown as Message<true>);
    await handlers.messageDelete(uncached as unknown as PartialMessage<true>);
    await handlers.messageDeleteBulk(bulk, channel());

    expect(persistTombstones).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ messageIds: [messageId] }),
    );
    expect(persistTombstones).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ messageIds: [uncached.id] }),
    );
    expect(persistTombstones).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ messageIds: [messageId, uncached.id] }),
    );
  });

  it("projects bot, webhook, application, and system message indicators", () => {
    expect(projectDiscordLiveMessage(projectedMessageFixture())).toMatchObject({
      applicationId,
      authorDiscordUserId: authorId,
      authorIsBot: true,
      messageType: 7,
      webhookId,
    });
  });

  it("contains listener failures without logging message data", async () => {
    const error = vi.fn();
    const failure = new Error("sensitive archived content");
    Object.assign(failure, { code: "DATABASE_UNAVAILABLE" });

    await expect(
      safelyHandleDiscordArchiveEvent({
        action: () => Promise.reject(failure),
        log: { error, info: vi.fn() },
        operation: "message create",
      }),
    ).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledWith(
      "Discord archive message create failed (DATABASE_UNAVAILABLE). Reconciliation will retry.",
    );
    expect(error.mock.calls.flat().join(" ")).not.toContain(
      "sensitive archived content",
    );
  });
});
