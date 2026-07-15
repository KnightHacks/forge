import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  pgEnum,
  pgTableCreator,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import z from "zod";

import { EVENTS, FORMS, ISSUE } from "@forge/consts";

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
    company: t.varchar({ length: 255 }),
    points: t.integer().notNull().default(0),
    dateCreated: t.date().notNull().defaultNow(),
    timeCreated: t.time().notNull().defaultNow(),
  }),
  (t) => ({
    uniqueEmail: unique().on(t.email),
    uniquePhoneNumber: unique().on(t.phoneNumber),
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

export const InsertFormSectionSchema = createInsertSchema(FormSections);

export const FormsSchemas = createTable("form_schemas", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  name: t.varchar({ length: 255 }).notNull(),
  slugName: t.varchar({ length: 255 }).notNull().unique(),
  createdAt: t.timestamp().notNull().defaultNow(),
  duesOnly: t.boolean().notNull().default(false),
  allowResubmission: t.boolean().notNull().default(false),
  allowEdit: t.boolean().notNull().default(false),
  formData: t.jsonb().notNull(),
  formValidatorJson: t.jsonb().notNull(),
  section: t.varchar({ length: 255 }).notNull().default("General"),
  sectionId: t
    .uuid()
    .references(() => FormSections.id, { onDelete: "set null" }),
  isClosed: t.boolean().notNull().default(false),
}));

export type Form = typeof FormsSchemas.$inferSelect;
//Ts so dumb
export const FormSchemaSchema = createInsertSchema(FormsSchemas);

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

export const FormResponse = createTable("form_response", (t) => ({
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
  createdAt: t.timestamp().notNull().defaultNow(),
  editedAt: t.timestamp().notNull().defaultNow(),
}));

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

export const Template = createTable("template", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  name: t.text().notNull(),
  body: t.jsonb().notNull(),
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t
    .timestamp()
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}));

export const InsertTemplateSchema = createInsertSchema(Template);
