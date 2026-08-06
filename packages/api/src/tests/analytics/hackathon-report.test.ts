import { describe, expect, it } from "vitest";

import type { HackathonAnalyticsSources } from "../../utils/analytics/hackathon-report";
import {
  buildHackathonAnalyticsReport,
  buildHackathonIdentifiedRows,
} from "../../utils/analytics/hackathon-report";

const HACK_ID = "10000000-0000-4000-8000-000000000001";
const OTHER_HACK_ID = "10000000-0000-4000-8000-000000000002";
const E1 = "20000000-0000-4000-8000-000000000001";
const E2 = "20000000-0000-4000-8000-000000000002";
const LEGACY = "20000000-0000-4000-8000-000000000003";
const A = "30000000-0000-4000-8000-000000000001";
const B = "30000000-0000-4000-8000-000000000002";
const C = "30000000-0000-4000-8000-000000000003";
const D = "30000000-0000-4000-8000-000000000004";

function sources(): HackathonAnalyticsSources {
  return {
    attendees: [
      {
        checkedInAt: new Date("2026-10-03T12:00:00Z"),
        country: "United States",
        dob: "2008-10-03",
        firstName: "Avery",
        gender: "Woman",
        gradDate: "2028-05-01",
        hackerAttId: A,
        hackerFirstTime: true,
        hackathonId: HACK_ID,
        isFirstTime: true,
        lastName: "Analytics",
        levelOfStudy:
          "Undergraduate University (2 year - community college or similar)",
        major: "Computer Science",
        points: 20,
        raceOrEthnicity: "Asian",
        school: "UCF",
        shirtSize: "M",
        status: "confirmed",
        timeApplied: new Date("2026-08-01T00:00:00Z"),
        timeConfirmed: new Date("2026-09-01T00:00:00Z"),
      },
      {
        checkedInAt: null,
        country: "United States",
        dob: "2004-01-01",
        firstName: "Blair",
        gender: "Man",
        gradDate: "2027-05-01",
        hackerAttId: B,
        hackerFirstTime: false,
        hackathonId: HACK_ID,
        isFirstTime: null,
        lastName: "Builder",
        levelOfStudy: "Undergraduate University (3+ year)",
        major: "Computer Science",
        points: 10,
        raceOrEthnicity: "White",
        school: "UCF",
        shirtSize: "L",
        status: "confirmed",
        timeApplied: new Date("2026-09-26T23:59:59Z"),
        timeConfirmed: null,
      },
      {
        checkedInAt: null,
        country: null,
        dob: null,
        firstName: "Casey",
        gender: null,
        gradDate: null,
        hackerAttId: C,
        hackerFirstTime: null,
        hackathonId: HACK_ID,
        isFirstTime: null,
        lastName: "Coverage",
        levelOfStudy: "Undergraduate University (3+ year)",
        major: null,
        points: 10,
        raceOrEthnicity: null,
        school: null,
        shirtSize: null,
        status: "checkedin",
        timeApplied: new Date("2026-09-27T00:00:00Z"),
        timeConfirmed: null,
      },
      {
        checkedInAt: new Date("2026-10-03T12:05:00Z"),
        country: "United States",
        dob: "2000-01-01",
        firstName: "Drew",
        gender: "Non-binary",
        gradDate: "2025-05-01",
        hackerAttId: D,
        hackerFirstTime: false,
        hackathonId: HACK_ID,
        isFirstTime: false,
        lastName: "Dirty",
        levelOfStudy:
          "Graduate University (Masters, Professional, Doctoral, etc)",
        major: "Design",
        points: 5,
        raceOrEthnicity: "Other",
        school: "UCF",
        shirtSize: "S",
        status: "accepted",
        timeApplied: new Date("2026-09-20T00:00:00Z"),
        timeConfirmed: null,
      },
    ],
    attendances: [
      {
        attendanceId: "40000000-0000-4000-8000-000000000001",
        checkedInAt: new Date("2026-10-03T13:00:00Z"),
        eventId: E1,
        hackerAttId: A,
        hackathonId: HACK_ID,
        pointsAwarded: 5,
        voidedAt: null,
      },
      {
        attendanceId: "40000000-0000-4000-8000-000000000002",
        checkedInAt: new Date("2026-10-03T13:05:00Z"),
        eventId: E1,
        hackerAttId: A,
        hackathonId: HACK_ID,
        pointsAwarded: 5,
        voidedAt: null,
      },
      {
        attendanceId: "40000000-0000-4000-8000-000000000003",
        checkedInAt: new Date("2026-10-03T14:00:00Z"),
        eventId: E2,
        hackerAttId: A,
        hackathonId: HACK_ID,
        pointsAwarded: 4,
        voidedAt: null,
      },
      {
        attendanceId: "40000000-0000-4000-8000-000000000004",
        checkedInAt: new Date("2026-10-03T13:10:00Z"),
        eventId: E1,
        hackerAttId: B,
        hackathonId: HACK_ID,
        pointsAwarded: null,
        voidedAt: null,
      },
      {
        attendanceId: "40000000-0000-4000-8000-000000000005",
        checkedInAt: new Date("2026-10-03T13:20:00Z"),
        eventId: LEGACY,
        hackerAttId: C,
        hackathonId: HACK_ID,
        pointsAwarded: 50,
        voidedAt: null,
      },
      {
        attendanceId: "40000000-0000-4000-8000-000000000006",
        checkedInAt: new Date("2026-10-03T13:30:00Z"),
        eventId: E1,
        hackerAttId: D,
        hackathonId: HACK_ID,
        pointsAwarded: 99,
        voidedAt: new Date("2026-10-03T13:31:00Z"),
      },
    ],
    attempts: [
      {
        attendanceId: "40000000-0000-4000-8000-000000000001",
        attemptedAt: new Date("2026-10-03T13:00:00Z"),
        className: "Green",
        eventId: E1,
        hackathonId: HACK_ID,
        mode: "scanner",
        operatorId: "operator-b",
        outcome: "checked_in",
      },
      {
        attendanceId: null,
        attemptedAt: new Date("2026-10-03T13:05:00Z"),
        className: "Blue",
        eventId: E1,
        hackathonId: HACK_ID,
        mode: "manual",
        operatorId: "operator-a",
        outcome: "wrong_class",
      },
    ],
    events: [
      {
        deletionIntentAt: null,
        endAt: new Date("2026-10-03T14:00:00Z"),
        hackathonId: HACK_ID,
        id: E1,
        legacy: false,
        name: "Lunch",
        publishedAt: new Date("2026-09-01T00:00:00Z"),
        purpose: "event",
        startAt: new Date("2026-10-03T13:00:00Z"),
        tag: "Food",
      },
      {
        deletionIntentAt: null,
        endAt: new Date("2026-10-03T15:00:00Z"),
        hackathonId: HACK_ID,
        id: E2,
        legacy: false,
        name: "Workshop",
        publishedAt: new Date("2026-09-01T00:00:00Z"),
        purpose: "event",
        startAt: new Date("2026-10-03T14:00:00Z"),
        tag: "Workshop",
      },
      {
        deletionIntentAt: null,
        endAt: new Date("2026-10-03T13:30:00Z"),
        hackathonId: HACK_ID,
        id: LEGACY,
        legacy: true,
        name: "Old check-in",
        publishedAt: null,
        purpose: "event",
        startAt: new Date("2026-10-03T12:00:00Z"),
        tag: "Operations",
      },
    ],
    hackathon: {
      applicationDeadline: new Date("2026-09-27T00:00:00Z"),
      applicationOpen: new Date("2026-08-01T00:00:00Z"),
      confirmationDeadline: new Date("2026-09-30T00:00:00Z"),
      displayName: "Knight Hacks 2026",
      endDate: new Date("2026-10-04T00:00:00Z"),
      id: HACK_ID,
      startDate: new Date("2026-10-03T12:00:00Z"),
    },
    roleGrants: [{ hackathonId: HACK_ID, kind: "general", state: "failed" }],
  };
}

