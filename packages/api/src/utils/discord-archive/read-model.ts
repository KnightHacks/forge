import type {
  AnalyticsReportInput,
  DiscordArchiveHealthInput,
} from "@forge/validators";
import { DISCORD, EVENTS } from "@forge/consts";
import { and, eq, ilike, isNull, sql } from "@forge/db";
import { db } from "@forge/db/client";
import {
  DiscordArchiveChannel,
  DiscordArchiveCheckpoint,
  DiscordArchiveMessage,
  DiscordArchiveState,
} from "@forge/db/schemas/discord";

import type {
  DiscordAnalyticsChannelRow,
  DiscordAnalyticsMixRow,
} from "./analytics-model";
import { resolveAnalyticsPeriod } from "../analytics/report";
import {
  buildDiscordAnalyticsMix,
  buildDiscordChannelDistribution,
} from "./analytics-model";

const DAY_MS = 24 * 60 * 60 * 1000;
const DISCORD_ANALYTICS_METRIC_VERSION = "discord-analytics-v1";

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
  const guildId = DISCORD.KNIGHTHACKS_GUILD;
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

export interface DiscordAnalyticsSummaryRow extends Record<string, unknown> {
  activeDays: number;
  activeSurfaceCount: number;
  currentMessageCount: number;
  firstMessageAt: Date | string | null;
  humanMessageCount: number;
  medianHumanMessagesPerAuthor: number | null;
  tombstonedMessageCount: number;
  uniqueAuthors: number;
  uniqueHumanAuthors: number;
}

export interface DiscordAnalyticsTrendRow extends Record<string, unknown> {
  activeChannels: number;
  date: string;
  messages: number;
}

