import { pgEnum, pgTableCreator } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

import {
  ETHNICITIES,
  GENDERS,
  HACKATHON_APPLICATION_STATES,
  LEVELS_OF_STUDY,
  MAJORS,
  SCHOOLS,
  SHIRT_SIZES,
  SPONSOR_TIERS,
} from "@blade/consts/knight-hacks";

import { User } from "./auth";

const createTable = pgTableCreator((name) => `knight_hacks_${name}`);

export const shirtSizeEnum = pgEnum("shirt_size", SHIRT_SIZES);
export const genderEnum = pgEnum("gender", GENDERS);
export const ethnicityEnum = pgEnum("ethnicity", ETHNICITIES);
export const majorEnum = pgEnum("major", MAJORS);
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

export const Member = createTable("member", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  userId: t
    .uuid()
    .notNull()
    .references(() => User.id, { onDelete: "cascade" }),
  firstName: t.varchar({ length: 255 }).notNull(),
  lastName: t.varchar({ length: 255 }).notNull(),
  email: t.varchar({ length: 255 }).notNull(),
  phoneNumber: t.varchar({ length: 255 }).notNull(),
  addressLine1: t.varchar({ length: 255 }).notNull(),
  addressLine2: t.varchar({ length: 255 }),
  city: t.varchar({ length: 255 }).notNull(),
  state: t.varchar({ length: 255 }).notNull(),
  zipCode: t.varchar({ length: 255 }).notNull(),
  githubProfileUrl: t.varchar({ length: 255 }),
  linkedinProfileUrl: t.varchar({ length: 255 }),
  resumeUrl: t.varchar({ length: 255 }),
  websiteUrl: t.varchar({ length: 255 }),
  age: t.integer().notNull(),
  shirtSize: shirtSizeEnum().notNull(),
  gender: genderEnum().notNull(),
  // Enum values exceed 63 bytes, so we need to use varchar instead of a pgEnum
  levelOfStudy: t.varchar({ length: 255, enum: LEVELS_OF_STUDY }).notNull(),
  ethnicity: ethnicityEnum().notNull(),
  major: majorEnum().notNull(),
  // Like levelOfStudy, enum values exceed 63 bytes (some schools have REALLY long names)
  school: t.text({ enum: SCHOOLS }).notNull(),
}));

export const InsertMemberSchema = createInsertSchema(Member);

export const HackathonApplication = createTable(
  "hackaton_application",
  (t) => ({
    memberId: t
      .uuid()
      .notNull()
      .references(() => Member.id, {
        onDelete: "cascade",
      }),
    hackathonId: t
      .uuid()
      .notNull()
      .references(() => Hackathon.id, {
        onDelete: "cascade",
      }),
    state: t
      .varchar({ length: 255, enum: HACKATHON_APPLICATION_STATES })
      .notNull(),
    // Dynamic json fields (e.g. survey responses)
    survey: t.jsonb().notNull(),
  }),
);

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
  name: t.varchar({ length: 255 }).notNull(),
  description: t.text().notNull(),
  datetime: t.timestamp().notNull(),
  // Can be null if the event is not associated with a hackathon (e.g. club events)
  hackathonId: t.uuid().references(() => Hackathon.id, {
    onDelete: "cascade",
  }),
}));

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
