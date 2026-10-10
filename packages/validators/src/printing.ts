import { z } from "zod";

import { PRINTING } from "@forge/consts";

const uuidSchema = z.string().uuid();

const DAY_MS = 24 * 60 * 60 * 1_000;
/** How far ahead an organizer may promise a print. */
export const MAX_PRINT_ESTIMATE_OVERRIDE_DAYS = 7;

export const printJobCategorySchema = z.enum(PRINTING.PRINT_JOB_CATEGORIES);
export const printingUpdateCategoryInputSchema = z
  .object({
    jobId: uuidSchema,
    category: printJobCategorySchema,
  })
  .strict();

export const printJobStatusSchema = z.enum(PRINTING.PRINT_JOB_STATUSES);

export const printJobDescriptionSchema = z
  .string()
  .trim()
  .min(1, "Describe what you want printed.")
  .max(PRINTING.MAX_PRINT_JOB_DESCRIPTION_LENGTH);

/** Trimmed; an empty note is stored as null. */
const printJobNoteSchema = z
  .string()
  .trim()
  .max(PRINTING.MAX_PRINT_JOB_NOTE_LENGTH)
  .transform((note) => (note === "" ? null : note));

export const printingHackathonInputSchema = z
  .object({ hackathonId: uuidSchema })
  .strict();

export const printingListInputSchema = z
  .object({
    hackathonId: uuidSchema,
    /** One status, `"active"` for every open status, or absent for all. */
    status: z.union([printJobStatusSchema, z.literal("active")]).optional(),
  })
  .strict();

export const printingFileDownloadInputSchema = z
  .object({ fileId: uuidSchema })
  .strict();

export const printingUpdateStatusInputSchema = z
  .object({
    jobId: uuidSchema,
    note: printJobNoteSchema.nullish(),
    status: printJobStatusSchema,
  })
  .strict()
  .refine(
    (input) =>
      !(
        PRINTING.NOTE_REQUIRED_PRINT_JOB_STATUSES as readonly string[]
      ).includes(input.status) || Boolean(input.note),
    {
      message: "Tell the hacker what you need clarified.",
      path: ["note"],
    },
  );

export const printingSetChannelInputSchema = z
  .object({
    channelId: z
      .string()
      .regex(/^\d{17,20}$/, "Choose a Discord channel.")
      .nullable(),
    hackathonId: uuidSchema,
  })
  .strict();

export const printingSetAvailabilityInputSchema = z
  .object({ hackathonId: uuidSchema, isOpen: z.boolean() })
  .strict();

export const printingSetEstimateSettingsInputSchema = z
  .object({
    hackathonId: uuidSchema,
    printMinutes: z
      .number()
      .int()
      .min(PRINTING.MIN_PRINT_MINUTES)
      .max(PRINTING.MAX_PRINT_MINUTES),
    printerCount: z
      .number()
      .int()
      .min(PRINTING.MIN_PRINTER_COUNT)
      .max(PRINTING.MAX_PRINTER_COUNT),
  })
  .strict();

export const printingSetEstimatedReadyAtInputSchema = z
  .object({
    estimatedReadyAt: z
      .date()
      .refine((date) => date.getTime() > Date.now(), {
        message: "Choose a time in the future.",
      })
      .refine(
        (date) =>
          date.getTime() <=
          Date.now() + MAX_PRINT_ESTIMATE_OVERRIDE_DAYS * DAY_MS,
        {
          message: `Choose a time within ${MAX_PRINT_ESTIMATE_OVERRIDE_DAYS} days.`,
        },
      )
      .nullable(),
    jobId: uuidSchema,
  })
  .strict();
