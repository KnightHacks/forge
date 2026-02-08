import * as z from "zod";

import { COMPANIES } from "./companies";
import { COUNTRIES } from "./countries";
import { SCHOOLS } from "./schools";

export { COMPANIES, COUNTRIES, SCHOOLS };

export const LEVELS_OF_STUDY = [
  "Less than Secondary / High School",
  "Secondary / High School",
  "Undergraduate University (2 year - community college or similar)",
  "Undergraduate University (3+ year)",
  "Graduate University (Masters, Professional, Doctoral, etc)",
  "Code School / Bootcamp",
  "Other Vocational / Trade Program or Apprenticeship",
  "Post Doctorate",
  "Other",
  "I’m not currently a student",
  "Prefer not to answer",
] as const;

export const ALLERGIES = [
  "Milk",
  "Eggs",
  "Fish",
  "Crustacean Shellfish",
  "Tree Nuts",
  "Peanuts",
  "Wheat",
  "Soybeans",
  "Halal",
  "Kosher",
  "Vegetarian",
  "Vegan",
] as const;

export const MAJORS = [
  "Computer Science",
  "Information Technology",
  "Software Engineering",
  "Computer Engineering",
  "Digital Media",
  "Business",
  "Accounting",
  "Aerospace Engineering",
  "Anthropology",
  "Architecture",
  "Art",
  "Astronomy",
  "Biochemistry",
  "Biology",
  "Biomedical Engineering",
  "Chemical Engineering",
  "Chemistry",
  "Civil Engineering",
  "Communication",
  "Criminal Justice",
  "Data Science",
  "Design",
  "Economics",
  "Education",
  "Electrical Engineering",
  "English",
  "Environmental Science",
  "Finance",
  "Game Design",
  "Geography",
  "Geology",
  "Graphic Design",
  "Health Sciences",
  "History",
  "Hospitality Management",
  "Human Resources",
  "Industrial Engineering",
  "International Relations",
  "Journalism",
  "Languages",
  "Law",
  "Linguistics",
  "Management",
  "Marketing",
  "Mathematics",
  "Mechanical Engineering",
  "Medicine",
  "Music",
  "Nursing",
  "Philosophy",
  "Physics",
  "Political Science",
  "Pre-Med",
  "Pre-Law",
  "Psychology",
  "Public Administration",
  "Public Health",
  "Religious Studies",
  "Social Work",
  "Sociology",
  "Statistics",
  "Theater",
  "Urban Planning",
  "Veterinary Science",
  "Interdisciplinary Studies",
  "Other",
] as const;

export type Major = (typeof MAJORS)[number];

export const SHORT_LEVELS_OF_STUDY = [
  "Undergraduate University (2 year)",
  "Graduate University (Masters/PhD)",
  "Vocational/Trade School",
] as const;

export const GENDERS = [
  "Man",
  "Woman",
  "Non-binary",
  "Prefer to self-describe",
  "Prefer not to answer",
] as const;

export const RACES_OR_ETHNICITIES = [
  "White",
  "Black or African American",
  "Hispanic / Latino / Spanish Origin",
  "Asian",
  "Native Hawaiian or Other Pacific Islander",
  "Native American or Alaskan Native",
  "Middle Eastern",
  "Prefer not to answer",
  "Other",
] as const;

export const SHORT_RACES_AND_ETHNICITIES = [
  "Native Hawaiian/Pacific Islander",
  "Hispanic/Latino",
  "Native American/Alaskan Native",
] as const;

export const QuestionValidator = z.object({
  question: z.string(),
  image: z.string().url().optional(),
  type: z.enum([
    "SHORT_ANSWER",
    "PARAGRAPH",
    "MULTIPLE_CHOICE",
    "CHECKBOXES",
    "DROPDOWN",
    "LINEAR_SCALE",
    "DATE",
    "TIME",
    "EMAIL",
    "NUMBER",
    "PHONE",
    "FILE_UPLOAD",
    "BOOLEAN",
    "LINK",
  ]),
  options: z.array(z.string()).optional(),
  optionsConst: z.string().optional(),
  optional: z.boolean().optional(),
  allowOther: z.boolean().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  order: z.number().optional(),
});

export const InstructionValidator = z.object({
  title: z.string().max(200),
  content: z.string().max(2000).optional(),
  imageUrl: z.string().url().optional(),
  videoUrl: z.string().url().optional(),
  imageObjectName: z.string().optional(),
  videoObjectName: z.string().optional(),
  order: z.number().optional(),
});

export const FormSchemaValidator = z.object({
  banner: z.string().url().optional(),
  name: z.string().max(200),
  description: z.string().max(500),
  questions: z.array(QuestionValidator),
  instructions: z.array(InstructionValidator).optional(),
});

export type FormType = z.infer<typeof FormSchemaValidator>;
export type InstructionValidatorType = z.infer<typeof InstructionValidator>;

type QuestionValidatorType = z.infer<typeof QuestionValidator>;
export type ValidatorOptions = Omit<QuestionValidatorType, "question">;

export type QuestionsType = z.infer<typeof QuestionValidator>["type"];

