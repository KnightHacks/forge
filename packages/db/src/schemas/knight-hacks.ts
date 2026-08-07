import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  pgTableCreator,
  primaryKey,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import z from "zod";

import { CAREER, EVENTS, FORMS, GUILD, ISSUE } from "@forge/consts";

import { Roles, Session, User } from "./auth";

const createTable = pgTableCreator((name) => `knight_hacks_${name}`);

export const shirtSizeEnum = pgEnum("shirt_size", FORMS.SHIRT_SIZES);
export const eventSyncStateEnum = pgEnum(
  "event_sync_state",
  EVENTS.EVENT_SYNC_STATES,
);
export const eventGoogleDestinationEnum = pgEnum(
  "event_google_destination",
  EVENTS.EVENT_GOOGLE_DESTINATIONS,
);
export const eventDiscordEntityTypeEnum = pgEnum(
  "event_discord_entity_type",
  EVENTS.EVENT_DISCORD_ENTITY_TYPES,
);
export const eventPurposeEnum = pgEnum("event_purpose", [
  "event",
  "primary_check_in",
]);
export const hackerCheckInOutcomeEnum = pgEnum("hacker_check_in_outcome", [
  "checked_in",
  "already_checked_in",
  "invalid_qr",
  "hacker_not_found",
  "wrong_status",
  "not_checked_in",
  "wrong_class",
  "not_ready",
]);
export const hackerDiscordRoleKindEnum = pgEnum("hacker_discord_role_kind", [
  "general",
  "class",
  "vip",
]);
export const hackerDiscordRoleGrantStateEnum = pgEnum(
  "hacker_discord_role_grant_state",
  ["pending", "succeeded", "failed", "unknown"],
);
export const hackerDiscordRoleAttemptOutcomeEnum = pgEnum(
  "hacker_discord_role_attempt_outcome",
  ["pending", "succeeded", "failed", "unknown"],
);
export const hackathonEventReminderStateEnum = pgEnum(
  "hackathon_event_reminder_state",
  ["pending", "delivering", "delivered", "failed", "unknown"],
);
export const hackerAgreementStageEnum = pgEnum("hacker_agreement_stage", [
  "application",
  "confirmation",
]);
export const hackerAgreementProvenanceEnum = pgEnum(
  "hacker_agreement_provenance",
  ["explicit", "legacy_unversioned"],
);
export const hackerParticipantCommandStateEnum = pgEnum(
  "hacker_participant_command_state",
  ["started", "completed"],
);
export const hackathonEventPublicationProviderEnum = pgEnum(
  "hackathon_event_publication_provider",
  ["discord", "google"],
);
export const eventPublicationWorkStateEnum = pgEnum(
  "event_publication_work_state",
  ["pending", "processing", "succeeded", "failed", "blocked"],
);
export const formKindEnum = pgEnum("form_kind", [
  "general",
  "event_feedback",
  "system",
]);
export const formStateEnum = pgEnum("form_state", [
  "draft",
  "published",
  "archived",
]);
export const formResponseModeEnum = pgEnum("form_response_mode", [
  "single_locked",
  "single_editable",
  "multiple_locked",
]);
export const formCallbackStatusEnum = pgEnum("form_callback_status", [
  "pending",
  "running",
  "succeeded",
  "failed",
  "cancelled",
]);
export const genderEnum = pgEnum("gender", FORMS.GENDERS);
export const raceOrEthnicityEnum = pgEnum(
  "race_or_ethnicity",
  FORMS.RACES_OR_ETHNICITIES,
);
export const sponsorTierEnum = pgEnum("sponsor_tier", FORMS.SPONSOR_TIERS);
export const hackathonApplicationStateEnum = pgEnum(
  "hackathon_application_state",
  FORMS.HACKATHON_APPLICATION_STATES,
);
export const issueStatus = pgEnum("issue_status", ISSUE.ISSUE_STATUS);
export const issuePriority = pgEnum("issue_priority", ISSUE.PRIORITY);
export const companyReviewStateEnum = pgEnum(
  "company_review_state",
  CAREER.COMPANY_REVIEW_STATES,
);
export const employmentStateEnum = pgEnum(
  "employment_state",
  CAREER.EMPLOYMENT_STATES,
);
export const employmentExperienceTypeEnum = pgEnum(
  "employment_experience_type",
  CAREER.EMPLOYMENT_EXPERIENCE_TYPES,
);
export const alumniBulletinStateEnum = pgEnum("alumni_bulletin_state", [
  "draft",
  "published",
  "archived",
]);

export const Hackathon = createTable(
  "hackathon",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    name: t.varchar({ length: 255 }).notNull(),
    displayName: t.varchar({ length: 255 }).notNull().default(""),
    theme: t.varchar({ length: 255 }).notNull(),
    timezone: t.varchar({ length: 64 }).notNull().default("America/New_York"),
    /**
     * Where the hackathon's own site hosts its application. Typed in rather
     * than built from `name`, because that site owns its paths and changes
     * them. Optional; nothing is blocked by its absence.
     */
    applicationUrl: t.text(),
    /**
     * Retired application-template fields retained for stored-data
     * compatibility. Current workflows must not read or write them.
     */
    applicationBackgroundEnabled: t.boolean().notNull().default(false),
    applicationBackgroundKey: t.varchar({ length: 255 }),
    emailTemplateEnabled: t.boolean().notNull().default(false),
    emailTemplateKey: t.varchar({ length: 255 }),
    applicationOpen: t.timestamp().notNull().defaultNow(),
    applicationDeadline: t.timestamp().notNull().defaultNow(),
    confirmationDeadline: t.timestamp().notNull().defaultNow(),
    startDate: t.timestamp().notNull(),
    endDate: t.timestamp().notNull(),
    /** Maximum confirmed hackers. NULL means confirmation has no capacity cap. */
    confirmationCapacity: t.integer(),
    /** Granted to every hacker admitted to this hackathon. */
    generalHackerDiscordRoleId: t.varchar({ length: 20 }),
    /** Destination for this hackathon's event reminders. */
    eventAnnouncementChannelId: t.varchar({ length: 20 }),
  }),
  (t) => ({
    uniqueName: unique("knight_hacks_hackathon_name_unique").on(t.name),
    validAnnouncementChannelId: check(
      "knight_hacks_hackathon_event_announcement_channel_id_check",
      sql`${t.eventAnnouncementChannelId} IS NULL OR ${t.eventAnnouncementChannelId} ~ '^[0-9]{17,20}$'`,
    ),
    validGeneralHackerRoleId: check(
      "knight_hacks_hackathon_general_hacker_discord_role_id_check",
      sql`${t.generalHackerDiscordRoleId} IS NULL OR ${t.generalHackerDiscordRoleId} ~ '^[0-9]{17,20}$'`,
    ),
    validConfirmationCapacity: check(
      "knight_hacks_hackathon_confirmation_capacity_check",
      sql`${t.confirmationCapacity} IS NULL OR ${t.confirmationCapacity} >= 0`,
    ),
  }),
);

export type InsertHackathon = typeof Hackathon.$inferInsert;
export type SelectHackathon = typeof Hackathon.$inferSelect;

/**
 * A hackathon's own hacker groupings, replacing the six theme-specific names
 * that used to be a constant in this file.
 *
 * The purpose is logistical: a thousand people cannot eat at once, so they are
 * split into buckets and the split is themed to make it enjoyable. Each
 * hackathon invents its own names and decides how many it wants.
 *
 * `kind` separates two things that share a shape but not a meaning. A `class`
 * is a bucket a hacker belongs to. `vip` is a bypass — when class A is called,
 * a VIP assigned to class B may still go — and a hacker holds it *in addition
 * to* a class, which is why it is not one of them. Legacy put VIP in the same
 * union as the class names and so could not express both at once.
 *
 * `discordRoleId` is a raw snowflake, deliberately not a reference to `Roles`.
 * A class role grants Discord channel access; it is not a Blade permission
 * role and must never appear in role administration. `Roles.discordRoleId` is
 * also unique, which would forbid two classes sharing a role — something these
 * are explicitly allowed to do.
 *
 * `color` is stored rather than read from the Discord role, because it drives
 * hacker-facing surfaces and must be changeable without touching Discord.
 */
export const HackathonClass = createTable(
  "hackathon_class",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    hackathonId: t
      .uuid()
      .notNull()
      .references(() => Hackathon.id, { onDelete: "cascade" }),
    kind: t.text({ enum: ["class", "vip"] }).notNull(),
    name: t.varchar({ length: 64 }).notNull(),
    discordRoleId: t.varchar({ length: 20 }).notNull(),
    color: t.varchar({ length: 7 }).notNull(),
  }),
  (table) => ({
    hackathonIdx: index("knight_hacks_hackathon_class_hackathon_idx").on(
      table.hackathonId,
    ),
    // At most one VIP entry per hackathon. A partial unique index rather than
    // a procedure check, so it holds against a direct write too.
    oneVipPerHackathon: uniqueIndex(
      "knight_hacks_hackathon_class_one_vip_per_hackathon",
    )
      .on(table.hackathonId)
      .where(sql`${table.kind} = 'vip'`),
    // Discord snowflakes are 17-20 digits. The realistic way an officer breaks
    // this is pasting a role *mention* (`<@&123>`) or a trailing space, which
    // would otherwise surface as a 404 from Discord at check-in. Same rule as
    // `knight_hacks_discord_config`.
    validDiscordRoleId: check(
      "knight_hacks_hackathon_class_discord_role_id_check",
      sql`${table.discordRoleId} ~ '^[0-9]{17,20}$'`,
    ),
    validColor: check(
      "knight_hacks_hackathon_class_color_check",
      sql`${table.color} ~ '^#[0-9a-fA-F]{6}$'`,
    ),
    scopedIdentity: unique(
      "knight_hacks_hackathon_class_id_hackathon_unique",
    ).on(table.id, table.hackathonId),
  }),
);

export type InsertHackathonClass = typeof HackathonClass.$inferInsert;
export type SelectHackathonClass = typeof HackathonClass.$inferSelect;

export const Company = createTable(
  "company",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    displayName: t.varchar({ length: 120 }).notNull(),
    normalizedDisplayName: t.varchar({ length: 120 }).notNull(),
    legalName: t.varchar({ length: 120 }),
    domain: t.varchar({ length: 253 }),
    logoObjectName: t.varchar({ length: 255 }),
    aliases: t
      .text()
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    reviewState: companyReviewStateEnum().notNull().default("pending"),
    mergedIntoCompanyId: t.uuid(),
    createdByUserId: t
      .uuid()
      .references(() => User.id, { onDelete: "set null" }),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  }),
  (table) => ({
    normalizedNameUnique: unique(
      "knight_hacks_company_normalized_display_name_unique",
    ).on(table.normalizedDisplayName),
    reviewStateIdx: index("knight_hacks_company_review_state_idx").on(
      table.reviewState,
    ),
    domainIdx: index("knight_hacks_company_domain_idx").on(table.domain),
    creatorIdx: index("knight_hacks_company_created_by_user_idx").on(
      table.createdByUserId,
    ),
    mergedIntoReference: foreignKey({
      columns: [table.mergedIntoCompanyId],
      foreignColumns: [table.id],
      name: "knight_hacks_company_merged_into_fk",
    }).onDelete("restrict"),
    mergedStateConsistency: check(
      "knight_hacks_company_merged_state_consistency",
      sql`(${table.reviewState} = 'merged') = (${table.mergedIntoCompanyId} IS NOT NULL)`,
    ),
  }),
);

export type InsertCompany = typeof Company.$inferInsert;
export type SelectCompany = typeof Company.$inferSelect;

export const Member = createTable(
  "member",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    userId: t
      .uuid()
      .notNull()
      .references(() => User.id, { onDelete: "cascade" }),
    firstName: t.varchar({ length: 255 }).notNull(),
    lastName: t.varchar({ length: 255 }).notNull(),
    discordUser: t.varchar({ length: 255 }).notNull(),
    age: t.integer().notNull(),
    email: t.varchar({ length: 255 }).notNull(),
    phoneNumber: t.varchar({ length: 255 }),
    school: t.text({ enum: FORMS.SCHOOLS }).notNull(),
    levelOfStudy: t.text({ enum: FORMS.LEVELS_OF_STUDY }).notNull(),
    major: t.text({ enum: FORMS.MAJORS }).notNull().default("Computer Science"),
    gender: genderEnum().default("Prefer not to answer").notNull(),
    raceOrEthnicity: raceOrEthnicityEnum()
      .default("Prefer not to answer")
      .notNull(),
    guildProfileVisible: t.boolean().notNull().default(true),
    guildResumeVisible: t.boolean().notNull().default(true),
    guildOpportunityStatuses: t
      .text({ enum: GUILD.GUILD_OPPORTUNITY_STATUS_OPTIONS })
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    tagline: t.varchar("tagline", { length: 80 }),
    about: t.varchar("about", { length: 500 }),
    profilePictureUrl: t.varchar("profile_picture_url", { length: 512 }),
    shirtSize: shirtSizeEnum().notNull(),
    githubProfileUrl: t.varchar({ length: 255 }),
    linkedinProfileUrl: t.varchar({ length: 255 }),
    websiteUrl: t.varchar({ length: 255 }),
    resumeUrl: t.varchar({ length: 255 }),
    dob: t.date().notNull(),
    gradDate: t.date().notNull(),
    alumniConfirmedAt: t.timestamp({ mode: "date", withTimezone: true }),
    company: t.varchar({ length: 255 }),
    currentCityKey: t.varchar({ length: 8 }),
    guildLocationVisible: t.boolean().notNull().default(true),
    points: t.integer().notNull().default(0),
    dateCreated: t.date().notNull().defaultNow(),
    timeCreated: t.time().notNull().defaultNow(),
  }),
  (t) => ({
    uniqueEmail: unique().on(t.email),
    uniquePhoneNumber: unique().on(t.phoneNumber),
    validGuildOpportunityStatuses: check(
      "knight_hacks_member_valid_guild_opportunity_statuses",
      sql`${t.guildOpportunityStatuses} <@ ARRAY['internships', 'full-time', 'freelance-contract', 'project-collaboration', 'offering-mentorship', 'seeking-mentorship']::text[] AND cardinality(${t.guildOpportunityStatuses}) <= 3`,
    ),
  }),
);

