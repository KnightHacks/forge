import type {
  createDiscordArchiveWorker,
  DiscordArchiveWorkerStore,
} from "./worker";

type DiscordArchiveWorker = ReturnType<typeof createDiscordArchiveWorker>;

export interface DiscordArchiveCycleStore extends DiscordArchiveWorkerStore {
  recordCycleCompleted(this: void, guildId: string, now: Date): Promise<void>;
  recordCycleFailure(
    this: void,
    guildId: string,
    error: unknown,
    now: Date,
  ): Promise<void>;
  recordCycleStarted(this: void, guildId: string, now: Date): Promise<void>;
  releaseLease(
    this: void,
    guildId: string,
    owner: string,
    now: Date,
  ): Promise<void>;
  tryAcquireLease(
    this: void,
    input: {
      guildId: string;
      leaseMs: number;
      now: Date;
      owner: string;
    },
  ): Promise<boolean>;
}

interface DiscordArchiveCycleOptions {
  guildId: string;
  leaseMs?: number;
  now?: () => Date;
  owner: string;
  store: DiscordArchiveCycleStore;
  worker: DiscordArchiveWorker;
}

export async function runDiscordArchiveCycle({
  guildId,
  leaseMs = 5 * 60_000,
  now = () => new Date(),
  owner,
  store,
  worker,
}: DiscordArchiveCycleOptions) {
  const acquired = await store.tryAcquireLease({
    guildId,
    leaseMs,
    now: now(),
    owner,
  });
  if (!acquired) {
    return { acquired: false as const };
  }

  try {
    await store.recordCycleStarted(guildId, now());
    const discovered = await worker.discover();
    const backfill = await worker.backfillBatch();
    const reconciliation = await worker.reconcileBatch();
    await store.recordCycleCompleted(guildId, now());
    return {
      acquired: true as const,
      backfill,
      discovered,
      reconciliation,
    };
  } catch (error) {
    await store.recordCycleFailure(guildId, error, now());
    throw error;
  } finally {
    await store.releaseLease(guildId, owner, now());
  }
}

interface InitialBackfillOptions extends DiscordArchiveCycleOptions {
  maxRounds?: number;
  onRound?: (input: {
    failed: number;
    round: number;
    selected: number;
    succeeded: number;
  }) => void;
}

export async function runDiscordArchiveInitialBackfill({
  guildId,
  leaseMs = 60 * 60_000,
  maxRounds = 10_000,
  now = () => new Date(),
  onRound,
  owner,
  store,
  worker,
}: InitialBackfillOptions) {
  const acquired = await store.tryAcquireLease({
    guildId,
    leaseMs,
    now: now(),
    owner,
  });
  if (!acquired) {
    return { acquired: false as const };
  }

  try {
    await store.recordCycleStarted(guildId, now());
    const discovered = await worker.discover();
    let pages = 0;

    for (let round = 1; round <= maxRounds; round += 1) {
      const result = await worker.backfillBatch();
      pages += result.succeeded;
      onRound?.({ ...result, round });

      if (result.selected === 0) {
        const reconciliation = await worker.reconcileBatch();
        await store.recordCycleCompleted(guildId, now());
        return {
          acquired: true as const,
          discovered,
          pages,
          reconciliation,
        };
      }
      if (result.succeeded === 0 && result.failed > 0) {
        throw new Error(
          "Discord archive backfill made no progress; see channel checkpoints.",
        );
      }
    }

    throw new Error(
      `Discord archive backfill exceeded ${maxRounds} page rounds.`,
    );
  } catch (error) {
    await store.recordCycleFailure(guildId, error, now());
    throw error;
  } finally {
    await store.releaseLease(guildId, owner, now());
  }
}
