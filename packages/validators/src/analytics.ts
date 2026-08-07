import { z } from "zod";

const TEN_YEARS_MS = 10 * 366 * 24 * 60 * 60 * 1000;

export const analyticsSectionSchema = z.enum([
  "overview",
  "events",
  "discord",
  "audience",
  "dues",
  "reports",
]);

export const analyticsDemographicSchema = z.enum([
  "age",
  "school",
  "major",
  "level_of_study",
  "inferred_year_of_study",
  "graduation",
  "gender",
  "race_or_ethnicity",
  "shirt_size",
]);

export const clubAudienceCohortSchema = z
  .enum(["all_profiles", "reached"])
  .default("all_profiles");

export const hackathonAnalyticsSectionSchema = z.enum([
  "overview",
  "applications",
  "events",
  "live_operations",
  "audience",
  "reports",
]);

export const hackathonAnalyticsDemographicSchema = z.enum([
  ...analyticsDemographicSchema.options,
  "country",
  "first_time_status",
]);

export const hackathonCompositionCohortSchema = z
  .enum([
    "applicants",
    "pending",
    "accepted",
    "confirmed",
    "on_site",
    "event_engaged",
  ])
  .default("applicants");

export const analyticsAudienceViewSchema = z
  .enum(["composition", "engagement"])
  .default("composition");

export const hackathonAnalyticsEventPurposeSchema = z
  .enum(["program", "primary_check_in", "legacy_unknown", "all"])
  .default("all");

export const hackathonLiveWindowSchema = z
  .enum([
    "last_15_minutes",
    "last_hour",
    "since_event_start",
    "whole_hackathon",
  ])
  .default("whole_hackathon");

const hackathonEventTagSchema = z.string().trim().min(1).max(100);

/** Read-only selections for one explicitly scoped Hackathon Analytics report. */
export const hackathonAnalyticsReportInputSchema = z
  .object({
    audienceView: analyticsAudienceViewSchema,
    comparisonHackathonId: z.uuid().nullable().default(null),
    compositionCohort: hackathonCompositionCohortSchema,
    demographic: hackathonAnalyticsDemographicSchema.default("level_of_study"),
    eventId: z.uuid().nullable().default(null),
    eventPurpose: hackathonAnalyticsEventPurposeSchema,
    eventTags: z
      .array(hackathonEventTagSchema)
      .max(20)
      .transform((tags) => [...new Set(tags)])
      .default([]),
    hackathonId: z.uuid(),
    liveWindow: hackathonLiveWindowSchema,
    section: hackathonAnalyticsSectionSchema.default("overview"),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.comparisonHackathonId === value.hackathonId) {
      ctx.addIssue({
        code: "custom",
        message:
          "Comparison hackathon must differ from the selected hackathon.",
        path: ["comparisonHackathonId"],
      });
    }
    if (value.liveWindow === "since_event_start" && value.eventId === null) {
      ctx.addIssue({
        code: "custom",
        message: "Since-event-start requires one selected event.",
        path: ["eventId"],
      });
    }
  });

export const hackathonAnalyticsExportKindSchema = z.enum([
  "overview",
  "applications",
  "events",
  "live_operations",
  "audience",
  "points_leaderboard",
  "institutional_summary",
  "sponsor",
]);

export const hackathonAnalyticsExportInputSchema = z
  .object({
    kind: hackathonAnalyticsExportKindSchema,
    report: hackathonAnalyticsReportInputSchema,
  })
  .strict();

export const hackathonResumePoolSchema = z
  .enum([
    "current_confirmed",
    "on_site",
    "current_selected",
    "custom_current_statuses",
  ])
  .default("current_confirmed");

const resumeCurrentStatusSchema = z.enum([
  "withdrawn",
  "pending",
  "accepted",
  "waitlisted",
  "checkedin",
  "confirmed",
  "denied",
]);

const resumePreparationSchema = z.object({
  partNumber: z.number().int().min(1).max(10_000),
  planFingerprint: z
    .string()
    .trim()
    .min(8)
    .max(128)
    .regex(/^[A-Za-z0-9_-]+$/),
  policyAcknowledged: z.literal(true),
  policyVersion: z.literal("resume-sensitive-index-v1"),
});

const resumePreviewPolicySchema = z.object({
  policyAcknowledged: z.literal(true),
  policyVersion: z.literal("resume-sensitive-index-v1"),
});

/** Officer-triggered, aggregate-only preview before any ZIP transport. */
export const resumeBundlePreviewInputSchema = z
  .discriminatedUnion("scope", [
    resumePreviewPolicySchema
      .extend({
        currentStatuses: z
          .array(resumeCurrentStatusSchema)
          .max(7)
          .transform((statuses) => [...new Set(statuses)])
          .default([]),
        hackathonId: z.uuid(),
        pool: hackathonResumePoolSchema,
        scope: z.literal("hackathon"),
      })
      .strict(),
    resumePreviewPolicySchema.extend({ scope: z.literal("club") }).strict(),
  ])
  .superRefine((value, ctx) => {
    if (value.scope !== "hackathon") return;
    const hasCustomStatuses = value.currentStatuses.length > 0;
    if (value.pool === "custom_current_statuses" && !hasCustomStatuses) {
      ctx.addIssue({
        code: "custom",
        message: "Custom resume pools require at least one current status.",
        path: ["currentStatuses"],
      });
    }
    if (value.pool !== "custom_current_statuses" && hasCustomStatuses) {
      ctx.addIssue({
        code: "custom",
        message: "Current statuses are only valid for a custom resume pool.",
        path: ["currentStatuses"],
      });
    }
  });

