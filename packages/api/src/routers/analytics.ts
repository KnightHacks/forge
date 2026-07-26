import { eq, isNull } from "@forge/db";
import { db } from "@forge/db/client";
import {
  DuesPayment,
  Event,
  EventAttendee,
  EventFeedbackConfig,
  FormResponse,
  Member,
} from "@forge/db/schemas/knight-hacks";
import {
  analyticsExportInputSchema,
  analyticsReportInputSchema,
} from "@forge/validators";

import type { ClubAnalyticsReport } from "../utils/analytics/report";
import { createTRPCRouter, permProcedure } from "../trpc";
import { createAdminAuditEvent } from "../utils/audit/service";
import { requireClubAnalyticsRead } from "../utils/analytics/access";
import {
  serializeInternalAnalyticsCsv,
  serializeSponsorAnalyticsCsv,
} from "../utils/analytics/export";
import { buildClubAnalyticsReport } from "../utils/analytics/report";

const CSV_MIME_TYPE = "text/csv;charset=utf-8";

async function loadClubAnalyticsSources() {
  const [members, events, attendances, dues, feedback] = await Promise.all([
    db
      .select({
        age: Member.age,
        dateCreated: Member.dateCreated,
        firstName: Member.firstName,
        gender: Member.gender,
        gradDate: Member.gradDate,
        id: Member.id,
        lastName: Member.lastName,
        levelOfStudy: Member.levelOfStudy,
        major: Member.major,
        points: Member.points,
        raceOrEthnicity: Member.raceOrEthnicity,
        school: Member.school,
        shirtSize: Member.shirtSize,
      })
      .from(Member),
    db
      .select({
        endAt: Event.end_datetime,
        hackathonId: Event.hackathonId,
        id: Event.id,
        location: Event.location,
        name: Event.name,
        startAt: Event.start_datetime,
        tag: Event.tag,
      })
      .from(Event)
      .where(isNull(Event.hackathonId)),
    db
      .select({
        eventId: EventAttendee.eventId,
        memberId: EventAttendee.memberId,
      })
      .from(EventAttendee)
      .innerJoin(Event, eq(EventAttendee.eventId, Event.id))
      .where(isNull(Event.hackathonId)),
    db
      .select({
        active: DuesPayment.active,
        id: DuesPayment.id,
        memberId: DuesPayment.memberId,
        paymentDate: DuesPayment.paymentDate,
        year: DuesPayment.year,
      })
      .from(DuesPayment),
    db
      .select({
        answers: FormResponse.responseData,
        eventId: EventFeedbackConfig.eventId,
        memberId: Member.id,
        responseId: FormResponse.id,
      })
      .from(FormResponse)
      .innerJoin(
        EventFeedbackConfig,
        eq(FormResponse.form, EventFeedbackConfig.formId),
      )
      .innerJoin(Event, eq(EventFeedbackConfig.eventId, Event.id))
      .leftJoin(Member, eq(FormResponse.userId, Member.userId))
      .where(isNull(Event.hackathonId)),
  ]);

  return { attendances, dues, events, feedback, members };
}

async function getClubAnalyticsReport(
  input: Parameters<typeof buildClubAnalyticsReport>[0]["input"],
) {
  const sources = await loadClubAnalyticsSources();
  return buildClubAnalyticsReport({
    ...sources,
    input,
    referenceDate: new Date(),
  });
}

function csvMetadata(report: ClubAnalyticsReport) {
  const tagLabel =
    report.metadata.filters.eventTags.length === 0
      ? "All event types"
      : report.metadata.filters.eventTags.join(" | ");
  const selectedEvent = report.filterOptions.events.find(
    (event) => event.id === report.metadata.filters.eventId,
  );
  const eventLabel = selectedEvent?.name ?? "All events";
  return {
    comparisonLabel: report.metadata.comparisonPeriod?.label ?? "No comparison",
    filterLabel: `${tagLabel}; ${eventLabel}; ${report.metadata.filters.demographic}`,
    metricVersion: report.metadata.metricVersion,
    periodLabel: report.metadata.period.label,
  };
}

