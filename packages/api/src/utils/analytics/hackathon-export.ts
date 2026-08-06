import type {
  HackathonAnalyticsDemographic,
  HackathonAnalyticsExportKind,
  HackathonAnalyticsReportInput,
} from "@forge/validators";
import { serializeCsvRows } from "@forge/utils";

import type {
  buildHackathonAnalyticsReport,
  buildHackathonIdentifiedRows,
  HackathonAnalyticsSources,
} from "./hackathon-report";

export const DOCUMENTED_HACKATHON_DEMOGRAPHICS = [
  "age",
  "school",
  "major",
  "level_of_study",
  "inferred_year_of_study",
  "graduation",
  "gender",
  "race_or_ethnicity",
  "shirt_size",
  "country",
  "first_time_status",
] as const satisfies readonly HackathonAnalyticsDemographic[];

export type HackathonReport = ReturnType<typeof buildHackathonAnalyticsReport>;
type HackathonIdentifiedRows = ReturnType<typeof buildHackathonIdentifiedRows>;

export function normalizeHackathonExportReportInput(
  kind: HackathonAnalyticsExportKind,
  reportInput: HackathonAnalyticsReportInput,
) {
  if (kind !== "institutional_summary" && kind !== "sponsor") {
    return reportInput;
  }
  return {
    ...reportInput,
    audienceView: "composition" as const,
    compositionCohort: "applicants" as const,
    eventId: null,
    eventPurpose: "all" as const,
    eventTags: [],
    liveWindow: "whole_hackathon" as const,
    section: "reports" as const,
  };
}

interface HackathonExportContext {
  comparisonHackathon?: { displayName: string; id: string } | null;
  generatedAt: Date;
  hackathon: HackathonAnalyticsSources["hackathon"];
  reportInput: HackathonAnalyticsReportInput;
}

const HACKER_STATUSES = [
  "withdrawn",
  "pending",
  "accepted",
  "waitlisted",
  "checkedin",
  "confirmed",
  "denied",
] as const;

interface ExportRow {
  attendeeId?: string | null;
  category?: string | null;
  coverage?: number | null;
  demographic?: string | null;
  denominator?: number | null;
  distinctEvents?: number | null;
  eventAwardedPoints?: number | null;
  label?: string | null;
  lastAttendanceAt?: Date | null;
  lastEventName?: string | null;
  metric: string;
  numerator?: number | null;
  rank?: number | null;
  recordType: "audience" | "metadata" | "metric" | "points_leaderboard";
  value?: unknown;
  vip?: boolean | null;
}

function metadataRows(
  context: HackathonExportContext,
  disclosure:
    | "internal"
    | "institutional_sensitive"
    | "sponsor_privacy_reduced",
): ExportRow[] {
  return [
    {
      recordType: "metadata",
      metric: "metric_version",
      value: "hackathon-analytics-v1",
    },
    { recordType: "metadata", metric: "disclosure", value: disclosure },
    {
      recordType: "metadata",
      metric: "hackathon_id",
      value: context.hackathon.id,
    },
    {
      recordType: "metadata",
      metric: "hackathon_name",
      value: context.hackathon.displayName,
    },
    {
      recordType: "metadata",
      metric: "generated_at",
      value: context.generatedAt,
    },
    {
      recordType: "metadata",
      metric: "comparison_hackathon_id",
      value: context.reportInput.comparisonHackathonId,
    },
    {
      recordType: "metadata",
      metric: "comparison_hackathon_name",
      value: context.comparisonHackathon?.displayName ?? null,
    },
    {
      recordType: "metadata",
      metric: "section",
      value: context.reportInput.section,
    },
    {
      recordType: "metadata",
      metric: "event_id",
      value: context.reportInput.eventId,
    },
    {
      recordType: "metadata",
      metric: "event_purpose",
      value: context.reportInput.eventPurpose,
    },
    {
      recordType: "metadata",
      metric: "event_tags",
      value: context.reportInput.eventTags.join(" | "),
    },
    {
      recordType: "metadata",
      metric: "demographic",
      value: context.reportInput.demographic,
    },
    {
      recordType: "metadata",
      metric: "composition_cohort",
      value: context.reportInput.compositionCohort,
    },
    {
      recordType: "metadata",
      metric: "audience_view",
      value: context.reportInput.audienceView,
    },
    {
      recordType: "metadata",
      metric: "live_window",
      value: context.reportInput.liveWindow,
    },
  ];
}

