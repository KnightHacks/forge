import { z } from "zod";

export const DISCORD_ARCHIVE_BACKFILL_STATUSES = [
  "pending",
  "running",
  "complete",
  "failed",
] as const;

export const DISCORD_ARCHIVE_HEALTH_STATUSES = [
  "disabled",
  "idle",
  "healthy",
  "degraded",
  "failed",
] as const;

export const discordSnowflakeSchema = z
  .string()
  .regex(/^\d{17,20}$/, "Expected a Discord snowflake.");

const nullableSnowflakeSchema = discordSnowflakeSchema.nullable();
const nullableBoundedUrlSchema = z.url().max(2_048).nullable();

const boundedJsonObjectSchema = z
  .record(z.string().max(100), z.json())
  .refine((value) => JSON.stringify(value).length <= 100_000, {
    message: "Discord metadata object is too large.",
  });

const discordArchiveAttachmentSchema = z
  .object({
    id: discordSnowflakeSchema,
    filename: z.string().min(1).max(255),
    contentType: z.string().max(255).nullable(),
    size: z.number().int().nonnegative().max(1_000_000_000),
    url: z.url().max(2_048),
    width: z.number().int().positive().max(100_000).nullable(),
    height: z.number().int().positive().max(100_000).nullable(),
  })
  .strict();

export const discordArchiveChannelInputSchema = z
  .object({
    id: discordSnowflakeSchema,
    guildId: discordSnowflakeSchema,
    parentId: nullableSnowflakeSchema,
    type: z.number().int().nonnegative().max(255),
    name: z.string().min(1).max(255),
    topic: z.string().max(4_096).nullable(),
    isThread: z.boolean(),
    isPrivateThread: z.boolean(),
    archived: z.boolean(),
    locked: z.boolean(),
    discordUpdatedAt: z.date(),
  })
  .strict();

export const discordArchiveMessageInputSchema = z
  .object({
    id: discordSnowflakeSchema,
    guildId: discordSnowflakeSchema,
    channelId: discordSnowflakeSchema,
    authorDiscordUserId: discordSnowflakeSchema,
    authorLabel: z.string().min(1).max(255),
    authorAvatarUrl: nullableBoundedUrlSchema,
    authorIsBot: z.boolean(),
    webhookId: nullableSnowflakeSchema,
    applicationId: nullableSnowflakeSchema,
    messageType: z.number().int().nonnegative().max(255),
    content: z.string().max(40_000),
    createdAt: z.date(),
    editedAt: z.date().nullable(),
    replyToMessageId: nullableSnowflakeSchema,
    pinned: z.boolean(),
    flags: z.string().regex(/^\d+$/).max(32),
    mentionEveryone: z.boolean(),
    mentionedUserIds: z.array(discordSnowflakeSchema).max(100),
    mentionedRoleIds: z.array(discordSnowflakeSchema).max(100),
    embeds: z.array(boundedJsonObjectSchema).max(25),
    attachments: z.array(discordArchiveAttachmentSchema).max(100),
    components: z.array(boundedJsonObjectSchema).max(50),
    stickers: z.array(boundedJsonObjectSchema).max(50),
    poll: boundedJsonObjectSchema.nullable(),
  })
  .strict();

export const discordArchiveHealthInputSchema = z
  .object({
    cursor: discordSnowflakeSchema.optional(),
    limit: z.number().int().min(1).max(100).default(50),
    search: z.string().trim().min(1).max(100).optional(),
  })
  .strict();

export type DiscordArchiveChannelInput = z.infer<
  typeof discordArchiveChannelInputSchema
>;
export type DiscordArchiveMessageInput = z.infer<
  typeof discordArchiveMessageInputSchema
>;
export type DiscordArchiveHealthInput = z.infer<
  typeof discordArchiveHealthInputSchema
>;
