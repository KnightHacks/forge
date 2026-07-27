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
  "graduation",
  "gender",
  "race_or_ethnicity",
  "shirt_size",
]);

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

const eventTagSchema = z.string().trim().min(1).max(100);

const analyticsReportInputBaseSchema = z.object({
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
export type AnalyticsSection = z.infer<typeof analyticsSectionSchema>;