function internalRows(
  kind: "overview" | "events" | "audience" | "dues",
  report: ClubAnalyticsReport,
): Record<string, unknown>[] {
  if (kind === "overview") {
    const summary = report.overview.summary;
    return [
      {
        metric: "Member profiles",
        record_subtype: "metric",
        value: report.overview.memberProfileCount,
      },
      {
        metric: "Club events",
        record_subtype: "metric",
        value: summary.eventCount,
      },
      {
        metric: "Distinct member-event attendances",
        record_subtype: "metric",
        value: summary.distinctAttendanceCount,
      },
      {
        metric: "Distinct attendees",
        record_subtype: "metric",
        value: summary.distinctAttendeeCount,
      },
      {
        metric: "Member reach",
        record_subtype: "metric",
        value: summary.memberReach,
      },
      {
        metric: "Repeat-attendee rate",
        record_subtype: "metric",
        value: summary.repeatAttendeeRate,
      },
      {
        metric: "Average attendance",
        record_subtype: "metric",
        value: summary.averageAttendance,
      },
      {
        metric: "Median attendance",
        record_subtype: "metric",
        value: summary.medianAttendance,
      },
      {
        metric: "Average overall rating",
        record_subtype: "metric",
        value: report.overview.feedback.averageOverall,
      },
      {
        metric: "Feedback responses",
        record_subtype: "metric",
        value: report.overview.feedback.responseCount,
      },
      {
        metric: "Current dues-paid rate",
        record_subtype: "metric",
        value: report.dues.summary.paidRate,
      },
      {
        metric: "Current unpaid profiles",
        record_subtype: "metric",
        value: report.dues.summary.unpaidCount,
      },
      ...Object.entries(report.overview.comparison ?? {}).map(
        ([metric, comparison]) => ({
          absolute_change: comparison.absolute,
          metric,
          percent_change: comparison.percent,
          record_subtype: "comparison",
        }),
      ),
      ...report.highlights.map((highlight) => ({
        destination: highlight.destination,
        filters: highlight.filters,
        highlight_kind: highlight.kind,
        message: highlight.message,
        record_subtype: "highlight",
      })),
      ...report.events.trend.rows.map((row) => ({
        ...row,
        grain: report.events.trend.grain,
        record_subtype: "turnout_trend",
      })),
      ...report.events.groupings.tag.map((row) => ({
        ...row,
        record_subtype: "program_mix",
      })),
    ];
  }
  if (kind === "events") {
    return [
      {
        ...report.events.summary,
        record_subtype: "summary",
      },
      ...report.events.rows.map((row) => ({
        attendance_count: row.attendanceCount,
        average_fun: row.feedback.averageFun,
        average_learning: row.feedback.averageLearning,
        average_overall: row.feedback.averageOverall,
        date: row.date,
        duration_minutes: row.durationMinutes,
        event_id: row.id,
        event_name: row.name,
        first_time_count: row.firstTimeCount,
        fun_response_count: row.feedback.funResponseCount,
        learning_response_count: row.feedback.learningResponseCount,
        location: row.location,
        overall_response_count: row.feedback.overallResponseCount,
        record_subtype: "event",
        response_count: row.feedback.responseCount,
        response_rate: row.feedback.responseRate,
        returning_count: row.returningCount,
        tag: row.tag,
        unmatched_response_count: row.feedback.unmatchedResponseCount,
      })),
      ...report.events.trend.rows.map((row) => ({
        ...row,
        grain: report.events.trend.grain,
        record_subtype: "turnout_trend",
      })),
      ...report.events.returnCohorts.map((row) => ({
        ...row,
        record_subtype: "return_cohort",
      })),
      ...Object.entries(report.events.groupings).flatMap(([grouping, rows]) =>
        rows.map((row) => ({
          ...row,
          grouping,
          record_subtype: "grouping",
        })),
      ),
      ...report.events.frequency.map((row) => ({
        ...row,
        record_subtype: "attendance_frequency",
      })),
      ...report.events.feedback.discovery.map((row) => ({
        ...row,
        record_subtype: "discovery_source",
      })),
      ...report.events.reliableTopRated.map((row) => ({
        ...row,
        record_subtype: "reliable_top_rated",
      })),
    ];
  }
  if (kind === "audience") {
    return [
      {
        ...report.audience.summary,
        record_subtype: "summary",
      },
      ...report.audience.demographics[
        report.audience.selectedDemographic
      ].rows.map((row) => ({
        ...row,
        demographic: report.audience.selectedDemographic,
        record_subtype: "demographic_segment",
      })),
      ...report.audience.affinity.map((row) => ({
        ...row,
        demographic: report.audience.selectedDemographic,
        record_subtype: "event_type_affinity",
      })),
      ...report.audience.memberRows.map((row) => ({
        ...row,
        record_subtype: "member",
      })),
    ];
  }
  return [
    {
      ...report.dues.summary,
      record_subtype: "summary",
    },
    ...report.dues.academicYears.map((row) => ({
      active_count: row.activeCount,
      denominator: row.denominator,
      label: row.label,
      recorded_count: row.recordedCount,
      recorded_rate: row.recordedRate,
      record_subtype: "academic_year",
      stale_count: row.staleCount,
    })),
    ...report.dues.academicYears.flatMap((row) =>
      row.curve.map((point) => ({
        ...point,
        academic_year: row.label,
        record_subtype: "collection_curve",
      })),
    ),
    ...report.dues.academicYears.flatMap((row) =>
      row.milestones.map((milestone) => ({
        ...milestone,
        academic_year: row.label,
        record_subtype: "coverage_milestone",
      })),
    ),
    ...Object.entries(report.dues.engagement).map(([duesStatus, row]) => ({
      ...row,
      dues_status: duesStatus,
      record_subtype: "attendance_engagement",
    })),
    ...report.dues.unpaidMembers.map((row) => ({
      ...row,
      record_subtype: "unpaid_member",
    })),
  ];
}

