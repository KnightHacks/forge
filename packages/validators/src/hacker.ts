import { z } from "zod";

import { FORMS } from "@forge/consts";

const optionalUrl = z.union([z.literal(""), z.string().url()]).optional();
const requiredAgreement = z
  .boolean()
  .refine((value) => value, "This agreement is required.");

export const hackerApplicationWireSchema = z.object({
  firstName: z.string().trim().min(1).max(255),
  lastName: z.string().trim().min(1).max(255),
  email: z.string().email().max(255),
  phoneNumber: z.string().max(255),
  country: z.enum(FORMS.COUNTRIES),
  school: z.enum(FORMS.SCHOOLS),
  major: z.enum(FORMS.MAJORS),
  levelOfStudy: z.enum(FORMS.LEVELS_OF_STUDY),
  gender: z.enum(FORMS.GENDERS).default("Prefer not to answer"),
  raceOrEthnicity: z
    .enum(FORMS.RACES_OR_ETHNICITIES)
    .default("Prefer not to answer"),
  shirtSize: z.enum(FORMS.SHIRT_SIZES),
  githubProfileUrl: optionalUrl,
  linkedinProfileUrl: optionalUrl,
  websiteUrl: optionalUrl,
  resumeUrl: z.string().nullable().optional(),
  dob: z.string().min(1),
  gradDate: z.string().min(1),
  survey1: z.string().min(1),
  survey2: z.string().min(1),
  isFirstTime: z.boolean().default(false),
  foodAllergies: z.string().nullable().optional(),
  agreesToReceiveEmailsFromMLH: z.boolean().default(false),
  agreesToMLHCodeOfConduct: requiredAgreement,
  agreesToMLHDataSharing: requiredAgreement,
});

export type HackerApplicationWireInput = z.input<
  typeof hackerApplicationWireSchema
>;
export type HackerApplicationWireData = z.output<
  typeof hackerApplicationWireSchema
>;