function headlineRows(report: HackathonReport): ExportRow[] {
  return [
    {
      recordType: "metric",
      metric: "total_applications",
      value: report.overview.pipeline.applicants,
    },
    {
      recordType: "metric",
      metric: "pending_review_current_status",
      value: report.overview.pipeline.pending,
    },
    {
      recordType: "metric",
      metric: "accepted_current_status",
      value: report.overview.pipeline.accepted,
    },
    {
      recordType: "metric",
      metric: "confirmed_current_status",
      value: report.overview.pipeline.confirmed,
    },
    {
      recordType: "metric",
      metric: "checked_in",
      value: report.overview.pipeline.checkedIn,
    },
    {
      recordType: "metric",
      metric: "hackathon_event_count",
      value: report.events.summary.selectedEvents,
    },
    {
      recordType: "metric",
      metric: "on_site_event_engaged_count",
      value: report.events.summary.eventEngagedOnSite,
    },
    {
      recordType: "metric",
      metric: "repeat_event_engaged_count",
      value: report.events.summary.repeatEventEngaged,
    },
  ];
}

/** Applies threshold-five and complementary suppression to one count column. */
export function suppressSponsorComposition(
  slices: readonly { category: string; count: number }[],
  total: number,
  threshold = 5,
) {
  const suppressed = new Set(
    slices
      .map((row, index) => ({ index, row }))
      .filter(
        ({ row }) => row.count < threshold || total - row.count < threshold,
      )
      .map(({ index }) => index),
  );
  if (suppressed.size === 1 && slices.length > 1) {
    const complement = slices
      .map((row, index) => ({ index, row }))
      .filter(({ index }) => !suppressed.has(index))
      .sort(
        (left, right) =>
          left.row.count - right.row.count ||
          left.row.category.localeCompare(right.row.category),
      )[0];
    if (complement) suppressed.add(complement.index);
  }
  const released: {
    category: string;
    count: number | null;
    suppressed: boolean;
  }[] = slices
    .filter((_, index) => !suppressed.has(index))
    .map((row) => ({ ...row, suppressed: false }));
  if (suppressed.size > 0) {
    released.push({
      category: "Withheld / other",
      count: null,
      suppressed: true,
    });
  }
  return released;
}

function compositionRows(
  reports: ReadonlyMap<HackathonAnalyticsDemographic, HackathonReport>,
  privacyReduced: boolean,
): ExportRow[] {
  return DOCUMENTED_HACKATHON_DEMOGRAPHICS.flatMap((demographic) => {
    const report = reports.get(demographic);
    if (!report) return [];
    const slices = privacyReduced
      ? suppressSponsorComposition(
          report.audience.composition.rows,
          report.audience.composition.total,
        )
      : report.audience.composition.rows.map((slice) => ({
          ...slice,
          suppressed: false,
        }));
    return slices.map((slice) => ({
      category: slice.category,
      coverage: report.audience.coverage.rate,
      demographic,
      denominator: report.audience.composition.total,
      metric: "applicant_composition",
      numerator: slice.count,
      recordType: "audience" as const,
      value: slice.count,
    }));
  });
}

function overviewRows(report: HackathonReport): ExportRow[] {
  const pipeline = report.overview.pipeline;
  return [
    ...headlineRows(report),
    {
      metric: "pending_to_accepted_historical_conversion_available",
      recordType: "metric",
      value: pipeline.historicalAcceptanceConversionAvailable,
    },
    {
      metric: "accepted_to_confirmed_historical_conversion_available",
      recordType: "metric",
      value: pipeline.historicalAcceptanceConversionAvailable,
    },
    {
      denominator: pipeline.knownConfirmed,
      metric: "known_confirmed_to_check_in_rate",
      numerator: pipeline.knownConfirmedCheckedIn,
      recordType: "metric",
      value: pipeline.knownConfirmedToCheckInRate,
    },
    {
      metric: "pending_review",
      recordType: "metric",
      value: pipeline.pendingReview,
    },
    {
      metric: "withdrawn",
      recordType: "metric",
      value: pipeline.withdrawn,
    },
  ];
}