describe("Hackathon Analytics pure report", () => {
  it("uses present-state intersections and trusted program events", () => {
    const report = buildHackathonAnalyticsReport(sources(), {
      eventId: null,
      eventTags: [],
      referenceDate: new Date("2026-10-03T15:00:00Z"),
    });

    expect(report.overview.pipeline).toMatchObject({
      applicants: 4,
      currentConfirmed: 3,
      currentSelected: 4,
      onSite: 3,
      onSiteCurrentConfirmed: 2,
      onSiteOutsideCurrentConfirmed: 1,
      onSiteRate: 2 / 3,
    });
    expect(report.events.summary).toMatchObject({
      distinctAttendance: 3,
      eventEngagedOnSite: 1,
      eventReach: 1 / 3,
      legacyUnknownPurposeEvents: 1,
      repeatEventEngaged: 1,
      trustedProgramEvents: 2,
    });
    expect(report.applications.finalSevenDayCount).toBe(2);
    expect(report.applications.confirmationTimeCoverage).toEqual({
      denominator: 3,
      numerator: 1,
      rate: 1 / 3,
    });
    expect(report.overview.actionBrief.map((row) => row.kind)).toEqual([
      "manage_application_demand",
      "advance_application_funnel",
      "prepare_people_and_supplies",
      "staff_live_operations",
      "strengthen_event_engagement",
      "improve_measurement",
    ]);
  });

  it("builds exact arrivals, immutable class coverage, live aliases, and ranks", () => {
    const report = buildHackathonAnalyticsReport(sources(), {
      eventId: E1,
      eventTags: [],
      referenceDate: new Date("2026-10-03T15:00:00Z"),
    });

    expect(report.events.arrivals?.buckets.slice(0, 3)).toEqual([
      expect.objectContaining({
        intervalCount: 1,
        startAt: new Date("2026-10-03T13:00:00Z"),
      }),
      expect.objectContaining({
        intervalCount: 1,
        startAt: new Date("2026-10-03T13:05:00Z"),
      }),
      expect.objectContaining({
        intervalCount: 1,
        startAt: new Date("2026-10-03T13:10:00Z"),
      }),
    ]);
    expect(report.events.arrivals?.classCoverage).toEqual({
      denominator: 3,
      numerator: 1,
      rate: 1 / 3,
    });
    expect(report.live.operatorRows.map((row) => row.label)).toEqual([
      "Operator 1",
      "Operator 2",
    ]);
    expect(report.live.issueCount).toBe(1);
    expect(report.live.failureCoverageStartsAt).toEqual(
      new Date("2026-09-03T15:00:00Z"),
    );
    expect(
      buildHackathonIdentifiedRows(sources(), {
        eventId: E1,
        eventTags: [],
        referenceDate: new Date("2026-10-03T15:00:00Z"),
      }).points.map(({ name, rank }) => ({ name, rank })),
    ).toEqual([
      { name: "Avery Analytics", rank: 1 },
      { name: "Blair Builder", rank: 2 },
      { name: "Casey Coverage", rank: 2 },
      { name: "Drew Dirty", rank: 4 },
    ]);
  });

  it("returns application pace, event popularity, live operations, and aggregate-only points", () => {
    const report = buildHackathonAnalyticsReport(sources(), {
      eventId: null,
      eventTags: [],
      referenceDate: new Date("2026-10-03T15:00:00Z"),
    });

    expect(report.applications.statusRows).toEqual(
      expect.arrayContaining([
        { count: 2, status: "confirmed" },
        { count: 1, status: "accepted" },
        { count: 1, status: "checkedin" },
      ]),
    );
    expect(report.applications.dailyBuckets.length).toBeGreaterThan(30);
    expect(report.events.eventRows.map((row) => row.name)).toEqual([
      "Lunch",
      "Workshop",
    ]);
    expect(report.events.eventRows[0]).toMatchObject({
      distinctAttendance: 2,
      occurrenceCount: 3,
    });
    expect(report.live).toMatchObject({
      activeOperatorCount: 2,
      attemptCount: 2,
      successCount: 1,
      successRate: 0.5,
    });
    expect(report.points).toEqual({
      participantCount: 4,
      pointsCoverage: { denominator: 4, numerator: 3, rate: 0.75 },
      topPoints: 20,
    });
    expect(JSON.stringify(report)).not.toContain("Avery Analytics");
  });

  it("keeps legacy event attendance useful when all hackathon events are selected", () => {
    const fixture = sources();
    const legacyAttendance = fixture.attendances.find(
      (row) => row.eventId === LEGACY,
    );
    if (!legacyAttendance)
      throw new Error("Legacy attendance fixture missing.");
    legacyAttendance.checkedInAt = null;
    legacyAttendance.pointsAwarded = null;

    const report = buildHackathonAnalyticsReport(fixture, {
      eventId: null,
      eventPurpose: "all",
      eventTags: [],
      referenceDate: new Date("2026-10-03T15:00:00Z"),
    });

    expect(report.events.eventRows.map((row) => row.name)).toContain(
      "Old check-in",
    );
    expect(report.events.summary).toMatchObject({
      distinctAttendance: 4,
      occurrenceCount: 5,
      selectedEvents: 3,
    });
    expect(report.events.groupings.tag).toContainEqual(
      expect.objectContaining({
        category: "Operations",
        distinctAttendeeCount: 1,
        occurrenceCount: 1,
      }),
    );
    expect(report.events.timeline.timestampCoverage).toEqual({
      denominator: 5,
      numerator: 4,
      rate: 0.8,
    });
  });

  it("returns application deadlines, confirmation timing, supplies, and stage breakdowns", () => {
    const report = buildHackathonAnalyticsReport(sources(), {
      eventId: null,
      eventTags: [],
      referenceDate: new Date("2026-09-25T00:00:00Z"),
    });

    expect(report.applications.nextDeadline).toEqual({
      at: new Date("2026-09-27T00:00:00Z"),
      kind: "application",
      millisecondsRemaining: 2 * 24 * 60 * 60 * 1000,
    });
    expect(report.applications.deadlineMarkers).toEqual([
      expect.objectContaining({ elapsedDay: 57, kind: "application" }),
      expect.objectContaining({ elapsedDay: 60, kind: "confirmation" }),
    ]);
    expect(
      report.applications.confirmationBuckets.reduce(
        (sum, bucket) => sum + bucket.intervalCount,
        0,
      ),
    ).toBe(1);
    expect(report.applications.firstTimeRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          applicantCount: 1,
          category: "First-time hacker",
        }),
        expect.objectContaining({ applicantCount: 1, category: "Unknown" }),
      ]),
    );
    expect(report.applications.shirtSizeRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ applicantCount: 1, category: "M" }),
        expect.objectContaining({ applicantCount: 1, category: "Missing" }),
      ]),
    );
    expect(report.applications.dietary).toMatchObject({
      missing: 4,
      recorded: 0,
    });
  });

  it("returns event frequency, first/returning attendance, groupings, class reach, and arrival audit fields", () => {
    const fixture = sources();
    const firstAttendee = fixture.attendees[0];
    const thirdAttendee = fixture.attendees[2];
    const firstEvent = fixture.events[0];
    const secondEvent = fixture.events[1];
    if (!firstAttendee || !thirdAttendee || !firstEvent || !secondEvent) {
      throw new Error("Fixture is incomplete.");
    }
    firstAttendee.className = "Green";
    thirdAttendee.className = "Blue";
    firstEvent.location = "Arena";
    secondEvent.location = "Arena";
    const report = buildHackathonAnalyticsReport(fixture, {
      eventId: E1,
      eventTags: [],
      referenceDate: new Date("2026-10-03T15:00:00Z"),
    });

    expect(report.events.frequencyRows).toEqual(
      expect.arrayContaining([
        { count: 2, key: "none" },
        { count: 1, key: "one" },
      ]),
    );
    expect(report.events.eventRows[0]).toMatchObject({
      firstAttendanceCount: 2,
      returningAttendanceCount: 0,
    });
    expect(report.events.firstReturningRows).toEqual([
      { count: 2, key: "first" },
      { count: 0, key: "returning" },
    ]);
    expect(report.events.groupings.location).toEqual([
      expect.objectContaining({
        category: "Arena",
        distinctAttendance: 2,
        eventCount: 1,
      }),
    ]);
    expect(report.events.classParticipationRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "Green",
          eventEngagedCount: 1,
          eventReach: 1,
        }),
        expect.objectContaining({
          category: "Blue",
          eventEngagedCount: 0,
          eventReach: 0,
        }),
      ]),
    );
    expect(report.events.arrivals).toMatchObject({
      bucketWidthMinutes: 5,
      schedule: {
        endAt: new Date("2026-10-03T14:00:00Z"),
        startAt: new Date("2026-10-03T13:00:00Z"),
        valid: true,
      },
      snapshottedClassCount: 1,
      totalArrivalCount: 3,
      unassignedClassCount: 2,
    });
  });

  it("bounds historical live windows and returns throughput and operational groupings", () => {
    const fixture = sources();
    fixture.roleGrants = [
      {
        attemptCount: 3,
        createdAt: new Date("2026-10-03T12:00:00Z"),
        hackathonId: HACK_ID,
        kind: "general",
        lastAttemptAt: new Date("2026-10-03T13:30:00Z"),
        lastError: "403 forbidden",
        state: "failed",
      },
    ];
    const report = buildHackathonAnalyticsReport(fixture, {
      eventId: E1,
      eventTags: [],
      liveWindow: "since_event_start",
      referenceDate: new Date("2026-11-03T15:00:00Z"),
    });

    expect(report.live.window).toEqual({
      endAt: new Date("2026-10-03T14:00:00Z"),
      startAt: new Date("2026-10-03T13:00:00Z"),
    });
    expect(report.live.attemptsPerMinute).toBe(2 / 60);
    expect(report.live.peakThroughput).toMatchObject({
      startAt: new Date("2026-10-03T13:00:00Z"),
      successCount: 1,
    });
    expect(report.live.eventRows).toEqual([{ category: "Lunch", count: 2 }]);
    expect(report.live.classRows).toEqual([
      { category: "Blue", count: 1 },
      { category: "Green", count: 1 },
    ]);
    expect(report.live.operatorRows).toEqual([
      { count: 1, label: "Operator 1" },
      { count: 1, label: "Operator 2" },
    ]);
    expect(report.live.outcomeRows).toHaveLength(8);
    expect(report.live.outcomeRows).toContainEqual({
      count: 0,
      outcome: "already_checked_in",
    });
    expect(report.live.oldestRetainedFailedAttemptAt).toEqual(
      new Date("2026-10-03T13:05:00Z"),
    );
    expect(report.live.failureCoverageState).toBe("partial");
    expect(report.live.roleHealth).toMatchObject({
      errorRows: [{ count: 1, family: "missing_permission" }],
      oldestUnresolvedAgeMilliseconds:
        31 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000,
      oldestUnresolvedAt: new Date("2026-10-03T12:00:00Z"),
      oldestUnresolvedLastAttemptAt: new Date("2026-10-03T13:30:00Z"),
      retryCount: 2,
    });
  });

  it("returns composition slices and keeps missing demographic data explicit", () => {
    const report = buildHackathonAnalyticsReport(sources(), {
      demographic: "gender",
      eventId: null,
      eventTags: [],
      referenceDate: new Date("2026-10-03T15:00:00Z"),
    });
    expect(report.audience.composition.total).toBe(4);
    const womanComposition = report.audience.composition.rows.find(
      (row) => row.category === "Woman",
    );
    expect(womanComposition?.color.startsWith("var(--chart-")).toBe(true);
    expect(report.audience.composition.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "Woman",
          count: 1,
          protected: false,
          share: 0.25,
        }),
        expect.objectContaining({
          category: "Missing",
          count: 1,
          protected: true,
          share: 0.25,
        }),
      ]),
    );
    expect(report.audience.composition.slices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: "Woman", count: 1 }),
        expect.objectContaining({ category: "Missing", count: 1 }),
      ]),
    );
    expect(report.audience.coverage).toEqual({
      denominator: 4,
      numerator: 3,
      rate: 0.75,
    });
  });

  it("keeps two-year and three-plus engagement rows distinct", () => {
    const report = buildHackathonAnalyticsReport(sources(), {
      demographic: "level_of_study",
      eventId: null,
      eventTags: [],
      referenceDate: new Date("2026-10-03T15:00:00Z"),
    });
    const labels = report.audience.rows.map((row) => row.category);
    expect(labels).toContain(
      "Undergraduate University (2 year - community college or similar)",
    );
    expect(labels).toContain("Undergraduate University (3+ year)");
    expect(labels).not.toContain("Undergraduate University");
    expect(
      report.audience.rows.every(
        (row) => row.eventReach === null || row.eventReach <= 1,
      ),
    ).toBe(true);
  });

  it("classifies a filtered later program event as returning using the full trusted sequence", () => {
    const report = buildHackathonAnalyticsReport(sources(), {
      eventId: E2,
      eventTags: [],
      referenceDate: new Date("2026-10-03T15:00:00Z"),
    });

    expect(report.events.eventRows).toEqual([
      expect.objectContaining({
        firstAttendanceCount: 0,
        name: "Workshop",
        returningAttendanceCount: 1,
      }),
    ]);
    expect(report.events.firstReturningRows).toEqual([
      { count: 0, key: "first" },
      { count: 1, key: "returning" },
    ]);
  });

  it("returns complete audience shares, stage rates, representation gaps, repeat engagement, points coverage, and anomalies", () => {
    const report = buildHackathonAnalyticsReport(sources(), {
      demographic: "gender",
      eventId: null,
      eventTags: [],
      referenceDate: new Date("2026-10-03T15:00:00Z"),
    });
    const women = report.audience.rows.find((row) => row.category === "Woman");
    expect(women).toMatchObject({
      acceptedCount: 0,
      applicantShare: 1 / 4,
      awardedPointShare: 1,
      awardedPoints: 14,
      currentConfirmedRate: 1,
      currentSelectedRate: 1,
      checkedInCount: 1,
      confirmedCount: 1,
      eventEngagedCount: 1,
      eventReach: 1,
      knownConfirmedToCheckInRate: 1,
      onSiteRate: 1,
      onSiteShare: 1 / 3,
      pointSnapshotCoverage: { denominator: 3, numerator: 3, rate: 1 },
      repeatEventEngagedCount: 1,
      repeatEventEngagedRate: 1,
      representationGap: 1 / 3 - 1 / 4,
    });
    const men = report.audience.rows.find((row) => row.category === "Man");
    expect(men).toMatchObject({
      eventEngagedCount: 0,
      eventEngagedOutsideOnSiteCount: 1,
      eventReach: null,
      onSiteOutsideCurrentConfirmedCount: 0,
    });
    expect(report.audience.anomalies).toEqual({
      eventEngagedOutsideOnSite: 1,
      onSiteOutsideCurrentConfirmed: 1,
    });
  });

  it("does not mislabel mutable current states as historical funnel conversion", () => {
    const fixture = sources();
    const [checkedIn, confirmed, denied, withdrawn] = fixture.attendees;
    if (!checkedIn || !confirmed || !denied || !withdrawn) {
      throw new Error("Fixture is incomplete.");
    }
    checkedIn.status = "checkedin";
    checkedIn.checkedInAt = null;
    confirmed.status = "confirmed";
    confirmed.timeConfirmed = new Date("2026-09-02T00:00:00Z");
    denied.status = "denied";
    withdrawn.status = "withdrawn";
    withdrawn.checkedInAt = null;
    withdrawn.timeConfirmed = new Date("2026-09-03T00:00:00Z");

    const report = buildHackathonAnalyticsReport(fixture, {
      eventId: null,
      eventTags: [],
      referenceDate: new Date("2026-10-03T15:00:00Z"),
    });

    expect(report.overview.pipeline).toMatchObject({
      accepted: 0,
      checkedIn: 1,
      confirmed: 1,
      confirmationRate: 1,
      currentConfirmed: 2,
      currentSelected: 2,
      historicalAcceptanceConversionAvailable: false,
      knownConfirmedCheckedIn: 1,
      knownConfirmed: 3,
      knownConfirmedToCheckInRate: 1 / 3,
    });
  });

  it("never admits cross-hack source rows", () => {
    const fixture = sources();
    const firstAttendee = fixture.attendees[0];
    if (!firstAttendee) throw new Error("Fixture is incomplete.");
    fixture.attendees.push({
      ...firstAttendee,
      hackathonId: OTHER_HACK_ID,
    });
    expect(() =>
      buildHackathonAnalyticsReport(fixture, {
        eventId: null,
        eventTags: [],
        referenceDate: new Date("2026-10-03T15:00:00Z"),
      }),
    ).toThrow(/scope/i);
  });
});
