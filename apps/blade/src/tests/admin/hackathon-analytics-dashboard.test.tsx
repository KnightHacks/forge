import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { hackathonAnalyticsReportInputSchema } from "@forge/validators";

import { HackathonAnalyticsDashboard } from "~/app/_components/admin/analytics/hackathon-analytics-dashboard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("~/trpc/react", () => ({
  api: {
    analytics: {
      getHackerAnalyticsProfile: { useQuery: vi.fn() },
      previewResumeBundle: {
        useQuery: vi.fn(() => ({
          data: {
            partCount: 1,
            parts: [{ partNumber: 1 }],
            planFingerprint: "cached-preview-fingerprint",
            skippedCount: 0,
            validCount: 3,
          },
          error: null,
          isLoading: false,
        })),
      },
    },
    useUtils: () => ({
      analytics: { exportHackathonReport: { fetch: vi.fn() } },
    }),
  },
}));

const hackathonId = "10000000-0000-4000-8000-000000000001";
const eventId = "20000000-0000-4000-8000-000000000001";
const attendeeId = "30000000-0000-4000-8000-000000000001";
const report = {
  applications: {
    anomalies: { atOrAfterDeadline: 0, beforeOpen: 0 },
    breakdowns: { gender: [] },
    confirmationBuckets: [],
    confirmationTimeCoverage: { denominator: 8, numerator: 6, rate: 0.75 },
    dailyBuckets: [
      {
        cumulativeCount: 3,
        elapsedDay: 0,
        endAt: new Date(),
        intervalCount: 3,
        startAt: new Date(),
      },
    ],
    deadlineMarkers: [],
    dietary: {
      missing: 2,
      other: 1,
      recorded: 6,
      tags: [{ count: 2, tag: "Peanuts" }],
    },
    finalSevenDayCount: 3,
    firstTimeRows: [],
    firstTimeState: {
      coverage: { denominator: 8, numerator: 8, rate: 1 },
      nativeVsLegacyDerivedProvenance: "unavailable",
    },
    nextDeadline: null,
    pendingAgeRows: [{ count: 2, key: "7d_plus" }],
    rates: { confirmation: 0.8, selection: 0.5 },
    shirtSizeCoverage: { denominator: 8, numerator: 7, rate: 0.875 },
    shirtSizeRows: [],
    statusRows: [{ count: 4, status: "confirmed" }],
  },
  audience: {
    composition: {
      cohort: "applicants",
      rows: [
        {
          category: "Woman",
          color: "var(--chart-1)",
          count: 6,
          protected: false,
          share: 0.75,
        },
        {
          category: "Missing",
          color: "var(--chart-2)",
          count: 2,
          protected: true,
          share: 0.25,
        },
      ],
      slices: [
        {
          category: "Woman",
          color: "var(--chart-1)",
          count: 6,
          protected: false,
        },
        {
          category: "Missing",
          color: "var(--chart-2)",
          count: 2,
          protected: true,
        },
      ],
      total: 8,
    },
    coverage: { denominator: 8, numerator: 6, rate: 0.75 },
    demographic: "gender",
    dietary: {
      missing: 2,
      other: 1,
      recorded: 6,
      tags: [{ count: 2, tag: "Peanuts" }],
    },
    rows: [
      {
        acceptedCount: 1,
        applicantCount: 6,
        category: "Woman",
        checkedInCount: 4,
        confirmedCount: 1,
        currentConfirmedCount: 4,
        currentConfirmedRate: 0.8,
        currentSelectedCount: 5,
        currentSelectedRate: 5 / 6,
        knownConfirmedCheckedInCount: 4,
        knownConfirmedCount: 5,
        knownConfirmedToCheckInRate: 0.8,
        awardedPointShare: 1,
        eventEngagedCount: 3,
        eventReach: 0.75,
        eventsPerOnSite: 1.5,
        onSiteCount: 4,
        onSiteRate: 1,
        pointSnapshotCoverage: { denominator: 2, numerator: 2, rate: 1 },
        repeatEventEngagedRate: 0.5,
        representationGap: 0,
      },
    ],
    totals: {
      applicants: 8,
      eventEngagedOnSite: 2,
      onSite: 4,
      onSiteAwardedPoints: 10,
      repeatEventEngagedOnSite: 1,
    },
  },
  events: {
    arrivals: {
      afterEndCount: 0,
      afterStartCount: 2,
      beforeStartCount: 0,
      buckets: [
        {
          cumulativeCount: 2,
          endAt: new Date(),
          intervalCount: 2,
          startAt: new Date(),
        },
      ],
      classCoverage: { denominator: 2, numerator: 2, rate: 1 },
      classSeries: [
        {
          category: "Gold",
          buckets: [{ count: 2, endAt: new Date(), startAt: new Date() }],
        },
      ],
      p50Bucket: null,
      p90Bucket: null,
      peakBucket: null,
      schedule: { endAt: new Date(), startAt: new Date(), valid: true },
      totalArrivalCount: 2,
      timestampCoverage: { denominator: 2, numerator: 2, rate: 1 },
    },
    eventRows: [
      {
        distinctAttendance: 2,
        id: eventId,
        legacy: false,
        firstAttendanceCount: 2,
        location: "Atrium",
        name: "Lunch",
        occurrenceCount: 2,
        published: true,
        purpose: "event",
        returningAttendanceCount: 0,
        startAt: new Date(),
        tag: "Food",
      },
    ],
    classParticipationRows: [],
    demographicRows: [],
    frequencyRows: [],
    groupings: {
      duration: [],
      location: [],
      startTime: [],
      tag: [
        {
          category: "Food",
          distinctAttendance: 3,
          distinctAttendeeCount: 2,
          eventCount: 1,
          eventReach: 0.5,
          occurrenceCount: 4,
          onSiteAttendeeCount: 2,
        },
      ],
      weekday: [],
    },
    summary: {
      distinctAttendance: 2,
      eventEngagedOnSite: 2,
      eventMedian: 2,
      eventReach: 0.5,
      legacyUnknownPurposeEvents: 0,
      occurrenceCount: 2,
      pointSnapshotCoverage: { denominator: 2, numerator: 2, rate: 1 },
      pointsAwarded: 10,
      repeatEventEngaged: 1,
      repeatEventEngagedRate: 0.5,
      trustedProgramEvents: 1,
    },
    timeline: {
      bucketWidthMinutes: 60,
      buckets: [],
      timestampCoverage: { denominator: 2, numerator: 2, rate: 1 },
    },
  },
  live: {
    activeOperatorCount: 2,
    attemptCount: 4,
    attemptsPerMinute: 0.5,
    classRows: [{ category: "Gold", count: 2 }],
    eventRows: [{ category: "Lunch", count: 4 }],
    failureCoverageState: "partial",
    failureCoverageStartsAt: new Date(),
    issueCount: 1,
    minorRows: [
      { count: 1, key: "minor" },
      { count: 2, key: "adult" },
      { count: 1, key: "unknown" },
    ],
    modeRows: [{ count: 4, mode: "scanner" }],
    oldestRetainedFailedAttemptAt: new Date(),
    operatorRows: [{ count: 4, label: "Operator 1" }],
    outcomeRows: [{ count: 3, outcome: "checked_in" }],
    repeatOccurrenceCount: 0,
    roleHealth: {
      errorRows: [],
      oldestUnresolvedAgeMilliseconds: null,
      oldestUnresolvedAt: null,
      oldestUnresolvedLastAttemptAt: null,
      retryCount: 0,
      rows: [],
    },
    successCount: 3,
    successRate: 0.75,
    throughputBuckets: [],
    peakThroughput: null,
    unresolvedRoleGrantCount: 1,
    vipRows: [
      { count: 1, key: "vip" },
      { count: 3, key: "non_vip" },
      { count: 0, key: "unknown" },
    ],
    window: { endAt: new Date(), startAt: new Date() },
  },
  metadata: {
    generatedAt: new Date(),
    hackathon: {
      applicationDeadline: new Date(),
      applicationOpen: new Date(),
      confirmationDeadline: new Date(),
      displayName: "Knight Hacks 2026",
      endDate: new Date(),
      id: hackathonId,
      startDate: new Date(),
    },
    metricVersion: "hackathon-analytics-v1",
    nativeVsLegacyDerivedFirstTimeProvenance: "unavailable",
  },
  options: {
    eventTags: ["Food"],
    events: [
      {
        id: eventId,
        legacy: false,
        name: "Lunch",
        purpose: "event",
        tag: "Food",
      },
    ],
  },
  overview: {
    actionBrief: [
      {
        available: true,
        evidence: [{ key: "applicants", value: 8 }],
        kind: "manage_application_demand",
        navigation: { section: "applications" },
      },
    ],
    nextLifecycleDeadline: null,
    pipeline: {
      accepted: 1,
      applicants: 8,
      checkedIn: 4,
      confirmed: 1,
      confirmationRate: 0.8,
      currentConfirmed: 4,
      currentSelected: 5,
      historicalAcceptanceConversionAvailable: false,
      knownConfirmedCheckedIn: 4,
      knownConfirmed: 5,
      knownConfirmedToCheckInRate: 0.8,
      onSite: 4,
      onSiteCurrentConfirmed: 4,
      onSiteOutsideCurrentConfirmed: 0,
      onSiteRate: 1,
      pending: 2,
      pendingReview: 2,
      selectionRate: 0.625,
      withdrawn: 0,
    },
    publishedProgramEventCount: 1,
  },
  points: {
    participantCount: 8,
    pointsCoverage: { denominator: 2, numerator: 2, rate: 1 },
    topPoints: 20,
  },
};

