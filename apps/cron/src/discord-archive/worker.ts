import type {
  DiscordArchiveChannelInput,
  DiscordArchiveMessageInput,
} from "@forge/validators";

export interface DiscordArchiveCheckpointView {
  backfillBeforeMessageId: string | null;
  backfillStatus: "complete" | "failed" | "pending" | "running";
  channelId: string;
  newestMessageId: string | null;
}

export interface DiscordArchiveMessageSource {
  discoverChannels(
    this: void,
    guildId: string,
  ): Promise<DiscordArchiveChannelInput[]>;
  fetchMessages(
    this: void,
    input: {
      before?: string;
      channelId: string;
      limit: number;
    },
  ): Promise<DiscordArchiveMessageInput[]>;
}

export interface DiscordArchiveWorkerStore {
  commitBackfillPage(
    this: void,
    input: {
      channelId: string;
      complete: boolean;
      messages: DiscordArchiveMessageInput[];
      newestMessageId: string | null;
      nextBeforeMessageId: string | null;
      observedAt: Date;
    },
  ): Promise<void>;
  commitReconciliation(
    this: void,
    input: {
      channelId: string;
      messages: DiscordArchiveMessageInput[];
      newestMessageId: string;
      observedAt: Date;
    },
  ): Promise<void>;
  getBackfillWork(
    this: void,
    limit: number,
  ): Promise<DiscordArchiveCheckpointView[]>;
  getReconciliationWork(
    this: void,
    limit: number,
  ): Promise<DiscordArchiveCheckpointView[]>;
  recordChannelFailure(
    this: void,
    channelId: string,
    operation: "backfill" | "reconciliation",
    error: unknown,
  ): Promise<void>;
  upsertDiscoveredChannels(
    this: void,
    channels: DiscordArchiveChannelInput[],
    observedAt: Date,
  ): Promise<void>;
}

interface DiscordArchiveWorkerOptions {
  channelBatchSize?: number;
  guildId: string;
  now?: () => Date;
  pageSize?: number;
  source: DiscordArchiveMessageSource;
  store: DiscordArchiveWorkerStore;
}

function compareSnowflakes(left: string, right: string) {
  const leftId = BigInt(left);
  const rightId = BigInt(right);
  return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
}

function oldestMessageId(messages: DiscordArchiveMessageInput[]) {
  const first = messages[0];
  if (!first)
    throw new Error("Cannot select an ID from an empty message page.");
  return messages
    .slice(1)
    .reduce(
      (oldest, message) =>
        compareSnowflakes(message.id, oldest) < 0 ? message.id : oldest,
      first.id,
    );
}

function newestMessageId(messages: DiscordArchiveMessageInput[]) {
  const first = messages[0];
  if (!first)
    throw new Error("Cannot select an ID from an empty message page.");
  return messages
    .slice(1)
    .reduce(
      (newest, message) =>
        compareSnowflakes(message.id, newest) > 0 ? message.id : newest,
      first.id,
    );
}

function sortAndDedupe(messages: DiscordArchiveMessageInput[]) {
  const byId = new Map(messages.map((message) => [message.id, message]));
  return [...byId.values()].sort((left, right) =>
    compareSnowflakes(left.id, right.id),
  );
}

export function createDiscordArchiveWorker({
  channelBatchSize = 25,
  guildId,
  now = () => new Date(),
  pageSize = 100,
  source,
  store,
}: DiscordArchiveWorkerOptions) {
  async function discover() {
    const observedAt = now();
    const channels = await source.discoverChannels(guildId);
    await store.upsertDiscoveredChannels(channels, observedAt);
    return channels.length;
  }

  async function backfillBatch() {
    const checkpoints = await store.getBackfillWork(channelBatchSize);
    let failed = 0;
    let succeeded = 0;

    for (const checkpoint of checkpoints) {
      try {
        const messages = await source.fetchMessages({
          ...(checkpoint.backfillBeforeMessageId
            ? { before: checkpoint.backfillBeforeMessageId }
            : {}),
          channelId: checkpoint.channelId,
          limit: pageSize,
        });
        const ordered = sortAndDedupe(messages);
        const complete = messages.length < pageSize;

        await store.commitBackfillPage({
          channelId: checkpoint.channelId,
          complete,
          messages: ordered,
          newestMessageId:
            checkpoint.newestMessageId === null && ordered.length > 0
              ? newestMessageId(ordered)
              : null,
          nextBeforeMessageId:
            complete || ordered.length === 0 ? null : oldestMessageId(ordered),
          observedAt: now(),
        });
        succeeded += 1;
      } catch (error) {
        failed += 1;
        await store.recordChannelFailure(
          checkpoint.channelId,
          "backfill",
          error,
        );
      }
    }

    return { failed, selected: checkpoints.length, succeeded };
  }

  async function reconcileBatch() {
    const checkpoints = await store.getReconciliationWork(channelBatchSize);
    let failed = 0;
    let succeeded = 0;

    for (const checkpoint of checkpoints) {
      if (checkpoint.newestMessageId === null) continue;

      try {
        const recovered: DiscordArchiveMessageInput[] = [];
        let before: string | undefined;
        let reachedCursor = false;

        while (!reachedCursor) {
          const page = await source.fetchMessages({
            ...(before ? { before } : {}),
            channelId: checkpoint.channelId,
            limit: pageSize,
          });
          if (page.length === 0) break;

          for (const message of page) {
            if (
              compareSnowflakes(message.id, checkpoint.newestMessageId) <= 0
            ) {
              reachedCursor = true;
            } else {
              recovered.push(message);
            }
          }

          before = oldestMessageId(page);
          if (page.length < pageSize) break;
        }

        const ordered = sortAndDedupe(recovered);

        await store.commitReconciliation({
          channelId: checkpoint.channelId,
          messages: ordered,
          newestMessageId:
            ordered.length > 0
              ? newestMessageId(ordered)
              : checkpoint.newestMessageId,
          observedAt: now(),
        });
        succeeded += 1;
      } catch (error) {
        failed += 1;
        await store.recordChannelFailure(
          checkpoint.channelId,
          "reconciliation",
          error,
        );
      }
    }

    return { failed, selected: checkpoints.length, succeeded };
  }

  return { backfillBatch, discover, reconcileBatch };
}
