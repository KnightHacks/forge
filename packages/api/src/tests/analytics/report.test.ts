import { describe, expect, it } from "vitest";

import type {
  AnalyticsAttendanceSource,
  AnalyticsDuesSource,
  AnalyticsEventSource,
  AnalyticsFeedbackSource,
  AnalyticsMemberSource,
} from "../../utils/analytics/report";
import {
  buildClubAnalyticsReport,
  resolveAnalyticsPeriod,
} from "../../utils/analytics/report";

const MEMBER_IDS = {
  alex: "00000000-0000-4000-8000-000000000101",
  blair: "00000000-0000-4000-8000-000000000102",
  casey: "00000000-0000-4000-8000-000000000103",
  drew: "00000000-0000-4000-8000-000000000104",
} as const;

const EVENT_IDS = {
  first: "00000000-0000-4000-8000-000000000201",
  second: "00000000-0000-4000-8000-000000000202",
  hackathon: "00000000-0000-4000-8000-000000000203",
} as const;

function required<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(`Missing ${label}.`);
  return value;
}

function member(
  id: string,
  overrides: Partial<AnalyticsMemberSource> = {},
): AnalyticsMemberSource {
  return {
    age: 20,
    dateCreated: "2025-09-01",
    firstName: `Member-${id.at(-1)}`,
    gender: "Prefer not to answer",
    gradDate: "2027-05-01",
    id,
    lastName: "Analytics",
    levelOfStudy: "Undergraduate",
    major: "Computer Science",
    points: 10,
    raceOrEthnicity: "Prefer not to answer",
    school: "University of Central Florida",
    shirtSize: "M",
    ...overrides,
  };
}

function event(
  id: string,
  startAt: string,
  overrides: Partial<AnalyticsEventSource> = {},
): AnalyticsEventSource {
  return {
    endAt: new Date(new Date(startAt).getTime() + 90 * 60 * 1000),
    hackathonId: null,
    id,
    location: "ENG2 Atrium",
    name: `Event ${id.at(-1)}`,
    startAt: new Date(startAt),
    tag: "Workshop",
    ...overrides,
  };
}

function attendance(
  eventId: string,
  memberId: string,
): AnalyticsAttendanceSource {
  return { eventId, memberId };
}

const defaultInput = {
  comparison: "none" as const,
  demographic: "level_of_study" as const,
  eventId: null,
  eventTags: [] as string[],
  period: {
    from: new Date("2026-01-01T00:00:00.000Z"),
    kind: "custom" as const,
    to: new Date("2026-08-01T00:00:00.000Z"),
  },
  section: "overview" as const,
};

