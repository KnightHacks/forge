import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { RouterOutputs } from "@forge/api";
import { analyticsReportInputSchema } from "@forge/validators";

import { AnalyticsDashboard } from "~/app/_components/admin/analytics/analytics-dashboard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("~/trpc/react", () => ({
  api: {
    useUtils: () => ({
      analytics: { exportReport: { fetch: vi.fn() } },
    }),
  },
}));

const emptyDemographic = { coverageRate: null, rows: [] };
const report = {
  audience: {
    affinity: [],
    demographics: {
      age: emptyDemographic,
      gender: emptyDemographic,
      graduation: emptyDemographic,
      level_of_study: emptyDemographic,
      major: emptyDemographic,
      race_or_ethnicity: emptyDemographic,
      school: emptyDemographic,
      shirt_size: emptyDemographic,
    },
    memberRows: [],
    selectedDemographic: "level_of_study",
    summary: {
      attendeeCount: 0,
      dataCoverage: null,
      memberProfileCount: 4,
      newProfileCount: 0,
      repeatAttendeeCount: 0,
    },
  },
  dues: {
    academicYears: [
      {
        activeCount: 1,
        curve: [],
        denominator: 4,
        label: "2025-2026",
        milestones: [
          { date: new Date("2025-09-01T00:00:00.000Z"), threshold: 0.25 },
          { date: null, threshold: 0.5 },
          { date: null, threshold: 0.75 },
          { date: null, threshold: 0.9 },
        ],
        recordedCount: 1,
        recordedRate: 0.25,
        staleCount: 0,
        startYear: 2025,
      },
    ],
    engagement: {
      paid: {
        distinctAttendanceCount: 0,
        profileCount: 1,
        reachedCount: 0,
        reachRate: 0,
        repeatCount: 0,
        repeatRate: null,
      },
      unpaid: {
        distinctAttendanceCount: 0,
        profileCount: 3,
        reachedCount: 0,
        reachRate: 0,
        repeatCount: 0,
        repeatRate: null,
      },
    },
    summary: { paidCount: 1, paidRate: 0.25, profileCount: 4, unpaidCount: 3 },
    unpaidMembers: [],
  },
  events: {
    feedback: {
      averageFun: null,
      averageLearning: null,
      averageOverall: null,
      discovery: [],
      discoveryResponseCount: 0,
      funResponseCount: 0,
      learningResponseCount: 0,
      overallResponseCount: 0,
      responseCount: 0,
      responseRate: null,
      unmatchedResponseCount: 0,
    },
    frequency: [
      { count: 4, label: "0" },
      { count: 0, label: "1" },
    ],
    groupings: {
      duration: [],
      location: [],
      month: [],
      startTime: [],
      tag: [],
      weekday: [],
    },
    reliableTopRated: [],
    returnCohorts: [
      { days: 30, matureCount: 0, rate: null, returnedCount: 0 },
      { days: 60, matureCount: 0, rate: null, returnedCount: 0 },
      { days: 90, matureCount: 0, rate: null, returnedCount: 0 },
    ],
    rows: [],
    summary: {
      averageAttendance: null,
      distinctAttendanceCount: 0,
      distinctAttendeeCount: 0,
      eventCount: 0,
      medianAttendance: null,
      memberReach: 0,
      repeatAttendeeRate: null,
    },
    trend: { grain: "month", rows: [] },
  },
  filterOptions: { events: [], tags: [] },
  highlights: [],
  metadata: {
    comparisonPeriod: null,
    filters: {
      demographic: "level_of_study",
      eventId: null,
      eventTags: [],
    },
    generatedAt: new Date("2026-07-16T12:00:00.000Z"),
    metricVersion: "club-analytics-v1",
    period: {
      end: new Date("2026-08-01T04:00:00.000Z"),
      kind: "current_academic_year",
      label: "2025-2026 academic school year",
      observationEnd: new Date("2026-07-16T12:00:00.000Z"),
      start: new Date("2025-08-01T04:00:00.000Z"),
    },
  },
  overview: {
    comparison: null,
    feedback: { averageOverall: null, responseCount: 0 },
    memberProfileCount: 4,
    summary: {
      averageAttendance: null,
      distinctAttendanceCount: 0,
      distinctAttendeeCount: 0,
      eventCount: 0,
      medianAttendance: null,
      memberReach: 0,
      repeatAttendeeRate: null,
    },
  },
  reports: {
    internalKinds: ["overview", "events", "audience", "dues"],
    sponsorSuppressionThreshold: 5,
  },
} as unknown as RouterOutputs["analytics"]["getReport"];

function renderSection(
  section: "audience" | "dues" | "events" | "overview" | "reports",
  selectedReport = report,
) {
  return renderToStaticMarkup(
    createElement(AnalyticsDashboard, {
      access: { canOpenEvents: false, canOpenMembers: false },
      input: analyticsReportInputSchema.parse({ section }),
      report: selectedReport,
    }),
  );
}

