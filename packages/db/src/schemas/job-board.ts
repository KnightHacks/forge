import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgEnum,
  pgTableCreator,
  unique,
} from "drizzle-orm/pg-core";

import { JOB_BOARD } from "@forge/consts";

import { Company, Member } from "./knight-hacks";

const createTable = pgTableCreator((name) => `knight_hacks_${name}`);

// Hash full identifiers to stay below PostgreSQL's ~2.7 KB B-tree entry limit.
// Doubling backslashes before decode(..., 'escape') preserves literal UTF-8 bytes;
// a ::bytea cast instead interprets escape sequences and can conflate distinct keys.
// convert_to is STABLE, so PostgreSQL rejects it in generated columns. This
// expression uses only IMMUTABLE functions, as stored generated columns require.
const identityHash = (column: string) =>
  sql`encode(sha256(decode(replace(${sql.identifier(column)}, chr(92), chr(92) || chr(92)), 'escape')), 'hex')`;
export const jobTrackEnum = pgEnum("job_track", JOB_BOARD.JOB_TRACKS);
export const jobCategoryEnum = pgEnum("job_category", JOB_BOARD.JOB_CATEGORIES);
export const jobLocationKindEnum = pgEnum(
  "job_location_kind",
  JOB_BOARD.JOB_LOCATION_KINDS,
);
export const jobWorkArrangementEnum = pgEnum(
  "job_work_arrangement",
  JOB_BOARD.JOB_WORK_ARRANGEMENTS,
);
export const jobDeliveryStateEnum = pgEnum(
  "job_delivery_state",
  JOB_BOARD.JOB_DELIVERY_STATES,
);
export const jobApplicationStageEnum = pgEnum(
  "job_application_stage",
  JOB_BOARD.APPLICATION_STAGES,
);
export const jobApplicationVisibilityEnum = pgEnum(
  "job_application_visibility",
  JOB_BOARD.APPLICATION_VISIBILITIES,
);
export const jobAlertTargetKindEnum = pgEnum(
  "job_alert_target_kind",
  JOB_BOARD.ALERT_TARGET_KINDS,
);

/** Provider is a code-owned adapter key; boardKey is officer-managed data. */
export const JobSource = createTable(
  "job_source",
  (t) => ({
    id: t.uuid().primaryKey().defaultRandom(),
    provider: t.varchar({ length: 64 }).notNull(),
    boardKey: t.text().notNull(),
    boardKeyHash: t
      .text()
      .notNull()
      .generatedAlwaysAs(identityHash("board_key")),
    label: t.varchar({ length: 200 }).notNull(),
    companyId: t.uuid().references(() => Company.id, { onDelete: "set null" }),
    enabled: t.boolean().notNull().default(false),
    pollIntervalSeconds: t.integer().notNull().default(900),
    nextPollAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastAttemptAt: t.timestamp({ withTimezone: true }),
    lastSuccessAt: t.timestamp({ withTimezone: true }),
    baselineCompletedAt: t.timestamp({ withTimezone: true }),
    etag: t.text(),
    lastModified: t.text(),
    lastError: t.text(),
    claimToken: t.uuid(),
    leaseExpiresAt: t.timestamp({ withTimezone: true }),
    createdAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: t
      .timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  }),
  (table) => ({
    identity: unique("knight_hacks_job_source_provider_board_unique").on(
      table.provider,
      table.boardKeyHash,
    ),
    schedule: index("knight_hacks_job_source_schedule_idx").on(
      table.enabled,
      table.nextPollAt,
    ),
    company: index("knight_hacks_job_source_company_idx").on(table.companyId),
    values: check(
      "knight_hacks_job_source_values_check",
      sql`${table.provider} ~ '^[a-z][a-z0-9_]*$' AND ${table.boardKey} ~ '[^[:space:]]' AND ${table.label} ~ '[^[:space:]]' AND ${table.pollIntervalSeconds} > 0`,
    ),
    lease: check(
      "knight_hacks_job_source_lease_check",
      sql`(${table.claimToken} IS NULL) = (${table.leaseExpiresAt} IS NULL)`,
    ),
  }),
);

