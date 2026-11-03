import { z } from "zod";

import { JOB_BOARD } from "@forge/consts";

import { normalizeCompanyName, usCityKeySchema } from "./career";

export const jobTrackSchema = z.enum(JOB_BOARD.JOB_TRACKS);
export const jobCategorySchema = z.enum(JOB_BOARD.JOB_CATEGORIES);
export const applicationStageSchema = z.enum(JOB_BOARD.APPLICATION_STAGES);
export const applicationVisibilitySchema = z.enum(
  JOB_BOARD.APPLICATION_VISIBILITIES,
);

const ROUND_STAGES: readonly JOB_BOARD.ApplicationStage[] =
  JOB_BOARD.APPLICATION_ROUND_STAGES;

/** Whether a numbered interview round can be recorded for this stage. */
export function stageAllowsRound(stage: JOB_BOARD.ApplicationStage) {
  return ROUND_STAGES.includes(stage);
}

/**
 * Grouping key for a company label, shared by jobs and custom alert targets.
 * A custom company name becomes a key, so both share one length limit.
 */
export const companyKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(JOB_BOARD.MAX_ALERT_CUSTOM_VALUE_LENGTH)
  .refine(
    (value) => value === normalizeCompanyName(value),
    "Use a normalized company key.",
  );

const customValueSchema = z
  .string()
  .trim()
  .max(
    JOB_BOARD.MAX_ALERT_CUSTOM_VALUE_LENGTH,
    `Use ${JOB_BOARD.MAX_ALERT_CUSTOM_VALUE_LENGTH} characters or fewer.`,
  );

/**
 * A company chosen from search, or a custom name entered through Other. Uses
 * the same `{ kind: "option" | "other" }` shape as the forms platform.
 */
export const companyTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("option"), value: companyKeySchema }).strict(),
  z
    .object({
      kind: z.literal("other"),
      text: customValueSchema.refine(
        (text) => normalizeCompanyName(text).length >= 2,
        "Enter a company name.",
      ),
    })
    .strict(),
]);

/** A U.S. city chosen from search, U.S. remote, or a custom value from Other. */
export const locationTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("option"), value: usCityKeySchema }).strict(),
  z
    .object({
      kind: z.literal("remote_us" satisfies JOB_BOARD.JobLocationKind),
    })
    .strict(),
  z
    .object({
      kind: z.literal("other"),
      text: customValueSchema.min(2, "Enter a location."),
    })
    .strict(),
]);

const pageSchema = z.coerce.number().int().min(1).default(1);
const limitSchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(JOB_BOARD.JOB_SEARCH_MAX_LIMIT)
  .default(JOB_BOARD.JOB_SEARCH_DEFAULT_LIMIT);

/** Treats a cleared search param (`?company=`) the same as a missing one. */
function searchParam<T extends z.ZodType>(schema: T) {
  return z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    schema,
  );
}

/**
 * Explore filters. Blade keeps these in the URL, so every field accepts the
 * string form a search param arrives in. Unknown params are dropped instead of
 * rejected, because the URL can carry params this schema doesn't own.
 */
export const jobSearchInputSchema = z.object({
  category: searchParam(jobCategorySchema.optional()),
  cityKey: searchParam(usCityKeySchema.optional()),
  company: searchParam(companyKeySchema.optional()),
  includeInactive: searchParam(z.stringbool().or(z.boolean()).default(false)),
  limit: searchParam(limitSchema),
  page: searchParam(pageSchema),
  postedWithin: searchParam(z.enum(JOB_BOARD.JOB_POSTED_WITHIN).optional()),
  query: searchParam(
    z.string().trim().max(JOB_BOARD.JOB_SEARCH_MAX_QUERY_LENGTH).optional(),
  ),
  remoteUs: searchParam(z.stringbool().or(z.boolean()).default(false)),
  sort: searchParam(z.enum(JOB_BOARD.JOB_SORTS).default("newest")),
  state: searchParam(
    z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, "Use a two-letter state code.")
      .optional(),
  ),
  track: searchParam(jobTrackSchema.optional()),
});

export const jobIdInputSchema = z.object({ jobId: z.string().uuid() }).strict();

export const companyViewInputSchema = z
  .object({ company: companyKeySchema, track: jobTrackSchema.optional() })
  .strict();

const applicationRoundSchema = z
  .number()
  .int()
  .min(1)
  .max(JOB_BOARD.MAX_APPLICATION_ROUND);