describe("AnalyticsDashboard", () => {
  it("[TC-022] renders the complete section navigation and metric definitions", () => {
    const html = renderSection("overview");

    expect(html).toContain("Club intelligence");
    expect(html).toContain("2025-2026 academic school year");
    expect(html).toContain("Overview");
    expect(html).toContain("Events");
    expect(html).toContain("Audience");
    expect(html).toContain("Dues");
    expect(html).toContain("Reports");
    expect(html).toContain("Member profiles");
    expect(html).toContain("New profiles");
    expect(html).toContain("Repeat rate");
    expect(html).toContain("30-day return");
    expect(html).toContain("Define Member profiles");
  });

  it("[TC-023] preserves known profile and unpaid counts when events are empty", () => {
    const overview = renderSection("overview");
    const dues = renderSection("dues");
    const events = renderSection("events");

    expect(overview).toContain(">4<");
    expect(overview).toContain("No matching event trend");
    expect(events).toContain("No Club events match this selection");
    expect(dues).toContain("Unpaid");
    expect(dues).toContain(">3<");
    expect(dues).toContain("no active dues credit recorded");
  });

  it("[TC-020, TC-022] separates internal exports from the sponsor-safe report", () => {
    const html = renderSection("reports");

    expect(html).toContain("Overview data");
    expect(html).toContain("Audience data");
    expect(html).toContain("Dues data");
    expect(html).toContain("Sponsor-safe report");
    expect(html).toContain("Privacy reduced");
    expect(html).toContain(
      "Sparse and complementary demographic cells under five",
    );
  });

  it("[TC-024] contains labeled horizontal table regions", () => {
    const html = renderSection("dues");

    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Academic-year dues comparison"');
    expect(html).toContain("max-w-full overflow-x-auto");
  });

  it("[TC-024] paginates unbounded analytical tables without truncating their totals", () => {
    const eventRows = Array.from({ length: 11 }, (_, index) => ({
      attendanceCount: index,
      date: new Date(
        `2025-09-${String(index + 1).padStart(2, "0")}T18:00:00.000Z`,
      ),
      durationMinutes: 60,
      feedback: {
        averageFun: null,
        averageLearning: null,
        averageOverall: null,
        funResponseCount: 0,
        learningResponseCount: 0,
        overallResponseCount: 0,
        responseCount: 0,
        responseRate: null,
      },
      firstTimeCount: index,
      id: `event-${index + 1}`,
      location: "Room 101",
      name: `Paginated Event ${index + 1}`,
      returningCount: 0,
      tag: "Social",
    }));
    const selectedReport = {
      ...report,
      events: { ...report.events, rows: eventRows },
    } as RouterOutputs["analytics"]["getReport"];
    const html = renderSection("events", selectedReport);

    expect(html).toContain("Showing 1–10 of 11");
    expect(html).toContain("1 / 2");
    expect(html).toContain(
      'aria-label="Next page of Complete matching event analytics"',
    );
    expect(html).toContain("Paginated Event 10");
    expect(html).not.toContain("Paginated Event 11");
  });

  it("[TC-026] sections formula-backed observations into an action brief", () => {
    const selectedReport = {
      ...report,
      highlights: [
        {
          destination: "audience",
          filters: {},
          group: "membership",
          kind: "profile_creation",
          message: "20 retained Member profiles were created.",
        },
        {
          destination: "events",
          filters: { eventTag: "Social" },
          group: "programming",
          kind: "event_tag_growth",
          message:
            "Social attendance increased 400% versus the comparison period.",
        },
        {
          destination: "events",
          filters: {},
          group: "engagement",
          kind: "first_attendee_return",
          message: "40% of first-time attendees returned within 30 days.",
        },
        {
          destination: "events",
          filters: {},
          group: "programming",
          kind: "schedule_performance",
          message:
            "Monday · 8 PM or later averaged 30 attendees across 3 events.",
        },
        {
          destination: "audience",
          filters: { demographic: "level_of_study" },
          group: "audience",
          kind: "audience_underrepresented",
          message: "Graduate is underrepresented among attendees.",
        },
        {
          destination: "dues",
          filters: {},
          group: "dues",
          kind: "unpaid_event_reach",
          message: "12 of 20 currently unpaid profiles attended an event.",
        },
        {
          destination: "events",
          filters: {},
          group: "measurement",
          kind: "feedback_coverage",
          message: "No linked feedback responses are available.",
        },
      ],
    } as RouterOutputs["analytics"]["getReport"];
    const html = renderSection("overview", selectedReport);

    expect(html).toContain("Member lifecycle findings");
    expect(html).toContain("What changed across profile activation");
    expect(html).toContain("Grow membership");
    expect(html).toContain("Deepen engagement");
    expect(html).toContain("Plan programming &amp; turnout");
    expect(html).toContain("Understand audience");
    expect(html).toContain("Collect &amp; renew dues");
    expect(html).toContain("Improve measurement");
    expect(html).toContain("tag=Social");
    expect(html.indexOf("Grow membership")).toBeLessThan(
      html.indexOf("Deepen engagement"),
    );
    expect(html.indexOf("Deepen engagement")).toBeLessThan(
      html.indexOf("Plan programming &amp; turnout"),
    );
    expect(html.indexOf("Plan programming &amp; turnout")).toBeLessThan(
      html.indexOf("Understand audience"),
    );
  });
});
