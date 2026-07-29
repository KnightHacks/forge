import type { DiscordArchiveHealthInput } from "@forge/validators";
import { and, eq, ilike, isNull, sql } from "@forge/db";
import { db } from "@forge/db/client";
import {
  DiscordArchiveChannel,
  DiscordArchiveCheckpoint,
  DiscordArchiveMessage,
  DiscordArchiveState,
} from "@forge/db/schemas/discord";
import { getKnightHacksGuildId } from "@forge/utils/discord-config";

function ratio(numerator: number, denominator: number) {
  return denominator === 0 ? null : numerator / denominator;
}

function lagSeconds(value: Date | null, now: Date) {
  return value === null
    ? null
    : Math.max(0, Math.floor((now.getTime() - value.getTime()) / 1_000));
}

function dateOrNull(value: Date | string | null | undefined) {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value : new Date(value);
}

export async function getDiscordArchiveHealth(
  input: DiscordArchiveHealthInput,
  now = new Date(),
) {
  const guildId = await getKnightHacksGuildId();
  const predicates = [
    eq(DiscordArchiveChannel.guildId, guildId),
    isNull(DiscordArchiveChannel.deletedAt),
  ];
  if (input.cursor) {
    predicates.push(
      sql`CAST(${DiscordArchiveChannel.id} AS numeric) < CAST(${input.cursor} AS numeric)`,
    );
  }
  if (input.search) {
    predicates.push(ilike(DiscordArchiveChannel.name, `%${input.search}%`));
  }

  const [stateRows, surfaceRows, messageRows, checkpointRows, channels] =
    await Promise.all([
      db
        .select({
          failureCount: DiscordArchiveState.failureCount,
          lastBackfillProgressAt: DiscordArchiveState.lastBackfillProgressAt,
          lastDiscoveryCompletedAt:
            DiscordArchiveState.lastDiscoveryCompletedAt,
          lastErrorCode: DiscordArchiveState.lastErrorCode,
          lastGatewayEventAt: DiscordArchiveState.lastGatewayEventAt,
          lastLiveWriteAt: DiscordArchiveState.lastLiveWriteAt,
          lastReconciliationCompletedAt:
            DiscordArchiveState.lastReconciliationCompletedAt,
          leaseExpiresAt: DiscordArchiveState.leaseExpiresAt,
          status: DiscordArchiveState.status,
          updatedAt: DiscordArchiveState.updatedAt,
        })
        .from(DiscordArchiveState)
        .where(eq(DiscordArchiveState.guildId, guildId))
        .limit(1),
      db
        .select({
          channelCount: sql<number>`count(*) filter (where ${DiscordArchiveChannel.isThread} = false)::int`,
          privateThreadCount: sql<number>`count(*) filter (where ${DiscordArchiveChannel.isPrivateThread} = true)::int`,
          surfaceCount: sql<number>`count(*)::int`,
          threadCount: sql<number>`count(*) filter (where ${DiscordArchiveChannel.isThread} = true)::int`,
        })
        .from(DiscordArchiveChannel)
        .where(
          and(
            eq(DiscordArchiveChannel.guildId, guildId),
            isNull(DiscordArchiveChannel.deletedAt),
          ),
        ),
      db
        .select({
          currentMessageCount: sql<number>`count(*) filter (where ${DiscordArchiveMessage.deletedAt} is null)::int`,
          firstMessageAt: sql<Date | null>`min(${DiscordArchiveMessage.createdAt})`,
          lastObservedAt: sql<Date | null>`max(${DiscordArchiveMessage.lastObservedAt})`,
          tombstonedMessageCount: sql<number>`count(*) filter (where ${DiscordArchiveMessage.deletedAt} is not null)::int`,
          totalMessageCount: sql<number>`count(*)::int`,
        })
        .from(DiscordArchiveMessage)
        .where(eq(DiscordArchiveMessage.guildId, guildId)),
      db
        .select({
          completeCount: sql<number>`count(*) filter (where ${DiscordArchiveCheckpoint.backfillStatus} = 'complete')::int`,
          failedCount: sql<number>`count(*) filter (where ${DiscordArchiveCheckpoint.backfillStatus} = 'failed')::int`,
          lastBackfillAt: sql<Date | null>`max(${DiscordArchiveCheckpoint.lastBackfillAt})`,
          lastReconciledAt: sql<Date | null>`max(${DiscordArchiveCheckpoint.lastReconciledAt})`,
          pendingCount: sql<number>`count(*) filter (where ${DiscordArchiveCheckpoint.backfillStatus} = 'pending')::int`,
          processedMessageCount: sql<number>`coalesce(sum(${DiscordArchiveCheckpoint.processedMessageCount}), 0)::int`,
          runningCount: sql<number>`count(*) filter (where ${DiscordArchiveCheckpoint.backfillStatus} = 'running')::int`,
          totalCount: sql<number>`count(*)::int`,
        })
        .from(DiscordArchiveCheckpoint)
        .where(eq(DiscordArchiveCheckpoint.guildId, guildId)),
      db
        .select({
          archived: DiscordArchiveChannel.archived,
          backfillCompletedAt: DiscordArchiveCheckpoint.backfillCompletedAt,
          backfillStatus: DiscordArchiveCheckpoint.backfillStatus,
          channelId: DiscordArchiveChannel.id,
          isPrivateThread: DiscordArchiveChannel.isPrivateThread,
          isThread: DiscordArchiveChannel.isThread,
          lastBackfillAt: DiscordArchiveCheckpoint.lastBackfillAt,
          lastErrorCode: DiscordArchiveCheckpoint.lastErrorCode,
          lastReconciledAt: DiscordArchiveCheckpoint.lastReconciledAt,
          name: DiscordArchiveChannel.name,
          processedMessageCount: DiscordArchiveCheckpoint.processedMessageCount,
          retryCount: DiscordArchiveCheckpoint.retryCount,
          type: DiscordArchiveChannel.type,
        })
        .from(DiscordArchiveChannel)
        .leftJoin(
          DiscordArchiveCheckpoint,
          eq(DiscordArchiveCheckpoint.channelId, DiscordArchiveChannel.id),
        )
        .where(and(...predicates))
        .orderBy(sql`CAST(${DiscordArchiveChannel.id} AS numeric) DESC`)
        .limit(input.limit + 1),
    ]);

  const state = stateRows[0] ?? null;
  const surfaces = surfaceRows[0] ?? {
    channelCount: 0,
    privateThreadCount: 0,
    surfaceCount: 0,
    threadCount: 0,
  };
  const messageAggregates = messageRows[0] ?? {
    currentMessageCount: 0,
    firstMessageAt: null,
    lastObservedAt: null,
    tombstonedMessageCount: 0,
    totalMessageCount: 0,
  };
  const messages = {
    ...messageAggregates,
    firstMessageAt: dateOrNull(messageAggregates.firstMessageAt),
    lastObservedAt: dateOrNull(messageAggregates.lastObservedAt),
  };
  const checkpointAggregates = checkpointRows[0] ?? {
    completeCount: 0,
    failedCount: 0,
    lastBackfillAt: null,
    lastReconciledAt: null,
    pendingCount: 0,
    processedMessageCount: 0,
    runningCount: 0,
    totalCount: 0,
  };
  const checkpoints = {
    ...checkpointAggregates,
    lastBackfillAt: dateOrNull(checkpointAggregates.lastBackfillAt),
    lastReconciledAt: dateOrNull(checkpointAggregates.lastReconciledAt),
  };
  const hasNextPage = channels.length > input.limit;
  const visibleChannels = channels.slice(0, input.limit);

  return {
    checkpoints: {
      ...checkpoints,
      coverage: ratio(checkpoints.completeCount, surfaces.surfaceCount),
    },
    generatedAt: now,
    ingestion: {
      failureCount: state?.failureCount ?? 0,
      gatewayLagSeconds: lagSeconds(state?.lastGatewayEventAt ?? null, now),
      lastBackfillProgressAt:
        state?.lastBackfillProgressAt ?? checkpoints.lastBackfillAt,
      lastDiscoveryCompletedAt: state?.lastDiscoveryCompletedAt ?? null,
      lastErrorCode: state?.lastErrorCode ?? null,
      lastGatewayEventAt: state?.lastGatewayEventAt ?? null,
      lastLiveWriteAt: state?.lastLiveWriteAt ?? null,
      lastReconciliationCompletedAt:
        state?.lastReconciliationCompletedAt ?? null,
      leaseActive:
        state?.leaseExpiresAt !== null &&
        state?.leaseExpiresAt !== undefined &&
        state.leaseExpiresAt.getTime() > now.getTime(),
      leaseExpiresAt: state?.leaseExpiresAt ?? null,
      reconciliationLagSeconds: lagSeconds(
        state?.lastReconciliationCompletedAt ?? null,
        now,
      ),
      status: state?.status ?? "idle",
      updatedAt: state?.updatedAt ?? null,
    },
    messages,
    nextCursor: hasNextPage
      ? (visibleChannels.at(-1)?.channelId ?? null)
      : null,
    surfaces,
    rows: visibleChannels.map((channel) => ({
      archived: channel.archived,
      backfillCompletedAt: channel.backfillCompletedAt,
      backfillStatus: channel.backfillStatus ?? "pending",
      channelId: channel.channelId,
      isPrivateThread: channel.isPrivateThread,
      isThread: channel.isThread,
      lastBackfillAt: channel.lastBackfillAt,
      lastErrorCode: channel.lastErrorCode,
      lastReconciledAt: channel.lastReconciledAt,
      name: channel.name,
      processedMessageCount: channel.processedMessageCount ?? 0,
      retryCount: channel.retryCount ?? 0,
      type: channel.type,
    })),
  };
}