export const Hacker = createTable("hacker", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  userId: t
    .uuid()
    .notNull()
    .references(() => User.id, { onDelete: "cascade" }),
  firstName: t.varchar({ length: 255 }).notNull(),
  lastName: t.varchar({ length: 255 }).notNull(),
  gender: genderEnum().default("Prefer not to answer").notNull(),
  discordUser: t.varchar({ length: 255 }).notNull(),
  age: t.integer().notNull(),
  country: t
    .text({ enum: FORMS.COUNTRIES })
    .notNull()
    .default("United States of America"),
  email: t.varchar({ length: 255 }).notNull(),
  phoneNumber: t.varchar({ length: 255 }).notNull(),
  school: t.text().notNull(),
  levelOfStudy: t.text({ enum: FORMS.LEVELS_OF_STUDY }).notNull(),
  major: t.text({ enum: FORMS.MAJORS }).notNull().default("Computer Science"),
  raceOrEthnicity: raceOrEthnicityEnum()
    .default("Prefer not to answer")
    .notNull(),
  shirtSize: shirtSizeEnum().notNull(),
  githubProfileUrl: t.varchar({ length: 255 }),
  linkedinProfileUrl: t.varchar({ length: 255 }),
  websiteUrl: t.varchar({ length: 255 }),
  resumeUrl: t.varchar({ length: 255 }),
  dob: t.date().notNull(),
  gradDate: t.date().notNull(),
  survey1: t.text("survey_1").notNull(),
  survey2: t.text("survey_2").notNull(),
  isFirstTime: t.boolean("is_first_time").default(false),
  foodAllergies: t.text("food_allergies"),
  agreesToReceiveEmailsFromMLH: t
    .boolean("agrees_to_receive_emails_from_mlh")
    .default(false),
  agreesToMLHCodeOfConduct: t
    .boolean("agrees_to_mlh_code_of_conduct")
    .default(false),
  agreesToMLHDataSharing: t
    .boolean("agrees_to_mlh_data_sharing")
    .default(false),
  dateCreated: t.date().notNull().defaultNow(),
  timeCreated: t.time().notNull().defaultNow(),
}));

export type InsertHacker = typeof Hacker.$inferInsert;
export type SelectHacker = typeof Hacker.$inferSelect;

/** One reusable participant profile, independent of any yearly application. */
export const HackerProfile = createTable(
  "hacker_profile",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    userId: t
      .uuid()
      .notNull()
      .references(() => User.id, { onDelete: "cascade" }),
    firstName: t.varchar({ length: 255 }).notNull(),
    lastName: t.varchar({ length: 255 }).notNull(),
    gender: genderEnum().notNull(),
    discordUser: t.varchar({ length: 255 }).notNull(),
    country: t.text({ enum: FORMS.COUNTRIES }).notNull(),
    email: t.varchar({ length: 255 }).notNull(),
    phoneNumber: t.varchar({ length: 255 }).notNull(),
    school: t.text().notNull(),
    levelOfStudy: t.text({ enum: FORMS.LEVELS_OF_STUDY }).notNull(),
    major: t.text({ enum: FORMS.MAJORS }).notNull(),
    raceOrEthnicity: raceOrEthnicityEnum().notNull(),
    shirtSize: shirtSizeEnum().notNull(),
    githubProfileUrl: t.varchar({ length: 255 }),
    linkedinProfileUrl: t.varchar({ length: 255 }),
    websiteUrl: t.varchar({ length: 255 }),
    resumeUrl: t.varchar({ length: 255 }),
    dob: t.date().notNull(),
    gradDate: t.date().notNull(),
    foodAllergies: t.text(),
    revision: t.integer().notNull().default(1),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  }),
  (table) => ({
    userUnique: unique("knight_hacks_hacker_profile_user_unique").on(
      table.userId,
    ),
    validRevision: check(
      "knight_hacks_hacker_profile_revision_check",
      sql`${table.revision} >= 1`,
    ),
  }),
);

export type InsertHackerProfile = typeof HackerProfile.$inferInsert;
export type SelectHackerProfile = typeof HackerProfile.$inferSelect;

/** Immutable sponsor-visible snapshot of reusable profile data. */
export const HackerProfileRevision = createTable(
  "hacker_profile_revision",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    profileId: t
      .uuid()
      .notNull()
      .references(() => HackerProfile.id, { onDelete: "cascade" }),
    legacyHackerId: t
      .uuid()
      .unique()
      .references(() => Hacker.id, { onDelete: "set null" }),
    revision: t.integer().notNull(),
    firstName: t.varchar({ length: 255 }).notNull(),
    lastName: t.varchar({ length: 255 }).notNull(),
    gender: genderEnum().notNull(),
    discordUser: t.varchar({ length: 255 }).notNull(),
    country: t.text({ enum: FORMS.COUNTRIES }).notNull(),
    email: t.varchar({ length: 255 }).notNull(),
    phoneNumber: t.varchar({ length: 255 }).notNull(),
    school: t.text().notNull(),
    levelOfStudy: t.text({ enum: FORMS.LEVELS_OF_STUDY }).notNull(),
    major: t.text({ enum: FORMS.MAJORS }).notNull(),
    raceOrEthnicity: raceOrEthnicityEnum().notNull(),
    shirtSize: shirtSizeEnum().notNull(),
    githubProfileUrl: t.varchar({ length: 255 }),
    linkedinProfileUrl: t.varchar({ length: 255 }),
    websiteUrl: t.varchar({ length: 255 }),
    resumeUrl: t.varchar({ length: 255 }),
    dob: t.date().notNull(),
    gradDate: t.date().notNull(),
    foodAllergies: t.text(),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: t.uuid().references(() => User.id, { onDelete: "set null" }),
  }),
  (table) => ({
    profileRevisionUnique: unique(
      "knight_hacks_hacker_profile_revision_profile_version_unique",
    ).on(table.profileId, table.revision),
    scopedIdentity: unique(
      "knight_hacks_hacker_profile_revision_id_profile_unique",
    ).on(table.id, table.profileId),
    profileCreated: index(
      "knight_hacks_hacker_profile_revision_profile_created_idx",
    ).on(table.profileId, table.createdAt),
    validRevision: check(
      "knight_hacks_hacker_profile_revision_version_check",
      sql`${table.revision} >= 1`,
    ),
  }),
);

export type InsertHackerProfileRevision =
  typeof HackerProfileRevision.$inferInsert;
export type SelectHackerProfileRevision =
  typeof HackerProfileRevision.$inferSelect;

/** Versioned legal text that a participant accepts for one lifecycle stage. */
export const HackathonAgreementDefinition = createTable(
  "hackathon_agreement_definition",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    hackathonId: t
      .uuid()
      .notNull()
      .references(() => Hackathon.id, { onDelete: "cascade" }),
    stage: hackerAgreementStageEnum().notNull(),
    key: t.varchar({ length: 64 }).notNull(),
    version: t.varchar({ length: 64 }).notNull(),
    title: t.varchar({ length: 255 }).notNull(),
    legalText: t.text(),
    url: t.text(),
    required: t.boolean().notNull().default(true),
    active: t.boolean().notNull().default(false),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: t.uuid().references(() => User.id, { onDelete: "set null" }),
  }),
  (table) => ({
    versionUnique: unique(
      "knight_hacks_hackathon_agreement_definition_version_unique",
    ).on(table.hackathonId, table.stage, table.key, table.version),
    scopedIdentity: unique(
      "knight_hacks_hackathon_agreement_definition_id_hackathon_unique",
    ).on(table.id, table.hackathonId),
    oneActiveVersion: uniqueIndex(
      "knight_hacks_hackathon_agreement_definition_active_unique",
    )
      .on(table.hackathonId, table.stage, table.key)
      .where(sql`${table.active} = true`),
    contentPresent: check(
      "knight_hacks_hackathon_agreement_definition_content_check",
      sql`${table.legalText} IS NOT NULL OR ${table.url} IS NOT NULL`,
    ),
  }),
);

export type InsertHackathonAgreementDefinition =
  typeof HackathonAgreementDefinition.$inferInsert;
export type SelectHackathonAgreementDefinition =
  typeof HackathonAgreementDefinition.$inferSelect;

/** Public portal registration. The browser receives only `clientId`. */
export const HackathonPortalClient = createTable(
  "hackathon_portal_client",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    hackathonId: t
      .uuid()
      .notNull()
      .references(() => Hackathon.id, { onDelete: "cascade" }),
    clientId: t.varchar({ length: 128 }).notNull(),
    name: t.varchar({ length: 120 }).notNull(),
    productionOrigin: t.varchar({ length: 2048 }).notNull(),
    enabled: t.boolean().notNull().default(true),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    createdBy: t.uuid().references(() => User.id, { onDelete: "set null" }),
  }),
  (table) => ({
    clientIdUnique: unique(
      "knight_hacks_hackathon_portal_client_client_id_unique",
    ).on(table.clientId),
    hackathonUnique: unique(
      "knight_hacks_hackathon_portal_client_hackathon_unique",
    ).on(table.hackathonId),
    productionOriginUnique: unique(
      "knight_hacks_hackathon_portal_client_origin_unique",
    ).on(table.productionOrigin),
    scopedIdentity: unique(
      "knight_hacks_hackathon_portal_client_id_hackathon_unique",
    ).on(table.id, table.hackathonId),
    productionOriginShape: check(
      "knight_hacks_hackathon_portal_client_origin_check",
      sql`${table.productionOrigin} ~ '^https://[a-z0-9-]+([.][a-z0-9-]+)*[.]knighthacks[.]org$'`,
    ),
  }),
);

export type InsertHackathonPortalClient =
  typeof HackathonPortalClient.$inferInsert;
export type SelectHackathonPortalClient =
  typeof HackathonPortalClient.$inferSelect;

/** Hashed, short-lived, one-use PKCE authorization code. */
export const HackathonPortalAuthorizationCode = createTable(
  "hackathon_portal_authorization_code",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    portalClientId: t.uuid().notNull(),
    hackathonId: t.uuid().notNull(),
    userId: t
      .uuid()
      .notNull()
      .references(() => User.id, { onDelete: "cascade" }),
    betterAuthSessionId: t
      .text()
      .notNull()
      .references(() => Session.id, { onDelete: "cascade" }),
    codeHash: t.varchar({ length: 64 }).notNull(),
    codeChallenge: t.varchar({ length: 128 }).notNull(),
    codeChallengeMethod: t.varchar({ length: 8 }).notNull().default("S256"),
    redirectUri: t.text().notNull(),
    expiresAt: t.timestamp({ mode: "date", withTimezone: true }).notNull(),
    consumedAt: t.timestamp({ mode: "date", withTimezone: true }),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  }),
  (table) => ({
    codeHashUnique: unique(
      "knight_hacks_hackathon_portal_authorization_code_hash_unique",
    ).on(table.codeHash),
    expiryIdx: index(
      "knight_hacks_hackathon_portal_authorization_code_expiry_idx",
    ).on(table.expiresAt),
    clientExpiryIdx: index(
      "knight_hacks_hackathon_portal_authorization_code_client_expiry_idx",
    ).on(table.portalClientId, table.expiresAt),
    scopedClientReference: foreignKey({
      columns: [table.portalClientId, table.hackathonId],
      foreignColumns: [
        HackathonPortalClient.id,
        HackathonPortalClient.hackathonId,
      ],
      name: "knight_hacks_hackathon_portal_authorization_code_scoped_client_fk",
    }).onDelete("cascade"),
    codeHashShape: check(
      "knight_hacks_hackathon_portal_authorization_code_hash_check",
      sql`${table.codeHash} ~ '^[0-9a-f]{64}$'`,
    ),
    challengeMethod: check(
      "knight_hacks_hackathon_portal_authorization_code_method_check",
      sql`${table.codeChallengeMethod} = 'S256'`,
    ),
  }),
);

export type InsertHackathonPortalAuthorizationCode =
  typeof HackathonPortalAuthorizationCode.$inferInsert;
export type SelectHackathonPortalAuthorizationCode =
  typeof HackathonPortalAuthorizationCode.$inferSelect;

/** Hashed portal access/refresh credentials derived from a Better Auth session. */
export const HackathonPortalSession = createTable(
  "hackathon_portal_session",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    portalClientId: t.uuid().notNull(),
    hackathonId: t.uuid().notNull(),
    userId: t
      .uuid()
      .notNull()
      .references(() => User.id, { onDelete: "cascade" }),
    betterAuthSessionId: t
      .text()
      .notNull()
      .references(() => Session.id, { onDelete: "cascade" }),
    accessTokenHash: t.varchar({ length: 64 }).notNull(),
    refreshTokenHash: t.varchar({ length: 64 }).notNull(),
    accessExpiresAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull(),
    refreshExpiresAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull(),
    refreshVersion: t.integer().notNull().default(1),
    revokedAt: t.timestamp({ mode: "date", withTimezone: true }),
    lastUsedAt: t.timestamp({ mode: "date", withTimezone: true }),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  }),
  (table) => ({
    accessHashUnique: unique(
      "knight_hacks_hackathon_portal_session_access_hash_unique",
    ).on(table.accessTokenHash),
    refreshHashUnique: unique(
      "knight_hacks_hackathon_portal_session_refresh_hash_unique",
    ).on(table.refreshTokenHash),
    scopedClientReference: foreignKey({
      columns: [table.portalClientId, table.hackathonId],
      foreignColumns: [
        HackathonPortalClient.id,
        HackathonPortalClient.hackathonId,
      ],
      name: "knight_hacks_hackathon_portal_session_scoped_client_fk",
    }).onDelete("cascade"),
    activeAccessIdx: index(
      "knight_hacks_hackathon_portal_session_access_expiry_idx",
    ).on(table.accessExpiresAt, table.revokedAt),
    refreshExpiryIdx: index(
      "knight_hacks_hackathon_portal_session_refresh_expiry_idx",
    ).on(table.refreshExpiresAt),
    userClientIdx: index(
      "knight_hacks_hackathon_portal_session_user_client_idx",
    ).on(table.userId, table.portalClientId),
    accessHashShape: check(
      "knight_hacks_hackathon_portal_session_access_hash_check",
      sql`${table.accessTokenHash} ~ '^[0-9a-f]{64}$'`,
    ),
    refreshHashShape: check(
      "knight_hacks_hackathon_portal_session_refresh_hash_check",
      sql`${table.refreshTokenHash} ~ '^[0-9a-f]{64}$'`,
    ),
    validRefreshVersion: check(
      "knight_hacks_hackathon_portal_session_refresh_version_check",
      sql`${table.refreshVersion} >= 1`,
    ),
  }),
);

