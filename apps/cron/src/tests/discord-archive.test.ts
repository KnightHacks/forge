import { describe, expect, it, vi } from "vitest";

import type {
  DiscordArchiveCheckpointView,
  DiscordArchiveWorkerStore,
} from "../discord-archive/worker";
import { createDiscordArchiveWorker } from "../discord-archive/worker";

const guildId = "111111111111111111";
const channelId = "222222222222222222";

function snowflake(sequence: number) {
  return (900_000_000_000_000_000n + BigInt(sequence)).toString();
}

function message(sequence: number) {
  return {
    applicationId: null,
    attachments: [],
    authorAvatarUrl: null,
    authorDiscordUserId: "333333333333333333",
    authorIsBot: false,
    authorLabel: "Archive Fixture",
    channelId,
    components: [],
    content: `message-${sequence}`,
    createdAt: new Date(
      `2026-07-26T12:${String(sequence % 60).padStart(2, "0")}:00.000Z`,
    ),
    editedAt: null,
    embeds: [],
    flags: "0",
    guildId,
    id: snowflake(sequence),
    mentionEveryone: false,
    mentionedRoleIds: [],
    mentionedUserIds: [],
    messageType: 0,
    pinned: false,
    poll: null,
    replyToMessageId: null,
    stickers: [],
    webhookId: null,
  };
}

function checkpoint(
  input: Partial<DiscordArchiveCheckpointView> = {},
): DiscordArchiveCheckpointView {
  return {
    backfillBeforeMessageId: null,
    backfillStatus: "pending",
    channelId,
    newestMessageId: null,
    ...input,
  };
}

function store(
  input: Partial<DiscordArchiveWorkerStore> = {},
): DiscordArchiveWorkerStore {
  return {
    commitBackfillPage: vi.fn().mockResolvedValue(undefined),
    commitReconciliation: vi.fn().mockResolvedValue(undefined),
    getBackfillWork: vi.fn().mockResolvedValue([]),
    getReconciliationWork: vi.fn().mockResolvedValue([]),
    recordChannelFailure: vi.fn().mockResolvedValue(undefined),
    upsertDiscoveredChannels: vi.fn().mockResolvedValue(undefined),
    ...input,
  };
}

describe("Discord archive durable scrape worker", () => {
  it("TC-012 discovers visible message-bearing channels", async () => {
    const archiveStore = store();
    const channels = [
      {
        archived: false,
        discordUpdatedAt: new Date("2026-07-26T12:00:00.000Z"),
        guildId,
        id: channelId,
        isPrivateThread: false,
        isThread: false,
        locked: false,
        name: "general",
        parentId: null,
        topic: null,
        type: 0,
      },
    ];
    const worker = createDiscordArchiveWorker({
      guildId,
      source: {
        discoverChannels: vi.fn().mockResolvedValue(channels),
        fetchMessages: vi.fn(),
      },
      store: archiveStore,
    });

    await worker.discover();

    expect(archiveStore.upsertDiscoveredChannels).toHaveBeenCalledWith(
      channels,
      expect.any(Date),
    );
  });

  it("TC-016 through TC-019 advances backfill pages and completes the final page", async () => {
    const pages = [
      Array.from({ length: 100 }, (_, index) => message(250 - index)),
      Array.from({ length: 100 }, (_, index) => message(150 - index)),
      Array.from({ length: 50 }, (_, index) => message(50 - index)),
    ];
    const archiveStore = store({
      getBackfillWork: vi
        .fn()
        .mockResolvedValueOnce([checkpoint()])
        .mockResolvedValueOnce([
          checkpoint({
            backfillBeforeMessageId: snowflake(151),
            newestMessageId: snowflake(250),
          }),
        ])
        .mockResolvedValueOnce([
          checkpoint({
            backfillBeforeMessageId: snowflake(51),
            newestMessageId: snowflake(250),
          }),
        ]),
    });
    const fetchMessages = vi
      .fn()
      .mockResolvedValueOnce(pages[0])
      .mockResolvedValueOnce(pages[1])
      .mockResolvedValueOnce(pages[2]);
    const worker = createDiscordArchiveWorker({
      guildId,
      pageSize: 100,
      source: { discoverChannels: vi.fn(), fetchMessages },
      store: archiveStore,
    });

    await worker.backfillBatch();
    await worker.backfillBatch();
    await worker.backfillBatch();

    expect(fetchMessages.mock.calls.map((call) => call[0].before)).toEqual([
      undefined,
      snowflake(151),
      snowflake(51),
    ]);
    expect(archiveStore.commitBackfillPage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        complete: false,
        nextBeforeMessageId: snowflake(151),
        newestMessageId: snowflake(250),
      }),
    );
    expect(archiveStore.commitBackfillPage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        complete: true,
        nextBeforeMessageId: null,
        newestMessageId: null,
      }),
    );
  });

  it("TC-018 leaves cursor ownership with the store when a page fetch fails", async () => {
    const archiveStore = store({
      getBackfillWork: vi.fn().mockResolvedValue([checkpoint()]),
    });
    const failure = new Error("Discord temporarily unavailable");
    const worker = createDiscordArchiveWorker({
      guildId,
      source: {
        discoverChannels: vi.fn(),
        fetchMessages: vi.fn().mockRejectedValue(failure),
      },
      store: archiveStore,
    });

    await worker.backfillBatch();

    expect(archiveStore.commitBackfillPage).not.toHaveBeenCalled();
    expect(archiveStore.recordChannelFailure).toHaveBeenCalledWith(
      channelId,
      "backfill",
      failure,
    );
  });

  it("TC-022 walks backward to overlap instead of skipping a multi-page gap", async () => {
    const newestStored = snowflake(100);
    const pages = [
      Array.from({ length: 100 }, (_, index) => message(301 - index)),
      Array.from({ length: 100 }, (_, index) => message(201 - index)),
      Array.from({ length: 100 }, (_, index) => message(101 - index)),
    ];
    const archiveStore = store({
      getReconciliationWork: vi
        .fn()
        .mockResolvedValue([checkpoint({ newestMessageId: newestStored })]),
    });
    const fetchMessages = vi
      .fn()
      .mockResolvedValueOnce(pages[0])
      .mockResolvedValueOnce(pages[1])
      .mockResolvedValueOnce(pages[2]);
    const worker = createDiscordArchiveWorker({
      guildId,
      pageSize: 100,
      source: { discoverChannels: vi.fn(), fetchMessages },
      store: archiveStore,
    });

    await worker.reconcileBatch();

    expect(fetchMessages).toHaveBeenCalledTimes(3);
    expect(fetchMessages.mock.calls.map((call) => call[0].before)).toEqual([
      undefined,
      snowflake(202),
      snowflake(102),
    ]);
    expect(archiveStore.commitReconciliation).toHaveBeenCalledOnce();
    const committed = vi.mocked(archiveStore.commitReconciliation).mock
      .calls[0]![0];
    expect(committed.messages).toHaveLength(201);
    expect(committed.messages[0]?.id).toBe(snowflake(101));
    expect(committed.messages.at(-1)?.id).toBe(snowflake(301));
    expect(committed.newestMessageId).toBe(snowflake(301));
  });
});
