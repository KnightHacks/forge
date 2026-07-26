import { sql } from "drizzle-orm";
import { check, index, pgTableCreator } from "drizzle-orm/pg-core";

const createTable = pgTableCreator((name) => `discord_archive_${name}`);

export interface DiscordArchiveAttachment {
  contentType: string | null;
  filename: string;
  height: number | null;
  id: string;
  size: number;
  url: string;
  width: number | null;
}

export type DiscordArchiveJsonObject = Record<string, unknown>;

export interface DiscordArchiveMentions {
  everyone: boolean;
  roleIds: string[];
  userIds: string[];
}

export const DiscordArchiveChannel = createTable(
  "channel",
  (t) => ({
    id: t.varchar({ length: 20 }).primaryKey(),
    guildId: t.varchar({ length: 20 }).notNull(),
    parentId: t.varchar({ length: 20 }),
    type: t.integer().notNull(),
    name: t.varchar({ length: 255 }).notNull(),
    topic: t.text(),
    isThread: t.boolean().notNull().default(false),
    isPrivateThread: t.boolean().notNull().default(false),
    archived: t.boolean().notNull().default(false),
    locked: t.boolean().notNull().default(false),
    discoveredAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    discordUpdatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull(),
    deletedAt: t.timestamp({ mode: "date", withTimezone: true }),
  }),
  (table) => ({
    guildTypeIdx: index("discord_archive_channel_guild_type_idx").on(
      table.guildId,
      table.type,
    ),
    parentIdx: index("discord_archive_channel_parent_idx").on(table.parentId),
  }),
);

