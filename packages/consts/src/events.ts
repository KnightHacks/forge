import { IS_PROD } from "./util";

export const EVENT_TAGS = [
  "GBM",
  "Social",
  "Kickstart",
  "Project Launch",
  "Hello World",
  "Sponsorship",
  "Tech Exploration",
  "Class Support",
  "Workshop",
  "OPS",
  "Collabs",
  "Check-in",
  "Merch",
  "Food",
  "Ceremony",
  "CAREER-FAIR",
  "RSO-FAIR",
] as const;

export const EVENT_FEEDBACK_SIMILAR_EVENT = ["Yes", "No"] as const;

type EventTag = (typeof EVENT_TAGS)[number];

export const EVENT_POINTS: Record<EventTag, number> = {
  GBM: 35,
  Social: 25,
  Kickstart: 25,
  "Project Launch": 25,
  "Hello World": 25,
  Sponsorship: 50,
  "Tech Exploration": 25,
  "Class Support": 25,
  Workshop: 25,
  OPS: 20,
  Collabs: 40,
  "Check-in": 5,
  Merch: 5,
  Food: 5,
  Ceremony: 50,
  "CAREER-FAIR": 100,
  "RSO-FAIR": 50,
} as const;

export type EventTagsColor =
  | "GBM"
  | "Social"
  | "Kickstart"
  | "Project Launch"
  | "Hello World"
  | "Sponsorship"
  | "Tech Exploration"
  | "Class Support"
  | "Workshop"
  | "OPS"
  | "Hackathon"
  | "Collabs"
  | "Check-in"
  | "Merch"
  | "Food"
  | "Ceremony"
  | "CAREER-FAIR"
  | "RSO-FAIR";

export const EVENT_FEEDBACK_SLIDER_MINIMUM = 1;
export const EVENT_FEEDBACK_SLIDER_MAXIMUM = 10;
export const EVENT_FEEDBACK_SLIDER_STEP = 1;
export const EVENT_FEEDBACK_SLIDER_VALUE = 5;
export const EVENT_FEEDBACK_TEXT_ROWS = 4;
export const EVENT_FEEDBACK_POINTS_INCREMENT = 10;

export const CALENDAR_TIME_ZONE = "America/New_York";

export const PROD_GOOGLE_CALENDAR_ID =
  "c_0b9df2b0062a5d711fc16060ff3286ef404b174bfafc4cbdd4e3009e91536e94@group.calendar.google.com";
export const DEV_GOOGLE_CALENDAR_ID =
  "c_178118a9a25d9f278014b123b79b7e9caf9b29ac94bba3934237db00979e0f75@group.calendar.google.com";
export const GOOGLE_CALENDAR_ID = IS_PROD
  ? PROD_GOOGLE_CALENDAR_ID
  : DEV_GOOGLE_CALENDAR_ID;

export const GOOGLE_PERSONIFY_EMAIL = "dylan@knighthacks.org";
