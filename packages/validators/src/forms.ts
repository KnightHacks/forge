import { z } from "zod";

// Shared form-field validators. Domain validators should compose these rather
// than re-encoding generic text/url/date behavior in each feature.
export const requiredText = (label: string, max = 255) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be ${max} characters or fewer.`);

export const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer.`)
    .optional()
    .or(z.literal(""));

export const optionalUrl = (label: string) =>
  z
    .string()
    .trim()
    .max(255, `${label} must be 255 characters or fewer.`)
    .url(`${label} must be a valid URL.`)
    .optional()
    .or(z.literal(""));

export const optionalStorageObjectName = (label: string) =>
  z
    .string()
    .trim()
    .max(255, `${label} must be 255 characters or fewer.`)
    .optional()
    .or(z.literal(""));

export function requiredOption<const Options extends readonly string[]>(
  label: string,
  options: Options,
) {
  return requiredText(label)
    .refine((value) => options.includes(value), {
      message: `Choose a valid ${label.toLowerCase()}.`,
    })
    .transform((value) => value as Options[number]);
}

export const dateString = (label: string) =>
  z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} must be a valid date.`)
    .refine(
      (value) => !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime()),
      {
        message: `${label} must be a valid date.`,
      },
    );

export function emptyToNull(value?: string) {
  const next = value?.trim();
  if (!next) return null;
  return next;
}