export const Job = createTable(
  "job",
  (t) => ({
    id: t.uuid().primaryKey().defaultRandom(),
    // API computes a normalized employer requisition identity or application URL.
    // Observations retain other source identities; title alone is never this key.
    identityKey: t.text().notNull(),
    identityHash: t
      .text()
      .notNull()
      .generatedAlwaysAs(identityHash("identity_key")),
    companyId: t.uuid().references(() => Company.id, { onDelete: "set null" }),
    companyLabel: t.varchar({ length: 200 }).notNull(),
    companyKey: t.varchar({ length: 120 }).notNull(),
    title: t.text().notNull(),
    track: jobTrackEnum().notNull(),
    category: jobCategoryEnum(),
    applyUrl: t.text().notNull(),
    description: t.text(),
    compensation: t.text(),
    workArrangement: jobWorkArrangementEnum(),
    postedAt: t.timestamp({ withTimezone: true }),
    firstSeenAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
    active: t.boolean().notNull().default(true),
    inactiveAt: t.timestamp({ withTimezone: true }),
    // Suppressed by default: schema rollout and initial inventories cannot post.
    deliveryState: jobDeliveryStateEnum().notNull().default("suppressed"),
    deliveryTrack: jobTrackEnum(),
    discordChannelId: t.varchar({ length: 20 }),
    discordMessageId: t.varchar({ length: 20 }),
    deliveredAt: t.timestamp({ withTimezone: true }),
    deliveryClaimToken: t.uuid(),
    deliveryLeaseExpiresAt: t.timestamp({ withTimezone: true }),
    deliveryNextAttemptAt: t.timestamp({ withTimezone: true }),
    deliveryAttempts: t.integer().notNull().default(0),
    deliveryError: t.text(),
  }),
  (table) => ({
    identity: unique("knight_hacks_job_identity_unique").on(table.identityHash),
    message: unique("knight_hacks_job_discord_message_unique").on(
      table.discordMessageId,
    ),
    company: index("knight_hacks_job_company_idx").on(table.companyId),
    companySearch: index("knight_hacks_job_company_search_idx").on(
      table.companyKey,
      table.track,
    ),
    search: index("knight_hacks_job_search_idx").on(
      table.active,
      table.track,
      table.firstSeenAt,
    ),
    posted: index("knight_hacks_job_posted_idx").on(
      table.active,
      table.postedAt,
    ),
    delivery: index("knight_hacks_job_delivery_idx").on(
      table.deliveryState,
      table.deliveryNextAttemptAt,
    ),
    digest: index("knight_hacks_job_digest_idx").on(
      table.discordChannelId,
      table.deliveredAt,
    ),
    values: check(
      "knight_hacks_job_values_check",
      sql`${table.identityKey} ~ '[^[:space:]]' AND ${table.companyLabel} ~ '[^[:space:]]' AND ${table.companyKey} ~ '[^[:space:]]' AND ${table.title} ~ '[^[:space:]]' AND ${table.applyUrl} ~ '^https?://' AND ${table.deliveryAttempts} >= 0`,
    ),
    dates: check(
      "knight_hacks_job_dates_check",
      sql`${table.lastSeenAt} >= ${table.firstSeenAt} AND (${table.active} = (${table.inactiveAt} IS NULL))`,
    ),
    channel: check(
      "knight_hacks_job_channel_check",
      sql`${table.discordChannelId} IS NULL OR ${table.discordChannelId} ~ '^[0-9]{17,20}$'`,
    ),
    messageId: check(
      "knight_hacks_job_message_check",
      sql`${table.discordMessageId} IS NULL OR ${table.discordMessageId} ~ '^[0-9]{17,20}$'`,
    ),
    lease: check(
      "knight_hacks_job_lease_check",
      sql`(${table.deliveryClaimToken} IS NULL) = (${table.deliveryLeaseExpiresAt} IS NULL)`,
    ),
    destination: check(
      "knight_hacks_job_destination_check",
      sql`${table.deliveryState} = 'suppressed' OR (${table.discordChannelId} IS NOT NULL AND ${table.deliveryTrack} IS NOT NULL)`,
    ),
    receipt: check(
      "knight_hacks_job_receipt_check",
      sql`(${table.deliveryState} = 'sent') = (${table.discordMessageId} IS NOT NULL AND ${table.deliveredAt} IS NOT NULL) AND (${table.discordMessageId} IS NULL) = (${table.deliveredAt} IS NULL)`,
    ),
    sending: check(
      "knight_hacks_job_sending_check",
      sql`${table.deliveryState} <> 'sending' OR ${table.deliveryClaimToken} IS NOT NULL`,
    ),
  }),
);