function sponsorMetrics(report: ClubAnalyticsReport) {
  const summary = report.events.summary;
  return [
    {
      coverage: null,
      denominator: null,
      metric: "Current Member profiles",
      numerator: null,
      value: report.overview.memberProfileCount,
    },
    {
      coverage: null,
      denominator: report.overview.memberProfileCount,
      metric: "New Member profiles in period",
      numerator: report.audience.summary.newProfileCount,
      value: report.audience.summary.newProfileCount,
    },
    {
      coverage: summary.memberReach,
      denominator: report.overview.memberProfileCount,
      metric: "Member reach",
      numerator: summary.distinctAttendeeCount,
      value: summary.memberReach,
    },
    {
      coverage: null,
      denominator: null,
      metric: "Club events held",
      numerator: summary.eventCount,
      value: summary.eventCount,
    },
    {
      coverage: null,
      denominator: null,
      metric: "Distinct member-event attendances",
      numerator: summary.distinctAttendanceCount,
      value: summary.distinctAttendanceCount,
    },
    {
      coverage: null,
      denominator: summary.distinctAttendeeCount,
      metric: "Repeat-attendee rate",
      numerator: report.audience.summary.repeatAttendeeCount,
      value: summary.repeatAttendeeRate,
    },
    {
      coverage: null,
      denominator: summary.eventCount,
      metric: "Average event turnout",
      numerator: summary.distinctAttendanceCount,
      value: summary.averageAttendance,
    },
    {
      coverage: null,
      denominator: summary.eventCount,
      metric: "Median event turnout",
      numerator: null,
      value: summary.medianAttendance,
    },
    {
      coverage: report.events.feedback.responseRate,
      denominator: report.events.feedback.overallResponseCount,
      metric: "Average overall event rating",
      numerator: null,
      value: report.overview.feedback.averageOverall,
    },
    {
      coverage: report.events.feedback.responseRate,
      denominator: summary.distinctAttendanceCount,
      metric: "Feedback responses",
      numerator: report.overview.feedback.responseCount,
      value: report.overview.feedback.responseCount,
    },
    ...report.events.groupings.tag.map((row) => ({
      coverage: null,
      denominator: summary.distinctAttendanceCount,
      metric: `Program type attendance: ${row.label}`,
      numerator: row.attendanceCount,
      value: row.attendanceCount,
    })),
    ...report.events.groupings.weekday.map((row) => ({
      coverage: null,
      denominator: summary.distinctAttendanceCount,
      metric: `Weekday attendance: ${row.label}`,
      numerator: row.attendanceCount,
      value: row.attendanceCount,
    })),
    ...report.events.groupings.startTime.map((row) => ({
      coverage: null,
      denominator: summary.distinctAttendanceCount,
      metric: `Start-time attendance: ${row.label}`,
      numerator: row.attendanceCount,
      value: row.attendanceCount,
    })),
    ...report.events.groupings.duration.map((row) => ({
      coverage: null,
      denominator: summary.distinctAttendanceCount,
      metric: `Duration attendance: ${row.label}`,
      numerator: row.attendanceCount,
      value: row.attendanceCount,
    })),
  ];
}

