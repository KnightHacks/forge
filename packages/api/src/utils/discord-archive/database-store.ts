import type {
  DiscordArchiveChannelInput,
  DiscordArchiveMessageInput,
} from "@forge/validators";
import { and, asc, eq, isNotNull, isNull, lte, ne, or, sql } from "@forge/db";
import { db } from "@forge/db/client";
import {
  DiscordArchiveChannel,
  DiscordArchiveCheckpoint,
  DiscordArchiveMessage,
  DiscordArchiveState,
} from "@forge/db/schemas/discord";

import type { WriteDb } from "../db";

type ArchiveOperation = "backfill" | "reconciliation";

function messageValues(
  message: DiscordArchiveMessageInput,
  observedAt: Date,
): typeof DiscordArchiveMessage.$inferInsert {
  return {
    applicationId: message.applicationId,
    attachments: message.attachments,
    authorAvatarUrl: message.authorAvatarUrl,
    authorDiscordUserId: message.authorDiscordUserId,
    authorIsBot: message.authorIsBot,
    authorLabel: message.authorLabel,
    channelId: message.channelId,
    components: message.components,
    content: message.content,
    createdAt: message.createdAt,
    editedAt: message.editedAt,
    embeds: message.embeds,
    flags: message.flags,
    guildId: message.guildId,
    id: message.id,
    lastObservedAt: observedAt,
    mentions: {
      everyone: message.mentionEveryone,
      roleIds: message.mentionedRoleIds,
      userIds: message.mentionedUserIds,
    },
    messageType: message.messageType,
    pinned: message.pinned,
    poll: message.poll,
    replyToMessageId: message.replyToMessageId,
    stickers: message.stickers,
    webhookId: message.webhookId,
  };
}

async function upsertMessages(
  executor: WriteDb,
  messages: DiscordArchiveMessageInput[],
  observedAt: Date,
) {
  if (messages.length === 0) return;

  await executor
    .insert(DiscordArchiveMessage)
    .values(messages.map((message) => messageValues(message, observedAt)))
    .onConflictDoUpdate({
      set: {
        applicationId: sql`excluded.application_id`,
        attachments: sql`excluded.attachments`,
        authorAvatarUrl: sql`excluded.author_avatar_url`,
        authorDiscordUserId: sql`excluded.author_discord_user_id`,
        authorIsBot: sql`excluded.author_is_bot`,
        authorLabel: sql`excluded.author_label`,
        channelId: sql`excluded.channel_id`,
        components: sql`excluded.components`,
        content: sql`excluded.content`,
        editedAt: sql`excluded.edited_at`,
        embeds: sql`excluded.embeds`,
        flags: sql`excluded.flags`,
        lastObservedAt: observedAt,
        mentions: sql`excluded.mentions`,
        messageType: sql`excluded.message_type`,
        pinned: sql`excluded.pinned`,
        poll: sql`excluded.poll`,
        replyToMessageId: sql`excluded.reply_to_message_id`,
        stickers: sql`excluded.stickers`,
        webhookId: sql`excluded.webhook_id`,
      },
      setWhere: sql`${DiscordArchiveMessage.deletedAt} IS NULL`,
      target: DiscordArchiveMessage.id,
    });
}

function safeError(error: unknown) {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code.slice(0, 64)
      : "DISCORD_ARCHIVE_OPERATION_FAILED";
  return {
    code,
    message: "Discord archive channel processing failed.",
  };
}

async function upsertChannel(
  executor: WriteDb,
  channel: DiscordArchiveChannelInput,
  observedAt: Date,
) {
  await executor
    .insert(DiscordArchiveChannel)
    .values({ ...channel, discoveredAt: observedAt })
    .onConflictDoUpdate({
      set: {
        archived: channel.archived,
        deletedAt: null,
        discoveredAt: observedAt,
        discordUpdatedAt: channel.discordUpdatedAt,
        isPrivateThread: channel.isPrivateThread,
        isThread: channel.isThread,
        locked: channel.locked,
        name: channel.name,
        parentId: channel.parentId,
        topic: channel.topic,
        type: channel.type,
      },
      target: DiscordArchiveChannel.id,
    });
  await executor
    .insert(DiscordArchiveCheckpoint)
    .values({
      channelId: channel.id,
      guildId: channel.guildId,
      lastDiscoveredAt: observedAt,
      updatedAt: observedAt,
    })
    .onConflictDoUpdate({
      set: { lastDiscoveredAt: observedAt, updatedAt: observedAt },
      target: DiscordArchiveCheckpoint.channelId,
    });
}

