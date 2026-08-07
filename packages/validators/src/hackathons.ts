import { z } from "zod";

import { FORMS } from "@forge/consts";

import { discordSnowflakeSchema } from "./discord-archive";

export const hackathonDisplayNameSchema = z
  .string()
  .trim()
  .min(1, "Display name is required.")
  .max(255, "Display name must be 255 characters or fewer.");

export const hackathonThemeSchema = z
  .string()
  .trim()
  .min(1, "Theme is required.")
  .max(255, "Theme must be 255 characters or fewer.");

export const ianaTimeZoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
      return true;
    } catch {
      return false;
    }
  }, "Choose a valid IANA timezone.");

/** Same rule and reason as `platform-config`: a cleared field means "not set". */
const emptyToNull = (value: string | null) => (value === "" ? null : value);

/**
 * Where the hackathon's own site hosts its application. Optional, so an officer
 * clearing the field is expressing "no link yet" rather than making a mistake.
 * The empty string is coerced before the URL check runs, because `""` would
 * otherwise fail it.
 */
export const hackathonApplicationUrlSchema = z
  .string()
  .trim()
  .nullable()
  .optional()
  .transform((value) => emptyToNull(value ?? null))
  .pipe(
    z
      .string()
      .url("Enter a full URL, including https://")
      // Load-bearing despite `.url()` running first: zod accepts
      // `javascript:alert(1)` as a URL, and this is the only thing rejecting it.
      // Compared case-insensitively because a scheme is case-insensitive per
      // RFC 3986 — an officer pasting `HTTPS://bloomknights.org` from a slide
      // deck is not making a mistake, and rejecting it would be a lie.
      .refine(
        (value) => /^https?:\/\//i.test(value),
        "Only http and https links are allowed.",
      )
      .max(2048, "Link must be 2048 characters or fewer.")
      .nullable(),
  );

export const hackathonClassNameSchema = z
  .string()
  .trim()
  .min(1, "Class name is required.")
  .max(64, "Class name must be 64 characters or fewer.");

/**
 * Six-digit hex, matching how colours are already stored on `Roles` and
 * `Event` (`varchar(7)`). Three-digit shorthand is rejected rather than
 * expanded, so what an officer types is what is stored.
 */
export const hackathonClassColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex colour, such as #4F46E5.");

/**
 * The Discord role a class maps to. Trimmed before the pattern runs, because
 * the realistic officer error is a pasted role *mention* (`<@&123>`) or a
 * trailing space — either of which would otherwise surface as a 404 from
 * Discord at check-in rather than here. Same composition as
 * `configSnowflakeSchema`.
 */
export const hackathonClassDiscordRoleSchema = z
  .string()
  .trim()
  .pipe(discordSnowflakeSchema);

export type HackathonDateWindowField =
  | "applicationOpen"
  | "applicationDeadline"
  | "confirmationDeadline"
  | "startDate"
  | "endDate";

export interface HackathonDateWindow {
  applicationDeadline: Date;
  applicationOpen: Date;
  confirmationDeadline: Date;
  endDate: Date;
  startDate: Date;
}

export interface HackathonValidationIssue {
  message: string;
  path: [HackathonDateWindowField];
}

function isValidDate(date: Date) {
  return Number.isFinite(date.getTime());
}

export function getHackathonDateWindowIssues(
  input: HackathonDateWindow,
): HackathonValidationIssue[] {
  const issues: HackathonValidationIssue[] = [];
  const dates = [
    ["applicationOpen", "application open", input.applicationOpen],
    ["applicationDeadline", "application deadline", input.applicationDeadline],
    [
      "confirmationDeadline",
      "confirmation deadline",
      input.confirmationDeadline,
    ],
    ["startDate", "start date", input.startDate],
    ["endDate", "end date", input.endDate],
  ] as const;

  for (const [path, label, date] of dates) {
    if (!isValidDate(date)) {
      issues.push({
        message: `Invalid ${label}.`,
        path: [path],
      });
    }
  }

  if (issues.length > 0) return issues;

  if (input.applicationOpen >= input.applicationDeadline) {
    issues.push({
      message: "Application open must be before the application deadline.",
      path: ["applicationOpen"],
    });
  }

  if (input.applicationDeadline > input.confirmationDeadline) {
    issues.push({
      message:
        "Confirmation deadline must be on or after the application deadline.",
      path: ["confirmationDeadline"],
    });
  }

  if (input.confirmationDeadline > input.startDate) {
    issues.push({
      message: "Confirmation deadline must be on or before the start date.",
      path: ["confirmationDeadline"],
    });
  }

  if (input.startDate >= input.endDate) {
    issues.push({
      message: "Start date must be before the end date.",
      path: ["endDate"],
    });
  }

  return issues;
}

