"use client";

import { z } from "zod";

import { FORMS, MINIO } from "@forge/consts";
import { hackerApplicationWireSchema } from "@forge/validators";

import type { PortalApplicationContext } from "./types";

function calculateAge(birthDate: Date, referenceDate: Date) {
  let age = referenceDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = referenceDate.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

function createResumeUploadSchema() {
  return z
    .custom<FileList>(
      (value) => typeof FileList !== "undefined" && value instanceof FileList,
      "Resume upload must be a browser file selection",
    )
    .superRefine((fileList, ctx) => {
      if (fileList.length !== 0 && fileList.length !== 1) {
        ctx.addIssue({
          code: "custom",
          message: "Only 0 or 1 files allowed",
        });
      }

      if (fileList.length !== 1) return;
      const file = fileList[0];
      if (typeof File === "undefined" || !(file instanceof File)) {
        ctx.addIssue({
          code: "custom",
          message: "Object in FileList is undefined",
        });
        return;
      }

      if (file.name.split(".").pop()?.toLowerCase() !== "pdf") {
        ctx.addIssue({
          code: "custom",
          message: "Resume must be a PDF",
        });
      }

      if (file.size > MINIO.MAX_RESUME_SIZE) {
        ctx.addIssue({
          code: "too_big",
          origin: "number",
          maximum: MINIO.MAX_RESUME_SIZE,
          inclusive: true,
          message: "File too large: maximum 5MB",
        });
      }
    })
    .optional();
}

export function createHackerApplicationClientSchema(
  hackathonStartDate: string,
) {
  return hackerApplicationWireSchema.extend({
    firstName: z.string().min(1, "Required"),
    lastName: z.string().min(1, "Required"),
    email: z.string().email("Invalid email").min(1, "Required"),
    phoneNumber: z
      .string()
      .min(1, "Required")
      .regex(/^\d{10}$|^\d{3}-\d{3}-\d{4}$/, "Invalid phone number"),
    country: z.enum(FORMS.COUNTRIES, { error: "Select your country" }),
    school: z.enum(FORMS.SCHOOLS, { error: "Select a school" }),
    levelOfStudy: z.enum(FORMS.LEVELS_OF_STUDY, {
      error: "Select your level of study",
    }),
    major: z.enum(FORMS.MAJORS, { error: "Select a major" }),
    gender: z
      .enum(FORMS.GENDERS, { error: "Select a valid gender" })
      .optional(),
    raceOrEthnicity: z
      .enum(FORMS.RACES_OR_ETHNICITIES, {
        error: "Select a valid race or ethnicity",
      })
      .optional(),
    shirtSize: z.enum(FORMS.SHIRT_SIZES, {
      error: "Select your shirt size",
    }),
    dob: z
      .string()
      .pipe(z.coerce.date())
      .refine(
        (date) => calculateAge(date, new Date(hackathonStartDate)) >= 18,
        {
          message:
            "You must be at least 18 years old by the hackathon start date to participate",
        },
      )
      .transform((date) => date.toISOString()),
    gradDate: z
      .string()
      .pipe(z.coerce.date())
      .transform((date) => date.toISOString()),
    survey1: z.string().min(1, "Required"),
    survey2: z.string().min(1, "Required"),
    isFirstTime: z.boolean(),
    githubProfileUrl: z
      .string()
      .regex(/^https:\/\/.+/, "Invalid URL: Please try again with https://")
      .regex(
        /^https:\/\/(www\.)?github\.com\/.+/,
        "Invalid URL: Enter a valid GitHub link",
      )
      .url({ message: "Invalid URL" })
      .optional()
      .or(z.literal("")),
    linkedinProfileUrl: z
      .string()
      .regex(/^https:\/\/.+/, "Invalid URL: Please try again with https://")
      .regex(
        /^https:\/\/(www\.)?linkedin\.com\/.+/,
        "Invalid URL: Enter a valid LinkedIn link",
      )
      .regex(
        /^https:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?$/,
        "Invalid URL: Do not use a mobile URL/excessively long URL",
      )
      .url({ message: "Invalid URL" })
      .optional()
      .or(z.literal("")),
    websiteUrl: z
      .string()
      .regex(
        /^https?:\/\/.+/,
        "Invalid URL: Please try again with https:// or http://",
      )
      .url({ message: "Invalid URL" })
      .optional()
      .or(z.literal("")),
    resumeUpload: createResumeUploadSchema(),
    agreesToMLHCodeOfConduct: z.boolean().refine((value) => value, {
      message: "You must agree to the MLH Code of Conduct",
    }),
    agreesToMLHDataSharing: z.boolean().refine((value) => value, {
      message: "You must agree to the MLH data sharing terms",
    }),
    agreesToReceiveEmailsFromMLH: z.boolean(),
  });
}

export function createHackerProfileClientSchema() {
  return hackerApplicationWireSchema.extend({
    firstName: z.string().min(1, "Required"),
    lastName: z.string().min(1, "Required"),
    email: z.string().email("Invalid email").min(1, "Required"),
    phoneNumber: z
      .string()
      .regex(/^\d{10}$|^\d{3}-\d{3}-\d{4}$|^$/, "Invalid phone number"),
    gender: z
      .enum(FORMS.GENDERS, { error: "Select a valid gender" })
      .optional(),
    raceOrEthnicity: z
      .enum(FORMS.RACES_OR_ETHNICITIES, {
        error: "Select a valid race or ethnicity",
      })
      .optional(),
    dob: z
      .string()
      .pipe(z.coerce.date())
      .transform((date) => date.toISOString()),
    gradDate: z.string(),
    survey1: z.string().min(1, "Required"),
    survey2: z.string().min(1, "Required"),
    isFirstTime: z.boolean(),
    githubProfileUrl: z
      .string()
      .regex(/^https:\/\/.+/, "Invalid URL: Please try again with https://")
      .regex(
        /^https:\/\/(www\.)?github\.com\/.+/,
        "Invalid URL: Enter a valid GitHub link",
      )
      .url({ message: "Invalid URL" })
      .optional()
      .or(z.literal("")),
    linkedinProfileUrl: z
      .string()
      .regex(/^https:\/\/.+/, "Invalid URL: Please try again with https://")
      .regex(
        /^https:\/\/(www\.)?linkedin\.com\/.+/,
        "Invalid URL: Enter a valid LinkedIn link",
      )
      .regex(
        /^https:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?$/,
        "Invalid URL: Do not use a mobile URL/excessively long URL",
      )
      .url({ message: "Invalid URL" })
      .optional()
      .or(z.literal("")),
    websiteUrl: z
      .string()
      .regex(
        /^https?:\/\/.+/,
        "Invalid URL: Please try again with https:// or http://",
      )
      .url({ message: "Invalid URL" })
      .optional()
      .or(z.literal("")),
    resumeUpload: createResumeUploadSchema(),
    agreesToMLHCodeOfConduct: z.boolean().refine((value) => value),
    agreesToMLHDataSharing: z.boolean().refine((value) => value),
    agreesToReceiveEmailsFromMLH: z.boolean(),
  });
}

export type HackerProfileFormValues = z.output<
  ReturnType<typeof createHackerProfileClientSchema>
>;

export type HackerApplicationFormValues = z.output<
  ReturnType<typeof createHackerApplicationClientSchema>
>;

export const HACKER_APPLICATION_DEFAULT_VALUES: Partial<HackerApplicationFormValues> =
  {
    firstName: "",
    lastName: "",
    gender: undefined,
    email: "",
    phoneNumber: "",
    country: undefined,
    school: undefined,
    levelOfStudy: undefined,
    major: undefined,
    raceOrEthnicity: undefined,
    shirtSize: undefined,
    githubProfileUrl: "",
    linkedinProfileUrl: "",
    websiteUrl: "",
    resumeUrl: "",
    dob: "",
    gradDate: "",
    survey1: "",
    survey2: "",
    isFirstTime: false,
    foodAllergies: "",
    agreesToReceiveEmailsFromMLH: false,
    agreesToMLHCodeOfConduct: false,
    agreesToMLHDataSharing: false,
  };

function getDateInputValue(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function getHackerApplicationPrefill(
  context: PortalApplicationContext | undefined,
): {
  selectedAllergies: string[];
  source: "hacker" | "member";
  values: Partial<HackerApplicationFormValues>;
} | null {
  if (!context) return null;

  const { previousHacker, memberProfile } = context;
  if (previousHacker) {
    return {
      source: "hacker",
      selectedAllergies: previousHacker.foodAllergies
        ? previousHacker.foodAllergies.split(",")
        : [],
      values: {
        firstName: previousHacker.firstName,
        lastName: previousHacker.lastName,
        gender: previousHacker.gender,
        raceOrEthnicity: previousHacker.raceOrEthnicity,
        email: previousHacker.email,
        phoneNumber: previousHacker.phoneNumber || "",
        country: previousHacker.country,
        school: previousHacker.school,
        levelOfStudy: previousHacker.levelOfStudy,
        major: previousHacker.major,
        shirtSize: previousHacker.shirtSize,
        githubProfileUrl: previousHacker.githubProfileUrl ?? undefined,
        linkedinProfileUrl: previousHacker.linkedinProfileUrl ?? undefined,
        websiteUrl: previousHacker.websiteUrl ?? undefined,
        resumeUrl: previousHacker.resumeUrl ?? "",
        dob: getDateInputValue(previousHacker.dob),
        gradDate: getDateInputValue(previousHacker.gradDate),
        survey1: "",
        survey2: "",
        isFirstTime: previousHacker.isFirstTime ?? false,
        foodAllergies: previousHacker.foodAllergies,
        agreesToReceiveEmailsFromMLH: false,
        agreesToMLHCodeOfConduct: false,
        agreesToMLHDataSharing: false,
      },
    };
  }

  if (!memberProfile) return null;
  return {
    source: "member",
    selectedAllergies: [],
    values: {
      firstName: memberProfile.firstName,
      lastName: memberProfile.lastName,
      gender: memberProfile.gender,
      raceOrEthnicity: memberProfile.raceOrEthnicity,
      email: memberProfile.email,
      phoneNumber: memberProfile.phoneNumber ?? "",
      country: undefined,
      school: memberProfile.school,
      levelOfStudy: memberProfile.levelOfStudy,
      major: memberProfile.major,
      shirtSize: memberProfile.shirtSize,
      githubProfileUrl: memberProfile.githubProfileUrl ?? undefined,
      linkedinProfileUrl: memberProfile.linkedinProfileUrl ?? undefined,
      websiteUrl: memberProfile.websiteUrl ?? undefined,
      resumeUrl: memberProfile.resumeUrl ?? "",
      dob: getDateInputValue(memberProfile.dob),
      gradDate: getDateInputValue(memberProfile.gradDate),
      survey1: "",
      survey2: "",
      isFirstTime: false,
      foodAllergies: "",
      agreesToReceiveEmailsFromMLH: false,
      agreesToMLHCodeOfConduct: false,
      agreesToMLHDataSharing: false,
    },
  };
}