async function recordLiveState(
  executor: WriteDb,
  guildId: string,
  observedAt: Date,
) {
  await executor
    .insert(DiscordArchiveState)
    .values({
      guildId,
      lastGatewayEventAt: observedAt,
      lastLiveWriteAt: observedAt,
      status: "healthy",
      updatedAt: observedAt,
    })
    .onConflictDoUpdate({
      set: {
        lastGatewayEventAt: observedAt,
        lastLiveWriteAt: observedAt,
        status: "healthy",
        updatedAt: observedAt,
      },
      target: DiscordArchiveState.guildId,
    });
}

function newestSnowflake(ids: string[]) {
  const first = ids[0];
  if (!first) throw new Error("Cannot select a snowflake from an empty list.");
  return ids
    .slice(1)
    .reduce((newest, id) => (BigInt(id) > BigInt(newest) ? id : newest), first);
}

function snowflakeCreatedAt(id: string) {
  return new Date(Number((BigInt(id) >> 22n) + 1_420_070_400_000n));
}

export const discordArchiveDatabaseStore = {
  async upsertLiveMessage(input: {
    channel: DiscordArchiveChannelInput;
    message: DiscordArchiveMessageInput;
    observedAt: Date;
  }) {
    await db.transaction(async (tx) => {
      await upsertChannel(tx, input.channel, input.observedAt);
      await upsertMessages(tx, [input.message], input.observedAt);
      await tx
        .update(DiscordArchiveCheckpoint)
        .set({
          newestMessageId: sql`CASE
            WHEN ${DiscordArchiveCheckpoint.newestMessageId} IS NULL
              OR CAST(${DiscordArchiveCheckpoint.newestMessageId} AS numeric) < CAST(${input.message.id} AS numeric)
            THEN ${input.message.id}
            ELSE ${DiscordArchiveCheckpoint.newestMessageId}
          END`,
          processedMessageCount: sql`${DiscordArchiveCheckpoint.processedMessageCount} + 1`,
          updatedAt: input.observedAt,
        })
        .where(eq(DiscordArchiveCheckpoint.channelId, input.channel.id));
      await recordLiveState(tx, input.channel.guildId, input.observedAt);
    });
  },

  async tombstoneLiveMessages(input: {
    channel: DiscordArchiveChannelInput;
    messageIds: string[];
    observedAt: Date;
  }) {
    if (input.messageIds.length === 0) return;
    const messageIds = [...new Set(input.messageIds)];

    await db.transaction(async (tx) => {
      await upsertChannel(tx, input.channel, input.observedAt);
      await tx
        .insert(DiscordArchiveMessage)
        .values(
          messageIds.map((id) => ({
            authorDiscordUserId: null,
            authorLabel: null,
            channelId: input.channel.id,
            content: "",
            createdAt: snowflakeCreatedAt(id),
            deletedAt: input.observedAt,
            guildId: input.channel.guildId,
            id,
            lastObservedAt: input.observedAt,
            messageType: 0,
          })),
        )
        .onConflictDoUpdate({
          set: {
            attachments: sql`'[]'::jsonb`,
            components: sql`'[]'::jsonb`,
            content: "",
            deletedAt: input.observedAt,
            embeds: sql`'[]'::jsonb`,
            lastObservedAt: input.observedAt,
            mentions: sql`'{"everyone":false,"roleIds":[],"userIds":[]}'::jsonb`,
            poll: null,
            stickers: sql`'[]'::jsonb`,
          },
          target: DiscordArchiveMessage.id,
        });
      const newestDeletedId = newestSnowflake(messageIds);
      await tx
        .update(DiscordArchiveCheckpoint)
        .set({
          newestMessageId: sql`CASE
            WHEN ${DiscordArchiveCheckpoint.newestMessageId} IS NULL
              OR CAST(${DiscordArchiveCheckpoint.newestMessageId} AS numeric) < CAST(${newestDeletedId} AS numeric)
            THEN ${newestDeletedId}
            ELSE ${DiscordArchiveCheckpoint.newestMessageId}
          END`,
          updatedAt: input.observedAt,
        })
        .where(eq(DiscordArchiveCheckpoint.channelId, input.channel.id));
      await recordLiveState(tx, input.channel.guildId, input.observedAt);
    });
  },

  async tryAcquireLease(input: {
    guildId: string;
    leaseMs: number;
    now: Date;
    owner: string;
  }) {
    return db.transaction(async (tx) => {
      const lock = await tx.execute<{ acquired: boolean }>(
        sql`select pg_try_advisory_xact_lock(hashtextextended(${`discord-archive:${input.guildId}`}, 0)) as acquired`,
      );
      if (!lock.rows[0]?.acquired) return false;

      await tx
        .insert(DiscordArchiveState)
        .values({ guildId: input.guildId, updatedAt: input.now })
        .onConflictDoNothing({ target: DiscordArchiveState.guildId });

      const [claimed] = await tx
        .update(DiscordArchiveState)
        .set({
          leaseExpiresAt: new Date(input.now.getTime() + input.leaseMs),
          leaseOwner: input.owner,
          updatedAt: input.now,
        })
        .where(
          and(
            eq(DiscordArchiveState.guildId, input.guildId),
            or(
              isNull(DiscordArchiveState.leaseExpiresAt),
              lte(DiscordArchiveState.leaseExpiresAt, input.now),
              eq(DiscordArchiveState.leaseOwner, input.owner),
            ),
          ),
        )
        .returning({ guildId: DiscordArchiveState.guildId });
      return claimed !== undefined;
    });
  },

  async recordCycleStarted(guildId: string, now: Date) {
    await db
      .update(DiscordArchiveState)
      .set({
        lastDiscoveryStartedAt: now,
        lastReconciliationStartedAt: now,
        status: "healthy",
        updatedAt: now,
      })
      .where(eq(DiscordArchiveState.guildId, guildId));
  },

  async recordCycleCompleted(guildId: string, now: Date) {
    await db
      .update(DiscordArchiveState)
      .set({
        lastDiscoveryCompletedAt: now,
        lastErrorCode: null,
        lastErrorMessage: null,
        lastReconciliationCompletedAt: now,
        status: "healthy",
        updatedAt: now,
      })
      .where(eq(DiscordArchiveState.guildId, guildId));
  },

  async recordCycleFailure(guildId: string, error: unknown, now: Date) {
    const safe = safeError(error);
    await db
      .update(DiscordArchiveState)
      .set({
        failureCount: sql`${DiscordArchiveState.failureCount} + 1`,
        lastErrorCode: safe.code,
        lastErrorMessage: safe.message,
        status: "degraded",
        updatedAt: now,
      })
      .where(eq(DiscordArchiveState.guildId, guildId));
  },

  async releaseLease(guildId: string, owner: string, now: Date) {
    await db
      .update(DiscordArchiveState)
      .set({
        leaseExpiresAt: null,
        leaseOwner: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(DiscordArchiveState.guildId, guildId),
          eq(DiscordArchiveState.leaseOwner, owner),
        ),
      );
  },

  async commitBackfillPage(input: {
    channelId: string;
    complete: boolean;
    messages: DiscordArchiveMessageInput[];
    newestMessageId: string | null;
    nextBeforeMessageId: string | null;
    observedAt: Date;
  }) {
    await db.transaction(async (tx) => {
      await upsertMessages(tx, input.messages, input.observedAt);
      await tx
        .update(DiscordArchiveCheckpoint)
        .set({
          backfillBeforeMessageId: input.nextBeforeMessageId,
          backfillCompletedAt: input.complete ? input.observedAt : null,
          backfillStatus: input.complete ? "complete" : "running",
          lastBackfillAt: input.observedAt,
          lastErrorCode: null,
          lastErrorMessage: null,
          ...(input.newestMessageId
            ? { newestMessageId: input.newestMessageId }
            : {}),
          oldestMessageId:
            input.messages[0]?.id ??
            sql`${DiscordArchiveCheckpoint.oldestMessageId}`,
          processedMessageCount: sql`${DiscordArchiveCheckpoint.processedMessageCount} + ${input.messages.length}`,
          retryCount: 0,
          updatedAt: input.observedAt,
        })
        .where(eq(DiscordArchiveCheckpoint.channelId, input.channelId));
    });
  },

  async commitReconciliation(input: {
    channelId: string;
    messages: DiscordArchiveMessageInput[];
    newestMessageId: string;
    observedAt: Date;
  }) {
    await db.transaction(async (tx) => {
      await upsertMessages(tx, input.messages, input.observedAt);
      await tx
        .update(DiscordArchiveCheckpoint)
        .set({
          lastErrorCode: null,
          lastErrorMessage: null,
          lastReconciledAt: input.observedAt,
          newestMessageId: input.newestMessageId,
          processedMessageCount: sql`${DiscordArchiveCheckpoint.processedMessageCount} + ${input.messages.length}`,
          retryCount: 0,
          updatedAt: input.observedAt,
        })
        .where(eq(DiscordArchiveCheckpoint.channelId, input.channelId));
    });
  },

  async getBackfillWork(limit: number) {
    return db
      .select({
        backfillBeforeMessageId:
          DiscordArchiveCheckpoint.backfillBeforeMessageId,
        backfillStatus: DiscordArchiveCheckpoint.backfillStatus,
        channelId: DiscordArchiveCheckpoint.channelId,
        newestMessageId: DiscordArchiveCheckpoint.newestMessageId,
      })
      .from(DiscordArchiveCheckpoint)
      .where(ne(DiscordArchiveCheckpoint.backfillStatus, "complete"))
      .orderBy(asc(DiscordArchiveCheckpoint.updatedAt))
      .limit(limit);
  },

  async getReconciliationWork(limit: number) {
    return db
      .select({
        backfillBeforeMessageId:
          DiscordArchiveCheckpoint.backfillBeforeMessageId,
        backfillStatus: DiscordArchiveCheckpoint.backfillStatus,
        channelId: DiscordArchiveCheckpoint.channelId,
        newestMessageId: DiscordArchiveCheckpoint.newestMessageId,
      })
      .from(DiscordArchiveCheckpoint)
      .where(isNotNull(DiscordArchiveCheckpoint.newestMessageId))
      .orderBy(asc(DiscordArchiveCheckpoint.lastReconciledAt))
      .limit(limit);
  },

  async recordChannelFailure(
    channelId: string,
    operation: ArchiveOperation,
    error: unknown,
  ) {
    const safe = safeError(error);
    await db
      .update(DiscordArchiveCheckpoint)
      .set({
        ...(operation === "backfill"
          ? {
              backfillStatus: sql`CASE WHEN ${DiscordArchiveCheckpoint.backfillStatus} = 'complete' THEN 'complete' ELSE 'failed' END`,
            }
          : {}),
        lastErrorCode: safe.code,
        lastErrorMessage: safe.message,
        retryCount: sql`${DiscordArchiveCheckpoint.retryCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(DiscordArchiveCheckpoint.channelId, channelId));
  },

  async upsertDiscoveredChannels(
    channels: DiscordArchiveChannelInput[],
    observedAt: Date,
  ) {
    await db.transaction(async (tx) => {
      for (const channel of channels) {
        await upsertChannel(tx, channel, observedAt);
      }
    });
  },
} satisfies {
  upsertLiveMessage(input: {
    channel: DiscordArchiveChannelInput;
    message: DiscordArchiveMessageInput;
    observedAt: Date;
  }): Promise<void>;
  tombstoneLiveMessages(input: {
    channel: DiscordArchiveChannelInput;
    messageIds: string[];
    observedAt: Date;
  }): Promise<void>;
  tryAcquireLease(input: {
    guildId: string;
    leaseMs: number;
    now: Date;
    owner: string;
  }): Promise<boolean>;
  recordCycleStarted(guildId: string, now: Date): Promise<void>;
  recordCycleCompleted(guildId: string, now: Date): Promise<void>;
  recordCycleFailure(guildId: string, error: unknown, now: Date): Promise<void>;
  releaseLease(guildId: string, owner: string, now: Date): Promise<void>;
  commitBackfillPage(input: {
    channelId: string;
    complete: boolean;
    messages: DiscordArchiveMessageInput[];
    newestMessageId: string | null;
    nextBeforeMessageId: string | null;
    observedAt: Date;
  }): Promise<void>;
  commitReconciliation(input: {
    channelId: string;
    messages: DiscordArchiveMessageInput[];
    newestMessageId: string;
    observedAt: Date;
  }): Promise<void>;
  getBackfillWork(limit: number): Promise<
    {
      backfillBeforeMessageId: string | null;
      backfillStatus: "complete" | "failed" | "pending" | "running";
      channelId: string;
      newestMessageId: string | null;
    }[]
  >;
  getReconciliationWork(limit: number): Promise<
    {
      backfillBeforeMessageId: string | null;
      backfillStatus: "complete" | "failed" | "pending" | "running";
      channelId: string;
      newestMessageId: string | null;
    }[]
  >;
  recordChannelFailure(
    channelId: string,
    operation: ArchiveOperation,
    error: unknown,
  ): Promise<void>;
  upsertDiscoveredChannels(
    channels: DiscordArchiveChannelInput[],
    observedAt: Date,
  ): Promise<void>;
};