/**
 * Transport contract for one staged resume archive part. The server still
 * rebuilds the plan and bounds `partNumber` against its actual part count.
 */
export const resumeBundlePartInputSchema = z
  .discriminatedUnion("scope", [
    resumePreparationSchema
      .extend({
        currentStatuses: z
          .array(resumeCurrentStatusSchema)
          .max(7)
          .transform((statuses) => [...new Set(statuses)])
          .default([]),
        hackathonId: z.uuid(),
        pool: hackathonResumePoolSchema,
        scope: z.literal("hackathon"),
      })
      .strict(),
    resumePreparationSchema
      .extend({
        scope: z.literal("club"),
      })
      .strict(),
  ])
  .superRefine((value, ctx) => {
    if (value.scope !== "hackathon") return;
    const hasCustomStatuses = value.currentStatuses.length > 0;
    if (value.pool === "custom_current_statuses" && !hasCustomStatuses) {
      ctx.addIssue({
        code: "custom",
        message: "Custom resume pools require at least one current status.",
        path: ["currentStatuses"],
      });
    }
    if (value.pool !== "custom_current_statuses" && hasCustomStatuses) {
      ctx.addIssue({
        code: "custom",
        message: "Current statuses are only valid for a custom resume pool.",
        path: ["currentStatuses"],
      });
    }
  });

export const analyticsComparisonSchema = z.enum([
  "previous_period",
  "previous_academic_year",
  "none",
]);

export const analyticsPeriodSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("current_semester") }),
  z.object({ kind: z.literal("current_academic_year") }),
  z.object({
    kind: z.literal("academic_year"),
    startYear: z.number().int().min(2000).max(2100),
  }),
  z.object({ kind: z.literal("all_time") }),
  z
    .object({
      from: z.date(),
      kind: z.literal("custom"),
      to: z.date(),
    })
    .superRefine(({ from, to }, ctx) => {
      const duration = to.getTime() - from.getTime();
      if (duration <= 0) {
        ctx.addIssue({
          code: "custom",
          message: "The end date must be after the start date.",
          path: ["to"],
        });
      } else if (duration > TEN_YEARS_MS) {
        ctx.addIssue({
          code: "custom",
          message: "Custom analytics ranges cannot exceed ten years.",
          path: ["to"],
        });
      }
    }),
]);

export const teamPerformanceReportInputSchema = z
  .object({
    period: analyticsPeriodSchema.default({ kind: "current_academic_year" }),
    teamSlug: z.string().trim().min(1).max(64),
  })
  .strict();

const eventTagSchema = z.string().trim().min(1).max(100);

const analyticsReportInputBaseSchema = z.object({
  audienceView: analyticsAudienceViewSchema,
  clubAudienceCohort: clubAudienceCohortSchema,
  comparison: analyticsComparisonSchema.optional(),
  demographic: analyticsDemographicSchema.default("level_of_study"),
  eventId: z.uuid().nullable().default(null),
  eventTags: z
    .array(eventTagSchema)
    .max(20)
    .transform((tags) => [...new Set(tags)])
    .default([]),
  period: analyticsPeriodSchema.default({ kind: "current_academic_year" }),
  section: analyticsSectionSchema.default("overview"),
});

function withComparisonDefault<
  Value extends z.output<typeof analyticsReportInputBaseSchema>,
>(value: Value) {
  const comparison =
    value.comparison ??
    (value.period.kind === "all_time"
      ? "none"
      : value.period.kind === "current_academic_year" ||
          value.period.kind === "academic_year"
        ? "previous_academic_year"
        : "previous_period");
  return { ...value, comparison };
}

/** Shared input for the complete read-only Club analytics report. */
export const analyticsReportInputSchema =
  analyticsReportInputBaseSchema.transform(withComparisonDefault);

export const analyticsExportKindSchema = z.enum([
  "overview",
  "events",
  "discord",
  "audience",
  "dues",
  "sponsor",
]);

/** Read-only CSV export request; sponsor output applies a separate privacy policy. */
export const analyticsExportInputSchema = analyticsReportInputBaseSchema
  .extend({ kind: analyticsExportKindSchema })
  .transform(withComparisonDefault);

export type AnalyticsComparison = z.infer<typeof analyticsComparisonSchema>;
export type AnalyticsDemographic = z.infer<typeof analyticsDemographicSchema>;
export type AnalyticsExportInput = z.infer<typeof analyticsExportInputSchema>;
export type AnalyticsExportKind = z.infer<typeof analyticsExportKindSchema>;
export type AnalyticsPeriod = z.infer<typeof analyticsPeriodSchema>;
export type AnalyticsReportInput = z.infer<typeof analyticsReportInputSchema>;
export type TeamPerformanceReportInput = z.infer<
  typeof teamPerformanceReportInputSchema
>;
export type AnalyticsSection = z.infer<typeof analyticsSectionSchema>;
export type ClubAudienceCohort = z.infer<typeof clubAudienceCohortSchema>;
export type HackathonAnalyticsDemographic = z.infer<
  typeof hackathonAnalyticsDemographicSchema
>;
export type HackathonAnalyticsExportKind = z.infer<
  typeof hackathonAnalyticsExportKindSchema
>;
export type HackathonAnalyticsReportInput = z.infer<
  typeof hackathonAnalyticsReportInputSchema
>;
export type HackathonAnalyticsSection = z.infer<
  typeof hackathonAnalyticsSectionSchema
>;
export type HackathonCompositionCohort = z.infer<
  typeof hackathonCompositionCohortSchema
>;
export type ResumeBundlePartInput = z.infer<typeof resumeBundlePartInputSchema>;
export type ResumeBundlePreviewInput = z.infer<
  typeof resumeBundlePreviewInputSchema
>;