export type InsertHackathonPortalSession =
  typeof HackathonPortalSession.$inferInsert;
export type SelectHackathonPortalSession =
  typeof HackathonPortalSession.$inferSelect;

/**
 * Hashed credentials retained for the lifetime of a portal session family.
 * Historical hashes let logout revoke a family after rotation and let refresh
 * distinguish an unknown token from replay of a credential we issued.
 */
export const HackathonPortalSessionCredential = createTable(
  "hackathon_portal_session_credential",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    portalSessionId: t
      .uuid()
      .notNull()
      .references(() => HackathonPortalSession.id, { onDelete: "cascade" }),
    tokenHash: t.varchar({ length: 64 }).notNull(),
    tokenKind: t.varchar({ length: 8 }).notNull(),
    expiresAt: t.timestamp({ mode: "date", withTimezone: true }).notNull(),
    rotatedAt: t.timestamp({ mode: "date", withTimezone: true }),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  }),
  (table) => ({
    tokenHashUnique: unique(
      "knight_hacks_hackathon_portal_session_credential_hash_unique",
    ).on(table.tokenHash),
    sessionIdx: index(
      "knight_hacks_hackathon_portal_session_credential_session_idx",
    ).on(table.portalSessionId),
    tokenHashShape: check(
      "knight_hacks_hackathon_portal_session_credential_hash_check",
      sql`${table.tokenHash} ~ '^[0-9a-f]{64}$'`,
    ),
    tokenKindShape: check(
      "knight_hacks_hackathon_portal_session_credential_kind_check",
      sql`${table.tokenKind} IN ('access', 'refresh')`,
    ),
  }),
);

export type InsertHackathonPortalSessionCredential =
  typeof HackathonPortalSessionCredential.$inferInsert;
export type SelectHackathonPortalSessionCredential =
  typeof HackathonPortalSessionCredential.$inferSelect;

/** Durable result for one participant mutation idempotency key. */
export const HackerParticipantCommand = createTable(
  "hacker_participant_command",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    userId: t
      .uuid()
      .notNull()
      .references(() => User.id, { onDelete: "cascade" }),
    hackathonId: t
      .uuid()
      .notNull()
      .references(() => Hackathon.id, { onDelete: "cascade" }),
    operation: t.varchar({ length: 64 }).notNull(),
    idempotencyKey: t.varchar({ length: 128 }).notNull(),
    payloadHash: t.varchar({ length: 64 }).notNull(),
    state: hackerParticipantCommandStateEnum().notNull().default("started"),
    result: t.jsonb(),
    safeErrorCode: t.varchar({ length: 64 }),
    startedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: t.timestamp({ mode: "date", withTimezone: true }),
    expiresAt: t.timestamp({ mode: "date", withTimezone: true }).notNull(),
  }),
  (table) => ({
    commandUnique: unique(
      "knight_hacks_hacker_participant_command_identity_unique",
    ).on(
      table.userId,
      table.hackathonId,
      table.operation,
      table.idempotencyKey,
    ),
    expiryIdx: index("knight_hacks_hacker_participant_command_expiry_idx").on(
      table.expiresAt,
    ),
    payloadHashShape: check(
      "knight_hacks_hacker_participant_command_payload_hash_check",
      sql`${table.payloadHash} ~ '^[0-9a-f]{64}$'`,
    ),
    completionState: check(
      "knight_hacks_hacker_participant_command_completion_check",
      sql`(${table.state} = 'started' AND ${table.completedAt} IS NULL) OR (${table.state} <> 'started' AND ${table.completedAt} IS NOT NULL)`,
    ),
  }),
);

export type InsertHackerParticipantCommand =
  typeof HackerParticipantCommand.$inferInsert;
export type SelectHackerParticipantCommand =
  typeof HackerParticipantCommand.$inferSelect;

export type InsertMember = typeof Member.$inferInsert;
export type SelectMember = typeof Member.$inferSelect;

export const InsertMemberSchema = createInsertSchema(Member);
export const InsertHackerSchema = createInsertSchema(Hacker);

export const Employment = createTable(
  "employment",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    memberId: t
      .uuid()
      .notNull()
      .references(() => Member.id, { onDelete: "cascade" }),
    companyId: t
      .uuid()
      .notNull()
      .references(() => Company.id, { onDelete: "restrict" }),
    title: t.varchar({ length: 120 }),
    experienceType: employmentExperienceTypeEnum(),
    state: employmentStateEnum().notNull(),
    startMonth: t.varchar({ length: 7 }),
    endMonth: t.varchar({ length: 7 }),
    cityKey: t.varchar({ length: 8 }),
    guildVisible: t.boolean().notNull().default(true),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  }),
  (table) => ({
    memberIdx: index("knight_hacks_employment_member_idx").on(table.memberId),
    companyIdx: index("knight_hacks_employment_company_idx").on(
      table.companyId,
    ),
    companyStateIdx: index("knight_hacks_employment_company_state_idx").on(
      table.companyId,
      table.state,
    ),
    currentHasNoEnd: check(
      "knight_hacks_employment_current_has_no_end",
      sql`${table.state} <> 'current' OR ${table.endMonth} IS NULL`,
    ),
    startMonthShape: check(
      "knight_hacks_employment_start_month_shape",
      sql`${table.startMonth} IS NULL OR ${table.startMonth} ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'`,
    ),
    endMonthShape: check(
      "knight_hacks_employment_end_month_shape",
      sql`${table.endMonth} IS NULL OR ${table.endMonth} ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'`,
    ),
    dateOrder: check(
      "knight_hacks_employment_date_order",
      sql`${table.startMonth} IS NULL OR ${table.endMonth} IS NULL OR ${table.endMonth} >= ${table.startMonth}`,
    ),
    cityKeyShape: check(
      "knight_hacks_employment_city_key_shape",
      sql`${table.cityKey} IS NULL OR ${table.cityKey} ~ '^[0-9]{2}-[0-9]{5}$'`,
    ),
  }),
);

export type InsertEmployment = typeof Employment.$inferInsert;
export type SelectEmployment = typeof Employment.$inferSelect;

export const Sponsor = createTable("sponsor", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  name: t.varchar({ length: 255 }).notNull(),
  logoUrl: t.varchar({ length: 255 }).notNull(),
  websiteUrl: t.varchar({ length: 255 }).notNull(),
}));

export const HackathonSponsor = createTable("hackathon_sponsor", (t) => ({
  hackathonId: t
    .uuid()
    .notNull()
    .references(() => Hackathon.id, {
      onDelete: "cascade",
    }),
  sponsorId: t
    .uuid()
    .notNull()
    .references(() => Sponsor.id, {
      onDelete: "cascade",
    }),
  tier: sponsorTierEnum().notNull(),
}));

export const EventTag = createTable(
  "event_tag",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    name: t.varchar({ length: 64 }).notNull(),
    normalizedName: t.varchar({ length: 64 }).notNull(),
    /** NULL is the Club tag catalog; a UUID owns a hackathon-local catalog. */
    hackathonId: t.uuid().references(() => Hackathon.id, {
      onDelete: "cascade",
    }),
    defaultPoints: t.integer().notNull().default(0),
    color: t.varchar({ length: 7 }).notNull(),
    active: t.boolean().notNull().default(true),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  }),
  (table) => ({
    nonNegativePoints: check(
      "knight_hacks_event_tag_default_points_check",
      sql`${table.defaultPoints} >= 0`,
    ),
    validColor: check(
      "knight_hacks_event_tag_color_check",
      sql`${table.color} ~ '^#[0-9A-Fa-f]{6}$'`,
    ),
    clubNormalizedNameUnique: uniqueIndex(
      "knight_hacks_event_tag_club_normalized_name_unique",
    )
      .on(table.normalizedName)
      .where(sql`${table.hackathonId} IS NULL`),
    hackathonNormalizedNameUnique: uniqueIndex(
      "knight_hacks_event_tag_hackathon_normalized_name_unique",
    )
      .on(table.hackathonId, table.normalizedName)
      .where(sql`${table.hackathonId} IS NOT NULL`),
    hackathonIdx: index("knight_hacks_event_tag_hackathon_idx").on(
      table.hackathonId,
    ),
  }),
);

export type InsertEventTag = typeof EventTag.$inferInsert;
export type SelectEventTag = typeof EventTag.$inferSelect;
export const InsertEventTagSchema = createInsertSchema(EventTag);

export const Event = createTable(
  "event",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    discordId: t.varchar({ length: 255 }),
    googleId: t.varchar({ length: 255 }),
    name: t.varchar({ length: 255 }).notNull(),
    tag: t.text().notNull(),
    tagColor: t
      .varchar({ length: 7 })
      .notNull()
      .default(EVENTS.EVENT_TAG_COLORS.Workshop),
    description: t.text().notNull(),
    start_datetime: t.timestamp({ mode: "date", withTimezone: true }).notNull(),
    end_datetime: t.timestamp({ mode: "date", withTimezone: true }).notNull(),
    location: t.varchar({ length: 255 }).notNull(),
    dues_paying: t.boolean().notNull().default(false),
    isOperationsCalendar: t.boolean().notNull().default(false),
    roles: t.varchar({ length: 255 }).array().notNull().default([]),
    points: t.integer(),
    // Can be null if the event is not associated with a hackathon (e.g. club events)
    hackathonId: t.uuid().references(() => Hackathon.id, {
      onDelete: "cascade",
    }),
    purpose: eventPurposeEnum().notNull().default("event"),
    discordChannelId: t.varchar({ length: 255 }),
    // Historical event rows may omit workflow fields. Defaulting those rows to
    // legacy keeps imports and rollback recovery safe; current event creation
    // explicitly persists legacy=false.
    legacy: t.boolean().notNull().default(true),
    discordSyncState: eventSyncStateEnum().default("pending"),
    googleSyncState: eventSyncStateEnum().default("pending"),
    discordLastError: t.text(),
    googleLastError: t.text(),
    publishedAt: t.timestamp({ mode: "date", withTimezone: true }),
    deletionIntentAt: t.timestamp({ mode: "date", withTimezone: true }),
    creationKey: t.uuid().unique(),
    creationPayloadHash: t.varchar({ length: 64 }),
    syncRevision: t.integer().notNull().default(1),
    syncLeaseToken: t.uuid(),
    syncLeaseExpiresAt: t.timestamp({ mode: "date", withTimezone: true }),
    syncLeaseRevision: t.integer(),
    discordOutboundAttemptToken: t.uuid(),
    discordOutboundAttemptedAt: t.timestamp({
      mode: "date",
      withTimezone: true,
    }),
    discordOutboundAttemptRevision: t.integer(),
    googleOutboundAttemptToken: t.uuid(),
    googleOutboundAttemptedAt: t.timestamp({
      mode: "date",
      withTimezone: true,
    }),
    googleOutboundAttemptRevision: t.integer(),
    discordAppliedRevision: t.integer(),
    discordAppliedEntityType: eventDiscordEntityTypeEnum(),
    discordAppliedChannelId: t.varchar({ length: 255 }),
    googleAppliedRevision: t.integer(),
    googleAppliedDestination: eventGoogleDestinationEnum(),
    googleAppliedCalendarId: t.varchar({ length: 255 }),
    visibilityRevision: t.integer(),
    visibilityDuesPaying: t.boolean(),
    visibilityRoles: t.varchar({ length: 255 }).array(),
    visibilityInternal: t.boolean(),
    discordNoProjectionAcknowledgedAt: t.timestamp({
      mode: "date",
      withTimezone: true,
    }),
    discordNoProjectionAcknowledgedBy: t
      .uuid()
      .references(() => User.id, { onDelete: "set null" }),
  }),
  (table) => ({
    startIdx: index("knight_hacks_event_start_datetime_idx").on(
      table.start_datetime,
    ),
    clubScopeIdx: index("knight_hacks_event_hackathon_id_idx").on(
      table.hackathonId,
    ),
    scopedIdentity: unique("knight_hacks_event_id_hackathon_unique").on(
      table.id,
      table.hackathonId,
    ),
    onePrimaryPerHackathon: uniqueIndex(
      "knight_hacks_event_one_primary_per_hackathon",
    )
      .on(table.hackathonId)
      .where(sql`${table.purpose} = 'primary_check_in'`),
    primaryRequiresHackathon: check(
      "knight_hacks_event_primary_requires_hackathon_check",
      sql`${table.purpose} <> 'primary_check_in' OR ${table.hackathonId} IS NOT NULL`,
    ),
    validTagColor: check(
      "knight_hacks_event_tag_color_check",
      sql`${table.tagColor} ~ '^#[0-9A-Fa-f]{6}$'`,
    ),
    validSyncRevision: check(
      "knight_hacks_event_sync_revision_check",
      sql`${table.syncRevision} >= 0`,
    ),
    validNewEventPoints: check(
      "knight_hacks_event_new_points_check",
      sql`${table.legacy} OR (${table.points} IS NOT NULL AND ${table.points} >= 0)`,
    ),
    nonLegacySyncStates: check(
      "knight_hacks_event_nonlegacy_sync_states_check",
      sql`${table.legacy} OR (${table.discordSyncState} IS NOT NULL AND ${table.googleSyncState} IS NOT NULL)`,
    ),
    creationIdentityPair: check(
      "knight_hacks_event_creation_identity_pair_check",
      sql`(${table.creationKey} IS NULL) = (${table.creationPayloadHash} IS NULL)`,
    ),
    newEventCreationIdentity: check(
      "knight_hacks_event_new_creation_identity_check",
      sql`${table.legacy} OR (${table.creationKey} IS NOT NULL AND ${table.creationPayloadHash} IS NOT NULL)`,
    ),
    syncLeaseSet: check(
      "knight_hacks_event_sync_lease_set_check",
      sql`(${table.syncLeaseToken} IS NULL AND ${table.syncLeaseExpiresAt} IS NULL AND ${table.syncLeaseRevision} IS NULL) OR (${table.syncLeaseToken} IS NOT NULL AND ${table.syncLeaseExpiresAt} IS NOT NULL AND ${table.syncLeaseRevision} IS NOT NULL)`,
    ),
    discordAttemptSet: check(
      "knight_hacks_event_discord_attempt_set_check",
      sql`(${table.discordOutboundAttemptToken} IS NULL AND ${table.discordOutboundAttemptedAt} IS NULL AND ${table.discordOutboundAttemptRevision} IS NULL) OR (${table.discordOutboundAttemptToken} IS NOT NULL AND ${table.discordOutboundAttemptedAt} IS NOT NULL AND ${table.discordOutboundAttemptRevision} IS NOT NULL)`,
    ),
    googleAttemptSet: check(
      "knight_hacks_event_google_attempt_set_check",
      sql`(${table.googleOutboundAttemptToken} IS NULL AND ${table.googleOutboundAttemptedAt} IS NULL AND ${table.googleOutboundAttemptRevision} IS NULL) OR (${table.googleOutboundAttemptToken} IS NOT NULL AND ${table.googleOutboundAttemptedAt} IS NOT NULL AND ${table.googleOutboundAttemptRevision} IS NOT NULL)`,
    ),
    visibilitySet: check(
      "knight_hacks_event_visibility_set_check",
      sql`(${table.visibilityRevision} IS NULL AND ${table.visibilityDuesPaying} IS NULL AND ${table.visibilityRoles} IS NULL AND ${table.visibilityInternal} IS NULL) OR (${table.visibilityRevision} IS NOT NULL AND ${table.visibilityDuesPaying} IS NOT NULL AND ${table.visibilityRoles} IS NOT NULL AND ${table.visibilityInternal} IS NOT NULL)`,
    ),
    visibilityRevisionBound: check(
      "knight_hacks_event_visibility_revision_check",
      sql`${table.visibilityRevision} IS NULL OR ${table.visibilityRevision} <= ${table.syncRevision}`,
    ),
    discordAppliedRevisionBound: check(
      "knight_hacks_event_discord_applied_revision_check",
      sql`${table.discordAppliedRevision} IS NULL OR ${table.discordAppliedRevision} <= ${table.syncRevision}`,
    ),
    googleAppliedRevisionBound: check(
      "knight_hacks_event_google_applied_revision_check",
      sql`${table.googleAppliedRevision} IS NULL OR ${table.googleAppliedRevision} <= ${table.syncRevision}`,
    ),
    discordSyncedState: check(
      "knight_hacks_event_discord_synced_state_check",
      sql`${table.discordSyncState} IS DISTINCT FROM 'synced' OR (${table.discordId} IS NOT NULL AND ${table.discordAppliedRevision} IS NOT NULL AND ${table.discordAppliedRevision} = ${table.syncRevision} AND ${table.discordAppliedEntityType} IS NOT NULL AND ((${table.discordAppliedEntityType} = 'external' AND ${table.discordAppliedChannelId} IS NULL) OR (${table.discordAppliedEntityType} IN ('voice', 'stage') AND ${table.discordAppliedChannelId} IS NOT NULL)))`,
    ),
    googleSyncedState: check(
      "knight_hacks_event_google_synced_state_check",
      sql`${table.googleSyncState} IS DISTINCT FROM 'synced' OR (${table.googleId} IS NOT NULL AND ${table.googleAppliedRevision} IS NOT NULL AND ${table.googleAppliedRevision} = ${table.syncRevision} AND ${table.googleAppliedDestination} IS NOT NULL AND ${table.googleAppliedCalendarId} IS NOT NULL)`,
    ),
    publishedVisibility: check(
      "knight_hacks_event_published_visibility_check",
      sql`${table.publishedAt} IS NULL OR (${table.visibilityRevision} IS NOT NULL AND ${table.visibilityDuesPaying} IS NOT NULL AND ${table.visibilityRoles} IS NOT NULL AND ${table.visibilityInternal} IS NOT NULL)`,
    ),
    acknowledgementTime: check(
      "knight_hacks_event_discord_acknowledgement_time_check",
      sql`${table.discordNoProjectionAcknowledgedBy} IS NULL OR ${table.discordNoProjectionAcknowledgedAt} IS NOT NULL`,
    ),
  }),
);

