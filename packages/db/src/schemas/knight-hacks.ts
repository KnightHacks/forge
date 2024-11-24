import { pgEnum, pgTableCreator } from "drizzle-orm/pg-core";

import {
  ETHNICITIES,
  GENDERS,
  LEVELS_OF_STUDY,
  MAJORS,
  SCHOOLS,
  SHIRT_SIZES,
} from "@blade/consts/knight-hacks";

import { User } from "./auth";

const createTable = pgTableCreator((name) => `knight_hacks_${name}`);

const shirtSizeEnum = pgEnum("shirt_size", SHIRT_SIZES);
const genderEnum = pgEnum("gender", GENDERS);
const ethnicityEnum = pgEnum("ethnicity", ETHNICITIES);
const levelOfStudyEnum = pgEnum("level_of_study", LEVELS_OF_STUDY);
const majorEnum = pgEnum("major", MAJORS);
const schoolEnum = pgEnum("school", SCHOOLS);

export const Profile = createTable("profile", (t) => ({
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
  age: t.integer().notNull(),
  shirtSize: shirtSizeEnum().notNull(),
  gender: genderEnum().notNull(),
  levelOfStudy: levelOfStudyEnum().notNull(),
  ethnicity: ethnicityEnum().notNull(),
  major: majorEnum().notNull(),
  school: schoolEnum().notNull(),
  githubProfileUrl: t.varchar({ length: 255 }),
  linkedinProfileUrl: t.varchar({ length: 255 }),
  resumeUrl: t.varchar({ length: 255 }),
}));
