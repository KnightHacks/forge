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

const discordReport = {
  channels: [
    {
      count: 60,
      isThread: false,
      label: "general",
      share: 0.6,
      type: 0,
    },
  ],
  coverage: {
    completeSurfaceCount: 52,
    coverage: 1,
    lastBackfillProgressAt: new Date("2026-07-16T11:58:00.000Z"),
    lastGatewayEventAt: new Date("2026-07-16T11:59:00.000Z"),
    lastLiveWriteAt: new Date("2026-07-16T11:59:00.000Z"),
    lastReconciledAt: new Date("2026-07-16T11:57:00.000Z"),
    status: "healthy",
    totalSurfaceCount: 52,
  },
  metadata: {
    generatedAt: new Date("2026-07-16T12:00:00.000Z"),
    metricVersion: "discord-analytics-v1",
    period: {
      end: new Date("2026-08-01T04:00:00.000Z"),
      kind: "current_academic_year",
      label: "2025-2026 academic school year",
      observationEnd: new Date("2026-07-16T12:00:00.000Z"),
      start: new Date("2025-08-01T04:00:00.000Z"),
    },
  },
  memberRows: [
    {
      activeChannels: 4,
      activeDays: 8,
      discordUser: "ada",
      lastMessageAt: new Date("2026-07-16T11:00:00.000Z"),
      memberId: "00000000-0000-4000-8000-000000000001",
      messageCount: 32,
      name: "Ada Lovelace",
    },
  ],
  mix: [
    { count: 75, kind: "human", label: "People", share: 0.75 },
    { count: 10, kind: "bot", label: "Bots", share: 0.1 },
    { count: 10, kind: "webhook", label: "Webhooks", share: 0.1 },
    { count: 5, kind: "system", label: "System", share: 0.05 },
  ],
  summary: {
    activeDays: 2,
    activeDayRate: 0.2,
    activeSurfaceCount: 4,
    activeSurfaceRate: 4 / 52,
    averageHumanMessagesPerAuthor: 75 / 18,
    averageMessagesPerDay: 10,
    calendarDays: 10,
    humanMessageCount: 75,
    messageCount: 100,
    medianHumanMessagesPerAuthor: 3,
    tombstonedMessageCount: 2,
    uniqueAuthors: 18,
    uniqueHumanAuthors: 18,
    visibleChannels: 24,
    visibleThreads: 28,
  },
  trend: {
    grain: "day",
    rows: [
      { activeChannels: 3, date: "2026-07-15", messages: 40 },
      { activeChannels: 4, date: "2026-07-16", messages: 60 },
    ],
  },
} as RouterOutputs["analytics"]["getDiscordReport"];