export type InsertEvent = typeof Event.$inferInsert;
export type SelectEvent = typeof Event.$inferSelect;
export type ReturnEvent = InsertEvent & {
  numAttended: number;
  numHackerAttended: number;
};

export const InsertEventSchema = createInsertSchema(Event).extend({
  hackathonName: z.string().nullable().optional(),
});

/** Requested external-calendar state for one hackathon and provider. */
export const HackathonEventPublication = createTable(
  "hackathon_event_publication",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    hackathonId: t
      .uuid()
      .notNull()
      .references(() => Hackathon.id, { onDelete: "cascade" }),
    provider: hackathonEventPublicationProviderEnum().notNull(),
    desiredEnabled: t.boolean().notNull().default(false),
    revision: t.integer().notNull().default(1),
    requestedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    requestedBy: t.uuid().references(() => User.id, { onDelete: "set null" }),
    lastReconciledAt: t.timestamp({ mode: "date", withTimezone: true }),
    lastConvergedAt: t.timestamp({ mode: "date", withTimezone: true }),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  }),
  (table) => ({
    providerUnique: unique(
      "knight_hacks_hackathon_event_publication_provider_unique",
    ).on(table.hackathonId, table.provider),
    scopedIdentity: unique(
      "knight_hacks_hackathon_event_publication_id_scope_unique",
    ).on(table.id, table.hackathonId, table.provider),
    validRevision: check(
      "knight_hacks_hackathon_event_publication_revision_check",
      sql`${table.revision} >= 1`,
    ),
  }),
);

export type InsertHackathonEventPublication =
  typeof HackathonEventPublication.$inferInsert;
export type SelectHackathonEventPublication =
  typeof HackathonEventPublication.$inferSelect;

/** Durable, leaseable reconciliation work for one event/provider pair. */
export const EventPublicationWork = createTable(
  "event_publication_work",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    publicationId: t.uuid().notNull(),
    eventId: t.uuid().notNull(),
    hackathonId: t.uuid().notNull(),
    provider: hackathonEventPublicationProviderEnum().notNull(),
    targetEnabled: t.boolean().notNull(),
    eventRevision: t.integer().notNull(),
    publicationRevision: t.integer().notNull(),
    state: eventPublicationWorkStateEnum().notNull().default("pending"),
    attemptCount: t.integer().notNull().default(0),
    nextAttemptAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow(),
    lastAttemptAt: t.timestamp({ mode: "date", withTimezone: true }),
    lastError: t.varchar({ length: 500 }),
    leaseToken: t.uuid(),
    leaseExpiresAt: t.timestamp({ mode: "date", withTimezone: true }),
    completedAt: t.timestamp({ mode: "date", withTimezone: true }),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  }),
  (table) => ({
    eventProviderUnique: unique(
      "knight_hacks_event_publication_work_event_provider_unique",
    ).on(table.eventId, table.provider),
    dueQueue: index("knight_hacks_event_publication_work_due_idx").on(
      table.state,
      table.nextAttemptAt,
    ),
    hackathonHealth: index("knight_hacks_event_publication_work_health_idx").on(
      table.hackathonId,
      table.provider,
      table.state,
    ),
    leaseExpiry: index(
      "knight_hacks_event_publication_work_lease_expiry_idx",
    ).on(table.leaseExpiresAt),
    scopedPublicationReference: foreignKey({
      columns: [table.publicationId, table.hackathonId, table.provider],
      foreignColumns: [
        HackathonEventPublication.id,
        HackathonEventPublication.hackathonId,
        HackathonEventPublication.provider,
      ],
      name: "knight_hacks_event_publication_work_scoped_publication_fk",
    }).onDelete("cascade"),
    scopedEventReference: foreignKey({
      columns: [table.eventId, table.hackathonId],
      foreignColumns: [Event.id, Event.hackathonId],
      name: "knight_hacks_event_publication_work_scoped_event_fk",
    }).onDelete("cascade"),
    validAttempts: check(
      "knight_hacks_event_publication_work_attempt_count_check",
      sql`${table.attemptCount} >= 0`,
    ),
    validRevisions: check(
      "knight_hacks_event_publication_work_revisions_check",
      sql`${table.eventRevision} >= 1 AND ${table.publicationRevision} >= 1`,
    ),
    leasePair: check(
      "knight_hacks_event_publication_work_lease_pair_check",
      sql`(${table.leaseToken} IS NULL) = (${table.leaseExpiresAt} IS NULL)`,
    ),
  }),
);

export type InsertEventPublicationWork =
  typeof EventPublicationWork.$inferInsert;
export type SelectEventPublicationWork =
  typeof EventPublicationWork.$inferSelect;

export const EventAttendee = createTable(
  "event_attendee",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    memberId: t
      .uuid()
      .notNull()
      .references(() => Member.id, {
        onDelete: "cascade",
      }),
    eventId: t
      .uuid()
      .notNull()
      .references(() => Event.id, {
        onDelete: "cascade",
      }),
    checkedInAt: t.timestamp({ mode: "date", withTimezone: true }),
    checkedInBy: t.uuid().references(() => User.id, { onDelete: "set null" }),
    pointsAwarded: t.integer(),
    pointsAwardedEstimated: t.boolean().notNull().default(false),
  }),
  (table) => ({
    eventMember: index("knight_hacks_event_attendee_event_member_idx").on(
      table.eventId,
      table.memberId,
    ),
    memberEvent: index("knight_hacks_event_attendee_member_event_idx").on(
      table.memberId,
      table.eventId,
    ),
  }),
);

export type InsertEventAttendee = typeof EventAttendee.$inferInsert;
export type SelectEventAttendee = typeof EventAttendee.$inferSelect;

export type RepeatPolicy = "none" | "all" | "class";

