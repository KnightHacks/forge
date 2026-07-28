import type { getDiscordAnalyticsReport } from "./discord-report";
import type { AnalyticsCsvMetadata } from "./export";
import type { ClubAnalyticsReport } from "./report";

type DiscordAnalyticsReport = Awaited<
  ReturnType<typeof getDiscordAnalyticsReport>
>;

export function csvMetadata(report: ClubAnalyticsReport): AnalyticsCsvMetadata {
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

export function discordCsvMetadata(
  report: DiscordAnalyticsReport,
): AnalyticsCsvMetadata {
  return {
    comparisonLabel: "Not applicable",
    filterLabel:
      "Discord activity and matched Member counts; event filters are not applied",
    metricVersion: report.metadata.metricVersion,
    periodLabel: report.metadata.period.label,
  };
}

export function discordRows(
  report: DiscordAnalyticsReport,
): Record<string, unknown>[] {
  const summaryMetrics = [
    ["Current messages", report.summary.messageCount],
    ["Human-authored messages", report.summary.humanMessageCount],
    ["Human participants", report.summary.uniqueHumanAuthors],
    [
      "Average human messages per participant",
      report.summary.averageHumanMessagesPerAuthor,
    ],
    [
      "Median human messages per participant",
      report.summary.medianHumanMessagesPerAuthor,
    ],
    ["Messages per observed day", report.summary.averageMessagesPerDay],
    ["Active days", report.summary.activeDays],
    ["Observed calendar days", report.summary.calendarDays],
    ["Active-day rate", report.summary.activeDayRate],
    ["Active surfaces", report.summary.activeSurfaceCount],
    ["Visible channels", report.summary.visibleChannels],
    ["Visible threads", report.summary.visibleThreads],
    ["Active-surface rate", report.summary.activeSurfaceRate],
    ["Deletion tombstones", report.summary.tombstonedMessageCount],
  ] as const;

  return [
    ...summaryMetrics.map(([metric, value]) => ({
      metric,
      record_subtype: "summary",
      value,
    })),
    ...report.mix.map((row) => ({
      category: row.label,
      count: row.count,
      record_subtype: "sender_mix",
      share: row.share,
    })),
    ...report.trend.rows.map((row) => ({
      active_surfaces: row.activeChannels,
      date: row.date,
      messages: row.messages,
      record_subtype: "daily_activity",
    })),
    ...report.channels.map((row) => ({
      count: row.count,
      is_thread: row.isThread,
      record_subtype: "top_surface",
      share: row.share,
      surface: row.label,
      surface_type: row.type,
    })),
    ...report.memberRows.map((row) => ({
      active_days: row.activeDays,
      active_surfaces: row.activeChannels,
      discord_username: row.discordUser,
      last_message_at: row.lastMessageAt,
      member_id: row.memberId,
      member_name: row.name,
      message_count: row.messageCount,
      record_subtype: "member",
    })),
    {
      complete_surface_count: report.coverage.completeSurfaceCount,
      coverage_rate: report.coverage.coverage,
      last_backfill_progress_at: report.coverage.lastBackfillProgressAt,
      last_gateway_event_at: report.coverage.lastGatewayEventAt,
      last_live_write_at: report.coverage.lastLiveWriteAt,
      last_reconciled_at: report.coverage.lastReconciledAt,
      record_subtype: "archive_coverage",
      status: report.coverage.status,
      total_surface_count: report.coverage.totalSurfaceCount,
    },
  ];
}

export function internalRows(
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

export function sponsorMetrics(report: ClubAnalyticsReport) {
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