function applicationRows(report: HackathonReport): ExportRow[] {
  return [
    ...overviewRows(report),
    {
      metric: "final_seven_day_applications",
      recordType: "metric",
      value: report.applications.finalSevenDayCount,
    },
    ...report.applications.statusRows.map((row) => ({
      label: row.status,
      metric: "current_status",
      recordType: "metric" as const,
      value: row.count,
    })),
    ...report.applications.pendingAgeRows.map((row) => ({
      label: row.key,
      metric: "pending_review_age",
      recordType: "metric" as const,
      value: row.count,
    })),
    ...report.applications.dailyBuckets.map((bucket) => ({
      label: bucket.startAt.toISOString(),
      metric: "application_daily_bucket",
      numerator: bucket.cumulativeCount,
      recordType: "metric" as const,
      value: bucket.intervalCount,
    })),
    ...report.applications.confirmationBuckets.map((bucket) => ({
      label: bucket.startAt.toISOString(),
      metric: "confirmation_daily_bucket",
      numerator: bucket.cumulativeCount,
      recordType: "metric" as const,
      value: bucket.intervalCount,
    })),
    {
      coverage: report.applications.confirmationTimeCoverage.rate,
      denominator: report.applications.confirmationTimeCoverage.denominator,
      metric: "confirmation_timestamp_coverage",
      numerator: report.applications.confirmationTimeCoverage.numerator,
      recordType: "metric",
      value: report.applications.confirmationTimeCoverage.numerator,
    },
  ];
}

function eventRows(report: HackathonReport): ExportRow[] {
  const arrivals = report.events.arrivals;
  return [
    ...headlineRows(report),
    {
      metric: "selected_event_count",
      recordType: "metric",
      value: report.events.summary.selectedEvents,
    },
    {
      metric: "trusted_distinct_attendance",
      recordType: "metric",
      value: report.events.summary.distinctAttendance,
    },
    {
      metric: "trusted_attendance_occurrences",
      recordType: "metric",
      value: report.events.summary.occurrenceCount,
    },
    ...report.events.eventRows.map((event) => ({
      category: event.tag,
      denominator: event.occurrenceCount,
      label: event.name,
      metric: "event_attendance",
      numerator: event.distinctAttendance,
      recordType: "metric" as const,
      value: event.distinctAttendance,
    })),
    ...report.events.timeline.buckets.map((bucket) => ({
      label: bucket.startAt.toISOString(),
      metric: "hackathon_attendance_bucket",
      numerator: bucket.cumulativeOccurrenceCount,
      recordType: "metric" as const,
      value: bucket.occurrenceCount,
    })),
    ...(arrivals?.buckets.map((bucket) => ({
      denominator: arrivals.totalArrivalCount,
      label: bucket.startAt.toISOString(),
      metric: "selected_event_arrival_bucket",
      numerator: bucket.cumulativeCount,
      recordType: "metric" as const,
      value: bucket.intervalCount,
    })) ?? []),
    ...(arrivals?.classSeries.flatMap((series) =>
      series.buckets.map((bucket) => ({
        category: series.category,
        denominator: series.count,
        label: bucket.startAt.toISOString(),
        metric: "selected_event_class_arrival_bucket",
        numerator: bucket.cumulativeCount,
        recordType: "metric" as const,
        value: bucket.count,
      })),
    ) ?? []),
  ];
}

