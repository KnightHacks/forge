import { describe, expect, it, vi } from "vitest";

import type { DiscordArchiveCycleStore } from "../discord-archive/cycle";
import type { createDiscordArchiveWorker } from "../discord-archive/worker";
import {
  runDiscordArchiveCycle,
  runDiscordArchiveInitialBackfill,
} from "../discord-archive/cycle";

const guildId = "111111111111111111";
const owner = "archive-test";

function store(
  input: Partial<DiscordArchiveCycleStore> = {},
): DiscordArchiveCycleStore {
  return {
    commitBackfillPage: vi.fn(),
    commitReconciliation: vi.fn(),
    getBackfillWork: vi.fn(),
    getReconciliationWork: vi.fn(),
    recordChannelFailure: vi.fn(),
    recordCycleCompleted: vi.fn(),
    recordCycleFailure: vi.fn(),
    recordCycleStarted: vi.fn(),
    releaseLease: vi.fn(),
    tryAcquireLease: vi.fn().mockResolvedValue(true),
    upsertDiscoveredChannels: vi.fn(),
    ...input,
  };
}

type Worker = ReturnType<typeof createDiscordArchiveWorker>;

function worker(input: Partial<Worker> = {}): Worker {
  return {
    backfillBatch: vi
      .fn()
      .mockResolvedValue({ failed: 0, selected: 0, succeeded: 0 }),
    discover: vi.fn().mockResolvedValue(3),
    reconcileBatch: vi
      .fn()
      .mockResolvedValue({ failed: 0, selected: 2, succeeded: 2 }),
    ...input,
  };
}

describe("Discord archive coordinated cycles", () => {
  it("does no Discord work when another worker owns the lease", async () => {
    const archiveStore = store({
      tryAcquireLease: vi.fn().mockResolvedValue(false),
    });
    const archiveWorker = worker();

    const result = await runDiscordArchiveCycle({
      guildId,
      owner,
      store: archiveStore,
      worker: archiveWorker,
    });

    expect(result).toEqual({ acquired: false });
    const discover = vi.mocked(archiveWorker.discover);
    const releaseLease = vi.mocked(archiveStore.releaseLease);
    expect(discover).not.toHaveBeenCalled();
    expect(releaseLease).not.toHaveBeenCalled();
  });

  it("releases the durable lease after a failed cycle", async () => {
    const failure = new Error("discovery failed");
    const archiveStore = store();
    const archiveWorker = worker({
      discover: vi.fn().mockRejectedValue(failure),
    });

    await expect(
      runDiscordArchiveCycle({
        guildId,
        owner,
        store: archiveStore,
        worker: archiveWorker,
      }),
    ).rejects.toThrow("discovery failed");

    const recordCycleFailure = vi.mocked(archiveStore.recordCycleFailure);
    const releaseLease = vi.mocked(archiveStore.releaseLease);
    expect(recordCycleFailure).toHaveBeenCalledWith(
      guildId,
      failure,
      expect.any(Date),
    );
    expect(releaseLease).toHaveBeenCalledWith(guildId, owner, expect.any(Date));
  });

  it("runs initial backfill pages until every checkpoint is complete", async () => {
    const archiveStore = store();
    const backfillBatch = vi
      .fn()
      .mockResolvedValueOnce({ failed: 0, selected: 2, succeeded: 2 })
      .mockResolvedValueOnce({ failed: 0, selected: 1, succeeded: 1 })
      .mockResolvedValueOnce({ failed: 0, selected: 0, succeeded: 0 });
    const archiveWorker = worker({ backfillBatch });

    const result = await runDiscordArchiveInitialBackfill({
      guildId,
      owner,
      store: archiveStore,
      worker: archiveWorker,
    });

    expect(result).toMatchObject({
      acquired: true,
      discovered: 3,
      pages: 3,
    });
    expect(backfillBatch).toHaveBeenCalledTimes(3);
    const recordCycleCompleted = vi.mocked(archiveStore.recordCycleCompleted);
    const releaseLease = vi.mocked(archiveStore.releaseLease);
    expect(recordCycleCompleted).toHaveBeenCalledOnce();
    expect(releaseLease).toHaveBeenCalledOnce();
  });
});
