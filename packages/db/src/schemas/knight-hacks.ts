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
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import z from "zod";

import { CAREER, EVENTS, FORMS, GUILD, ISSUE } from "@forge/consts";

import { Roles, User } from "./auth";

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
    applicationBackgroundEnabled: t.boolean().notNull().default(false),
    applicationBackgroundKey: t.varchar({ length: 255 }),
    emailTemplateEnabled: t.boolean().notNull().default(false),
    emailTemplateKey: t.varchar({ length: 255 }),
    applicationOpen: t.timestamp().notNull().defaultNow(),
    applicationDeadline: t.timestamp().notNull().defaultNow(),
    confirmationDeadline: t.timestamp().notNull().defaultNow(),
    startDate: t.timestamp().notNull(),
    endDate: t.timestamp().notNull(),
  }),
  (t) => ({
    uniqueName: unique("knight_hacks_hackathon_name_unique").on(t.name),
  }),
);

export type InsertHackathon = typeof Hackathon.$inferInsert;
export type SelectHackathon = typeof Hackathon.$inferSelect;

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
  school: t.text({ enum: FORMS.SCHOOLS }).notNull(),
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
    normalizedName: t.varchar({ length: 64 }).notNull().unique(),
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
    discordChannelId: t.varchar({ length: 255 }),
    // Old Blade writers omit Reforge workflow fields. Defaulting those writes
    // to Legacy keeps mixed-version deploys and rollbacks safe; Reforge creates
    // explicitly persist legacy=false.
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
    validTagColor: check(
      "knight_hacks_event_tag_color_check",
      sql`${table.tagColor} ~ '^#[0-9A-Fa-f]{6}$'`,
    ),
    validSyncRevision: check(
      "knight_hacks_event_sync_revision_check",
      sql`${table.syncRevision} >= 0`,
    ),
    validNewClubPoints: check(
      "knight_hacks_event_new_club_points_check",
      sql`${table.legacy} OR ${table.hackathonId} IS NOT NULL OR (${table.points} IS NOT NULL AND ${table.points} >= 0)`,
    ),
    nonLegacySyncStates: check(
      "knight_hacks_event_nonlegacy_sync_states_check",
      sql`${table.legacy} OR (${table.discordSyncState} IS NOT NULL AND ${table.googleSyncState} IS NOT NULL)`,
    ),
    creationIdentityPair: check(
      "knight_hacks_event_creation_identity_pair_check",
      sql`(${table.creationKey} IS NULL) = (${table.creationPayloadHash} IS NULL)`,
    ),
    newClubCreationIdentity: check(
      "knight_hacks_event_new_club_creation_identity_check",
      sql`${table.legacy} OR ${table.hackathonId} IS NOT NULL OR (${table.creationKey} IS NOT NULL AND ${table.creationPayloadHash} IS NOT NULL)`,
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

export const HACKER_TEAMS = ["Humanity", "Monstrosity"] as const;
export const HACKER_CLASSES = [
  "Operator",
  "Mechanist",
  "Sentinel",
  "Harbinger",
  "Monstologist",
  "Alchemist",
] as const;
export const SPECIAL_HACKER_CLASSES = ["VIP"] as const;
export const HACKER_CLASSES_ALL = [
  ...HACKER_CLASSES,
  ...SPECIAL_HACKER_CLASSES,
] as const;
export type HackerClass = (typeof HACKER_CLASSES_ALL)[number];
export type RepeatPolicy = "none" | "all" | "class";
export const AssignedClassCheckinSchema = z.union([
  z.literal("All"),
  z.enum(HACKER_CLASSES),
]);

export const HackerAttendee = createTable("hacker_attendee", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  hackerId: t
    .uuid()
    .notNull()
    .references(() => Hacker.id, {
      onDelete: "cascade",
    }),
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
  class: t.varchar({ length: 20 }).$type<HackerClass | null>().default(null),
}));

export const HackerEventAttendee = createTable(
  "hacker_event_attendee",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    hackerAttId: t
      .uuid()
      .notNull()
      .references(() => HackerAttendee.id, {
        onDelete: "cascade",
      }),
    hackathonId: t
      .uuid()
      .notNull()
      .references(() => Hackathon.id, {
        onDelete: "cascade",
      }),
    eventId: t
      .uuid()
      .notNull()
      .references(() => Event.id, {
        onDelete: "cascade",
      }),
  }),
);

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
    finalizedAt: t.timestamp({ mode: "date", withTimezone: true }),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  }),
  (t) => ({
    formIdx: index("knight_hacks_form_attachment_form_idx").on(t.formId),
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