function liveRows(report: HackathonReport): ExportRow[] {
  return [
    {
      metric: "retained_check_in_attempts",
      recordType: "metric",
      value: report.live.attemptCount,
    },
    {
      coverage: report.live.successRate,
      denominator: report.live.attemptCount,
      metric: "retained_check_in_successes",
      numerator: report.live.successCount,
      recordType: "metric",
      value: report.live.successCount,
    },
    {
      metric: "active_operator_count",
      recordType: "metric",
      value: report.live.activeOperatorCount,
    },
    {
      metric: "attempts_per_minute",
      recordType: "metric",
      value: report.live.attemptsPerMinute,
    },
    ...report.live.throughputBuckets.map((bucket) => ({
      denominator: bucket.attemptCount,
      label: bucket.startAt.toISOString(),
      metric: "check_in_throughput_bucket",
      numerator: bucket.successCount,
      recordType: "metric" as const,
      value: bucket.attemptCount,
    })),
    ...report.live.outcomeRows.map((row) => ({
      label: row.outcome,
      metric: "check_in_outcome",
      recordType: "metric" as const,
      value: row.count,
    })),
    ...report.live.modeRows.map((row) => ({
      label: row.mode,
      metric: "check_in_mode",
      recordType: "metric" as const,
      value: row.count,
    })),
    ...report.live.eventRows.map((row) => ({
      label: row.category,
      metric: "check_in_attempts_by_event",
      recordType: "metric" as const,
      value: row.count,
    })),
    ...report.live.classRows.map((row) => ({
      label: row.category,
      metric: "check_in_attempts_by_class",
      recordType: "metric" as const,
      value: row.count,
    })),
    ...report.live.operatorRows.map((row) => ({
      label: row.label,
      metric: "check_in_attempts_by_operator_alias",
      recordType: "metric" as const,
      value: row.count,
    })),
  ];
}

function audienceRows(
  report: HackathonReport,
  reports: ReadonlyMap<HackathonAnalyticsDemographic, HackathonReport>,
): ExportRow[] {
  return [
    ...compositionRows(reports, false),
    ...report.audience.rows.flatMap((row) => [
      {
        category: row.category,
        demographic: report.audience.demographic,
        metric: "applicant_count",
        recordType: "audience" as const,
        value: row.applicantCount,
      },
      {
        category: row.category,
        demographic: report.audience.demographic,
        metric: "accepted_current_status_count",
        recordType: "audience" as const,
        value: row.acceptedCount,
      },
      {
        category: row.category,
        demographic: report.audience.demographic,
        metric: "confirmed_current_status_count",
        recordType: "audience" as const,
        value: row.confirmedCount,
      },
      {
        category: row.category,
        demographic: report.audience.demographic,
        metric: "checked_in_count",
        recordType: "audience" as const,
        value: row.checkedInCount,
      },
      {
        category: row.category,
        demographic: report.audience.demographic,
        denominator: row.knownConfirmedCount,
        metric: "known_confirmed_to_check_in_rate",
        numerator: row.knownConfirmedCheckedInCount,
        recordType: "audience" as const,
        value: row.knownConfirmedToCheckInRate,
      },
      {
        category: row.category,
        demographic: report.audience.demographic,
        denominator: row.onSiteCount,
        metric: "event_reach",
        numerator: row.eventEngagedCount,
        recordType: "audience" as const,
        value: row.eventReach,
      },
      {
        category: row.category,
        demographic: report.audience.demographic,
        denominator: row.eventEngagedCount,
        metric: "repeat_event_engaged_rate",
        numerator: row.repeatEventEngagedCount,
        recordType: "audience" as const,
        value: row.repeatEventEngagedRate,
      },
      {
        category: row.category,
        coverage: row.pointSnapshotCoverage.rate,
        demographic: report.audience.demographic,
        denominator: row.pointSnapshotCoverage.denominator,
        metric: "awarded_points",
        numerator: row.pointSnapshotCoverage.numerator,
        recordType: "audience" as const,
        value: row.awardedPoints,
      },
    ]),
  ];
}

function serializeExportRows(
  rows: readonly ExportRow[],
  includeIdentifiedColumns: boolean,
) {
  const aggregateColumns = [
    "record_type",
    "metric",
    "value",
    "numerator",
    "denominator",
    "coverage",
    "category",
    "demographic",
    "label",
  ];
  const identifiedColumns = [
    "attendee_id",
    "rank",
    "vip",
    "distinct_events",
    "event_awarded_points",
    "last_event_name",
    "last_attendance_at",
  ];
  return serializeCsvRows([
    [
      ...aggregateColumns,
      ...(includeIdentifiedColumns ? identifiedColumns : []),
    ],
    ...rows.map((row) => [
      row.recordType,
      row.metric,
      row.value,
      row.numerator,
      row.denominator,
      row.coverage,
      row.category,
      row.demographic,
      row.label,
      ...(includeIdentifiedColumns
        ? [
            row.attendeeId,
            row.rank,
            row.vip,
            row.distinctEvents,
            row.eventAwardedPoints,
            row.lastEventName,
            row.lastAttendanceAt,
          ]
        : []),
    ]),
  ]);
}