export const HackerAttendee = createTable(
  "hacker_attendee",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    hackerId: t
      .uuid()
      .notNull()
      .references(() => Hacker.id, {
        onDelete: "cascade",
      }),
    /** Canonical identity for SDK applications; nullable for mixed-version writers. */
    profileId: t.uuid().references(() => HackerProfile.id, {
      onDelete: "restrict",
    }),
    /** Sponsor-visible immutable revision pinned for this hackathon. */
    profileRevisionId: t.uuid(),
    hackathonId: t
      .uuid()
      .notNull()
      .references(() => Hackathon.id, {
        onDelete: "cascade",
      }),
    status: t
      .text("status", {
        enum: FORMS.HACKATHON_APPLICATION_STATES,
      })
      .notNull()
      .default("pending"),
    timeApplied: t.timestamp().notNull().defaultNow(),
    timeConfirmed: t.timestamp(),
    points: t.integer().notNull().default(0),
    /** Assigned at check-in to whichever class currently has the fewest people. */
    classId: t.uuid(),
    /** Bypasses class gating. Held alongside `classId`, not instead of it. */
    isVip: t.boolean().notNull().default(false),
    /** Stable per-hackathon answer. NULL means the application did not record it. */
    isFirstTime: t.boolean(),
    /** Fixed per-hack application answers retained outside the reusable profile. */
    survey1: t.text(),
    survey2: t.text(),
    /** Whole-hack admission metadata. Legacy checked-in rows leave this NULL. */
    checkedInAt: t.timestamp({ mode: "date", withTimezone: true }),
    checkedInBy: t.uuid().references(() => User.id, { onDelete: "set null" }),
    /**
     * Retired by hackathon-configuration, in favour of `classId`/`isVip`.
     *
     * Held a class *name* from a retired theme, and — because Legacy kept `VIP`
     * in the same union as the class names — sometimes held `'VIP'` to mean "VIP,
     * no class". Those values are deliberately abandoned rather than backfilled,
     * so nothing here may be reinterpreted as a class reference.
     *
     * The column remains only for stored-data compatibility. Current check-in
     * and assignment flows do not read or write it.
     */
    class: t.varchar({ length: 20 }).$type<string | null>().default(null),
    /**
     * Soft blacklist: "do not accept this person by accident".
     *
     * Deliberately **not** a status. The previous implementation expressed this
     * by rewriting the hacker's status to `denied` on read from a hard-coded
     * account ID, which made the flag invisible and unattributable.
     * Here it sits beside the status and changes nothing about it — a
     * blacklisted applicant stays `pending` until an officer capacity-rejects
     * them like anyone else.
     *
     * Officer-only, per hackathon, and never rendered to the applicant. No
     * member-facing procedure and no SDK payload may carry these three columns.
     */
    blacklistedAt: t.timestamp({ withTimezone: true }),
    blacklistedBy: t.uuid().references(() => User.id, { onDelete: "set null" }),
    blacklistReason: t.text(),
    /**
     * The `EmailSend` that carried this attendee's most recent status mail.
     *
     * Many attendees to one send: a bulk accept of two hundred shares one row,
     * which is what the pipeline produces. This exists so a failed delivery is
     * still attributable to a person — `EmailSendRecipient`, the obvious place
     * to look, is deleted by the delivery cycle once a send passes retention,
     * so "who was in that failed send" stops being answerable exactly when an
     * officer goes looking.
     *
     * `set null` because expired drafts are hard-deleted; completed and failed
     * sends are not, so the status stays readable indefinitely.
     */
    lastStatusSendId: t.uuid().references(() => EmailSend.id, {
      onDelete: "set null",
    }),
  }),
  (table) => ({
    /**
     * This table carried no index beyond its primary key. Hackathon
     * configuration adds reads against it that are free today, because
     * `classId` is entirely NULL, and monotonically worse with every attendee
     * ever recorded.
     *
     * Two indexes rather than one, because the queries have two different
     * leading columns and a composite only serves its prefix:
     *
     * - `(hackathonId, classId)` serves the per-class headcount and the
     *   pre-delete count in `remove`, both of which filter on `hackathonId`.
     * - `(classId)` serves the pre-delete count in `removeClass`, which filters
     *   on `classId` alone, plus the RESTRICT integrity probe Postgres fires on
     *   every class delete. Neither can use the composite, since `classId` is
     *   not its leading column — and Postgres does not auto-index a
     *   referencing column the way it does a primary key.
     */
    classOnly: index("knight_hacks_hacker_attendee_class_idx").on(
      table.classId,
    ),
    hackathonClass: index(
      "knight_hacks_hacker_attendee_hackathon_class_idx",
    ).on(table.hackathonId, table.classId),
    checkedInByOnly: index("knight_hacks_hacker_attendee_checked_in_by_idx").on(
      table.checkedInBy,
    ),
    hackathonCheckedIn: index(
      "knight_hacks_hacker_attendee_hackathon_checked_in_idx",
    ).on(table.hackathonId, table.checkedInAt),
    hackerHackathonUnique: unique(
      "knight_hacks_hacker_attendee_hacker_hackathon_unique",
    ).on(table.hackerId, table.hackathonId),
    profileHackathonUnique: uniqueIndex(
      "knight_hacks_hacker_attendee_profile_hackathon_unique",
    )
      .on(table.profileId, table.hackathonId)
      .where(sql`${table.profileId} IS NOT NULL`),
    profileIdx: index("knight_hacks_hacker_attendee_profile_idx").on(
      table.profileId,
    ),
    profileRevisionIdx: index(
      "knight_hacks_hacker_attendee_profile_revision_idx",
    ).on(table.profileRevisionId),
    scopedIdentity: unique(
      "knight_hacks_hacker_attendee_id_hackathon_unique",
    ).on(table.id, table.hackathonId),
    scopedClassReference: foreignKey({
      columns: [table.classId, table.hackathonId],
      foreignColumns: [HackathonClass.id, HackathonClass.hackathonId],
      name: "knight_hacks_hacker_attendee_scoped_class_fk",
    }).onDelete("restrict"),
    scopedProfileRevisionReference: foreignKey({
      columns: [table.profileRevisionId, table.profileId],
      foreignColumns: [
        HackerProfileRevision.id,
        HackerProfileRevision.profileId,
      ],
      name: "knight_hacks_hacker_attendee_scoped_profile_revision_fk",
    }).onDelete("restrict"),
    /**
     * A blacklist with no reason is the thing a year-later officer cannot
     * interpret, so the database refuses it rather than trusting the form.
     * Either the flag is unset entirely, or both the timestamp and the reason
     * are present.
     */
    blacklistNeedsReason: check(
      "knight_hacks_hacker_attendee_blacklist_reason_check",
      sql`(${table.blacklistedAt} is null and ${table.blacklistReason} is null)
          or (${table.blacklistedAt} is not null and ${table.blacklistReason} is not null)`,
    ),
    /**
     * The roster's default read: one hackathon, ordered and filtered by status.
     * `hackathonId` alone was already covered by the composite above only as a
     * prefix; this pairs it with `status`, which every roster query filters or
     * groups by.
     */
    hackathonStatus: index(
      "knight_hacks_hacker_attendee_hackathon_status_idx",
    ).on(table.hackathonId, table.status),
    /**
     * Both new FK columns get their own index, for the same reason `classId`
     * has one: Postgres does not auto-index a referencing column, and every
     * `ON DELETE SET NULL` fires a referential-integrity probe against this
     * table per deleted parent row.
     *
     * `lastStatusSendId` is the sharper of the two — the delivery cycle deletes
     * up to 500 expired draft sends per tick, which without this is 500
     * sequential scans of every attendee ever recorded, every two minutes.
     */
    blacklistedByOnly: index(
      "knight_hacks_hacker_attendee_blacklisted_by_idx",
    ).on(table.blacklistedBy),
    lastStatusSend: index(
      "knight_hacks_hacker_attendee_last_status_send_idx",
    ).on(table.lastStatusSendId),
  }),
);

export type InsertHackerAttendee = typeof HackerAttendee.$inferInsert;
export type SelectHackerAttendee = typeof HackerAttendee.$inferSelect;

/** Per-hack evidence for a versioned legal agreement. */
export const HackerAgreementAcceptance = createTable(
  "hacker_agreement_acceptance",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    attendeeId: t.uuid().notNull(),
    hackathonId: t.uuid().notNull(),
    agreementDefinitionId: t.uuid().notNull(),
    accepted: t.boolean().notNull(),
    provenance: hackerAgreementProvenanceEnum().notNull().default("explicit"),
    acceptedAt: t.timestamp({ mode: "date", withTimezone: true }),
    recordedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  }),
  (table) => ({
    attendeeAgreementUnique: unique(
      "knight_hacks_hacker_agreement_acceptance_attendee_definition_unique",
    ).on(table.attendeeId, table.agreementDefinitionId),
    attendeeIdx: index(
      "knight_hacks_hacker_agreement_acceptance_attendee_idx",
    ).on(table.attendeeId),
    scopedAttendeeReference: foreignKey({
      columns: [table.attendeeId, table.hackathonId],
      foreignColumns: [HackerAttendee.id, HackerAttendee.hackathonId],
      name: "knight_hacks_hacker_agreement_acceptance_scoped_attendee_fk",
    }).onDelete("cascade"),
    scopedDefinitionReference: foreignKey({
      columns: [table.agreementDefinitionId, table.hackathonId],
      foreignColumns: [
        HackathonAgreementDefinition.id,
        HackathonAgreementDefinition.hackathonId,
      ],
      name: "knight_hacks_hacker_agreement_acceptance_scoped_definition_fk",
    }).onDelete("restrict"),
    acceptanceTimestamp: check(
      "knight_hacks_hacker_agreement_acceptance_timestamp_check",
      sql`(${table.accepted} = true AND ${table.acceptedAt} IS NOT NULL) OR (${table.accepted} = false AND ${table.acceptedAt} IS NULL)`,
    ),
  }),
);

export type InsertHackerAgreementAcceptance =
  typeof HackerAgreementAcceptance.$inferInsert;
export type SelectHackerAgreementAcceptance =
  typeof HackerAgreementAcceptance.$inferSelect;

/** Opaque, revocable whole-hack check-in pass. Only the token hash is stored. */
export const HackerCheckInPass = createTable(
  "hacker_check_in_pass",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    attendeeId: t.uuid().notNull(),
    hackathonId: t.uuid().notNull(),
    tokenHash: t.varchar({ length: 64 }).notNull(),
    version: t.integer().notNull().default(1),
    issuedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: t.timestamp({ mode: "date", withTimezone: true }),
    revokedAt: t.timestamp({ mode: "date", withTimezone: true }),
  }),
  (table) => ({
    tokenHashUnique: unique(
      "knight_hacks_hacker_check_in_pass_token_hash_unique",
    ).on(table.tokenHash),
    oneActivePass: uniqueIndex(
      "knight_hacks_hacker_check_in_pass_active_attendee_unique",
    )
      .on(table.attendeeId)
      .where(sql`${table.revokedAt} IS NULL`),
    attendeeIdx: index("knight_hacks_hacker_check_in_pass_attendee_idx").on(
      table.attendeeId,
    ),
    scopedAttendeeReference: foreignKey({
      columns: [table.attendeeId, table.hackathonId],
      foreignColumns: [HackerAttendee.id, HackerAttendee.hackathonId],
      name: "knight_hacks_hacker_check_in_pass_scoped_attendee_fk",
    }).onDelete("cascade"),
    tokenHashShape: check(
      "knight_hacks_hacker_check_in_pass_token_hash_check",
      sql`${table.tokenHash} ~ '^[0-9a-f]{64}$'`,
    ),
    validVersion: check(
      "knight_hacks_hacker_check_in_pass_version_check",
      sql`${table.version} >= 1`,
    ),
  }),
);

export type InsertHackerCheckInPass = typeof HackerCheckInPass.$inferInsert;
export type SelectHackerCheckInPass = typeof HackerCheckInPass.$inferSelect;

export const HackerEventAttendee = createTable(
  "hacker_event_attendee",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    hackerAttId: t.uuid().notNull(),
    hackathonId: t
      .uuid()
      .notNull()
      .references(() => Hackathon.id, {
        onDelete: "cascade",
      }),
    eventId: t.uuid().notNull(),
    /** NULL only for Legacy rows whose occurrence time cannot be recovered. */
    checkedInAt: t.timestamp({ mode: "date", withTimezone: true }),
    checkedInBy: t.uuid().references(() => User.id, { onDelete: "set null" }),
    /** NULL only for Legacy awards that cannot be reconstructed safely. */
    pointsAwarded: t.integer(),
    /** NULL identifies a Legacy row with unknown first-occurrence ordering. */
    isInitialAttendance: t.boolean(),
    voidedAt: t.timestamp({ mode: "date", withTimezone: true }),
    voidedBy: t.uuid().references(() => User.id, { onDelete: "set null" }),
    voidReason: t.varchar({ length: 300 }),
  }),
  (table) => ({
    eventAttendeeHistory: index(
      "knight_hacks_hacker_event_attendee_event_attendee_history_idx",
    ).on(table.eventId, table.hackerAttId, table.checkedInAt, table.id),
    attendeeEventHistory: index(
      "knight_hacks_hacker_event_attendee_attendee_event_history_idx",
    ).on(table.hackerAttId, table.eventId, table.checkedInAt, table.id),
    hackathonHistory: index(
      "knight_hacks_hacker_event_attendee_hackathon_history_idx",
    ).on(table.hackathonId, table.checkedInAt, table.id),
    checkedInByOnly: index(
      "knight_hacks_hacker_event_attendee_checked_in_by_idx",
    ).on(table.checkedInBy),
    voidedByOnly: index("knight_hacks_hacker_event_attendee_voided_by_idx").on(
      table.voidedBy,
    ),
    oneActiveInitialAttendance: uniqueIndex(
      "knight_hacks_hacker_event_attendee_one_active_initial",
    )
      .on(table.eventId, table.hackerAttId)
      .where(
        sql`${table.isInitialAttendance} = true AND ${table.voidedAt} IS NULL`,
      ),
    scopedAttemptIdentity: unique(
      "knight_hacks_hacker_event_attendee_attempt_scope_unique",
    ).on(table.id, table.hackathonId, table.eventId, table.hackerAttId),
    nonNegativePoints: check(
      "knight_hacks_hacker_event_attendee_points_awarded_check",
      sql`${table.pointsAwarded} IS NULL OR ${table.pointsAwarded} >= 0`,
    ),
    voidMetadataPair: check(
      "knight_hacks_hacker_event_attendee_void_metadata_check",
      sql`(${table.voidedAt} IS NULL AND ${table.voidReason} IS NULL) OR (${table.voidedAt} IS NOT NULL AND ${table.voidReason} IS NOT NULL)`,
    ),
    scopedAttendeeReference: foreignKey({
      columns: [table.hackerAttId, table.hackathonId],
      foreignColumns: [HackerAttendee.id, HackerAttendee.hackathonId],
      name: "knight_hacks_hacker_event_attendee_scoped_attendee_fk",
    }).onDelete("cascade"),
    scopedEventReference: foreignKey({
      columns: [table.eventId, table.hackathonId],
      foreignColumns: [Event.id, Event.hackathonId],
      name: "knight_hacks_hacker_event_attendee_scoped_event_fk",
    }).onDelete("cascade"),
  }),
);

export type InsertHackerEventAttendee = typeof HackerEventAttendee.$inferInsert;
export type SelectHackerEventAttendee = typeof HackerEventAttendee.$inferSelect;

/**
 * One operator-visible result. Successful occurrences are permanent; rejected
 * results receive an expiry and are pruned without retaining the scanned QR or
 * a second copy of the hacker's date of birth.
 */
