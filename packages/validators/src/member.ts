import { z } from "zod";

import { FORMS } from "@forge/consts";

import {
  dateString,
  emptyToNull,
  optionalStorageObjectName,
  optionalText,
  optionalUrl,
  requiredOption,
  requiredText,
} from "./forms";

export const MEMBER_SIGNUP_FORM_ID = "f0000000-0000-4000-8000-000000000001";
export const MEMBER_SIGNUP_CONNECTION_ID =
  "f0000000-0000-4000-8000-000000000002";
export const MEMBER_SIGNUP_FORM_SLUG = "member-signup";
export const MEMBER_SIGNUP_CALLBACK_PROC = "member.createMember";
export const MEMBER_SIGNUP_COMPLETION_REDIRECT_URL = "/dashboard";
export const MEMBER_CODE_OF_CONDUCT_URL =
  "https://knight-hacks.notion.site/code-of-conduct";

const GRAD_TERMS = ["Spring", "Summer", "Fall"] as const;

export function calculateMemberAge(dob: string, referenceDate = new Date()) {
  const birthDate = new Date(`${dob}T00:00:00Z`);
  let age = referenceDate.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDiff = referenceDate.getUTCMonth() - birthDate.getUTCMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && referenceDate.getUTCDate() < birthDate.getUTCDate())
  ) {
    age -= 1;
  }

  return age;
}