export async function getDiscordAnalyticsReport(
  input: AnalyticsReportInput,
  now = new Date(),
) {
  const guildId = DISCORD.KNIGHTHACKS_GUILD;
  const period = resolveAnalyticsPeriod(input.period, now);
  const observationEnd = period.observationEnd;
  const startFilter = period.start
    ? sql`and created_at >= ${period.start}`
    : sql``;
  const aliasedStartFilter = period.start
    ? sql`and message.created_at >= ${period.start}`
    : sql``;
  const messagePeriodFilter = sql`
    guild_id = ${guildId}
    ${startFilter}
    and created_at < ${observationEnd}
  `;

  const [summaryResult, mixResult, trendResult, channelResult, coverageRows] =
    await Promise.all([
      db.execute<DiscordAnalyticsSummaryRow>(sql`
        with scoped_messages as (
          select
            application_id,
            author_discord_user_id,
            author_is_bot,
            channel_id,
            created_at,
            deleted_at,
            message_type,
            webhook_id
          from discord_archive_message
          where ${messagePeriodFilter}
        ),
        human_authors as (
          select
            author_discord_user_id,
            count(*)::int as message_count
          from scoped_messages
          where
            deleted_at is null
            and author_discord_user_id is not null
            and webhook_id is null
            and author_is_bot = false
            and message_type = 0
            and application_id is null
          group by author_discord_user_id
        )
        select
          count(distinct (created_at at time zone ${EVENTS.CALENDAR_TIME_ZONE})::date)
            filter (where deleted_at is null)::int as "activeDays",
          count(distinct channel_id)
            filter (where deleted_at is null)::int as "activeSurfaceCount",
          count(*) filter (where deleted_at is null)::int as "currentMessageCount",
          min(created_at) filter (where deleted_at is null) as "firstMessageAt",
          count(*) filter (where deleted_at is not null)::int as "tombstonedMessageCount",
          count(distinct author_discord_user_id)
            filter (where deleted_at is null and author_discord_user_id is not null)::int
            as "uniqueAuthors",
          coalesce((select sum(message_count) from human_authors), 0)::int
            as "humanMessageCount",
          (select percentile_cont(0.5) within group (order by message_count)
            from human_authors)::float8 as "medianHumanMessagesPerAuthor",
          (select count(*) from human_authors)::int as "uniqueHumanAuthors"
        from scoped_messages
      `),
      db.execute<DiscordAnalyticsMixRow>(sql`
        select
          case
            when webhook_id is not null then 'webhook'
            when author_is_bot = true then 'bot'
            when message_type <> 0 or application_id is not null then 'system'
            else 'human'
          end as kind,
          count(*)::int as count
        from discord_archive_message
        where ${messagePeriodFilter} and deleted_at is null
        group by kind
        order by count desc
      `),
      db.execute<DiscordAnalyticsTrendRow>(sql`
        select
          count(distinct channel_id)::int as "activeChannels",
          to_char(
            created_at at time zone ${EVENTS.CALENDAR_TIME_ZONE},
            'YYYY-MM-DD'
          ) as date,
          count(*)::int as messages
        from discord_archive_message
        where ${messagePeriodFilter} and deleted_at is null
        group by date
        order by date asc
      `),
      db.execute<DiscordAnalyticsChannelRow>(sql`
        select
          count(*)::int as count,
          channel.is_thread as "isThread",
          channel.name,
          channel.type
        from discord_archive_message as message
        inner join discord_archive_channel as channel
          on channel.id = message.channel_id
        where
          message.guild_id = ${guildId}
          ${aliasedStartFilter}
          and message.created_at < ${observationEnd}
          and message.deleted_at is null
        group by channel.id, channel.is_thread, channel.name, channel.type
        order by count desc, channel.name asc
        limit 12
      `),
      Promise.all([
        db
          .select({
            channelCount: sql<number>`count(*) filter (where ${DiscordArchiveChannel.isThread} = false)::int`,
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
            completeCount: sql<number>`count(*) filter (where ${DiscordArchiveCheckpoint.backfillStatus} = 'complete')::int`,
            lastBackfillAt: sql<Date | null>`max(${DiscordArchiveCheckpoint.lastBackfillAt})`,
            lastReconciledAt: sql<Date | null>`max(${DiscordArchiveCheckpoint.lastReconciledAt})`,
            totalCount: sql<number>`count(*)::int`,
          })
          .from(DiscordArchiveCheckpoint)
          .where(eq(DiscordArchiveCheckpoint.guildId, guildId)),
        db
          .select({
            lastBackfillProgressAt: DiscordArchiveState.lastBackfillProgressAt,
            lastGatewayEventAt: DiscordArchiveState.lastGatewayEventAt,
            lastLiveWriteAt: DiscordArchiveState.lastLiveWriteAt,
            status: DiscordArchiveState.status,
          })
          .from(DiscordArchiveState)
          .where(eq(DiscordArchiveState.guildId, guildId))
          .limit(1),
      ]),
    ]);

  const summary = summaryResult.rows[0] ?? {
    activeDays: 0,
    activeSurfaceCount: 0,
    currentMessageCount: 0,
    firstMessageAt: null,
    humanMessageCount: 0,
    medianHumanMessagesPerAuthor: null,
    tombstonedMessageCount: 0,
    uniqueAuthors: 0,
    uniqueHumanAuthors: 0,
  };
  const [surfaceRows, checkpointRows, stateRows] = coverageRows;
  const surfaces = surfaceRows[0] ?? {
    channelCount: 0,
    surfaceCount: 0,
    threadCount: 0,
  };
  const checkpoints = checkpointRows[0] ?? {
    completeCount: 0,
    lastBackfillAt: null,
    lastReconciledAt: null,
    totalCount: 0,
  };
  const state = stateRows[0] ?? null;
  const firstMessageAt = dateOrNull(summary.firstMessageAt);
  const effectiveStart = period.start ?? firstMessageAt;
  const calendarDays =
    effectiveStart === null
      ? 0
      : Math.max(
          1,
          Math.ceil(
            (observationEnd.getTime() - effectiveStart.getTime()) / DAY_MS,
          ),
        );
  const messageCount = summary.currentMessageCount;

  return {
    channels: buildDiscordChannelDistribution(channelResult.rows, messageCount),
    coverage: {
      completeSurfaceCount: checkpoints.completeCount,
      coverage: ratio(checkpoints.completeCount, surfaces.surfaceCount),
      lastBackfillProgressAt:
        state?.lastBackfillProgressAt ?? dateOrNull(checkpoints.lastBackfillAt),
      lastGatewayEventAt: state?.lastGatewayEventAt ?? null,
      lastLiveWriteAt: state?.lastLiveWriteAt ?? null,
      lastReconciledAt: dateOrNull(checkpoints.lastReconciledAt),
      status: state?.status ?? "idle",
      totalSurfaceCount: surfaces.surfaceCount,
    },
    metadata: {
      generatedAt: now,
      metricVersion: DISCORD_ANALYTICS_METRIC_VERSION,
      period: {
        end: period.end,
        kind: period.kind,
        label: period.label,
        observationEnd,
        start: period.start,
      },
    },
    mix: buildDiscordAnalyticsMix(mixResult.rows, messageCount),
    summary: {
      activeDays: summary.activeDays,
      activeDayRate: ratio(summary.activeDays, calendarDays),
      activeSurfaceCount: summary.activeSurfaceCount,
      activeSurfaceRate: ratio(
        summary.activeSurfaceCount,
        surfaces.surfaceCount,
      ),
      averageHumanMessagesPerAuthor: ratio(
        summary.humanMessageCount,
        summary.uniqueHumanAuthors,
      ),
      averageMessagesPerDay:
        calendarDays === 0 ? null : messageCount / calendarDays,
      calendarDays,
      humanMessageCount: summary.humanMessageCount,
      messageCount,
      medianHumanMessagesPerAuthor: summary.medianHumanMessagesPerAuthor,
      tombstonedMessageCount: summary.tombstonedMessageCount,
      uniqueAuthors: summary.uniqueAuthors,
      uniqueHumanAuthors: summary.uniqueHumanAuthors,
      visibleChannels: surfaces.channelCount,
      visibleThreads: surfaces.threadCount,
    },
    trend: {
      grain: "day" as const,
      rows: trendResult.rows,
    },
  };
}