export const JobObservation = createTable(
  "job_observation",
  (t) => ({
    id: t.uuid().primaryKey().defaultRandom(),
    sourceId: t
      .uuid()
      .notNull()
      .references(() => JobSource.id, { onDelete: "restrict" }),
    jobId: t
      .uuid()
      .notNull()
      .references(() => Job.id, { onDelete: "restrict" }),
    externalId: t.text().notNull(),
    externalIdHash: t
      .text()
      .notNull()
      .generatedAlwaysAs(identityHash("external_id")),
    sourceUrl: t.text(),
    sourceData: t.jsonb().$type<Record<string, unknown>>(),
    postedAt: t.timestamp({ withTimezone: true }),
    firstSeenAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
    inactiveAt: t.timestamp({ withTimezone: true }),
  }),
  (table) => ({
    identity: unique("knight_hacks_job_observation_source_external_unique").on(
      table.sourceId,
      table.externalIdHash,
    ),
    job: index("knight_hacks_job_observation_job_idx").on(table.jobId),
    lastSeen: index("knight_hacks_job_observation_seen_idx").on(
      table.sourceId,
      table.lastSeenAt,
    ),
    values: check(
      "knight_hacks_job_observation_values_check",
      sql`${table.externalId} ~ '[^[:space:]]' AND ${table.lastSeenAt} >= ${table.firstSeenAt}`,
    ),
  }),
);

export const JobLocation = createTable(
  "job_location",
  (t) => ({
    id: t.uuid().primaryKey().defaultRandom(),
    jobId: t
      .uuid()
      .notNull()
      .references(() => Job.id, { onDelete: "cascade" }),
    sourceText: t.text().notNull(),
    kind: jobLocationKindEnum().notNull(),
    cityKey: t.varchar({ length: 8 }),
    state: t.varchar({ length: 2 }),
  }),
  (table) => ({
    job: index("knight_hacks_job_location_job_idx").on(table.jobId),
    city: index("knight_hacks_job_location_city_idx").on(
      table.cityKey,
      table.jobId,
    ),
    state: index("knight_hacks_job_location_state_idx").on(
      table.state,
      table.jobId,
    ),
    kind: index("knight_hacks_job_location_kind_idx").on(
      table.kind,
      table.jobId,
    ),
    values: check(
      "knight_hacks_job_location_values_check",
      sql`${table.sourceText} ~ '[^[:space:]]' AND (${table.state} IS NULL OR ${table.state} ~ '^[A-Z]{2}$') AND (${table.cityKey} IS NULL OR ${table.cityKey} ~ '^[0-9]{2}-[0-9]{5}$')`,
    ),
    shape: check(
      "knight_hacks_job_location_shape_check",
      sql`(${table.kind} = 'city' AND ${table.cityKey} IS NOT NULL AND ${table.state} IS NOT NULL) OR (${table.kind} = 'state' AND ${table.state} IS NOT NULL AND ${table.cityKey} IS NULL) OR (${table.kind} IN ('remote_us', 'unknown') AND ${table.cityKey} IS NULL AND ${table.state} IS NULL)`,
    ),
  }),
);