export function serializeHackathonAnalyticsExport(input: {
  compositions: ReadonlyMap<HackathonAnalyticsDemographic, HackathonReport>;
  context: HackathonExportContext;
  identifiedRows?: HackathonIdentifiedRows;
  kind: HackathonAnalyticsExportKind;
  report: HackathonReport;
}) {
  const { context, report } = input;
  let rows: ExportRow[];
  if (input.kind === "points_leaderboard") {
    rows = [
      ...metadataRows(context, "internal"),
      ...(input.identifiedRows?.points ?? []).map((row) => ({
        attendeeId: row.attendeeId,
        category: row.className,
        coverage: row.eventPointCoverage.rate,
        denominator: row.eventPointCoverage.denominator,
        distinctEvents: row.distinctEvents,
        eventAwardedPoints: row.eventAwardedPoints,
        label: row.name,
        lastAttendanceAt: row.lastAttendance?.checkedInAt ?? null,
        lastEventName: row.lastAttendance?.eventName ?? null,
        metric: "points_leaderboard",
        numerator: row.eventPointCoverage.numerator,
        rank: row.rank,
        recordType: "points_leaderboard" as const,
        value: row.points,
        vip: row.vip,
      })),
    ];
  } else if (input.kind === "institutional_summary") {
    const statusCount = new Map(
      report.applications.statusRows.map((row) => [row.status, row.count]),
    );
    rows = [
      ...metadataRows(context, "institutional_sensitive"),
      ...headlineRows(report),
      {
        recordType: "metric",
        metric: "final_seven_day_applications",
        value: report.applications.finalSevenDayCount,
      },
      ...HACKER_STATUSES.map((status) => ({
        label: status,
        metric: "current_status",
        recordType: "metric" as const,
        value: statusCount.get(status) ?? 0,
      })),
      {
        recordType: "metric",
        metric: "published_program_event_count",
        value: report.overview.publishedProgramEventCount,
      },
      {
        coverage: report.events.summary.pointSnapshotCoverage.rate,
        denominator: report.events.summary.pointSnapshotCoverage.denominator,
        metric: "trusted_attendance_point_coverage",
        numerator: report.events.summary.pointSnapshotCoverage.numerator,
        recordType: "metric",
        value: report.events.summary.occurrenceCount,
      },
      {
        recordType: "metric",
        metric: "retained_check_in_attempts",
        value: report.live.attemptCount,
      },
      {
        coverage: report.live.successRate,
        denominator: report.live.attemptCount,
        metric: "retained_check_in_successes",
        numerator: report.live.successCount,
        recordType: "metric",
        value: report.live.successCount,
      },
      ...report.live.modeRows.map((row) => ({
        label: row.mode,
        metric: "retained_check_in_mode",
        recordType: "metric" as const,
        value: row.count,
      })),
      ...report.live.outcomeRows.map((row) => ({
        label: row.outcome,
        metric: "retained_check_in_outcome",
        recordType: "metric" as const,
        value: row.count,
      })),
      {
        recordType: "metadata",
        metric: "failure_retention_coverage_starts_at",
        value: report.live.failureCoverageStartsAt,
      },
      ...compositionRows(input.compositions, false),
    ];
  } else if (input.kind === "sponsor") {
    rows = [
      ...metadataRows(context, "sponsor_privacy_reduced"),
      { recordType: "metadata", metric: "suppression_threshold", value: 5 },
      ...headlineRows(report),
      ...compositionRows(input.compositions, true),
    ];
  } else {
    const sectionRows =
      input.kind === "overview"
        ? overviewRows(report)
        : input.kind === "applications"
          ? applicationRows(report)
          : input.kind === "events"
            ? eventRows(report)
            : input.kind === "live_operations"
              ? liveRows(report)
              : audienceRows(report, input.compositions);
    rows = [...metadataRows(context, "internal"), ...sectionRows];
  }
  return {
    content: serializeExportRows(rows, input.kind === "points_leaderboard"),
    rowCount: rows.length,
  };
}