function graduationDateFromTerm(
  term: (typeof GRAD_TERMS)[number],
  year: number,
) {
  const { month, day } = FORMS.TERM_TO_DATE[term];
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(
    2,
    "0",
  )}`;
}

export const memberFormSchema = z.object({
  firstName: requiredText("First name"),
  lastName: requiredText("Last name"),
  email: requiredText("Email").email("Enter a valid email address."),
  phoneNumber: z
    .string()
    .trim()
    .regex(
      /^$|^\d{10}$|^\d{3}-\d{3}-\d{4}$/,
      "Enter a 10 digit phone number or use 123-456-7890.",
    )
    .optional()
    .or(z.literal("")),
  dob: dateString("Date of birth").refine(
    (value) => calculateMemberAge(value) >= 16,
    "You must be at least 16 years old to join Knight Hacks.",
  ),
  school: requiredOption("School", FORMS.SCHOOLS),
  levelOfStudy: requiredOption("Level of study", FORMS.LEVELS_OF_STUDY),
  major: requiredOption("Major", FORMS.MAJORS),
  gender: requiredOption("Gender", FORMS.GENDERS),
  raceOrEthnicity: requiredOption(
    "Race or ethnicity",
    FORMS.RACES_OR_ETHNICITIES,
  ),
  shirtSize: requiredOption("Shirt size", FORMS.SHIRT_SIZES),
  gradTerm: z.enum(GRAD_TERMS, {
    message: "Choose a graduation term.",
  }),
  gradYear: z
    .number()
    .int("Graduation year must be a whole year.")
    .min(1900, "Graduation year is too early.")
    .max(2100, "Graduation year is too far in the future."),
  company: optionalText("Company", 255),
  githubProfileUrl: optionalUrl("GitHub profile URL"),
  linkedinProfileUrl: optionalUrl("LinkedIn profile URL"),
  websiteUrl: optionalUrl("Website URL"),
  profilePictureUrl: optionalStorageObjectName("Profile picture"),
  resumeUrl: optionalStorageObjectName("Resume"),
  tagline: optionalText("Tagline", 80),
  about: optionalText("About", 500),
  guildProfileVisible: z.boolean().default(true),
  codeOfConductAccepted: z.boolean().refine((accepted) => accepted, {
    message: "You must accept the Knight Hacks Code of Conduct.",
  }),
});

export const memberSchema = memberFormSchema.transform((input) => ({
  firstName: input.firstName,
  lastName: input.lastName,
  email: input.email.toLowerCase(),
  phoneNumber: emptyToNull(input.phoneNumber),
  dob: input.dob,
  school: input.school,
  levelOfStudy: input.levelOfStudy,
  major: input.major,
  gender: input.gender,
  raceOrEthnicity: input.raceOrEthnicity,
  shirtSize: input.shirtSize,
  gradDate: graduationDateFromTerm(input.gradTerm, input.gradYear),
  company: emptyToNull(input.company),
  githubProfileUrl: emptyToNull(input.githubProfileUrl),
  linkedinProfileUrl: emptyToNull(input.linkedinProfileUrl),
  websiteUrl: emptyToNull(input.websiteUrl),
  profilePictureUrl: emptyToNull(input.profilePictureUrl),
  resumeUrl: emptyToNull(input.resumeUrl),
  tagline: emptyToNull(input.tagline),
  about: emptyToNull(input.about),
  guildProfileVisible: input.guildProfileVisible,
}));

export type MemberFormValues = z.input<typeof memberFormSchema>;
export type MemberInput = z.output<typeof memberSchema>;

export interface GuildProfileLinks {
  github: MemberInput["githubProfileUrl"];
  linkedin: MemberInput["linkedinProfileUrl"];
  portfolio: MemberInput["websiteUrl"];
}

// Guild profile is still persisted on Member in the legacy schema. Keeping this
// as a distinct type gives Guild room to become its own model later.
export interface GuildProfile extends Pick<
  MemberInput,
  "about" | "company" | "guildProfileVisible" | "profilePictureUrl" | "tagline"
> {
  links: GuildProfileLinks;
}

export type MemberSignupFieldKind =
  | "boolean"
  | "checkbox"
  | "combobox"
  | "date"
  | "email"
  | "file"
  | "image"
  | "number"
  | "phone"
  | "select"
  | "textarea"
  | "text"
  | "url";

export interface MemberSignupFieldDefinition {
  description?: string;
  kind: MemberSignupFieldKind;
  label: string;
  name: keyof MemberFormValues;
  options?: readonly string[];
  placeholder?: string;
  required?: boolean;
  section: "Personal" | "Academics" | "Guild";
}

export const memberSignupFields: readonly MemberSignupFieldDefinition[] = [
  {
    name: "firstName",
    label: "First name",
    kind: "text",
    section: "Personal",
    placeholder: "Lenny",
    required: true,
  },
  {
    name: "lastName",
    label: "Last name",
    kind: "text",
    section: "Personal",
    placeholder: "Dragonson",
    required: true,
  },
  {
    name: "email",
    label: "Email",
    kind: "email",
    section: "Personal",
    placeholder: "tk@knighthacks.org",
    required: true,
  },
  {
    name: "phoneNumber",
    label: "Phone number",
    kind: "phone",
    section: "Personal",
    placeholder: "123-456-7890",
  },
  {
    name: "dob",
    label: "Date of birth",
    kind: "date",
    section: "Personal",
    required: true,
  },
  {
    name: "gender",
    label: "Gender",
    kind: "select",
    section: "Personal",
    options: FORMS.GENDERS,
    required: true,
  },
  {
    name: "raceOrEthnicity",
    label: "Race or ethnicity",
    kind: "select",
    section: "Personal",
    options: FORMS.RACES_OR_ETHNICITIES,
    required: true,
  },
  {
    name: "shirtSize",
    label: "Shirt size",
    kind: "select",
    section: "Personal",
    options: FORMS.SHIRT_SIZES,
    required: true,
  },
  {
    name: "codeOfConductAccepted",
    label: "I agree to follow the Knight Hacks Code of Conduct",
    kind: "checkbox",
    section: "Personal",
    description: MEMBER_CODE_OF_CONDUCT_URL,
    required: true,
  },
  {
    name: "levelOfStudy",
    label: "Level of study",
    kind: "select",
    section: "Academics",
    options: FORMS.LEVELS_OF_STUDY,
    required: true,
  },
  {
    name: "school",
    label: "School",
    kind: "combobox",
    section: "Academics",
    options: FORMS.SCHOOLS,
    placeholder: "Select your school",
    required: true,
  },
  {
    name: "major",
    label: "Major",
    kind: "combobox",
    section: "Academics",
    options: FORMS.MAJORS,
    placeholder: "Select your major",
    required: true,
  },
  {
    name: "gradTerm",
    label: "Graduation term",
    kind: "select",
    section: "Academics",
    options: GRAD_TERMS,
    required: true,
  },
  {
    name: "gradYear",
    label: "Graduation year",
    kind: "number",
    section: "Academics",
    placeholder: "2027",
    required: true,
  },
  {
    name: "guildProfileVisible",
    label: "Guild profile visibility",
    kind: "boolean",
    section: "Guild",
    description:
      "Private profiles are still visible to sponsors. Public profiles are also visible to other members on guild.knighthacks.org.",
  },
  {
    name: "profilePictureUrl",
    label: "Profile picture",
    kind: "image",
    section: "Guild",
    description: "Upload a JPEG, PNG, GIF, or WebP image, up to 2MB.",
  },
  {
    name: "company",
    label: "Current or most recent company",
    kind: "text",
    section: "Guild",
    placeholder: "Knight Hacks, UCF, a company, or self-employed",
  },
  {
    name: "tagline",
    label: "Tagline",
    kind: "text",
    section: "Guild",
    placeholder: "Builder, designer, first-time hacker",
  },
  {
    name: "about",
    label: "About",
    kind: "textarea",
    section: "Guild",
    placeholder: "Share a little about what you like building.",
  },
  {
    name: "githubProfileUrl",
    label: "GitHub profile URL",
    kind: "url",
    section: "Guild",
    placeholder: "https://github.com/knighthacks",
  },
  {
    name: "linkedinProfileUrl",
    label: "LinkedIn profile URL",
    kind: "url",
    section: "Guild",
    placeholder: "https://www.linkedin.com/company/knight-hacks",
  },
  {
    name: "websiteUrl",
    label: "Portfolio URL",
    kind: "url",
    section: "Guild",
    placeholder: "https://knighthacks.org",
  },
  {
    name: "resumeUrl",
    label: "Resume",
    kind: "file",
    section: "Guild",
    description: "Upload a PDF resume, up to 5MB.",
  },
] as const satisfies readonly MemberSignupFieldDefinition[];

const formQuestionTypeByKind = {
  boolean: "BOOLEAN",
  checkbox: "BOOLEAN",
  combobox: "DROPDOWN",
  date: "DATE",
  email: "EMAIL",
  file: "FILE_UPLOAD",
  image: "FILE_UPLOAD",
  number: "NUMBER",
  phone: "PHONE",
  select: "DROPDOWN",
  textarea: "PARAGRAPH",
  text: "SHORT_ANSWER",
  url: "LINK",
} as const satisfies Record<MemberSignupFieldKind, FORMS.FormQuestionType>;

export const memberSignupFormData = {
  name: "Knight Hacks Member Signup",
  description: "Create your Knight Hacks member profile.",
  instructions: [
    {
      title: "Member profile",
      content:
        "This creates your Knight Hacks member profile for Blade. Hacker applications, dues, and admin-only workflows are separate flows.",
      order: 0,
    },
  ],
  questions: memberSignupFields.map((field, index) => ({
    question: field.label,
    type: formQuestionTypeByKind[field.kind],
    optional: !field.required,
    options: field.options ? [...field.options] : undefined,
    order: index + 1,
  })),
} satisfies FORMS.FormType;

export const memberSignupCallbackConnections = memberSignupFields.map(
  (field) => ({
    formField: field.name,
    procField: field.name,
  }),
);

export const memberSignupFormJsonSchema = {
  type: "object",
  required: memberSignupFields
    .filter((field) => field.required)
    .map((field) => field.name),
  properties: Object.fromEntries(
    memberSignupFields.map((field) => [
      field.name,
      field.kind === "boolean" || field.kind === "checkbox"
        ? { type: "boolean" }
        : field.kind === "number"
          ? { type: "number" }
          : { type: "string" },
    ]),
  ),
  additionalProperties: false,
} as const;

export const memberSignupFormDefinition = {
  id: MEMBER_SIGNUP_FORM_ID,
  slugName: MEMBER_SIGNUP_FORM_SLUG,
  callbackProc: MEMBER_SIGNUP_CALLBACK_PROC,
  completionRedirectUrl: MEMBER_SIGNUP_COMPLETION_REDIRECT_URL,
  fields: memberSignupFields,
  formData: memberSignupFormData,
};
