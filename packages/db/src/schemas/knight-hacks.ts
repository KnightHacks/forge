import { relations } from "drizzle-orm";
import {
  pgEnum,
  pgTableCreator,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import z from "zod";

import { EVENTS, FORMS } from "@forge/consts";

import { Roles, User } from "./auth";

const createTable = pgTableCreator((name) => `knight_hacks_${name}`);

export const shirtSizeEnum = pgEnum("shirt_size", FORMS.SHIRT_SIZES);
export const eventTagEnum = pgEnum("event_tag", EVENTS.EVENT_TAGS);
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

export const Hackathon = createTable("hackathon", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  name: t.varchar({ length: 255 }).notNull(),
  displayName: t.varchar({ length: 255 }).notNull().default(""),
  theme: t.varchar({ length: 255 }).notNull(),
  applicationOpen: t.timestamp().notNull().defaultNow(),
  applicationDeadline: t.timestamp().notNull().defaultNow(),
  confirmationDeadline: t.timestamp().notNull().defaultNow(),
  startDate: t.timestamp().notNull(),
  endDate: t.timestamp().notNull(),
}));

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
  phoneNumber: t.varchar({ length: 255 }),
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

export const MemberRelations = relations(Member, ({ one }) => ({
  user: one(User, { fields: [Member.userId], references: [User.id] }),
}));

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
  numHackerAttended: number;
};

export const InsertEventSchema = createInsertSchema(Event).extend({
  hackathonName: z.string().nullable().optional(),
});

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
}));

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