export const HackerCheckInAttempt = createTable(
  "hacker_check_in_attempt",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    hackathonId: t.uuid().notNull(),
    eventId: t.uuid().notNull(),
    hackerAttendeeId: t.uuid(),
    attendanceId: t.uuid().unique(),
    operatorId: t.uuid().references(() => User.id, { onDelete: "set null" }),
    operatorDisplayNameSnapshot: t.varchar({ length: 255 }),
    mode: t.varchar({ length: 16, enum: ["scanner", "manual"] }).notNull(),
    outcome: hackerCheckInOutcomeEnum().notNull(),
    eventPurpose: eventPurposeEnum().notNull(),
    eventNameSnapshot: t.varchar({ length: 255 }).notNull(),
    hackerNameSnapshot: t.varchar({ length: 511 }),
    classId: t.uuid(),
    classNameSnapshot: t.varchar({ length: 64 }),
    classColorSnapshot: t.varchar({ length: 7 }),
    isVipSnapshot: t.boolean().notNull().default(false),
    wasMinorAtAttempt: t.boolean(),
    isRepeatOccurrence: t.boolean().notNull().default(false),
    pointsAwarded: t.integer().notNull().default(0),
    attemptedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: t.timestamp({ mode: "date", withTimezone: true }),
  }),
  (table) => ({
    hackathonHistory: index(
      "knight_hacks_hacker_check_in_attempt_hackathon_history_idx",
    ).on(table.hackathonId, table.attemptedAt, table.id),
    attendeeHistory: index(
      "knight_hacks_hacker_check_in_attempt_attendee_history_idx",
    ).on(table.hackerAttendeeId, table.attemptedAt, table.id),
    expiring: index("knight_hacks_hacker_check_in_attempt_expiring_idx")
      .on(table.expiresAt)
      .where(sql`${table.expiresAt} IS NOT NULL`),
    validMode: check(
      "knight_hacks_hacker_check_in_attempt_mode_check",
      sql`${table.mode} IN ('scanner', 'manual')`,
    ),
    validClassColor: check(
      "knight_hacks_hacker_check_in_attempt_class_color_check",
      sql`${table.classColorSnapshot} IS NULL OR ${table.classColorSnapshot} ~ '^#[0-9A-Fa-f]{6}$'`,
    ),
    nonNegativePoints: check(
      "knight_hacks_hacker_check_in_attempt_points_check",
      sql`${table.pointsAwarded} >= 0`,
    ),
    successfulAttendanceRetention: check(
      "knight_hacks_hacker_check_in_attempt_success_retention_check",
      sql`(${table.outcome} = 'checked_in' AND ${table.attendanceId} IS NOT NULL AND ${table.expiresAt} IS NULL) OR (${table.outcome} <> 'checked_in' AND ${table.attendanceId} IS NULL AND ${table.expiresAt} IS NOT NULL)`,
    ),
    scopedAttendeeReference: foreignKey({
      columns: [table.hackerAttendeeId, table.hackathonId],
      foreignColumns: [HackerAttendee.id, HackerAttendee.hackathonId],
      name: "knight_hacks_hacker_check_in_attempt_scoped_attendee_fk",
    }).onDelete("cascade"),
    scopedAttendanceReference: foreignKey({
      columns: [
        table.attendanceId,
        table.hackathonId,
        table.eventId,
        table.hackerAttendeeId,
      ],
      foreignColumns: [
        HackerEventAttendee.id,
        HackerEventAttendee.hackathonId,
        HackerEventAttendee.eventId,
        HackerEventAttendee.hackerAttId,
      ],
      name: "knight_hacks_hacker_check_in_attempt_scoped_attendance_fk",
    }).onDelete("cascade"),
    scopedClassReference: foreignKey({
      columns: [table.classId, table.hackathonId],
      foreignColumns: [HackathonClass.id, HackathonClass.hackathonId],
      name: "knight_hacks_hacker_check_in_attempt_scoped_class_fk",
    }).onDelete("restrict"),
    scopedEventReference: foreignKey({
      columns: [table.eventId, table.hackathonId],
      foreignColumns: [Event.id, Event.hackathonId],
      name: "knight_hacks_hacker_check_in_attempt_scoped_event_fk",
    }).onDelete("cascade"),
  }),
);

export type InsertHackerCheckInAttempt =
  typeof HackerCheckInAttempt.$inferInsert;
export type SelectHackerCheckInAttempt =
  typeof HackerCheckInAttempt.$inferSelect;

/** Current repair state for one logical role granted by primary admission. */
export const HackerDiscordRoleGrant = createTable(
  "hacker_discord_role_grant",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    hackerAttendeeId: t.uuid().notNull(),
    hackathonId: t.uuid().notNull(),
    sourceAttendanceId: t.uuid().notNull(),
    sourceEventId: t.uuid().notNull(),
    kind: hackerDiscordRoleKindEnum().notNull(),
    desiredRoleId: t.varchar({ length: 20 }).notNull(),
    state: hackerDiscordRoleGrantStateEnum().notNull().default("pending"),
    attemptCount: t.integer().notNull().default(0),
    lastAttemptAt: t.timestamp({ mode: "date", withTimezone: true }),
    succeededAt: t.timestamp({ mode: "date", withTimezone: true }),
    lastError: t.varchar({ length: 500 }),
    leaseToken: t.uuid(),
    leaseExpiresAt: t.timestamp({ mode: "date", withTimezone: true }),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  }),
  (table) => ({
    logicalGrant: unique(
      "knight_hacks_hacker_discord_role_grant_logical_unique",
    ).on(table.hackerAttendeeId, table.kind),
    repairQueue: index(
      "knight_hacks_hacker_discord_role_grant_repair_queue_idx",
    ).on(table.state, table.leaseExpiresAt),
    validDesiredRole: check(
      "knight_hacks_hacker_discord_role_grant_role_id_check",
      sql`${table.desiredRoleId} ~ '^[0-9]{17,20}$'`,
    ),
    nonNegativeAttempts: check(
      "knight_hacks_hacker_discord_role_grant_attempt_count_check",
      sql`${table.attemptCount} >= 0`,
    ),
    leasePair: check(
      "knight_hacks_hacker_discord_role_grant_lease_pair_check",
      sql`(${table.leaseToken} IS NULL) = (${table.leaseExpiresAt} IS NULL)`,
    ),
    scopedAttendeeReference: foreignKey({
      columns: [table.hackerAttendeeId, table.hackathonId],
      foreignColumns: [HackerAttendee.id, HackerAttendee.hackathonId],
      name: "knight_hacks_hacker_discord_role_grant_scoped_attendee_fk",
    }).onDelete("cascade"),
    scopedAttendanceReference: foreignKey({
      columns: [
        table.sourceAttendanceId,
        table.hackathonId,
        table.sourceEventId,
        table.hackerAttendeeId,
      ],
      foreignColumns: [
        HackerEventAttendee.id,
        HackerEventAttendee.hackathonId,
        HackerEventAttendee.eventId,
        HackerEventAttendee.hackerAttId,
      ],
      name: "knight_hacks_hacker_discord_role_grant_scoped_attendance_fk",
    }).onDelete("cascade"),
  }),
);

export type InsertHackerDiscordRoleGrant =
  typeof HackerDiscordRoleGrant.$inferInsert;
export type SelectHackerDiscordRoleGrant =
  typeof HackerDiscordRoleGrant.$inferSelect;

/** Append-only evidence for each idempotent Discord role PUT. */
export const HackerDiscordRoleGrantAttempt = createTable(
  "hacker_discord_role_grant_attempt",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    grantId: t
      .uuid()
      .notNull()
      .references(() => HackerDiscordRoleGrant.id, { onDelete: "cascade" }),
    attemptToken: t.uuid().notNull().unique(),
    roleIdSnapshot: t.varchar({ length: 20 }).notNull(),
    discordUserIdSnapshot: t.varchar({ length: 20 }).notNull(),
    attemptedBy: t.uuid().references(() => User.id, { onDelete: "set null" }),
    outcome: hackerDiscordRoleAttemptOutcomeEnum().notNull().default("pending"),
    error: t.varchar({ length: 500 }),
    startedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: t.timestamp({ mode: "date", withTimezone: true }),
  }),
  (table) => ({
    grantHistory: index(
      "knight_hacks_hacker_discord_role_grant_attempt_history_idx",
    ).on(table.grantId, table.startedAt, table.id),
    validRoleId: check(
      "knight_hacks_hacker_discord_role_grant_attempt_role_id_check",
      sql`${table.roleIdSnapshot} ~ '^[0-9]{17,20}$'`,
    ),
    validDiscordUserId: check(
      "knight_hacks_hacker_discord_role_grant_attempt_user_id_check",
      sql`${table.discordUserIdSnapshot} ~ '^[0-9]{17,20}$'`,
    ),
    completionPair: check(
      "knight_hacks_hacker_discord_role_grant_attempt_completion_check",
      sql`(${table.outcome} = 'pending' AND ${table.finishedAt} IS NULL) OR (${table.outcome} <> 'pending' AND ${table.finishedAt} IS NOT NULL)`,
    ),
  }),
);

export type InsertHackerDiscordRoleGrantAttempt =
  typeof HackerDiscordRoleGrantAttempt.$inferInsert;
export type SelectHackerDiscordRoleGrantAttempt =
  typeof HackerDiscordRoleGrantAttempt.$inferSelect;

/** Durable at-most-once delivery claim for one event start/reminder window. */
export const HackathonEventReminderDelivery = createTable(
  "hackathon_event_reminder_delivery",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    eventId: t.uuid().notNull(),
    hackathonId: t.uuid().notNull(),
    eventStartAt: t.timestamp({ mode: "date", withTimezone: true }).notNull(),
    reminderKey: t.varchar({ length: 32 }).notNull(),
    destinationChannelIdSnapshot: t.varchar({ length: 20 }).notNull(),
    roleIdSnapshot: t.varchar({ length: 20 }).notNull(),
    discordEventIdSnapshot: t.varchar({ length: 255 }),
    contentSnapshot: t.text().notNull(),
    state: hackathonEventReminderStateEnum().notNull().default("pending"),
    attemptCount: t.integer().notNull().default(0),
    lastError: t.varchar({ length: 500 }),
    lockedAt: t.timestamp({ mode: "date", withTimezone: true }),
    nextAttemptAt: t.timestamp({ mode: "date", withTimezone: true }),
    deliveredAt: t.timestamp({ mode: "date", withTimezone: true }),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  }),
  (table) => ({
    deliveryIdentity: unique(
      "knight_hacks_hackathon_event_reminder_delivery_identity_unique",
    ).on(table.eventId, table.reminderKey),
    pendingQueue: index(
      "knight_hacks_hackathon_event_reminder_delivery_pending_idx",
    ).on(table.state, table.nextAttemptAt),
    validDestinationChannelId: check(
      "knight_hacks_hackathon_event_reminder_channel_id_check",
      sql`${table.destinationChannelIdSnapshot} ~ '^[0-9]{17,20}$'`,
    ),
    validRoleId: check(
      "knight_hacks_hackathon_event_reminder_role_id_check",
      sql`${table.roleIdSnapshot} ~ '^[0-9]{17,20}$'`,
    ),
    nonNegativeAttempts: check(
      "knight_hacks_hackathon_event_reminder_attempt_count_check",
      sql`${table.attemptCount} >= 0`,
    ),
    scopedEventReference: foreignKey({
      columns: [table.eventId, table.hackathonId],
      foreignColumns: [Event.id, Event.hackathonId],
      name: "knight_hacks_hackathon_event_reminder_scoped_event_fk",
    }).onDelete("cascade"),
  }),
);

export type InsertHackathonEventReminderDelivery =
  typeof HackathonEventReminderDelivery.$inferInsert;
export type SelectHackathonEventReminderDelivery =
  typeof HackathonEventReminderDelivery.$inferSelect;

export const InsertEventAttendeeSchema = createInsertSchema(EventAttendee);
export const InsertHackerAttendeeSchema = createInsertSchema(HackerAttendee);

export const DuesPayment = createTable(
  "dues_payment",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    memberId: t
      .uuid()
      .notNull()
      .references(() => Member.id, {
        onDelete: "cascade",
      }),
    amount: t.integer().notNull(),
    paymentDate: t.timestamp().notNull(),
    year: t.integer().notNull(),
    active: t.boolean().notNull().default(true),
    stripePaymentIntentId: t.varchar("stripe_payment_intent_id", {
      length: 255,
    }),
  }),
  (table) => ({
    uniqueMemberYear: unique().on(table.memberId, table.year),
    uniqueStripePaymentIntent: unique(
      "knight_hacks_dues_payment_stripe_payment_intent_id_unique",
    ).on(table.stripePaymentIntentId),
  }),
);

export type InsertDuesPayment = typeof DuesPayment.$inferInsert;
export type SelectDuesPayment = typeof DuesPayment.$inferSelect;

export const DuesPaymentSchema = createInsertSchema(DuesPayment);

export const EventFeedback = createTable("event_feedback", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  memberId: t
    .uuid()
    .notNull()
    .references(() => Member.id, {
      onDelete: "cascade",
    }),
  eventId: t
    .uuid()
    .notNull()
    .references(() => Event.id, {
      onDelete: "cascade",
    }),
  overallEventRating: t.integer().notNull(),
  funRating: t.integer().notNull(),
  learnedRating: t.integer().notNull(),
  heardAboutUs: t.text({ enum: FORMS.EVENT_FEEDBACK_HEARD }).notNull(),
  additionalFeedback: t.text(),
  similarEvent: t.text({ enum: EVENTS.EVENT_FEEDBACK_SIMILAR_EVENT }).notNull(),
  createdAt: t.timestamp().notNull().defaultNow(),
}));

export const InsertEventFeedbackSchema = createInsertSchema(EventFeedback);

export const Challenges = createTable(
  "challenges",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    title: t.text().notNull(),
    hackathonId: t
      .uuid()
      .notNull()
      .references(() => Hackathon.id, {
        onDelete: "cascade",
      }),
    description: t.text().notNull(),
    sponsor: t.text().notNull(),
  }),
  (table) => ({
    uniqueTitlePerHackathon: unique().on(table.title, table.hackathonId),
  }),
);

export const InsertChallengesSchema = createInsertSchema(Challenges);

export const Submissions = createTable(
  "submissions",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    challengeId: t
      .uuid()
      .notNull()
      .references(() => Challenges.id, {
        onDelete: "cascade",
      }),
    teamId: t
      .uuid()
      .notNull()
      .references(() => Teams.id, {
        onDelete: "cascade",
      }),
    hackathonId: t
      .uuid()
      .notNull()
      .references(() => Hackathon.id, {
        onDelete: "cascade",
      }),
  }),
  (table) => ({
    uniqueTeamPerChallenge: unique().on(table.teamId, table.challengeId),
  }),
);

export const InsertSubmissionsSchema = createInsertSchema(Submissions);

export const Teams = createTable("teams", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  hackathonId: t
    .uuid()
    .notNull()
    .references(() => Hackathon.id, {
      onDelete: "cascade",
    }),

  // Core project info
  projectTitle: t.text().notNull(),
  submissionUrl: t.text(),
  projectCreatedAt: t.timestamp().notNull(),
  isProjectSubmitted: t.boolean().notNull().default(false),

  // Devpost link
  devpostUrl: t.text(),

  // Team info
  notes: t.text(),
  universities: t.text(),
  emails: t.text(),

  // Csv matching
  // To uniqueliy identify a team when comparing it with devpost csv data
  // firstName and lastName are the csv's submitter first and last names which are never null
  matchKey: t.text().unique(), // should have the format of ${firstName}_${lastName}:${createdAt}:${projectTitle}
}));

export const InsertTeamsSchema = createInsertSchema(Teams);

export const Judges = createTable("judges", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  name: t.text().notNull(),
  roomName: t.text().notNull(),
  challengeId: t
    .uuid()
    .notNull()
    .references(() => Challenges.id, {
      onDelete: "cascade",
    }),
}));