describe("club analytics report builder", () => {
  it("[TC-001] resolves academic-year midnight in the Club event time zone", () => {
    const resolved = resolveAnalyticsPeriod(
      { kind: "current_academic_year" },
      new Date("2026-07-16T12:00:00.000Z"),
    );

    expect(resolved.start?.toISOString()).toBe("2025-08-01T04:00:00.000Z");
    expect(resolved.end.toISOString()).toBe("2026-08-01T04:00:00.000Z");
  });

  it("[TC-006, TC-007] excludes hackathons and deduplicates member/event attendance", () => {
    const report = buildClubAnalyticsReport({
      attendances: [
        attendance(EVENT_IDS.first, MEMBER_IDS.alex),
        attendance(EVENT_IDS.first, MEMBER_IDS.alex),
        attendance(EVENT_IDS.first, MEMBER_IDS.alex),
        attendance(EVENT_IDS.second, MEMBER_IDS.alex),
        attendance(EVENT_IDS.first, MEMBER_IDS.blair),
        attendance(EVENT_IDS.hackathon, MEMBER_IDS.blair),
      ],
      dues: [],
      events: [
        event(EVENT_IDS.first, "2026-02-01T18:00:00.000Z"),
        event(EVENT_IDS.second, "2026-03-01T18:00:00.000Z"),
        event(EVENT_IDS.hackathon, "2026-03-02T18:00:00.000Z", {
          hackathonId: "00000000-0000-4000-8000-000000000301",
        }),
      ],
      feedback: [],
      input: defaultInput,
      members: [member(MEMBER_IDS.alex), member(MEMBER_IDS.blair)],
      referenceDate: new Date("2026-07-16T12:00:00.000Z"),
    });

    expect(report.events.summary).toMatchObject({
      distinctAttendanceCount: 3,
      distinctAttendeeCount: 2,
      eventCount: 2,
      repeatAttendeeRate: 0.5,
    });
    expect(report.events.rows).toEqual([
      expect.objectContaining({
        attendanceCount: 2,
        firstTimeCount: 2,
        id: EVENT_IDS.first,
      }),
      expect.objectContaining({
        attendanceCount: 1,
        id: EVENT_IDS.second,
        returningCount: 1,
      }),
    ]);
    expect(report.filterOptions.events.map(({ id }) => id)).not.toContain(
      EVENT_IDS.hackathon,
    );
  });

  it("[TC-012] excludes immature members from 30/60/90-day return cohorts", () => {
    const referenceDate = new Date("2026-07-01T00:00:00.000Z");
    const offsets = [100, 70, 40, 20] as const;
    const members = offsets.map((_, index) =>
      member(required(Object.values(MEMBER_IDS)[index], "cohort member")),
    );
    const events = offsets.flatMap((days, index) => {
      const firstAt = new Date(referenceDate);
      firstAt.setUTCDate(firstAt.getUTCDate() - days);
      const first = event(
        `00000000-0000-4000-8000-0000000004${index}1`,
        firstAt.toISOString(),
      );
      const returnedAt = new Date(firstAt);
      returnedAt.setUTCDate(returnedAt.getUTCDate() + 10);
      return [
        first,
        event(
          `00000000-0000-4000-8000-0000000004${index}2`,
          returnedAt.toISOString(),
        ),
      ];
    });
    const attendances = events.flatMap((row, index) => {
      const memberId = required(
        members[Math.floor(index / 2)],
        "cohort member",
      ).id;
      return index % 2 === 0 || index < 6 ? [attendance(row.id, memberId)] : [];
    });

    const report = buildClubAnalyticsReport({
      attendances,
      dues: [],
      events,
      feedback: [],
      input: {
        ...defaultInput,
        period: {
          from: new Date("2026-01-01T00:00:00.000Z"),
          kind: "custom",
          to: referenceDate,
        },
      },
      members,
      referenceDate,
    });

    expect(report.events.returnCohorts).toEqual([
      { days: 30, matureCount: 3, rate: 1, returnedCount: 3 },
      { days: 60, matureCount: 2, rate: 1, returnedCount: 2 },
      { days: 90, matureCount: 1, rate: 1, returnedCount: 1 },
    ]);
  });

  it("[TC-013] reports feedback validity, coverage, and reliability", () => {
    const events = [
      event(EVENT_IDS.first, "2026-02-01T18:00:00.000Z"),
      event(EVENT_IDS.second, "2026-03-01T18:00:00.000Z"),
    ];
    const members = [
      member(MEMBER_IDS.alex),
      member(MEMBER_IDS.blair),
      member(MEMBER_IDS.casey),
      member(MEMBER_IDS.drew),
    ];
    const feedback: AnalyticsFeedbackSource[] = [
      ...Array.from({ length: 4 }, (_, index) => ({
        answers: {
          discovery: "Discord",
          fun: 4,
          learning: 4,
          overall: 5,
        },
        eventId: EVENT_IDS.first,
        memberId: required(members[index], "feedback member").id,
        responseId: `response-first-${index}`,
      })),
      ...Array.from({ length: 5 }, (_, index) => ({
        answers: {
          discovery: index === 0 ? "Instagram" : "Discord",
          fun: 4,
          learning: index === 0 ? 9 : 5,
          overall: 4,
        },
        eventId: EVENT_IDS.second,
        memberId:
          index < members.length
            ? required(members[index], "feedback member").id
            : "unmatched",
        responseId: `response-second-${index}`,
      })),
    ];

    const report = buildClubAnalyticsReport({
      attendances: [
        ...members.map(({ id }) => attendance(EVENT_IDS.first, id)),
        ...members.map(({ id }) => attendance(EVENT_IDS.second, id)),
      ],
      dues: [],
      events,
      feedback,
      input: defaultInput,
      members,
      referenceDate: new Date("2026-07-16T12:00:00.000Z"),
    });

    const second = report.events.rows.find(({ id }) => id === EVENT_IDS.second);
    expect(second?.feedback).toMatchObject({
      averageLearning: 5,
      averageOverall: 4,
      learningResponseCount: 4,
      overallResponseCount: 5,
      responseCount: 5,
      responseRate: 1,
      unmatchedResponseCount: 1,
    });
    expect(report.events.reliableTopRated).toEqual([
      expect.objectContaining({ id: EVENT_IDS.second }),
    ]);
  });

  it("[TC-014, TC-016, TC-018] preserves demographic and dues denominators", () => {
    const members = [
      member(MEMBER_IDS.alex, {
        firstName: "Alex",
        levelOfStudy: "Undergraduate",
      }),
      member(MEMBER_IDS.blair, {
        firstName: "Blair",
        levelOfStudy: "Graduate",
      }),
      member(MEMBER_IDS.casey, {
        firstName: "Casey",
        levelOfStudy: "Prefer not to answer",
      }),
      member(MEMBER_IDS.drew, {
        firstName: "Drew",
        levelOfStudy: null,
      }),
    ];
    const events = [event(EVENT_IDS.first, "2026-02-01T18:00:00.000Z")];
    const dues: AnalyticsDuesSource[] = [
      {
        active: true,
        id: "00000000-0000-4000-8000-000000000501",
        memberId: MEMBER_IDS.alex,
        paymentDate: new Date("2025-09-01T00:00:00.000Z"),
        year: 2025,
      },
    ];

    const report = buildClubAnalyticsReport({
      attendances: [
        attendance(EVENT_IDS.first, MEMBER_IDS.alex),
        attendance(EVENT_IDS.first, MEMBER_IDS.blair),
      ],
      dues,
      events,
      feedback: [],
      input: defaultInput,
      members,
      referenceDate: new Date("2026-07-16T12:00:00.000Z"),
    });

    expect(report.dues.summary).toMatchObject({
      paidCount: 1,
      paidRate: 0.25,
      profileCount: 4,
      unpaidCount: 3,
    });
    expect(
      report.audience.demographics.level_of_study.rows.map((row) => [
        row.category,
        row.baseCount,
        row.attendeeCount,
      ]),
    ).toEqual(
      expect.arrayContaining([
        ["Undergraduate", 1, 1],
        ["Graduate", 1, 1],
        ["Prefer not to answer", 1, 0],
        ["Missing", 1, 0],
      ]),
    );
    expect(report.dues.unpaidMembers).toHaveLength(3);
    expect(report.dues.unpaidMembers[0]).not.toHaveProperty("email");
    expect(report.dues.unpaidMembers[0]).not.toHaveProperty(
      "stripePaymentIntentId",
    );
  });

  it("[TC-026] groups deterministic action-brief observations", () => {
    const undergraduates = Array.from({ length: 5 }, (_, index) =>
      member(`undergraduate-${index}`, {
        firstName: `Undergraduate ${index}`,
        levelOfStudy: "Undergraduate",
      }),
    );
    const graduates = Array.from({ length: 5 }, (_, index) =>
      member(`graduate-${index}`, {
        firstName: `Graduate ${index}`,
        levelOfStudy: "Graduate",
      }),
    );
    const events = [
      event("social-current-1", "2026-01-06T01:00:00.000Z", {
        tag: "Social",
      }),
      event("social-current-2", "2026-01-13T01:00:00.000Z", {
        tag: "Social",
      }),
      event("social-current-3", "2026-01-20T01:00:00.000Z", {
        tag: "Social",
      }),
      event("class-current", "2026-03-04T23:00:00.000Z", {
        tag: "Class Support",
      }),
      event("social-previous", "2024-09-03T00:00:00.000Z", {
        tag: "Social",
      }),
      event("class-previous", "2024-10-01T00:00:00.000Z", {
        tag: "Class Support",
      }),
    ];
    const currentSocial = events.slice(0, 3);
    const attendances = [
      ...undergraduates.map(({ id }) =>
        attendance(required(currentSocial[0], "first social").id, id),
      ),
      ...undergraduates
        .slice(0, 3)
        .map(({ id }) =>
          attendance(required(currentSocial[1], "second social").id, id),
        ),
      ...undergraduates
        .slice(0, 2)
        .map(({ id }) =>
          attendance(required(currentSocial[2], "third social").id, id),
        ),
      attendance(
        "class-current",
        required(undergraduates[4], "fifth undergraduate").id,
      ),
      attendance(
        "social-previous",
        required(graduates[0], "first graduate").id,
      ),
      ...graduates
        .slice(0, 4)
        .map(({ id }) => attendance("class-previous", id)),
    ];
    const dues: AnalyticsDuesSource[] = [
      {
        active: true,
        id: "dues-current-1",
        memberId: required(undergraduates[0], "first undergraduate").id,
        paymentDate: new Date("2025-09-01T00:00:00.000Z"),
        year: 2025,
      },
      {
        active: true,
        id: "dues-current-2",
        memberId: required(undergraduates[1], "second undergraduate").id,
        paymentDate: new Date("2025-09-02T00:00:00.000Z"),
        year: 2025,
      },
      {
        active: true,
        id: "dues-previous-1",
        memberId: required(graduates[0], "first graduate").id,
        paymentDate: new Date("2024-09-01T00:00:00.000Z"),
        year: 2024,
      },
    ];

    const report = buildClubAnalyticsReport({
      attendances,
      dues,
      events,
      feedback: [],
      input: {
        ...defaultInput,
        comparison: "previous_academic_year",
        period: { kind: "current_academic_year" },
      },
      members: [...undergraduates, ...graduates],
      referenceDate: new Date("2026-07-16T12:00:00.000Z"),
    });
    const highlights = new Map(
      report.highlights.map((highlight) => [highlight.kind, highlight]),
    );

    expect(highlights.get("event_tag_growth")).toMatchObject({
      group: "programming",
      message:
        "Social attendance increased by 9 (10 across 3 events versus 1 across 1; 900%). Average turnout increased 233% to 3.3 per event.",
    });
    expect(highlights.get("event_tag_decline")).toMatchObject({
      group: "programming",
      message:
        "Class Support attendance decreased by 3 (1 across 1 event versus 4 across 1; 75%). Average turnout decreased 75% to 1 per event.",
    });
    expect(highlights.get("schedule_performance")).toMatchObject({
      group: "programming",
      message:
        "Monday · 8 PM or later averaged 3.3 attendees across 3 events, the highest measured per-event turnout among schedule windows with at least three events.",
    });
    expect(highlights.get("first_attendee_return")).toMatchObject({
      group: "engagement",
      message:
        "60% of mature first-time attendees returned within 30 days (3 of 5).",
    });
    expect(highlights.get("profile_creation")?.group).toBe("membership");
    expect(highlights.get("profile_activation")).toMatchObject({
      group: "membership",
      message:
        "0% of mature profiles created in the selected period recorded a first Club-event attendance within 30 days (0 of 10).",
    });
    expect(highlights.get("attendee_continuation")?.group).toBe("engagement");
    expect(highlights.get("gateway_event_type")).toMatchObject({
      group: "programming",
      message:
        "Social first-time attendees had a 60% measured 30-day return rate (3 of 5), the highest among event types with at least five mature first-time attendees.",
    });
    expect(highlights.get("audience_overrepresented")).toMatchObject({
      group: "audience",
      message:
        "Undergraduate is overrepresented among attendees by 50 percentage points.",
    });
    expect(highlights.get("audience_underrepresented")).toMatchObject({
      group: "audience",
      message:
        "Graduate is underrepresented among attendees by 50 percentage points.",
    });
    expect(highlights.get("dues_pace")?.group).toBe("dues");
    expect(highlights.get("dues_pace")?.message).toBe(
      "Recorded dues credits are 1 ahead of the comparable day last academic year: 0 renewed, 2 first-recorded, 0 reactivated, and 1 prior-year payers not yet renewed.",
    );
    expect(highlights.get("unpaid_event_reach")).toMatchObject({
      group: "dues",
      message:
        "3 of 8 currently unpaid profiles attended at least one selected-period event (38%); 2 attended at least twice.",
    });
    expect(highlights.get("next_dues_milestone")).toMatchObject({
      group: "dues",
      message:
        "1 more current profile needs an active dues credit to reach 25%.",
    });
    expect(highlights.get("feedback_coverage")).toMatchObject({
      group: "measurement",
      message:
        "No linked feedback responses are available for the selected events, so rating and discovery patterns cannot be measured.",
    });
  });

  it("[TC-NEG-001] returns unavailable ratios instead of invalid numbers", () => {
    const report = buildClubAnalyticsReport({
      attendances: [],
      dues: [],
      events: [],
      feedback: [],
      input: defaultInput,
      members: [],
      referenceDate: new Date("2026-07-16T12:00:00.000Z"),
    });

    expect(report.events.summary).toMatchObject({
      averageAttendance: null,
      medianAttendance: null,
      memberReach: null,
      repeatAttendeeRate: null,
    });
    expect(JSON.stringify(report)).not.toMatch(/NaN|Infinity/);
  });
});
