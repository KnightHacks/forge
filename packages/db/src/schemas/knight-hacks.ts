import { relations } from "drizzle-orm";
import { pgEnum, pgTableCreator, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

import {
  EVENT_FEEDBACK_HEARD,
  EVENT_FEEDBACK_SIMILAR_EVENT,
  EVENT_TAGS,
  GENDERS,
  HACKATHON_APPLICATION_STATES,
  LEVELS_OF_STUDY,
  RACES_OR_ETHNICITIES,
  SCHOOLS,
  SHIRT_SIZES,
  SPONSOR_TIERS,
} from "@forge/consts/knight-hacks";

import { User } from "./auth";

const createTable = pgTableCreator((name) => `knight_hacks_${name}`);

export const shirtSizeEnum = pgEnum("shirt_size", SHIRT_SIZES);
export const eventTagEnum = pgEnum("event_tag", EVENT_TAGS);
export const genderEnum = pgEnum("gender", GENDERS);
export const raceOrEthnicityEnum = pgEnum(
  "race_or_ethnicity",
  RACES_OR_ETHNICITIES,
);
export const sponsorTierEnum = pgEnum("sponsor_tier", SPONSOR_TIERS);
export const hackathonApplicationStateEnum = pgEnum(
  "hackathon_application_state",
  HACKATHON_APPLICATION_STATES,
);

export const Hackathon = createTable("hackathon", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  name: t.varchar({ length: 255 }).notNull(),
  theme: t.varchar({ length: 255 }).notNull(),
  startDate: t.timestamp().notNull(),
  endDate: t.timestamp().notNull(),
}));

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
    school: t.text({ enum: SCHOOLS }).notNull(),
    levelOfStudy: t.text({ enum: LEVELS_OF_STUDY }).notNull(),
    gender: genderEnum().default("Prefer not to answer").notNull(),
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
    points: t.integer().notNull().default(0),
    dateCreated: t.date().notNull().defaultNow(),
    timeCreated: t.time().notNull().defaultNow(),
  }),
  (t) => ({
    uniqueEmail: unique().on(t.email),
    uniquePhoneNumber: unique().on(t.phoneNumber),
  }),
);

export const Hacker = createTable(
  "hacker",
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
    school: t.text({ enum: SCHOOLS }).notNull(),
    levelOfStudy: t.text({ enum: LEVELS_OF_STUDY }).notNull(),
    raceOrEthnicity: raceOrEthnicityEnum()
      .default("Prefer not to answer")
      .notNull(),
    shirtSize: shirtSizeEnum().notNull(),
    githubProfileUrl: t.varchar({ length: 255 }),
    linkedinProfileUrl: t.varchar({ length: 255 }),
    websiteUrl: t.varchar({ length: 255 }),
    resumeUrl: t.varchar({ length: 255 }),
    dob: t.date().notNull(),
    status: t.text("status", {
      enum: HACKATHON_APPLICATION_STATES,
    }),
    survey1: t.text("survey_1").notNull(),
    survey2: t.text("survey_2").notNull(),
    isFirstTime: t.boolean("is_first_time").default(false),
    agreesToReceiveEmailsFromMLH: t
      .boolean("agrees_to_receive_emails_from_mlh")
      .default(false),
    dateCreated: t.date().notNull().defaultNow(),
    timeCreated: t.time().notNull().defaultNow(),
  }),
  (t) => ({
    uniqueEmail: unique().on(t.email),
    uniquePhoneNumber: unique().on(t.phoneNumber),
  }),
);

export type InsertMember = typeof Member.$inferInsert;
export type SelectMember = typeof Member.$inferSelect;

export const MemberRelations = relations(Member, ({ one }) => ({
  user: one(User, { fields: [Member.userId], references: [User.id] }),
}));

export const InsertMemberSchema = createInsertSchema(Member);

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

export const Event = createTable("event", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  discordId: t.varchar({ length: 255 }).notNull(),
  googleId: t.varchar({ length: 255 }).notNull(),
  name: t.varchar({ length: 255 }).notNull(),
  tag: eventTagEnum().notNull(),
  description: t.text().notNull(),
  start_datetime: t.timestamp().notNull(),
  end_datetime: t.timestamp().notNull(),
  location: t.varchar({ length: 255 }).notNull(),
  dues_paying: t.boolean().notNull().default(false),
  points: t.integer(),
  // Can be null if the event is not associated with a hackathon (e.g. club events)
  hackathonId: t.uuid().references(() => Hackathon.id, {
    onDelete: "cascade",
  }),
}));

export type InsertEvent = typeof Event.$inferInsert;
export type SelectEvent = typeof Event.$inferSelect;
export type ReturnEvent = InsertEvent & {
  numAttended: number;
};

export const InsertEventSchema = createInsertSchema(Event);

export const EventAttendee = createTable("event_attendee", (t) => ({
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
}));

export const HackerAttendee = createTable("hacker_attendee", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  hackerId: t
    .uuid()
    .notNull()
    .references(() => Member.id, {
      onDelete: "cascade",
    }),
  hackathonId: t
    .uuid()
    .notNull()
    .references(() => Event.id, {
      onDelete: "cascade",
    }),
}));

export const InsertEventAttendeeSchema = createInsertSchema(EventAttendee);

export const DuesPayment = createTable("dues_payment", (t) => ({
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
}));

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
  heardAboutUs: t.text({ enum: EVENT_FEEDBACK_HEARD }).notNull(),
  additionalFeedback: t.text(),
  similarEvent: t.text({ enum: EVENT_FEEDBACK_SIMILAR_EVENT }).notNull(),
  createdAt: t.timestamp().notNull().defaultNow(),
}));

export const InsertEventFeedbackSchema = createInsertSchema(EventFeedback);