export const InsertJudgesSchema = createInsertSchema(Judges);
export const JudgedSubmission = createTable("judged_submission", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  hackathonId: t
    .uuid()
    .notNull()
    .references(() => Hackathon.id),
  submissionId: t
    .uuid()
    .notNull()
    .references(() => Submissions.id),
  judgeId: t
    .uuid()
    .notNull()
    .references(() => Judges.id),
  privateFeedback: t.varchar({ length: 255 }).notNull(),
  publicFeedback: t.varchar({ length: 255 }).notNull(),
  originality_rating: t.integer().notNull(),
  design_rating: t.integer().notNull(),
  technical_understanding_rating: t.integer().notNull(),
  implementation_rating: t.integer().notNull(),
  wow_factor_rating: t.integer().notNull(),
}));

export const InsertJudgedSubmissionSchema =
  createInsertSchema(JudgedSubmission);

export const OtherCompanies = createTable("companies", (t) => ({
  name: t.varchar({ length: 255 }).notNull().primaryKey(),
}));

export const InsertOtherCompaniesSchema = createInsertSchema(OtherCompanies);

export const FormSections = createTable("form_sections", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  name: t.varchar({ length: 255 }).notNull().unique(),
  order: t.integer().notNull().default(0),
  createdAt: t.timestamp().notNull().defaultNow(),
}));

export const FormSectionRoles = createTable(
  "form_section_roles",
  (t) => ({
    sectionId: t
      .uuid()
      .notNull()
      .references(() => FormSections.id, { onDelete: "cascade" }),
    roleId: t
      .uuid()
      .notNull()
      .references(() => Roles.id, { onDelete: "cascade" }),
  }),
  (t) => ({
    pk: primaryKey({ columns: [t.sectionId, t.roleId] }),
  }),
);

export const FormSectionViewRole = createTable(
  "form_section_view_role",
  (t) => ({
    sectionId: t
      .uuid()
      .notNull()
      .references(() => FormSections.id, { onDelete: "cascade" }),
    roleId: t
      .uuid()
      .notNull()
      .references(() => Roles.id, { onDelete: "cascade" }),
  }),
  (t) => ({
    pk: primaryKey({ columns: [t.sectionId, t.roleId] }),
  }),
);

export const FormSectionEditRole = createTable(
  "form_section_edit_role",
  (t) => ({
    sectionId: t
      .uuid()
      .notNull()
      .references(() => FormSections.id, { onDelete: "cascade" }),
    roleId: t
      .uuid()
      .notNull()
      .references(() => Roles.id, { onDelete: "cascade" }),
  }),
  (t) => ({
    pk: primaryKey({ columns: [t.sectionId, t.roleId] }),
  }),
);

export const InsertFormSectionSchema = createInsertSchema(FormSections);

export const FormsSchemas = createTable("form_schemas", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  name: t.varchar({ length: 255 }).notNull(),
  slugName: t.varchar({ length: 255 }).notNull().unique(),
  createdAt: t.timestamp().notNull().defaultNow(),
  kind: formKindEnum().notNull().default("general"),
  state: formStateEnum().notNull().default("draft"),
  opensAt: t.timestamp({ mode: "date", withTimezone: true }),
  closesAt: t.timestamp({ mode: "date", withTimezone: true }),
  manuallyClosed: t.boolean().notNull().default(false),
  responseMode: formResponseModeEnum().notNull().default("single_locked"),
  publishedAt: t.timestamp({ mode: "date", withTimezone: true }),
  archivedAt: t.timestamp({ mode: "date", withTimezone: true }),
  revision: t.integer().notNull().default(1),
  duesOnly: t.boolean().notNull().default(false),
  allowResubmission: t.boolean().notNull().default(false),
  allowEdit: t.boolean().notNull().default(false),
  formData: t.jsonb().notNull(),
  formValidatorJson: t.jsonb().notNull(),
  section: t.varchar({ length: 255 }).notNull().default("General"),
  sectionId: t
    .uuid()
    .notNull()
    .references(() => FormSections.id, { onDelete: "restrict" }),
  isClosed: t.boolean().notNull().default(false),
}));

export type Form = typeof FormsSchemas.$inferSelect;
//Ts so dumb
export const FormSchemaSchema = createInsertSchema(FormsSchemas);

export const AlumniBulletinPost = createTable(
  "alumni_bulletin_post",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    title: t.varchar({ length: 120 }).notNull(),
    body: t.text(),
    imageObjectName: t.varchar({ length: 255 }),
    imageAlt: t.varchar({ length: 240 }),
    ctaLabel: t.varchar({ length: 80 }),
    externalUrl: t.varchar({ length: 2_048 }),
    formId: t
      .uuid()
      .references(() => FormsSchemas.id, { onDelete: "set null" }),
    state: alumniBulletinStateEnum().notNull().default("draft"),
    displayOrder: t.integer().notNull().default(0),
    publishAt: t.timestamp({ mode: "date", withTimezone: true }),
    expiresAt: t.timestamp({ mode: "date", withTimezone: true }),
    archivedAt: t.timestamp({ mode: "date", withTimezone: true }),
    createdByUserId: t
      .uuid()
      .notNull()
      .references(() => User.id, { onDelete: "restrict" }),
    updatedByUserId: t
      .uuid()
      .notNull()
      .references(() => User.id, { onDelete: "restrict" }),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  }),
  (t) => ({
    actionExclusive: check(
      "alumni_bulletin_action_exclusive",
      sql`NOT (${t.externalUrl} IS NOT NULL AND ${t.formId} IS NOT NULL)`,
    ),
    actionPair: check(
      "alumni_bulletin_action_pair",
      sql`((${t.externalUrl} IS NULL AND ${t.formId} IS NULL) OR ${t.ctaLabel} IS NOT NULL)`,
    ),
    displayOrderNonnegative: check(
      "alumni_bulletin_display_order_nonnegative",
      sql`${t.displayOrder} >= 0`,
    ),
    imageAltPair: check(
      "alumni_bulletin_image_alt_pair",
      sql`((${t.imageObjectName} IS NULL AND ${t.imageAlt} IS NULL) OR (${t.imageObjectName} IS NOT NULL AND ${t.imageAlt} IS NOT NULL))`,
    ),
    scheduleOrder: check(
      "alumni_bulletin_schedule_order",
      sql`${t.expiresAt} IS NULL OR ${t.publishAt} IS NULL OR ${t.expiresAt} > ${t.publishAt}`,
    ),
    stateOrderIdx: index("knight_hacks_alumni_bulletin_state_order_idx").on(
      t.state,
      t.displayOrder,
    ),
    publicationWindowIdx: index(
      "knight_hacks_alumni_bulletin_publication_window_idx",
    ).on(t.publishAt, t.expiresAt),
  }),
);

export type InsertAlumniBulletinPost = typeof AlumniBulletinPost.$inferInsert;
export type SelectAlumniBulletinPost = typeof AlumniBulletinPost.$inferSelect;

export const FormResponseRoles = createTable(
  "form_response_roles",
  (t) => ({
    formId: t
      .uuid()
      .notNull()
      .references(() => FormsSchemas.id, { onDelete: "cascade" }),
    roleId: t
      .uuid()
      .notNull()
      .references(() => Roles.id, { onDelete: "cascade" }),
  }),
  (t) => ({
    pk: primaryKey({ columns: [t.formId, t.roleId] }),
  }),
);

export const FormResponse = createTable(
  "form_response",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    form: t
      .uuid()
      .notNull()
      .references(() => FormsSchemas.id),
    userId: t
      .uuid()
      .notNull()
      .references(() => User.id, { onDelete: "cascade" }),
    responseData: t.jsonb().notNull(),
    formRevision: t.integer().notNull().default(1),
    responseSnapshot: t.jsonb().notNull().default({}),
    createdAt: t.timestamp().notNull().defaultNow(),
    editedAt: t.timestamp().notNull().defaultNow(),
  }),
  (t) => ({
    formCreatedIdx: index("knight_hacks_form_response_form_created_idx").on(
      t.form,
      t.createdAt,
    ),
    userCreatedIdx: index("knight_hacks_form_response_user_created_idx").on(
      t.userId,
      t.createdAt,
    ),
  }),
);

export const InsertFormResponseSchema = createInsertSchema(FormResponse);

export const TrpcFormConnection = createTable("trpc_form_connection", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  form: t
    .uuid()
    .notNull()
    .references(() => FormsSchemas.id),
  proc: t.varchar().notNull(),
  connections: t.jsonb().notNull(),
}));

export const TrpcFormConnectionSchema = createInsertSchema(TrpcFormConnection);

export const FormSingleResponseClaim = createTable(
  "form_single_response_claim",
  (t) => ({
    formId: t
      .uuid()
      .notNull()
      .references(() => FormsSchemas.id, { onDelete: "cascade" }),
    userId: t
      .uuid()
      .notNull()
      .references(() => User.id, { onDelete: "cascade" }),
    responseId: t
      .uuid()
      .notNull()
      .unique()
      .references(() => FormResponse.id, { onDelete: "cascade" }),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  }),
  (t) => ({
    pk: primaryKey({ columns: [t.formId, t.userId] }),
  }),
);

export const FormAttachment = createTable(
  "form_attachment",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    formId: t
      .uuid()
      .notNull()
      .references(() => FormsSchemas.id, { onDelete: "cascade" }),
    responseId: t
      .uuid()
      .references(() => FormResponse.id, { onDelete: "cascade" }),
    ownerUserId: t
      .uuid()
      .notNull()
      .references(() => User.id, { onDelete: "cascade" }),
    objectName: t.varchar({ length: 512 }).notNull().unique(),
    fileName: t.varchar({ length: 255 }).notNull(),
    contentType: t.varchar({ length: 255 }).notNull(),
    size: t.integer().notNull(),
    purpose: t
      .text({ enum: ["instruction", "response"] })
      .notNull()
      .default("response"),
    finalizedAt: t.timestamp({ mode: "date", withTimezone: true }),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  }),
  (t) => ({
    formIdx: index("knight_hacks_form_attachment_form_idx").on(t.formId),
    purposeCheck: check(
      "knight_hacks_form_attachment_purpose_check",
      sql`${t.purpose} IN ('instruction', 'response')`,
    ),
    responseIdx: index("knight_hacks_form_attachment_response_idx").on(
      t.responseId,
    ),
  }),
);

export const FormCallbackConfiguration = createTable(
  "form_callback_configuration",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    formId: t
      .uuid()
      .notNull()
      .references(() => FormsSchemas.id, { onDelete: "cascade" }),
    callbackSlug: t.varchar({ length: 255 }).notNull(),
    active: t.boolean().notNull().default(true),
    mappings: t.jsonb().notNull(),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  }),
  (t) => ({
    uniqueCallbackPerForm: unique(
      "knight_hacks_form_callback_configuration_form_slug_unique",
    ).on(t.formId, t.callbackSlug),
  }),
);

export const FormCallbackExecution = createTable(
  "form_callback_execution",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    configurationId: t
      .uuid()
      .notNull()
      .references(() => FormCallbackConfiguration.id, {
        onDelete: "restrict",
      }),
    responseId: t.uuid().references(() => FormResponse.id, {
      onDelete: "set null",
    }),
    callbackSlug: t.varchar({ length: 255 }).notNull(),
    input: t.jsonb().notNull(),
    status: formCallbackStatusEnum().notNull().default("pending"),
    attempts: t.integer().notNull().default(0),
    lastError: t.text(),
    availableAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    leaseToken: t.uuid(),
    leaseExpiresAt: t.timestamp({ mode: "date", withTimezone: true }),
    succeededAt: t.timestamp({ mode: "date", withTimezone: true }),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  }),
  (t) => ({
    statusAvailableIdx: index(
      "knight_hacks_form_callback_execution_status_available_idx",
    ).on(t.status, t.availableAt),
  }),
);

export const EventFeedbackConfig = createTable(
  "event_feedback_config",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    eventId: t
      .uuid()
      .notNull()
      .unique()
      .references(() => Event.id, { onDelete: "cascade" }),
    formId: t
      .uuid()
      .notNull()
      .unique()
      .references(() => FormsSchemas.id, { onDelete: "restrict" }),
    closesAt: t.timestamp({ mode: "date", withTimezone: true }).notNull(),
    rewardPoints: t.integer().notNull().default(5),
    templateRevision: t.integer().notNull().default(1),
    customQuestions: t.jsonb().notNull().default([]),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  }),
  (t) => ({
    fivePointReward: check(
      "knight_hacks_event_feedback_config_reward_check",
      sql`${t.rewardPoints} = 5`,
    ),
  }),
);

export const EventFeedbackReward = createTable(
  "event_feedback_reward",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    eventId: t
      .uuid()
      .notNull()
      .references(() => Event.id, { onDelete: "restrict" }),
    memberId: t
      .uuid()
      .notNull()
      .references(() => Member.id, { onDelete: "restrict" }),
    responseId: t.uuid().references(() => FormResponse.id, {
      onDelete: "set null",
    }),
    pointsAwarded: t.integer().notNull().default(5),
    awardedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  }),
  (t) => ({
    uniqueEventMemberReward: unique(
      "knight_hacks_event_feedback_reward_event_member_unique",
    ).on(t.eventId, t.memberId),
    fivePoints: check(
      "knight_hacks_event_feedback_reward_points_check",
      sql`${t.pointsAwarded} = 5`,
    ),
  }),
);

export const FormAttachmentSchema = createInsertSchema(FormAttachment);
export const FormCallbackConfigurationSchema = createInsertSchema(
  FormCallbackConfiguration,
);
export const FormCallbackExecutionSchema = createInsertSchema(
  FormCallbackExecution,
);
export const EventFeedbackConfigSchema =
  createInsertSchema(EventFeedbackConfig);
export const EventFeedbackRewardSchema =
  createInsertSchema(EventFeedbackReward);

