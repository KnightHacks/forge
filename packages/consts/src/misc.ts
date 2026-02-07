// This file should not be added to. I have no idea where these belong, hence
// the miscellaneous category. Please DO NOT add any more constants to this
// file.

import { IS_PROD } from "./util";

export const KNIGHTHACKS_S3_BUCKET_REGION = "us-east-1";
export const KNIGHTHACKS_MAX_RESUME_SIZE = 5 * 1000000; // 5MB
export const FORM_ASSETS_BUCKET = "form-assets";

export const PRESIGNED_URL_EXPIRY = 7 * 24 * 60 * 60; // 7 days

export const KNIGHTHACKS_MAX_PROFILE_PICTURE_SIZE = 2 * 1024 * 1024; // 2MB
export const ALLOWED_PROFILE_PICTURE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

export const ALLOWED_PROFILE_PICTURE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
];

export const TERM_TO_DATE = {
  Spring: { month: 4, day: 2 }, // May 2
  Summer: { month: 7, day: 6 }, // Aug 6
  Fall: { month: 11, day: 10 }, // Dec 10
} as const;
export type GradTerm = keyof typeof TERM_TO_DATE;

export const GUILD_TAG_OPTIONS = ["alumni", "current"] as const;
export type GuildTag = (typeof GUILD_TAG_OPTIONS)[number];

export const MINIO_ENDPOINT = "minio-g0soogg4gs8gwcggw4ococok.knighthacks.org";
export const BUCKET_NAME = "knight-hacks-qr";
export const QR_CONTENT_TYPE = "image/png";
export const QR_PATHNAME = "/knight-hacks-qr/**";

export const KNIGHTHACKS_MEMBERSHIP_PRICE = 2500;

export interface PermissionDataObj {
  idx: number;
  name: string;
  desc: string;
}

export const PERMISSION_DATA: Record<string, PermissionDataObj> = {
  IS_OFFICER: {
    idx: 0,
    name: "Is Officer",
    desc: "Grants access to sensitive club officer pages.",
  },
  IS_JUDGE: {
    idx: 1,
    name: "Is Judge",
    desc: "Grants access to the judging system.",
  },
  READ_MEMBERS: {
    idx: 2,
    name: "Read Members",
    desc: "Grants access to the list of club members.",
  },
  EDIT_MEMBERS: {
    idx: 3,
    name: "Edit Members",
    desc: "Allows editing member data, including deletion.",
  },
  READ_HACKERS: {
    idx: 4,
    name: "Read Hackers",
    desc: "Grants access to the list of hackers, and their hackathons.",
  },
  EDIT_HACKERS: {
    idx: 5,
    name: "Edit Hackers",
    desc: "Allows editing hacker data, including approval, rejection, deletion, etc.",
  },
  READ_CLUB_DATA: {
    idx: 6,
    name: "Read Club Data",
    desc: "Grants access to club statistics, such as demographics.",
  },
  READ_HACK_DATA: {
    idx: 7,
    name: "Read Hackathon Data",
    desc: "Grants access to hackathon statistics, such as demographics.",
  },
  READ_CLUB_EVENT: {
    idx: 8,
    name: "Read Club Events",
    desc: "Grants access to club event data, such as attendance.",
  },
  EDIT_CLUB_EVENT: {
    idx: 9,
    name: "Edit Club Events",
    desc: "Allows creating, editing, or deleting club events.",
  },
  CHECKIN_CLUB_EVENT: {
    idx: 10,
    name: "Club Event Check-in",
    desc: "Allows the user to check members into club events.",
  },
  READ_HACK_EVENT: {
    idx: 11,
    name: "Read Hackathon Events",
    desc: "Grants access to hackathon event data, such as attendance.",
  },
  EDIT_HACK_EVENT: {
    idx: 12,
    name: "Edit Hackathon Events",
    desc: "Allows creating, editing, or deleting hackathon events.",
  },
  CHECKIN_HACK_EVENT: {
    idx: 13,
    name: "Hackathon Event Check-in",
    desc: "Allows the user to check hackers into hackathon events, including the primary check-in.",
  },
  EMAIL_PORTAL: {
    idx: 14,
    name: "Email Portal",
    desc: "Grants access to the email queue portal.",
  },
  READ_FORMS: {
    idx: 15,
    name: "Read Forms",
    desc: "Grants access to created forms, but not their responses.",
  },
  READ_FORM_RESPONSES: {
    idx: 16,
    name: "Read Form Responses",
    desc: "Grants access to form responses.",
  },
  EDIT_FORMS: {
    idx: 17,
    name: "Edit Forms",
    desc: "Allows creating, editing, or deleting forms.",
  },
  ASSIGN_ROLES: {
    idx: 18,
    name: "Assign Roles",
    desc: "Allows assigning or removing roles to Blade users.",
  },
  CONFIGURE_ROLES: {
    idx: 19,
    name: "Configure Roles",
    desc: "Allows creating, editing, or deleting roles.",
  },
} as const satisfies Record<string, PermissionDataObj>;

export const PERMISSIONS = Object.fromEntries(
  Object.entries(PERMISSION_DATA).map(([key, value]) => [key, value.idx]),
) as {
  [K in keyof typeof PERMISSION_DATA]: (typeof PERMISSION_DATA)[K]["idx"];
};

export type PermissionKey = keyof typeof PERMISSION_DATA;
export type PermissionIndex = (typeof PERMISSION_DATA)[PermissionKey]["idx"];

export const MEMBER_PROFILE_ICON_SIZE = 24;

export const SPONSOR_VIDEO_LINK =
  "https://www.youtube.com/embed/OU1q02v1Vrw?si=dyHSQCmxzcau7-mF";

export const CALENDAR_TIME_ZONE = "America/New_York";

export const DUES_PAYMENT = 25;

export const CLEAR_DUES_MESSAGE =
  "I am aware of the consequences regarding this action if it were by mistake. I am absolutely sure that I want to clear all dues.";

export const PROD_GOOGLE_CALENDAR_ID =
  "c_0b9df2b0062a5d711fc16060ff3286ef404b174bfafc4cbdd4e3009e91536e94@group.calendar.google.com";
export const DEV_GOOGLE_CALENDAR_ID =
  "c_178118a9a25d9f278014b123b79b7e9caf9b29ac94bba3934237db00979e0f75@group.calendar.google.com";
export const GOOGLE_CALENDAR_ID = IS_PROD
  ? PROD_GOOGLE_CALENDAR_ID
  : DEV_GOOGLE_CALENDAR_ID;

export const GOOGLE_PERSONIFY_EMAIL = "dylan@knighthacks.org";

export const USE_CAUTION = true;