/** One normalized company/location target per member and track. */
export const JobAlertPreference = createTable(
  "job_alert_preference",
  (t) => ({
    id: t.uuid().primaryKey().defaultRandom(),
    memberId: t
      .uuid()
      .notNull()
      .references(() => Member.id, { onDelete: "cascade" }),
    track: jobTrackEnum().notNull(),
    kind: jobAlertTargetKindEnum().notNull(),
    targetKey: t.varchar({ length: 120 }).notNull(),
    customValue: t.varchar({ length: JOB_BOARD.MAX_ALERT_CUSTOM_VALUE_LENGTH }),
    createdAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
  }),
  (table) => ({
    identity: unique("knight_hacks_job_alert_member_target_unique").on(
      table.memberId,
      table.track,
      table.kind,
      table.targetKey,
    ),
    matching: index("knight_hacks_job_alert_matching_idx").on(
      table.kind,
      table.targetKey,
      table.track,
    ),
    values: check(
      "knight_hacks_job_alert_values_check",
      sql`${table.targetKey} ~ '[^[:space:]]' AND (${table.customValue} IS NULL OR ${table.customValue} ~ '[^[:space:]]')`,
    ),
  }),
);

export const JobApplication = createTable(
  "job_application",
  (t) => ({
    id: t.uuid().primaryKey().defaultRandom(),
    memberId: t
      .uuid()
      .notNull()
      .references(() => Member.id, { onDelete: "cascade" }),
    jobId: t
      .uuid()
      .notNull()
      .references(() => Job.id, { onDelete: "restrict" }),
    stage: jobApplicationStageEnum().notNull().default("saved"),
    round: t.integer(),
    interviewLabel: t.varchar({ length: 120 }),
    visibility: jobApplicationVisibilityEnum()
      .notNull()
      .default(JOB_BOARD.DEFAULT_APPLICATION_VISIBILITY),
    privateNotes: t.varchar({ length: JOB_BOARD.MAX_APPLICATION_NOTES_LENGTH }),
    createdAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: t
      .timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  }),
  (table) => ({
    identity: unique("knight_hacks_job_application_member_job_unique").on(
      table.memberId,
      table.jobId,
    ),
    community: index("knight_hacks_job_application_community_idx").on(
      table.jobId,
      table.visibility,
      table.stage,
    ),
    round: check(
      "knight_hacks_job_application_round_check",
      sql`${table.round} IS NULL OR (${table.stage} = 'interviewing' AND ${table.round} BETWEEN 1 AND ${sql.raw(String(JOB_BOARD.MAX_APPLICATION_ROUND))})`,
    ),
    interviewLabel: check(
      "knight_hacks_job_application_interview_label_check",
      sql`${table.interviewLabel} IS NULL OR (${table.stage} = 'interviewing' AND ${table.interviewLabel} ~ '[^[:space:]]')`,
    ),
  }),
);

/** A dated stage/round snapshot; future application mutations write one per change. */
export const JobApplicationHistory = createTable(
  "job_application_history",
  (t) => ({
    id: t.uuid().primaryKey().defaultRandom(),
    applicationId: t
      .uuid()
      .notNull()
      .references(() => JobApplication.id, { onDelete: "cascade" }),
    stage: jobApplicationStageEnum().notNull(),
    round: t.integer(),
    interviewLabel: t.varchar({ length: 120 }),
    changedAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
  }),
  (table) => ({
    timeline: index("knight_hacks_job_application_history_timeline_idx").on(
      table.applicationId,
      table.changedAt,
    ),
    round: check(
      "knight_hacks_job_application_history_round_check",
      sql`${table.round} IS NULL OR (${table.stage} = 'interviewing' AND ${table.round} BETWEEN 1 AND ${sql.raw(String(JOB_BOARD.MAX_APPLICATION_ROUND))})`,
    ),
    interviewLabel: check(
      "knight_hacks_job_application_history_interview_label_check",
      sql`${table.interviewLabel} IS NULL OR (${table.stage} = 'interviewing' AND ${table.interviewLabel} ~ '[^[:space:]]')`,
    ),
  }),
);