export const AVAILABLE_DROPDOWN_CONSTANTS = {
  LEVELS_OF_STUDY: "Levels of Study",
  ALLERGIES: "Allergies",
  MAJORS: "Majors",
  GENDERS: "Genders",
  RACES_OR_ETHNICITIES: "Races or Ethnicities",
  COUNTRIES: "Countries",
  SCHOOLS: "Schools",
  COMPANIES: "Companies",
  SHIRT_SIZES: "Shirt Sizes",
  EVENT_FEEDBACK_HEARD: "Event Feedback - How You Heard",
  SHORT_LEVELS_OF_STUDY: "Short Levels of Study",
  SHORT_RACES_AND_ETHNICITIES: "Short Races and Ethnicities",
} as const;

export type DropdownConstantKey = keyof typeof AVAILABLE_DROPDOWN_CONSTANTS;

export const SHIRT_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"] as const;

export const EVENT_FEEDBACK_HEARD = [
  "Discord",
  "Instagram",
  "KnightConnect",
  "Word of Mouth",
  "CECS Emailing List",
  "Reddit",
  "LinkedIn",
  "From Class Presentation",
  "From Another Club",
] as const;

/**
 * Retrieve dropdown option values for a named constant.
 *
 * @param constName - The constant name to look up (one of: `LEVELS_OF_STUDY`, `ALLERGIES`, `MAJORS`, `GENDERS`, `RACES_OR_ETHNICITIES`, `COUNTRIES`, `SCHOOLS`, `COMPANIES`, `SHIRT_SIZES`, `EVENT_FEEDBACK_HEARD`, `SHORT_LEVELS_OF_STUDY`, `SHORT_RACES_AND_ETHNICITIES`)
 * @returns The array of option strings associated with `constName`, or an empty array if the name is not recognized.
 */
export function getDropdownOptionsFromConst(
  constName: string,
): readonly string[] {
  switch (constName) {
    case "LEVELS_OF_STUDY":
      return LEVELS_OF_STUDY;
    case "ALLERGIES":
      return ALLERGIES;
    case "MAJORS":
      return MAJORS;
    case "GENDERS":
      return GENDERS;
    case "RACES_OR_ETHNICITIES":
      return RACES_OR_ETHNICITIES;
    case "COUNTRIES":
      return COUNTRIES;
    case "SCHOOLS":
      return SCHOOLS;
    case "COMPANIES":
      return COMPANIES;
    case "SHIRT_SIZES":
      return SHIRT_SIZES;
    case "EVENT_FEEDBACK_HEARD":
      return EVENT_FEEDBACK_HEARD;
    case "SHORT_LEVELS_OF_STUDY":
      return SHORT_LEVELS_OF_STUDY;
    case "SHORT_RACES_AND_ETHNICITIES":
      return SHORT_RACES_AND_ETHNICITIES;
    default:
      return [];
  }
}

export const FORM_QUESTION_TYPES = [
  { value: "SHORT_ANSWER", label: "Short answer" },
  { value: "PARAGRAPH", label: "Paragraph" },
  { value: "MULTIPLE_CHOICE", label: "Multiple choice" },
  { value: "CHECKBOXES", label: "Checkboxes" },
  { value: "DROPDOWN", label: "Dropdown" },
  { value: "FILE_UPLOAD", label: "File upload" },
  { value: "LINEAR_SCALE", label: "Linear scale" },
  { value: "DATE", label: "Date" },
  { value: "TIME", label: "Time" },
  { value: "EMAIL", label: "Email" },
  { value: "NUMBER", label: "Number" },
  { value: "PHONE", label: "Phone" },
  { value: "BOOLEAN", label: "Boolean (Yes/No)" },
  { value: "LINK", label: "Link (URL)" },
] as const;

export const HACKATHON_APPLICATION_STATES = [
  "withdrawn",
  "pending",
  "accepted",
  "waitlisted",
  "checkedin",
  "confirmed",
  "denied",
] as const;

export const SPONSOR_TIERS = ["gold", "silver", "bronze", "other"] as const;

export const ADMIN_PIE_CHART_COLORS: readonly string[] = [
  "#f72585",
  "#b5179e",
  "#7209b7",
  "#3a0ca3",
  "#4361ee",
  "#4895ef",
  "#4cc9f0",
  "#560bad",
  "#480ca8",
] as const;

export const WEEKDAY_ORDER: string[] = [
  "Mon",
  "Tues",
  "Wed",
  "Thurs",
  "Fri",
  "Sat/Sun",
] as const;

export const RANKING_STYLES: string[] = [
  "md:text-lg lg:text-lg font-bold text-yellow-500",
  "md:text-lg lg:text-lg font-semibold text-gray-400",
  "md:text-lg lg:text-lg font-medium text-orange-500",
];

export const DEFAULT_COLOR = "#ffffff";
export const DEFAULT_EMAIL_QUEUE_CRON_SCHEDULE = "0 * * * *";

export const SEMESTER_START_DATES = {
  spring: {
    month: 0,
    day: 1, // first day of January
  },
  summer: {
    month: 4,
    day: 1, // first day of May
  },
  fall: {
    month: 7,
    day: 15, // middle of August
  },
} as const;

export const ALL_DATES_RANGE_UNIX = {
  start: -8640000000000000,
  end: 8640000000000000,
} as const;

export interface Semester {
  name: string;
  startDate: Date;
  endDate: Date;
}

export const DEVPOST_TEAM_MEMBER_EMAIL_OFFSET = 3;