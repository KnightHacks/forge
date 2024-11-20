import { pgEnum, pgTableCreator, unique } from "drizzle-orm/pg-core";
import { z } from "zod";

import {
  DIFFICULTIES,
  LOWERCASE_DIFFICULTIES,
  POINTS,
  PROBLEM_NUMBERS,
  SECTIONS,
  TOPICS,
} from "@blade/consts/feprep";

import { User } from "./auth";

const createTable = pgTableCreator((name) => `feprep_${name}`);

export const points = pgEnum("points", POINTS);
export const sections = pgEnum("section", SECTIONS);
export const topics = pgEnum("topic", TOPICS);
export const problemNumbers = pgEnum("problem_number", PROBLEM_NUMBERS);
export const difficulties = pgEnum("difficulties", DIFFICULTIES);
export const lowercaseDifficulties = pgEnum(
  "lowercase_difficulties",
  LOWERCASE_DIFFICULTIES,
);

export const Problem = createTable("problem", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  title: t
    .varchar("title", {
      length: 255,
    })
    .notNull(),
  pdf_url: t.text("pdf_url").notNull(),
  average_score: t.doublePrecision().notNull(),
  points: points().notNull(),
  section: sections().notNull(),
  topic: topics().notNull(),
  problemNumber: problemNumbers().notNull(),
  easyVotes: t.integer("easy_votes").notNull().default(0),
  mediumVotes: t.integer("medium_votes").notNull().default(0),
  hardVotes: t.integer("hard_votes").notNull().default(0),
}));

export const Resources = createTable("resource", (t) => ({
  id: t.serial().primaryKey(),
  topic: pgEnum("topic", TOPICS)().notNull(),
  url: t.text("url").notNull(),
  isVideo: t.boolean("is_video").notNull(),
}));

export const Comment = createTable("comment", (t) => ({
  id: t
    .varchar("id", { length: 255 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  problemId: t.integer().notNull(),
  userId: t
    .uuid()
    .notNull()
    .references(() => User.id, { onDelete: "cascade" }),
  text: t.text("text").notNull(),
  createdAt: t.timestamp("created_at").defaultNow().notNull(),
  updatedAt: t
    .timestamp("updated_at", { mode: "date" })
    .$onUpdate(() => new Date()),
  parentCommentId: t.text(),
}));

export const CreateCommentSchema = z.object({
  problemId: z.number(),
  userId: z.string(),
  text: z.string(),
  parentCommentId: z.string().optional(),
});

export const UpdateCommentSchema = z.object({
  commentId: z.string(),
  text: z.string(),
});

export const Vote = createTable(
  "vote",
  (t) => ({
    id: t
      .varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: t
      .uuid()
      .notNull()
      .references(() => User.id, { onDelete: "cascade" }),
    problemId: t
      .uuid()
      .notNull()
      .references(() => Problem.id, {
        onDelete: "cascade",
      }),
    vote: lowercaseDifficulties().notNull(),
  }),
  (t) => ({
    unique: unique("vote_unique_idx").on(t.userId, t.problemId),
  }),
);