function safeFileToken(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "report"
  );
}

export const analyticsRouter = createTRPCRouter({
  /** Returns complete read-only Club analytics; source rows are never exposed. */
  getReport: permProcedure
    .input(analyticsReportInputSchema)
    .query(async ({ ctx, input }) => {
      requireClubAnalyticsRead(ctx);
      return getClubAnalyticsReport(input);
    }),

  /** Returns an internal section CSV or a separately privacy-reduced sponsor CSV. */
  exportReport: permProcedure
    .input(analyticsExportInputSchema)
    .query(async ({ ctx, input }) => {
      requireClubAnalyticsRead(ctx);
      const { kind, ...reportInput } = input;
      const report = await getClubAnalyticsReport(reportInput);
      const metadata = csvMetadata(report);
      const content =
        kind === "sponsor"
          ? serializeSponsorAnalyticsCsv({
              audienceRows: Object.entries(
                report.audience.demographics,
              ).flatMap(([demographic, dimension]) =>
                dimension.rows.map((row) => ({
                  attendeeCount: row.attendeeCount,
                  category: row.category,
                  demographic,
                  memberCount: row.baseCount,
                })),
              ),
              generatedAt: report.metadata.generatedAt,
              metadata,
              metrics: sponsorMetrics(report),
              suppressionThreshold: report.reports.sponsorSuppressionThreshold,
            })
          : serializeInternalAnalyticsCsv({
              generatedAt: report.metadata.generatedAt,
              kind,
              metadata,
              rows: internalRows(kind, report),
            });
      await createAdminAuditEvent({
        actionKey: "analytics.report.exported",
        actor: ctx.session.user,
        metadata: {
          dateFrom:
            reportInput.period.kind === "custom"
              ? reportInput.period.from.toISOString()
              : null,
          dateTo:
            reportInput.period.kind === "custom"
              ? reportInput.period.to.toISOString()
              : null,
          eventIds: reportInput.eventId ? [reportInput.eventId] : [],
          kind,
          rowCount: Math.max(0, content.split(/\r?\n/).length - 1),
        },
        subjects: [
          {
            relation: "primary",
            targetId: kind,
            targetLabel: `${kind} analytics report`,
            targetType: "analytics_report",
          },
        ],
      });
      return {
        content,
        fileName: `club-analytics-${kind}-${safeFileToken(report.metadata.period.label)}.csv`,
        mimeType: CSV_MIME_TYPE,
      };
    }),
});