/** One shared summary per track/schedule, not a message per subscribed member. */
export const JobDigest = createTable(
  "job_digest",
  (t) => ({
    id: t.uuid().primaryKey().defaultRandom(),
    track: jobTrackEnum().notNull(),
    scheduledAt: t.timestamp({ withTimezone: true }).notNull(),
    windowStart: t.timestamp({ withTimezone: true }).notNull(),
    windowEnd: t.timestamp({ withTimezone: true }).notNull(),
    discordChannelId: t.varchar({ length: 20 }).notNull(),
    discordMessageId: t.varchar({ length: 20 }),
    deliveryState: jobDeliveryStateEnum().notNull().default("pending"),
    deliveredAt: t.timestamp({ withTimezone: true }),
    claimToken: t.uuid(),
    leaseExpiresAt: t.timestamp({ withTimezone: true }),
    nextAttemptAt: t.timestamp({ withTimezone: true }),
    attempts: t.integer().notNull().default(0),
    lastError: t.text(),
  }),
  (table) => ({
    schedule: unique("knight_hacks_job_digest_schedule_unique").on(
      table.track,
      table.scheduledAt,
    ),
    message: unique("knight_hacks_job_digest_message_unique").on(
      table.discordMessageId,
    ),
    pending: index("knight_hacks_job_digest_pending_idx").on(
      table.deliveryState,
      table.nextAttemptAt,
    ),
    values: check(
      "knight_hacks_job_digest_values_check",
      sql`${table.windowStart} < ${table.windowEnd} AND ${table.windowEnd} <= ${table.scheduledAt} AND ${table.attempts} >= 0 AND ${table.discordChannelId} ~ '^[0-9]{17,20}$' AND (${table.discordMessageId} IS NULL OR ${table.discordMessageId} ~ '^[0-9]{17,20}$')`,
    ),
    lease: check(
      "knight_hacks_job_digest_lease_check",
      sql`(${table.claimToken} IS NULL) = (${table.leaseExpiresAt} IS NULL)`,
    ),
    receipt: check(
      "knight_hacks_job_digest_receipt_check",
      sql`(${table.deliveryState} = 'sent') = (${table.discordMessageId} IS NOT NULL AND ${table.deliveredAt} IS NOT NULL) AND (${table.discordMessageId} IS NULL) = (${table.deliveredAt} IS NULL)`,
    ),
    sending: check(
      "knight_hacks_job_digest_sending_check",
      sql`${table.deliveryState} <> 'sending' OR ${table.claimToken} IS NOT NULL`,
    ),
  }),
);

export type InsertJob = typeof Job.$inferInsert;
export type SelectJob = typeof Job.$inferSelect;
export type InsertJobSource = typeof JobSource.$inferInsert;
export type SelectJobSource = typeof JobSource.$inferSelect;
export type InsertJobObservation = typeof JobObservation.$inferInsert;
export type SelectJobObservation = typeof JobObservation.$inferSelect;
export type InsertJobLocation = typeof JobLocation.$inferInsert;
export type SelectJobLocation = typeof JobLocation.$inferSelect;
export type InsertJobAlertPreference = typeof JobAlertPreference.$inferInsert;
export type SelectJobAlertPreference = typeof JobAlertPreference.$inferSelect;
export type InsertJobApplication = typeof JobApplication.$inferInsert;
export type SelectJobApplication = typeof JobApplication.$inferSelect;
export type InsertJobApplicationHistory =
  typeof JobApplicationHistory.$inferInsert;
export type SelectJobApplicationHistory =
  typeof JobApplicationHistory.$inferSelect;
export type InsertJobDigest = typeof JobDigest.$inferInsert;
export type SelectJobDigest = typeof JobDigest.$inferSelect;