/**
 * The statuses that send mail. `checkedin` is the one that does not, and this
 * is derived rather than written out so the two lists cannot drift.
 */
export const HACKATHON_SENDING_STATUSES =
  FORMS.HACKATHON_APPLICATION_STATES.filter(
    (status): status is HackathonSendingStatus => status !== "checkedin",
  );

export type HackathonSendingStatus = Exclude<
  (typeof FORMS.HACKATHON_APPLICATION_STATES)[number],
  "checkedin"
>;

export const hackathonSendingStatusSchema = z.enum(
  HACKATHON_SENDING_STATUSES as [
    HackathonSendingStatus,
    ...HackathonSendingStatus[],
  ],
);

/**
 * Route name is no longer an officer-facing field.
 *
 * Applications live on each hackathon's own site, which owns its paths, so
 * current routes do not read this compatibility column. It remains `NOT NULL
 * UNIQUE`, so Blade derives a stable value from the display name rather than
 * asking officers to type one.
 */
export function deriveHackathonRouteName(displayName: string) {
  return displayName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/g, "");
}

const hackathonWritableFields = {
  applicationDeadline: z.coerce.date(),
  applicationOpen: z.coerce.date(),
  applicationUrl: hackathonApplicationUrlSchema,
  confirmationDeadline: z.coerce.date(),
  displayName: hackathonDisplayNameSchema,
  endDate: z.coerce.date(),
  startDate: z.coerce.date(),
  theme: hackathonThemeSchema,
};

export const hackathonConfirmationCapacitySchema = z.preprocess(
  (value) => (value === "" ? null : value),
  z.coerce.number().int().min(0).nullable(),
);

export const hackathonCreateSchema = z.object({
  ...hackathonWritableFields,
  confirmationCapacity: hackathonConfirmationCapacitySchema.default(null),
  timezone: ianaTimeZoneSchema.default("America/New_York"),
});

export const hackathonUpdateSchema = z.object({
  ...hackathonWritableFields,
  confirmationCapacity: hackathonConfirmationCapacitySchema,
  id: z.string().uuid(),
  timezone: ianaTimeZoneSchema,
});

export const hackathonIdSchema = z.object({ id: z.string().uuid() });

export const hackathonStatusEmailSetSchema = z.object({
  hackathonId: z.string().uuid(),
  status: hackathonSendingStatusSchema,
  subject: z
    .string()
    .trim()
    .min(1, "Subject is required.")
    .max(200, "Subject must be 200 characters or fewer."),
  templateId: z.string().uuid(),
});

export const hackathonStatusEmailClearSchema = z.object({
  hackathonId: z.string().uuid(),
  status: hackathonSendingStatusSchema,
});

export const hackathonClassKindSchema = z.enum(["class", "vip"]);

export const hackathonClassCreateSchema = z.object({
  color: hackathonClassColorSchema,
  discordRoleId: hackathonClassDiscordRoleSchema,
  hackathonId: z.string().uuid(),
  kind: hackathonClassKindSchema,
  name: hackathonClassNameSchema,
});

export const hackathonClassUpdateSchema = z.object({
  color: hackathonClassColorSchema,
  discordRoleId: hackathonClassDiscordRoleSchema,
  id: z.string().uuid(),
  name: hackathonClassNameSchema,
});

export const hackathonClassIdSchema = z.object({ id: z.string().uuid() });