export const DiscordArchiveMessage = createTable(
  "message",
  (t) => ({
    id: t.varchar({ length: 20 }).primaryKey(),
    guildId: t.varchar({ length: 20 }).notNull(),
    channelId: t
      .varchar({ length: 20 })
      .notNull()
      .references(() => DiscordArchiveChannel.id),
    authorDiscordUserId: t.varchar({ length: 20 }).notNull(),
    authorLabel: t.varchar({ length: 255 }).notNull(),
    authorAvatarUrl: t.text(),
    authorIsBot: t.boolean().notNull().default(false),
    webhookId: t.varchar({ length: 20 }),
    applicationId: t.varchar({ length: 20 }),
    messageType: t.integer().notNull(),
    content: t.text().notNull().default(""),
    createdAt: t.timestamp({ mode: "date", withTimezone: true }).notNull(),
    editedAt: t.timestamp({ mode: "date", withTimezone: true }),
    deletedAt: t.timestamp({ mode: "date", withTimezone: true }),
    replyToMessageId: t.varchar({ length: 20 }),
    pinned: t.boolean().notNull().default(false),
    flags: t.varchar({ length: 32 }).notNull().default("0"),
    mentions: t
      .jsonb()
      .$type<DiscordArchiveMentions>()
      .notNull()
      .default(sql`'{"everyone":false,"roleIds":[],"userIds":[]}'::jsonb`),
    embeds: t
      .jsonb()
      .$type<DiscordArchiveJsonObject[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    attachments: t
      .jsonb()
      .$type<DiscordArchiveAttachment[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    components: t
      .jsonb()
      .$type<DiscordArchiveJsonObject[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    stickers: t
      .jsonb()
      .$type<DiscordArchiveJsonObject[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    poll: t.jsonb().$type<DiscordArchiveJsonObject | null>(),
    ingestedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    lastObservedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  }),
  (table) => ({
    authorCreatedIdx: index("discord_archive_message_author_created_idx").on(
      table.authorDiscordUserId,
      table.createdAt,
    ),
    channelCreatedIdx: index("discord_archive_message_channel_created_idx").on(
      table.channelId,
      table.createdAt,
      table.id,
    ),
    guildCreatedIdx: index("discord_archive_message_guild_created_idx").on(
      table.guildId,
      table.createdAt,
      table.id,
    ),
    nonDeletedCreatedIdx: index(
      "discord_archive_message_non_deleted_created_idx",
    )
      .on(table.guildId, table.createdAt)
      .where(sql`${table.deletedAt} IS NULL`),
  }),
);

export const DiscordArchiveCheckpoint = createTable(
  "checkpoint",
  (t) => ({
    channelId: t
      .varchar({ length: 20 })
      .primaryKey()
      .references(() => DiscordArchiveChannel.id, { onDelete: "cascade" }),
    guildId: t.varchar({ length: 20 }).notNull(),
    oldestMessageId: t.varchar({ length: 20 }),
    newestMessageId: t.varchar({ length: 20 }),
    backfillBeforeMessageId: t.varchar({ length: 20 }),
    backfillStatus: t.varchar({ length: 16 }).notNull().default("pending"),
    backfillCompletedAt: t.timestamp({ mode: "date", withTimezone: true }),
    lastDiscoveredAt: t.timestamp({ mode: "date", withTimezone: true }),
    lastReconciledAt: t.timestamp({ mode: "date", withTimezone: true }),
    processedMessageCount: t.integer().notNull().default(0),
    retryCount: t.integer().notNull().default(0),
    lastErrorCode: t.varchar({ length: 64 }),
    lastErrorMessage: t.varchar({ length: 500 }),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  }),
  (table) => ({
    guildStatusUpdatedIdx: index(
      "discord_archive_checkpoint_guild_status_updated_idx",
    ).on(table.guildId, table.backfillStatus, table.updatedAt),
    validBackfillStatus: check(
      "discord_archive_checkpoint_status_check",
      sql`${table.backfillStatus} IN ('pending', 'running', 'complete', 'failed')`,
    ),
  }),
);

export const DiscordArchiveState = createTable(
  "state",
  (t) => ({
    guildId: t.varchar({ length: 20 }).primaryKey(),
    status: t.varchar({ length: 16 }).notNull().default("idle"),
    lastGatewayEventAt: t.timestamp({ mode: "date", withTimezone: true }),
    lastLiveWriteAt: t.timestamp({ mode: "date", withTimezone: true }),
    lastDiscoveryStartedAt: t.timestamp({
      mode: "date",
      withTimezone: true,
    }),
    lastDiscoveryCompletedAt: t.timestamp({
      mode: "date",
      withTimezone: true,
    }),
    lastReconciliationStartedAt: t.timestamp({
      mode: "date",
      withTimezone: true,
    }),
    lastReconciliationCompletedAt: t.timestamp({
      mode: "date",
      withTimezone: true,
    }),
    lastBackfillProgressAt: t.timestamp({
      mode: "date",
      withTimezone: true,
    }),
    leaseOwner: t.varchar({ length: 128 }),
    leaseExpiresAt: t.timestamp({ mode: "date", withTimezone: true }),
    lastErrorCode: t.varchar({ length: 64 }),
    lastErrorMessage: t.varchar({ length: 500 }),
    failureCount: t.integer().notNull().default(0),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  }),
  (table) => ({
    validStatus: check(
      "discord_archive_state_status_check",
      sql`${table.status} IN ('disabled', 'idle', 'healthy', 'degraded', 'failed')`,
    ),
  }),
);

export type InsertDiscordArchiveChannel =
  typeof DiscordArchiveChannel.$inferInsert;
export type SelectDiscordArchiveChannel =
  typeof DiscordArchiveChannel.$inferSelect;
export type InsertDiscordArchiveMessage =
  typeof DiscordArchiveMessage.$inferInsert;
export type SelectDiscordArchiveMessage =
  typeof DiscordArchiveMessage.$inferSelect;
export type InsertDiscordArchiveCheckpoint =
  typeof DiscordArchiveCheckpoint.$inferInsert;
export type SelectDiscordArchiveCheckpoint =
  typeof DiscordArchiveCheckpoint.$inferSelect;
export type InsertDiscordArchiveState = typeof DiscordArchiveState.$inferInsert;
export type SelectDiscordArchiveState = typeof DiscordArchiveState.$inferSelect;
