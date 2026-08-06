import { z } from "zod";

import { HACKER_PARTICIPANT_V1_SCHEMAS } from "@forge/hacker-sdk";

const submitApplicationSchema =
  HACKER_PARTICIPANT_V1_SCHEMAS.input.submitApplication;
const sharedProfileSchema = submitApplicationSchema.shape.profile;
const optionalUrlSchema = sharedProfileSchema.shape.githubProfileUrl
  .unwrap()
  .or(z.literal(""));

const resumeUploadSchema = z
  .custom<FileList>(
    (value) => typeof FileList !== "undefined" && value instanceof FileList,
    "Choose a PDF resume.",
  )
  .superRefine((files, context) => {
    if (files.length === 0) return;
    if (files.length !== 1) {
      context.addIssue({ code: "custom", message: "Choose one PDF resume." });
      return;
    }
    const file = files[0];
    if (file?.type !== "application/pdf") {
      context.addIssue({ code: "custom", message: "Resume must be a PDF." });
    } else if (file.size > 5_000_000) {
      context.addIssue({
        code: "custom",
        message: "Resume must be 5 MB or smaller.",
      });
    }
  })
  .optional();

export const portalFormSchema = z.object({
  firstName: sharedProfileSchema.shape.firstName,
  lastName: sharedProfileSchema.shape.lastName,
  email: sharedProfileSchema.shape.email,
  phoneNumber: sharedProfileSchema.shape.phoneNumber,
  country: sharedProfileSchema.shape.country,
  school: sharedProfileSchema.shape.school,
  levelOfStudy: sharedProfileSchema.shape.levelOfStudy,
  major: sharedProfileSchema.shape.major,
  gender: sharedProfileSchema.shape.gender.optional(),
  raceOrEthnicity: sharedProfileSchema.shape.raceOrEthnicity.optional(),
  shirtSize: sharedProfileSchema.shape.shirtSize,
  dob: sharedProfileSchema.shape.dob,
  gradDate: sharedProfileSchema.shape.gradDate,
  survey1: submitApplicationSchema.shape.survey1,
  survey2: submitApplicationSchema.shape.survey2,
  isFirstTime: z.boolean(),
  foodAllergies: sharedProfileSchema.shape.foodAllergies
    .unwrap()
    .or(z.literal("")),
  githubProfileUrl: optionalUrlSchema,
  linkedinProfileUrl: optionalUrlSchema,
  websiteUrl: optionalUrlSchema,
  resumeUrl: z.string(),
  resumeUpload: resumeUploadSchema,
  agreesToMLHCodeOfConduct: z.boolean(),
  agreesToMLHDataSharing: z.boolean(),
  agreesToReceiveEmailsFromMLH: z.boolean(),
});

export type HackerApplicationFormValues = z.output<typeof portalFormSchema>;
export type HackerProfileFormValues = HackerApplicationFormValues;
export type PortalApplicationInput = HackerApplicationFormValues;