function renderSection(
  section: "audience" | "discord" | "dues" | "events" | "overview" | "reports",
  selectedReport = report,
  access = {
    canEditMembers: false,
    canOpenEvents: false,
    canOpenMembers: false,
  },
) {
  return renderToStaticMarkup(
    createElement(AnalyticsDashboard, {
      access,
      discordReport,
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
    expect(html).toContain("Discord");
    expect(html).toContain("Audience");
    expect(html).toContain("Dues");
    expect(html).toContain("Reports");
    expect(html).toContain("Member profiles");
    expect(html).toContain("New profiles");
    expect(html).toContain("Repeat rate");
    expect(html).toContain("30-day return");
    expect(html).toContain("Discord participants");
    expect(html).toContain("Messages / participant");
    expect(html).toContain("Define Member profiles");
  });

  it("renders aggregate Discord analytics without raw archive records", () => {
    const html = renderSection("discord");

    expect(html).toContain("Current messages");
    expect(html).toContain("People posting");
    expect(html).toContain("Messages per person");
    expect(html).toContain("Most active surfaces");
    expect(html).toContain("Member message drill-down");
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain(">32<");
    expect(html).toContain("general");
    expect(html).toContain("Discord activity on Jul 15, 2026");
    expect(html).toContain("Define Current messages");
    expect(html).toContain("Healthy");
    expect(html).toContain("Updated");
    expect(html).not.toContain("Aggregate activity only");
    expect(html).not.toContain("discord-analytics-v1");
    expect(html).not.toContain("Ingestion context");
    expect(html).not.toContain("raw-message-sentinel");
    expect(html).not.toContain("authorDiscordUserId");
  });

  it("makes matched Discord members actionable when Member access is available", () => {
    const html = renderSection("discord", report, {
      canEditMembers: true,
      canOpenEvents: false,
      canOpenMembers: true,
    });

    expect(html).toMatch(/<button[^>]*>Ada Lovelace<\/button>/);
  });

  it("uses the shared Member action for every named analytics drill-down", () => {
    const namedReport = {
      ...report,
      audience: {
        ...report.audience,
        memberRows: [
          {
            attendanceCount: 2,
            category: "Undergraduate University",
            lastEventAt: new Date("2026-07-10T12:00:00Z"),
            lastEventName: "TypeScript Workshop",
            memberId: "00000000-0000-4000-8000-000000000001",
            name: "Ada Lovelace",
            paid: false,
          },
        ],
      },
      dues: {
        ...report.dues,
        unpaidMembers: [
          {
            attendanceCount: 2,
            graduationYear: "2027",
            lastEventAt: new Date("2026-07-10T12:00:00Z"),
            lastEventName: "TypeScript Workshop",
            memberId: "00000000-0000-4000-8000-000000000001",
            name: "Ada Lovelace",
            points: 20,
          },
        ],
      },
    } as RouterOutputs["analytics"]["getReport"];
    const memberAccess = {
      canEditMembers: false,
      canOpenEvents: false,
      canOpenMembers: true,
    };

    expect(renderSection("audience", namedReport, memberAccess)).toMatch(
      /<button[^>]*>Ada Lovelace<\/button>/,
    );
    expect(renderSection("dues", namedReport, memberAccess)).toMatch(
      /<button[^>]*>Ada Lovelace<\/button>/,
    );
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

  it("adds aggregate Discord context without changing Audience or dues identity boundaries", () => {
    const audience = renderSection("audience");
    const dues = renderSection("dues");

    expect(audience).not.toContain("Discord audience context");
    expect(audience).toContain("Discord participants");
    expect(audience).not.toContain("Data coverage");
    expect(audience).not.toContain("authorDiscordUserId");
    expect(dues).not.toContain("Discord community context");
    expect(dues).toContain("Human messages");
    expect(dues).not.toContain("authorDiscordUserId");
  });

  it("renders enrichment detail on every analytics metric card", () => {
    for (const section of [
      "overview",
      "events",
      "discord",
      "audience",
      "dues",
    ] as const) {
      const html = renderSection(section);
      const cardCount = html.match(
        /data-analytics-metric-card="true"/g,
      )?.length;
      const detailCount = html.match(
        /data-analytics-metric-detail="true"/g,
      )?.length;

      expect(cardCount, `${section} metric cards`).toBeGreaterThan(0);
      expect(detailCount, `${section} metric details`).toBe(cardCount);
    }
  });

  it("[TC-020, TC-022] separates internal exports from the sponsor-safe report", () => {
    const html = renderSection("reports");

    expect(html).toContain("Overview data");
    expect(html).toContain("Audience data");
    expect(html).toContain("Dues data");
    expect(html).toContain("Discord summary");
    expect(html).toContain("Member resume bundle");
    expect(html).toContain("Download ZIP");
    expect(html).toContain("xl:grid-cols-3");
    expect(html).toContain("Sponsor-safe report");
    expect(html).toContain("Privacy reduced");
    expect(html).toContain(
      "Sparse and complementary demographic cells under five",
    );
  });

  it("combines the two undergraduate MLH levels only in audience rendering", () => {
    const undergraduateRows = [
      {
        attendeeCount: 4,
        audienceShare: 0.4,
        baseCount: 8,
        baseShare: 0.4,
        category:
          "Undergraduate University (2 year - community college or similar)",
        duesPaidRate: 0.5,
        participationRate: 0.5,
        repeatAttendeeRate: 0.25,
        representationGap: 0,
      },
      {
        attendeeCount: 6,
        audienceShare: 0.6,
        baseCount: 12,
        baseShare: 0.6,
        category: "Undergraduate University (3+ year)",
        duesPaidRate: 0.75,
        participationRate: 0.5,
        repeatAttendeeRate: 0.5,
        representationGap: 0,
      },
    ];
    const audienceReport = {
      ...report,
      audience: {
        ...report.audience,
        demographics: {
          ...report.audience.demographics,
          level_of_study: { coverageRate: 1, rows: undergraduateRows },
        },
        memberRows: [
          {
            attendanceCount: 1,
            category: "Undergraduate University (3+ year)",
            lastEventAt: null,
            lastEventName: null,
            memberId: "member-1",
            name: "Ada Lovelace",
            paid: true,
          },
        ],
      },
    } as unknown as RouterOutputs["analytics"]["getReport"];

    const html = renderSection("audience", audienceReport);

    expect(html).toContain("Undergraduate University");
    expect(html).not.toContain("community college or similar");
    expect(html).not.toContain("Undergraduate University (3+ year)");
    expect(html).toContain(">20<");
    expect(html).toContain(">10<");
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
    expect(html).toContain("A linked brief across profile activation");
    expect(html).toContain("Grow membership");
    expect(html).toContain("Deepen engagement");
    expect(html).toContain("Sustain community conversation");
    expect(html).toContain("Plan programming &amp; turnout");
    expect(html).toContain("Understand audience");
    expect(html).toContain("Collect &amp; renew dues");
    expect(html).toContain("Improve measurement");
    expect(html).toContain("tag=Social");
    expect(html).toContain("section=discord");
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
