import { z } from "zod";

export const hackathonRouteNameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Route name must be at least 2 characters.")
  .max(64, "Route name must be 64 characters or fewer.")
  .regex(
    /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
    "Use lowercase letters, numbers, and hyphens. Start and end with a letter or number.",
  );

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

export function createHackathonApplicationBackgroundKeySchema<
  T extends readonly [string, ...string[]],
>(backgroundKeys: T) {
  return z.enum(backgroundKeys).nullable().optional();
}

export function createHackathonEmailTemplateKeySchema<
  T extends readonly [string, ...string[]],
>(emailTemplateKeys: T) {
  return z.enum(emailTemplateKeys).nullable().optional();
}

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
  path: [
    HackathonDateWindowField | "applicationBackgroundKey" | "emailTemplateKey",
  ];
}

function isValidDate(date: Date) {
  return Number.isFinite(date.getTime());
}

export function getHackathonBackgroundIssues({
  applicationBackgroundEnabled,
  applicationBackgroundKey,
}: {
  applicationBackgroundEnabled: boolean;
  applicationBackgroundKey?: string | null;
}): HackathonValidationIssue[] {
  if (!applicationBackgroundEnabled || applicationBackgroundKey) return [];

  return [
    {
      message: "Choose a background preset or disable the background override.",
      path: ["applicationBackgroundKey"],
    },
  ];
}

export function getHackathonEmailTemplateIssues({
  emailTemplateEnabled,
  emailTemplateKey,
}: {
  emailTemplateEnabled: boolean;
  emailTemplateKey?: string | null;
}): HackathonValidationIssue[] {
  if (!emailTemplateEnabled || emailTemplateKey) return [];

  return [
    {
      message: "Choose an email template preset or disable the email override.",
      path: ["emailTemplateKey"],
    },
  ];
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