const identifiedRows = {
  points: [
    {
      attendeeId,
      classColor: "#ffaa00",
      className: "Gold",
      distinctEvents: 2,
      eventAwardedPoints: 10,
      eventPointCoverage: { denominator: 2, numerator: 2, rate: 1 },
      lastAttendance: null,
      name: "Ada Lovelace",
      points: 20,
      rank: 1,
      vip: false,
    },
  ],
};

function render(
  section:
    | "applications"
    | "audience"
    | "events"
    | "live_operations"
    | "overview"
    | "reports",
  audienceView: "composition" | "engagement" = "composition",
) {
  return renderToStaticMarkup(
    createElement(HackathonAnalyticsDashboard, {
      canAccessClub: true,
      canPrepareResumes: true,
      identifiedRows: identifiedRows as never,
      input: hackathonAnalyticsReportInputSchema.parse({
        demographic: "gender",
        eventId: section === "events" ? eventId : null,
        hackathonId,
        section,
        audienceView,
      }),
      options: [report.metadata.hackathon] as never,
      report: report as never,
    }),
  );
}

describe("HackathonAnalyticsDashboard", () => {
  it("renders the Club-consistent six-section shell without judging or projects", () => {
    const html = render("overview");
    expect(html).toContain("Hackathon intelligence");
    for (const section of [
      "Overview",
      "Applications",
      "Events",
      "Live operations",
      "Audience",
      "Reports",
    ]) {
      expect(html).toContain(section);
    }
    expect(html).not.toContain("Judging");
    expect(html).not.toContain("Projects");
    expect(html).toContain("Organizer action brief");
  });

  it("renders event arrival tabs and an actionable points leaderboard", () => {
    const html = render("events");
    expect(html).toContain("Popular event tags");
    expect(html).toContain("Unique hackers");
    expect(html).toContain("Lunch arrivals");
    expect(html).toContain("Overall");
    expect(html).toContain("By class");
    expect(html).toContain("Points leaderboard");
    expect(html).toMatch(/<button[^>]*>Ada Lovelace<\/button>/);
  });

  it("renders demographic composition as a pie and engagement as a local view", () => {
    const html = render("audience");
    expect(html).toContain("Composition");
    expect(html).toContain("Engagement");
    expect(html).toContain("Composition of 8 profiles");
    expect(html).toContain("Woman");
    expect(html).toContain("Missing");
    expect(html).toContain("Class year (inferred)");
    for (const demographic of [
      "Gender",
      "Race / ethnicity",
      "Age group",
      "Class year (inferred)",
      "Level of study",
      "Major",
    ]) {
      expect(html).toContain(demographic);
    }

    const engagement = render("audience", "engagement");
    expect(engagement).toContain("Applicants");
    expect(engagement).toContain("Accepted");
    expect(engagement).toContain("Confirmed → check-in");
    expect(engagement).toContain("Repeat rate");
    expect(engagement).toContain("Point coverage");
  });

  it("uses exact application-state language and does not invent commitment", () => {
    const html = render("applications");
    expect(html).toContain("Pending review");
    expect(html).toContain("Accepted");
    expect(html).toContain("Confirmed");
    expect(html).toContain("Checked in");
    expect(html).toContain("Accepted → confirmed");
    expect(html).toContain("Unavailable");
    expect(html).not.toMatch(/admitted|committed/i);
  });

  it("renders retained live-operation coverage and staffing breakdowns", () => {
    const html = render("live_operations");
    expect(html).toContain("Partial history");
    expect(html).toContain("Operator load");
    expect(html).toContain("Event load");
    expect(html).toContain("Class load");
    expect(html).toContain("Attempt-time cohorts");
    expect(html).toContain("Role delivery health");
  });

  it("renders exact organizer exports and the recruiter-indexed resume bundle", () => {
    const html = render("reports");
    expect(html).toContain("Overview data");
    expect(html).toContain("Applications data");
    expect(html).toContain("Events data");
    expect(html).toContain("Live operations data");
    expect(html).toContain("Audience data");
    expect(html).toContain("MLH / UCF institutional summary");
    expect(html).toContain("Sponsor-safe report");
    expect(html).toContain("Recruiter resume bundle");
    expect(html).toContain("Acknowledge policy to preview");
    expect(html).toContain("resume-sensitive-index-v1");
    expect(html).not.toContain("Part 1 of 1");
    expect(html).not.toContain("policyAcknowledged=true");
  });
});