export const Issue = createTable(
  "issue",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    status: issueStatus().notNull(),
    name: t.text().notNull(),
    description: t.text().notNull(),
    links: t.text().array(),
    event: t.uuid().references(() => Event.id, { onDelete: "set null" }),
    discordThreadId: t.varchar({ length: 32 }),
    date: t.timestamp(),
    dueAt: t.timestamp({ mode: "date", withTimezone: true }),
    priority: issuePriority().notNull(),
    team: t
      .uuid()
      .notNull()
      .references(() => Roles.id, { onDelete: "restrict" }),
    creator: t
      .uuid()
      .notNull()
      .references(() => User.id, { onDelete: "restrict" }),
    parent: t.uuid(),
    revision: t.integer().notNull().default(1),
    archivedAt: t.timestamp({ mode: "date", withTimezone: true }),
    archivedBy: t.uuid().references(() => User.id, { onDelete: "set null" }),
    archiveBatchId: t.uuid(),
    creationKey: t.uuid(),
    creationHash: t.varchar({ length: 64 }),
    createdAt: t.timestamp().defaultNow().notNull(),
    updatedAt: t
      .timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  }),
  (table) => ({
    parentReference: foreignKey({
      columns: [table.parent],
      foreignColumns: [table.id],
      name: "issue_parent_fk",
    }).onDelete("set null"),
    teamIdx: index("issue_team_idx").on(table.team),
    creatorIdx: index("issue_creator_idx").on(table.creator),
    statusIdx: index("issue_status_idx").on(table.status),
    dateIdx: index("issue_date_idx").on(table.date),
    dueAtIdx: index("issue_due_at_idx").on(table.dueAt),
    archiveIdx: index("issue_archive_idx").on(
      table.archivedAt,
      table.archiveBatchId,
    ),
    creationKeyUnique: unique("knight_hacks_issue_creation_key_unique").on(
      table.creationKey,
    ),
    parentIdx: index("issue_parent_idx").on(table.parent),
    priorityIdx: index("issue_priority_idx").on(table.priority),
  }),
);

export const IssueSchema = createInsertSchema(Issue);

export const IssuesToTeamsVisibility = createTable(
  "issues_to_teams_visibility",
  (t) => ({
    issueId: t
      .uuid("issue_id")
      .notNull()
      .references(() => Issue.id, { onDelete: "cascade" }),
    teamId: t
      .uuid("team_id")
      .notNull()
      .references(() => Roles.id, { onDelete: "cascade" }),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.issueId, table.teamId] }),
  }),
);

export const IssuesToUsersAssignment = createTable(
  "issues_to_users_assignment",
  (t) => ({
    issueId: t
      .uuid("issue_id")
      .notNull()
      .references(() => Issue.id, { onDelete: "cascade" }),
    userId: t
      .uuid("user_id")
      .notNull()
      .references(() => User.id, { onDelete: "cascade" }),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.issueId, table.userId] }),
  }),
);

export const IssueHistory = createTable(
  "issue_history",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    issueId: t
      .uuid()
      .notNull()
      .references(() => Issue.id, { onDelete: "restrict" }),
    actorId: t.uuid().references(() => User.id, { onDelete: "set null" }),
    actorDisplayName: t.varchar({ length: 255 }).notNull(),
    action: t.varchar({ length: 64 }).notNull(),
    changedFields: t
      .text()
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    before: t.jsonb(),
    after: t.jsonb(),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  }),
  (table) => ({
    issueCreatedIdx: index("issue_history_issue_created_idx").on(
      table.issueId,
      table.createdAt,
      table.id,
    ),
  }),
);

export const IssueReminderDelivery = createTable(
  "issue_reminder_delivery",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    issueId: t
      .uuid()
      .notNull()
      .references(() => Issue.id, { onDelete: "restrict" }),
    dueAt: t.timestamp({ mode: "date", withTimezone: true }).notNull(),
    reminderKey: t.varchar({ length: 32 }).notNull(),
    destinationSnapshot: t.varchar({ length: 32 }).notNull(),
    contentSnapshot: t.text().notNull(),
    status: t.varchar({ length: 24 }).notNull().default("pending"),
    attemptCount: t.integer().notNull().default(0),
    lastError: t.text(),
    lockedAt: t.timestamp({ mode: "date", withTimezone: true }),
    deliveredAt: t.timestamp({ mode: "date", withTimezone: true }),
    nextAttemptAt: t.timestamp({ mode: "date", withTimezone: true }),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  }),
  (table) => ({
    deliveryIdentity: unique("issue_reminder_delivery_identity_unique").on(
      table.issueId,
      table.dueAt,
      table.reminderKey,
    ),
    pendingIdx: index("issue_reminder_delivery_pending_idx").on(
      table.status,
      table.nextAttemptAt,
    ),
  }),
);

export const Template = createTable(
  "template",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    name: t.text().notNull(),
    normalizedName: t.varchar({ length: 100 }),
    body: t.jsonb().notNull(),
    disabledAt: t.timestamp({ mode: "date", withTimezone: true }),
    disabledReason: t.text(),
    createdAt: t.timestamp().defaultNow().notNull(),
    updatedAt: t
      .timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  }),
  (table) => ({
    normalizedNameUnique: unique(
      "knight_hacks_template_normalized_name_unique",
    ).on(table.normalizedName),
  }),
);

export const InsertTemplateSchema = createInsertSchema(Template);

export const EmailTemplate = pgTable(
  "email_template",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    name: t.varchar({ length: 120 }).notNull(),
    normalizedName: t.varchar({ length: 120 }).notNull(),
    kind: t.text({ enum: ["code", "visual"] }).notNull(),
    /**
     * Which product this template writes for. Orthogonal to `kind`, which is
     * the authoring format.
     *
     * Declared by the author rather than derived from "is any hackathon
     * pointing at it", because a derived mark is empty while the template is
     * being written — exactly when the offered field list and the list badge
     * matter.
     *
     * Scopes the personalization catalog: a `hackathon` template is never
     * offered `member.*` or `team.*`, which come from a club member record. A
     * hacker need not be a club member, so those would render blank for the
     * people most likely to receive hackathon mail.
     *
     * Named `domain` rather than `audience` because the email portal already
     * uses "audience" for recipient targeting.
     */
    domain: t
      .text({ enum: ["club", "hackathon"] })
      .notNull()
      .default("club"),
    archivedAt: t.timestamp({ mode: "date", withTimezone: true }),
    createdBy: t
      .uuid()
      .notNull()
      .references(() => User.id, { onDelete: "restrict" }),
    updatedBy: t
      .uuid()
      .notNull()
      .references(() => User.id, { onDelete: "restrict" }),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  }),
  (table) => ({
    normalizedNameUnique: unique("email_template_normalized_name_unique").on(
      table.normalizedName,
    ),
    archivedIdx: index("email_template_archived_updated_idx").on(
      table.archivedAt,
      table.updatedAt,
    ),
  }),
);

/**
 * Which template and subject a hackathon sends when an applicant reaches a
 * status. Replaces a table of Listmonk template ids that lived in
 * `@forge/email` source, where adding a hackathon meant a deploy.
 *
 * One row per `(hackathon, status)`. Six statuses send; `checkedin` does not,
 * which the CHECK enforces rather than leaving to the caller.
 *
 * `templateId` points at the template, not at a revision, so editing a template
 * changes what future applicants receive and leaves sent mail alone — what an
 * officer expects from "fix a typo in the acceptance email". `restrict` means a
 * template in use cannot be deleted out from under a hackathon; note that
 * `EmailTemplate.archivedAt` is a soft delete no foreign key can catch, so
 * archival has to be refused in the procedure.
 *
 * `subject` lives here rather than on the template because subjects change far
 * more often than bodies, and keeping it beside the template pointer is what
 * stops a subject drifting away from the mail it heads.
 */
export const HackathonStatusEmail = createTable(
  "hackathon_status_email",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    hackathonId: t
      .uuid()
      .notNull()
      .references(() => Hackathon.id, { onDelete: "cascade" }),
    status: t.text({ enum: FORMS.HACKATHON_APPLICATION_STATES }).notNull(),
    templateId: t
      .uuid()
      .notNull()
      .references(() => EmailTemplate.id, { onDelete: "restrict" }),
    subject: t.varchar({ length: 200 }).notNull(),
  }),
  (table) => ({
    oneTemplatePerStatus: unique(
      "knight_hacks_hackathon_status_email_hackathon_status_unique",
    ).on(table.hackathonId, table.status),
    // Checking in sends no mail, so a row for it is meaningless rather than
    // merely unused.
    sendingStatusOnly: check(
      "knight_hacks_hackathon_status_email_status_check",
      sql`${table.status} <> 'checkedin'`,
    ),
  }),
);

export type InsertHackathonStatusEmail =
  typeof HackathonStatusEmail.$inferInsert;
export type SelectHackathonStatusEmail =
  typeof HackathonStatusEmail.$inferSelect;

export const EmailTemplateRevision = pgTable(
  "email_template_revision",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    templateId: t
      .uuid()
      .notNull()
      .references(() => EmailTemplate.id, { onDelete: "restrict" }),
    version: t.integer().notNull(),
    state: t
      .text({ enum: ["draft", "published", "superseded"] })
      .notNull()
      .default("draft"),
    source: t.text(),
    visualDocument: t.jsonb(),
    compiledHtml: t.text(),
    compiledText: t.text(),
    personalizationContract: t.jsonb().notNull().default([]),
    checksum: t.varchar({ length: 64 }),
    createdBy: t
      .uuid()
      .notNull()
      .references(() => User.id, { onDelete: "restrict" }),
    publishedAt: t.timestamp({ mode: "date", withTimezone: true }),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  }),
  (table) => ({
    templateVersionUnique: unique(
      "email_template_revision_template_version_unique",
    ).on(table.templateId, table.version),
    templateStateIdx: index("email_template_revision_template_state_idx").on(
      table.templateId,
      table.state,
      table.version,
    ),
  }),
);

export const EmailSend = pgTable(
  "email_send",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    subject: t.varchar({ length: 200 }).notNull(),
    templateRevisionId: t
      .uuid()
      .references(() => EmailTemplateRevision.id, { onDelete: "restrict" }),
    plainTextSource: t.text(),
    compiledHtml: t.text(),
    compiledText: t.text().notNull(),
    contentHash: t.varchar({ length: 64 }).notNull(),
    audienceDefinition: t.jsonb().notNull(),
    audienceVersion: t.integer().notNull().default(1),
    audienceHash: t.varchar({ length: 64 }).notNull(),
    previewVersion: t.varchar({ length: 80 }).notNull(),
    previewExpiresAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull(),
    rawMatchCount: t.integer().notNull().default(0),
    duplicateCount: t.integer().notNull().default(0),
    excludedInvalidCount: t.integer().notNull().default(0),
    excludedSuppressedCount: t.integer().notNull().default(0),
    excludedMissingFieldCount: t.integer().notNull().default(0),
    excludedManualCount: t.integer().notNull().default(0),
    finalRecipientCount: t.integer().notNull().default(0),
    status: t
      .text({
        enum: [
          "draft",
          "queued",
          "syncing",
          "scheduled",
          "running",
          "completed",
          "cancelled",
          "failed",
        ],
      })
      .notNull()
      .default("draft"),
    scheduledFor: t.timestamp({ mode: "date", withTimezone: true }),
    listmonkListId: t.integer(),
    listmonkCampaignId: t.integer(),
    providerTag: t.varchar({ length: 80 }).notNull(),
    providerMayHaveStarted: t.boolean().notNull().default(false),
    providerSentCount: t.integer().notNull().default(0),
    providerBounceCount: t.integer().notNull().default(0),
    retryAttemptCount: t.integer().notNull().default(0),
    retryLeaseExpiresAt: t.timestamp({ mode: "date", withTimezone: true }),
    nextRetryAt: t.timestamp({ mode: "date", withTimezone: true }),
    safeError: t.varchar({ length: 500 }),
    createdBy: t
      .uuid()
      .notNull()
      .references(() => User.id, { onDelete: "restrict" }),
    confirmedAt: t.timestamp({ mode: "date", withTimezone: true }),
    cancelledAt: t.timestamp({ mode: "date", withTimezone: true }),
    cancelledBy: t.uuid().references(() => User.id, { onDelete: "set null" }),
    terminalAt: t.timestamp({ mode: "date", withTimezone: true }),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  }),
  (table) => ({
    providerTagUnique: unique("email_send_provider_tag_unique").on(
      table.providerTag,
    ),
    dueIdx: index("email_send_status_scheduled_for_idx").on(
      table.status,
      table.scheduledFor,
    ),
    retryIdx: index("email_send_retry_idx").on(
      table.status,
      table.nextRetryAt,
      table.retryLeaseExpiresAt,
    ),
  }),
);

export const EmailSendRecipient = pgTable(
  "email_send_recipient",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    sendId: t
      .uuid()
      .notNull()
      .references(() => EmailSend.id, { onDelete: "cascade" }),
    email: t.varchar({ length: 320 }).notNull(),
    normalizedEmail: t.varchar({ length: 320 }).notNull(),
    attributes: t.jsonb().notNull().default({}),
    matchReasons: t
      .text()
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    exclusionReason: t.varchar({ length: 64 }),
    listmonkSubscriberId: t.integer(),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  }),
  (table) => ({
    sendEmailUnique: unique(
      "email_send_recipient_send_id_normalized_email_unique",
    ).on(table.sendId, table.normalizedEmail),
    sendIdx: index("email_send_recipient_send_id_idx").on(
      table.sendId,
      table.exclusionReason,
    ),
  }),
);

export const EmailSendEvent = pgTable(
  "email_send_event",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    sendId: t
      .uuid()
      .notNull()
      .references(() => EmailSend.id, { onDelete: "restrict" }),
    type: t.varchar({ length: 64 }).notNull(),
    fromStatus: t.varchar({ length: 32 }),
    toStatus: t.varchar({ length: 32 }),
    actorId: t.uuid().references(() => User.id, { onDelete: "set null" }),
    metadata: t.jsonb().notNull().default({}),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  }),
  (table) => ({
    sendCreatedIdx: index("email_send_event_send_created_idx").on(
      table.sendId,
      table.createdAt,
      table.id,
    ),
  }),
);
