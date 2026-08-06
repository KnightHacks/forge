import { describe, expect, it } from "vitest";

import type {
  HackathonAnalyticsBuildInput,
  HackathonAnalyticsSources,
} from "../../utils/analytics/hackathon-report";
import {
  normalizeHackathonExportReportInput,
  serializeHackathonAnalyticsExport,
  suppressSponsorComposition,
} from "../../utils/analytics/hackathon-export";
import {
  buildHackathonAnalyticsReport,
  buildHackathonIdentifiedRows,
} from "../../utils/analytics/hackathon-report";

const HACK_ID = "10000000-0000-4000-8000-000000000001";
const EVENT_ID = "20000000-0000-4000-8000-000000000001";
const DEMOGRAPHICS = [
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
] as const;

function sources(): HackathonAnalyticsSources {
  return {
    attendees: Array.from({ length: 13 }, (_, index) => ({
      checkedInAt: index < 8 ? new Date("2026-10-03T12:00:00Z") : null,
      country: "United States",
      dob: "2005-01-01",
      firstName: index === 0 ? "=Formula" : `Hacker${index}`,
      gender: index === 0 ? "=Sparse" : index < 7 ? "Complement" : "Published",
      gradDate: "2028-05-01",
      hackerAttId: `30000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      hackerFirstTime: index % 2 === 0,
      hackathonId: HACK_ID,
      isFirstTime: index % 2 === 0,
      lastName: "Analytics",
      levelOfStudy: "Undergraduate University (3+ year)",
      major: "Computer Science",
      points: 13 - index,
      raceOrEthnicity: "Test category",
      school: "UCF",
      shirtSize: "M",
      status: index < 8 ? ("checkedin" as const) : ("pending" as const),
      timeApplied: new Date(
        `2026-09-${String(index + 1).padStart(2, "0")}T00:00:00Z`,
      ),
      timeConfirmed: index < 8 ? new Date("2026-09-20T00:00:00Z") : null,
    })),
    attendances: [
      {
        attendanceId: "40000000-0000-4000-8000-000000000001",
        checkedInAt: new Date("2026-10-03T13:00:00Z"),
        eventId: EVENT_ID,
        hackerAttId: "30000000-0000-4000-8000-000000000000",
        hackathonId: HACK_ID,
        pointsAwarded: null,
        voidedAt: null,
      },
    ],
    attempts: [
      {
        attendanceId: "40000000-0000-4000-8000-000000000001",
        attemptedAt: new Date("2026-10-03T13:00:00Z"),
        className: null,
        eventId: EVENT_ID,
        hackathonId: HACK_ID,
        mode: "scanner",
        operatorId: null,
        outcome: "checked_in",
      },
    ],
    events: [
      {
        deletionIntentAt: null,
        endAt: new Date("2026-10-03T14:00:00Z"),
        hackathonId: HACK_ID,
        id: EVENT_ID,
        legacy: false,
        name: '=HYPERLINK("https://evil.test","Event")',
        publishedAt: new Date("2026-09-01T00:00:00Z"),
        purpose: "event",
        startAt: new Date("2026-10-03T13:00:00Z"),
        tag: "workshop",
      },
    ],
    hackathon: {
      applicationDeadline: new Date("2026-10-01T00:00:00Z"),
      applicationOpen: new Date("2026-08-01T00:00:00Z"),
      confirmationDeadline: new Date("2026-10-02T00:00:00Z"),
      displayName: "=Unsafe Hack Name",
      endDate: new Date("2026-10-05T00:00:00Z"),
      id: HACK_ID,
      startDate: new Date("2026-10-03T00:00:00Z"),
    },
    roleGrants: [],
  };
}

const buildInput: HackathonAnalyticsBuildInput = {
  compositionCohort: "applicants",
  demographic: "gender",
  eventId: EVENT_ID,
  eventTags: [],
  referenceDate: new Date("2026-10-04T00:00:00Z"),
};

function exportFixture() {
  const source = sources();
  const report = buildHackathonAnalyticsReport(source, buildInput);
  const compositions = new Map(
    DEMOGRAPHICS.map((demographic) => [
      demographic,
      buildHackathonAnalyticsReport(source, {
        ...buildInput,
        demographic,
      }),
    ]),
  );
  return {
    compositions,
    context: {
      generatedAt: buildInput.referenceDate,
      hackathon: source.hackathon,
      reportInput: {
        audienceView: "composition" as const,
        comparisonHackathonId: null,
        compositionCohort: "applicants" as const,
        demographic: "gender" as const,
        eventId: EVENT_ID,
        eventPurpose: "program" as const,
        eventTags: [],
        hackathonId: HACK_ID,
        liveWindow: "whole_hackathon" as const,
        section: "reports" as const,
      },
    },
    identifiedRows: buildHackathonIdentifiedRows(source, buildInput),
    report,
  };
}

describe("Hackathon Analytics exports", () => {
  it("makes external summaries whole-hack and filter-independent", () => {
    const selected = exportFixture().context.reportInput;
    const filtered = {
      ...selected,
      audienceView: "engagement" as const,
      compositionCohort: "on_site" as const,
      eventId: EVENT_ID,
      eventPurpose: "all" as const,
      eventTags: ["workshop"],
      liveWindow: "last_15_minutes" as const,
      section: "events" as const,
    };

    expect(
      normalizeHackathonExportReportInput("sponsor", filtered),
    ).toMatchObject({
      audienceView: "composition",
      compositionCohort: "applicants",
      eventId: null,
      eventPurpose: "all",
      eventTags: [],
      liveWindow: "whole_hackathon",
      section: "reports",
    });
    expect(normalizeHackathonExportReportInput("events", filtered)).toBe(
      filtered,
    );
  });

  it("records both comparison identity fields in export metadata", () => {
    const fixture = exportFixture();
    const comparisonHackathonId =
      "10000000-0000-4000-8000-000000000099" as const;
    const csv = serializeHackathonAnalyticsExport({
      ...fixture,
      context: {
        ...fixture.context,
        comparisonHackathon: {
          displayName: "Knight Hacks 2025",
          id: comparisonHackathonId,
        },
        reportInput: {
          ...fixture.context.reportInput,
          comparisonHackathonId,
        },
      },
      kind: "overview",
    }).content;

    expect(csv).toContain("comparison_hackathon_id");
    expect(csv).toContain("10000000-0000-4000-8000-000000000099");
    expect(csv).toContain("comparison_hackathon_name");
    expect(csv).toContain("Knight Hacks 2025");
  });

  it("neutralizes formulas and keeps identified leaderboard rows in their own export", () => {
    const fixture = exportFixture();
    const internal = serializeHackathonAnalyticsExport({
      ...fixture,
      kind: "events",
    }).content;
    const leaderboard = serializeHackathonAnalyticsExport({
      ...fixture,
      kind: "points_leaderboard",
    }).content;

    expect(internal).toContain("'=Unsafe Hack Name");
    expect(internal).toContain("'=HYPERLINK");
    expect(leaderboard).toContain("'=Formula Analytics");
    expect(leaderboard).toContain("attendee_id");
    expect(leaderboard).toContain("event_awarded_points");
    expect(leaderboard).toContain("last_event_name");
    expect(internal).not.toContain("=Formula Analytics");
  });

  it("keeps institutional output on the exact aggregate boundary", () => {
    const csv = serializeHackathonAnalyticsExport({
      ...exportFixture(),
      kind: "institutional_summary",
    }).content;

    expect(csv).toContain("institutional_sensitive");
    expect(csv).toContain("final_seven_day_applications");
    expect(csv).toContain("retained_check_in_outcome");
    for (const demographic of DEMOGRAPHICS) expect(csv).toContain(demographic);
    expect(csv).not.toContain("HYPERLINK");
    expect(csv).not.toContain("Formula Analytics");
    expect(csv).not.toContain("attendee_id");
  });

  it("emits exact section rows instead of an ambiguous combined organizer file", () => {
    const fixture = exportFixture();
    const applications = serializeHackathonAnalyticsExport({
      ...fixture,
      kind: "applications",
    }).content;
    const events = serializeHackathonAnalyticsExport({
      ...fixture,
      kind: "events",
    }).content;
    const live = serializeHackathonAnalyticsExport({
      ...fixture,
      kind: "live_operations",
    }).content;
    const audience = serializeHackathonAnalyticsExport({
      ...fixture,
      kind: "audience",
    }).content;

    expect(applications).toContain("application_daily_bucket");
    expect(applications).toContain("confirmation_daily_bucket");
    expect(events).toContain("selected_event_arrival_bucket");
    expect(events).toContain("selected_event_class_arrival_bucket");
    expect(live).toContain("check_in_outcome");
    expect(live).toContain("check_in_throughput_bucket");
    expect(audience).toContain("accepted_current_status_count");
    expect(audience).toContain("known_confirmed_to_check_in_rate");
    expect(audience).not.toContain("current_selected_rate");
    expect(audience).not.toContain("current_confirmed_rate");
    expect(audience).toContain("repeat_event_engaged_rate");
  });

  it("exports complete long-tail composition rows instead of pie display tails", () => {
    const fixture = exportFixture();
    const gender = fixture.compositions.get("gender");
    if (!gender) throw new Error("Gender composition fixture is missing.");
    const rows = Array.from({ length: 13 }, (_, index) => ({
      category: `Long tail ${index + 1}`,
      color: "var(--chart-1)" as const,
      count: 1,
      protected: false,
      share: 1 / 13,
    }));
    gender.audience.composition.rows.splice(
      0,
      gender.audience.composition.rows.length,
      ...rows,
    );
    gender.audience.composition.slices.splice(
      0,
      gender.audience.composition.slices.length,
      ...rows.slice(0, 11),
      {
        category: "Other categories (2)",
        color: "var(--chart-5)",
        count: 2,
        protected: false,
      },
    );

    const csv = serializeHackathonAnalyticsExport({
      ...fixture,
      kind: "audience",
    }).content;
    expect(csv).toContain("Long tail 13");
    expect(csv).not.toContain("Other categories (2)");
  });

  it("applies threshold-five and complementary suppression to sponsor composition", () => {
    expect(
      suppressSponsorComposition(
        [
          { category: "Sparse", count: 1 },
          { category: "Complement", count: 6 },
          { category: "Published", count: 6 },
        ],
        13,
      ),
    ).toEqual([
      { category: "Published", count: 6, suppressed: false },
      { category: "Withheld / other", count: null, suppressed: true },
    ]);

    const csv = serializeHackathonAnalyticsExport({
      ...exportFixture(),
      kind: "sponsor",
    }).content;
    expect(csv).toContain("sponsor_privacy_reduced");
    expect(csv).toContain("Withheld / other");
    expect(csv).not.toContain("=Sparse");
    expect(csv).not.toContain("Complement");
    expect(csv).not.toMatch(/^.*?,current_status,/m);
    expect(csv).not.toContain("retained_check_in_outcome");
    expect(csv).not.toContain("HYPERLINK");
  });
});