const applicationNotesSchema = z
  .string()
  .max(
    JOB_BOARD.MAX_APPLICATION_NOTES_LENGTH,
    `Notes must be ${JOB_BOARD.MAX_APPLICATION_NOTES_LENGTH} characters or fewer.`,
  )
  .transform((value) => (value.trim().length > 0 ? value : null));

export const applicationSaveInputSchema = z
  .object({
    jobId: z.string().uuid(),
    privateNotes: applicationNotesSchema.nullable().optional(),
    round: applicationRoundSchema.nullable().optional(),
    stage: applicationStageSchema.default("saved"),
    visibility: applicationVisibilitySchema.default(
      JOB_BOARD.DEFAULT_APPLICATION_VISIBILITY,
    ),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.round != null && !stageAllowsRound(input.stage)) {
      context.addIssue({
        code: "custom",
        message: "Rounds apply only while interviewing.",
        path: ["round"],
      });
    }
  })
  .transform((input) => ({
    ...input,
    privateNotes: input.privateNotes ?? null,
    round: input.round ?? null,
  }));

/**
 * Partial update. When `stage` is omitted the API checks `round` against the
 * stored stage, so this schema can only reject combinations it can see.
 */
export const applicationUpdateInputSchema = z
  .object({
    applicationId: z.string().uuid(),
    privateNotes: applicationNotesSchema.nullable().optional(),
    round: applicationRoundSchema.nullable().optional(),
    stage: applicationStageSchema.optional(),
    visibility: applicationVisibilitySchema.optional(),
  })
  .strict()
  .superRefine((input, context) => {
    const changesSomething =
      input.privateNotes !== undefined ||
      input.round !== undefined ||
      input.stage !== undefined ||
      input.visibility !== undefined;
    if (!changesSomething) {
      context.addIssue({
        code: "custom",
        message: "Change at least one field.",
        path: [],
      });
    }
    if (
      input.stage !== undefined &&
      input.round != null &&
      !stageAllowsRound(input.stage)
    ) {
      context.addIssue({
        code: "custom",
        message: "Rounds apply only while interviewing.",
        path: ["round"],
      });
    }
  });

export const applicationIdInputSchema = z
  .object({ applicationId: z.string().uuid() })
  .strict();

export const peopleInProcessInputSchema = z
  .object({
    company: companyKeySchema.optional(),
    limit: limitSchema,
    page: pageSchema,
    role: z
      .string()
      .trim()
      .max(JOB_BOARD.JOB_SEARCH_MAX_QUERY_LENGTH)
      .transform((value) => (value.length > 0 ? value : undefined))
      .optional(),
    stage: applicationStageSchema.optional(),
    track: jobTrackSchema.optional(),
  })
  .strict();

// Keyed by ALERT_TARGET_KINDS so renaming or adding a kind in consts fails
// typecheck here instead of drifting from the database enum.
const ALERT_TARGET_SCHEMAS = {
  company: companyTargetSchema,
  location: locationTargetSchema,
} satisfies Record<JOB_BOARD.AlertTargetKind, z.ZodType>;

function alertPreferenceOption<K extends JOB_BOARD.AlertTargetKind>(kind: K) {
  return z
    .object({
      kind: z.literal(kind),
      target: ALERT_TARGET_SCHEMAS[kind],
      track: jobTrackSchema,
    })
    .strict();
}

const alertPreferenceFields = z.discriminatedUnion("kind", [
  alertPreferenceOption("company"),
  alertPreferenceOption("location"),
]);

export const alertPreferenceCreateInputSchema = alertPreferenceFields;

export const alertPreferenceUpdateInputSchema = z
  .object({
    preference: alertPreferenceFields,
    preferenceId: z.string().uuid(),
  })
  .strict();

export const alertPreferenceIdInputSchema = z
  .object({ preferenceId: z.string().uuid() })
  .strict();

export const digestOptInInputSchema = z
  .object({ enabled: z.boolean(), track: jobTrackSchema })
  .strict();

export type CompanyTarget = z.infer<typeof companyTargetSchema>;
export type LocationTarget = z.infer<typeof locationTargetSchema>;
export type JobSearchInput = z.infer<typeof jobSearchInputSchema>;
export type ApplicationSaveInput = z.infer<typeof applicationSaveInputSchema>;
export type ApplicationUpdateInput = z.infer<
  typeof applicationUpdateInputSchema
>;
export type PeopleInProcessInput = z.infer<typeof peopleInProcessInputSchema>;
export type AlertPreferenceInput = z.infer<
  typeof alertPreferenceCreateInputSchema
>;
export type DigestOptInInput = z.infer<typeof digestOptInInputSchema>;
