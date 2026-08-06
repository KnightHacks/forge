import type { HackathonAnalyticsDemographic } from "@forge/validators";

import {
  buildCompositionSlices,
  deriveAgeBand,
  inferAcademicYear,
  parseDietaryResponse,
  stableCategoryColor,
} from "./demographics";

const DAY_MS = 24 * 60 * 60 * 1000;
const FIVE_MINUTES_MS = 5 * 60 * 1000;

const HACKATHON_DEMOGRAPHICS = [
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

const PROTECTED_TRUTH_CATEGORIES = new Set([
  "Prefer not to answer",
  "Missing",
  "Invalid",
  "Unknown",
  "Not applicable",
]);

type HackerStatus =
  | "withdrawn"
  | "pending"
  | "accepted"
  | "waitlisted"
  | "checkedin"
  | "confirmed"
  | "denied";

const HACKER_STATUSES: readonly HackerStatus[] = [
  "pending",
  "accepted",
  "waitlisted",
  "confirmed",
  "checkedin",
  "denied",
  "withdrawn",
];

const CHECK_IN_OUTCOMES: readonly HackathonAnalyticsAttemptSource["outcome"][] =
  [
    "checked_in",
    "already_checked_in",
    "invalid_qr",
    "hacker_not_found",
    "wrong_status",
    "not_checked_in",
    "wrong_class",
    "not_ready",
  ];

export interface HackathonAnalyticsAttendeeSource {
  checkedInAt: Date | null;
  classColor?: string | null;
  className?: string | null;
  country: string | null;
  dob: Date | string | null;
  firstName: string;
  foodAllergies?: string | null;
  gender: string | null;
  gradDate: Date | string | null;
  hackerAttId: string;
  hackerFirstTime: boolean | null;
  hackathonId: string;
  isFirstTime: boolean | null;
  isVip?: boolean;
  lastName: string;
  levelOfStudy: string | null;
  major: string | null;
  points: number;
  raceOrEthnicity: string | null;
  school: string | null;
  shirtSize: string | null;
  status: HackerStatus;
  timeApplied: Date;
  timeConfirmed: Date | null;
}

export interface HackathonAnalyticsEventSource {
  deletionIntentAt: Date | null;
  endAt: Date;
  hackathonId: string;
  id: string;
  legacy: boolean;
  location?: string | null;
  name: string;
  publishedAt: Date | null;
  purpose: "event" | "primary_check_in";
  startAt: Date;
  tag: string;
}

export interface HackathonAnalyticsAttendanceSource {
  attendanceId: string;
  checkedInAt: Date | null;
  eventId: string;
  hackerAttId: string;
  hackathonId: string;
  pointsAwarded: number | null;
  voidedAt: Date | null;
}

export interface HackathonAnalyticsAttemptSource {
  attendanceId: string | null;
  attemptedAt: Date;
  className: string | null;
  classColor?: string | null;
  eventId: string;
  eventName?: string;
  hackathonId: string;
  mode: "scanner" | "manual";
  operatorId: string | null;
  outcome:
    | "checked_in"
    | "already_checked_in"
    | "invalid_qr"
    | "hacker_not_found"
    | "wrong_status"
    | "not_checked_in"
    | "wrong_class"
    | "not_ready";
  isRepeatOccurrence?: boolean;
  isVip?: boolean;
  pointsAwarded?: number;
  wasMinor?: boolean | null;
}

export interface HackathonAnalyticsSources {
  attendees: HackathonAnalyticsAttendeeSource[];
  attendances: HackathonAnalyticsAttendanceSource[];
  attempts: HackathonAnalyticsAttemptSource[];
  events: HackathonAnalyticsEventSource[];
  hackathon: {
    applicationDeadline: Date;
    applicationOpen: Date;
    confirmationDeadline: Date;
    displayName: string;
    endDate: Date;
    id: string;
    startDate: Date;
  };
  roleGrants: {
    attemptCount?: number;
    createdAt?: Date;
    hackathonId: string;
    kind: string;
    lastAttemptAt?: Date | null;
    lastError?: string | null;
    state: string;
  }[];
}

export interface HackathonAnalyticsBuildInput {
  compositionCohort?:
    | "applicants"
    | "pending"
    | "accepted"
    | "confirmed"
    | "on_site"
    | "event_engaged";
  demographic?: HackathonAnalyticsDemographic;
  eventId: string | null;
  eventPurpose?: "program" | "primary_check_in" | "legacy_unknown" | "all";
  eventTags: string[];
  liveWindow?:
    | "last_15_minutes"
    | "last_hour"
    | "since_event_start"
    | "whole_hackathon";
  referenceDate: Date;
}

function ratio(numerator: number, denominator: number) {
  return denominator === 0 ? null : numerator / denominator;
}

function countBy<T>(rows: readonly T[], categoryForRow: (row: T) => string) {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const category = categoryForRow(row);
    counts.set(category, (counts.get(category) ?? 0) + 1);
  });
  return [...counts]
    .map(([category, count]) => ({ category, count }))
    .sort(
      (left, right) =>
        right.count - left.count || left.category.localeCompare(right.category),
    );
}

function textCategory(value: string | null | undefined) {
  return value === null || value === undefined || value.trim() === ""
    ? "Missing"
    : value.trim();
}

function assertScope(sources: HackathonAnalyticsSources) {
  const hackathonId = sources.hackathon.id;
  if (
    sources.attendees.some((row) => row.hackathonId !== hackathonId) ||
    sources.attendances.some((row) => row.hackathonId !== hackathonId) ||
    sources.events.some((row) => row.hackathonId !== hackathonId) ||
    sources.attempts.some((row) => row.hackathonId !== hackathonId) ||
    sources.roleGrants.some((row) => row.hackathonId !== hackathonId)
  ) {
    throw new Error("Hackathon Analytics source scope mismatch.");
  }
  const attendeeIds = new Set(sources.attendees.map((row) => row.hackerAttId));
  const eventIds = new Set(sources.events.map((row) => row.id));
  if (
    sources.attendances.some(
      (row) => !attendeeIds.has(row.hackerAttId) || !eventIds.has(row.eventId),
    )
  ) {
    throw new Error("Hackathon Analytics child scope mismatch.");
  }
}

function isSelected(status: HackerStatus) {
  return ["accepted", "confirmed", "checkedin"].includes(status);
}

function isConfirmed(status: HackerStatus) {
  return ["confirmed", "checkedin"].includes(status);
}

function hasKnownConfirmation(row: HackathonAnalyticsAttendeeSource) {
  return isConfirmed(row.status) || row.timeConfirmed !== null;
}

function isOnSite(row: HackathonAnalyticsAttendeeSource) {
  return row.checkedInAt !== null || row.status === "checkedin";
}

function isTrustedProgramEvent(row: HackathonAnalyticsEventSource) {
  return (
    !row.legacy && row.deletionIntentAt === null && row.purpose === "event"
  );
}

function matchesEventPurpose(
  row: HackathonAnalyticsEventSource,
  purpose: HackathonAnalyticsBuildInput["eventPurpose"],
) {
  if (row.deletionIntentAt !== null) return false;
  if (purpose === "all") return true;
  if (purpose === "primary_check_in")
    return !row.legacy && row.purpose === "primary_check_in";
  if (purpose === "legacy_unknown") return row.legacy;
  return isTrustedProgramEvent(row);
}

function categoryFor(
  row: HackathonAnalyticsAttendeeSource,
  demographic: HackathonAnalyticsDemographic,
  referenceDate: Date,
) {
  const text = (value: string | null) =>
    value === null || value.trim() === "" ? "Missing" : value.trim();
  switch (demographic) {
    case "age":
      return deriveAgeBand(row.dob, referenceDate);
    case "country":
      return text(row.country);
    case "first_time_status": {
      const value = row.isFirstTime ?? row.hackerFirstTime;
      return value === null
        ? "Unknown"
        : value
          ? "First-time hacker"
          : "Returning hacker";
    }
    case "gender":
      return text(row.gender);
    case "graduation": {
      if (row.gradDate === null) return "Missing";
      const parsed = new Date(row.gradDate);
      return Number.isNaN(parsed.getTime())
        ? "Invalid"
        : String(parsed.getUTCFullYear());
    }
    case "inferred_year_of_study":
      return inferAcademicYear(row.gradDate, row.levelOfStudy, referenceDate);
    case "level_of_study":
      return text(row.levelOfStudy).replace(
        "Undergraduate University (2 year)",
        "Undergraduate University (2 year - community college or similar)",
      );
    case "major":
      return text(row.major);
    case "race_or_ethnicity":
      return text(row.raceOrEthnicity);
    case "school":
      return text(row.school);
    case "shirt_size":
      return text(row.shirtSize);
  }
}

function buildArrivals({
  attempts,
  attendances,
  event,
}: {
  attempts: readonly HackathonAnalyticsAttemptSource[];
  attendances: readonly HackathonAnalyticsAttendanceSource[];
  event: HackathonAnalyticsEventSource;
}) {
  const rows = attendances
    .filter(
      (
        row,
      ): row is HackathonAnalyticsAttendanceSource & { checkedInAt: Date } =>
        row.eventId === event.id &&
        row.voidedAt === null &&
        row.checkedInAt !== null,
    )
    .sort(
      (left, right) => left.checkedInAt.getTime() - right.checkedInAt.getTime(),
    );
  const first = rows[0]?.checkedInAt ?? event.startAt;
  const last = rows.at(-1)?.checkedInAt ?? null;
  const observedEnd = Math.max(
    event.endAt.getTime(),
    last === null ? event.endAt.getTime() : last.getTime() + 1,
  );
  const observedStart = Math.min(event.startAt.getTime(), first.getTime());
  const duration = observedEnd - observedStart;
  const width =
    duration <= 8 * 60 * 60 * 1000
      ? FIVE_MINUTES_MS
      : duration <= DAY_MS
        ? 15 * 60 * 1000
        : 60 * 60 * 1000;
  const start = Math.floor(observedStart / width) * width;
  let endExclusive = Math.ceil(observedEnd / width) * width;
  if (endExclusive <= start) endExclusive = start + width;
  let cumulativeCount = 0;
  const buckets: {
    cumulativeCount: number;
    endAt: Date;
    intervalCount: number;
    startAt: Date;
  }[] = [];
  for (let cursor = start; cursor < endExclusive; cursor += width) {
    const intervalCount = rows.filter((row) => {
      const time = row.checkedInAt.getTime();
      return time >= cursor && time < cursor + width;
    }).length;
    cumulativeCount += intervalCount;
    buckets.push({
      cumulativeCount,
      endAt: new Date(cursor + width),
      intervalCount,
      startAt: new Date(cursor),
    });
  }
  const successfulClassByAttendance = new Map(
    attempts
      .filter(
        (
          row,
        ): row is HackathonAnalyticsAttemptSource & {
          attendanceId: string;
          className: string;
        } =>
          row.outcome === "checked_in" &&
          row.attendanceId !== null &&
          row.className !== null,
      )
      .map((row) => [row.attendanceId, row.className]),
  );
  const classNumerator = rows.filter((row) =>
    successfulClassByAttendance.has(row.attendanceId),
  ).length;
  const peakBucket = buckets.reduce<(typeof buckets)[number] | null>(
    (peak, bucket) =>
      peak === null || bucket.intervalCount > peak.intervalCount
        ? bucket
        : peak,
    null,
  );
  const percentileBucket = (percentile: number) => {
    if (rows.length === 0) return null;
    const threshold = Math.ceil(rows.length * percentile);
    return (
      buckets.find((bucket) => bucket.cumulativeCount >= threshold) ?? null
    );
  };
  return {
    afterEndCount: rows.filter(
      (row) => row.checkedInAt.getTime() > event.endAt.getTime(),
    ).length,
    afterStartCount: rows.filter(
      (row) => row.checkedInAt.getTime() >= event.startAt.getTime(),
    ).length,
    beforeStartCount: rows.filter(
      (row) => row.checkedInAt.getTime() < event.startAt.getTime(),
    ).length,
    buckets,
    bucketWidthMinutes: width / (60 * 1000),
    classCoverage: {
      denominator: rows.length,
      numerator: classNumerator,
      rate: ratio(classNumerator, rows.length),
    },
    classSeries: [
      ...new Set(
        rows.map(
          (row) =>
            successfulClassByAttendance.get(row.attendanceId) ??
            "Unassigned / legacy",
        ),
      ),
    ]
      .sort()
      .map((category) => {
        let classCumulativeCount = 0;
        return {
          category,
          buckets: buckets.map((bucket) => {
            const count = rows.filter((row) => {
              const rowCategory =
                successfulClassByAttendance.get(row.attendanceId) ??
                "Unassigned / legacy";
              const time = row.checkedInAt.getTime();
              return (
                rowCategory === category &&
                time >= bucket.startAt.getTime() &&
                time < bucket.endAt.getTime()
              );
            }).length;
            classCumulativeCount += count;
            return {
              count,
              cumulativeCount: classCumulativeCount,
              endAt: bucket.endAt,
              startAt: bucket.startAt,
            };
          }),
          count: rows.filter(
            (row) =>
              (successfulClassByAttendance.get(row.attendanceId) ??
                "Unassigned / legacy") === category,
          ).length,
        };
      }),
    p50Bucket: percentileBucket(0.5),
    p90Bucket: percentileBucket(0.9),
    peakBucket,
    schedule: {
      endAt: event.endAt,
      startAt: event.startAt,
      valid: event.endAt.getTime() >= event.startAt.getTime(),
    },
    snapshottedClassCount: classNumerator,
    timestampCoverage: {
      denominator: attendances.filter(
        (row) => row.eventId === event.id && row.voidedAt === null,
      ).length,
      numerator: rows.length,
      rate: ratio(
        rows.length,
        attendances.filter(
          (row) => row.eventId === event.id && row.voidedAt === null,
        ).length,
      ),
    },
    totalArrivalCount: rows.length,
    unassignedClassCount: rows.length - classNumerator,
  };
}

function buildApplicationBuckets(
  attendees: readonly HackathonAnalyticsAttendeeSource[],
  hackathon: HackathonAnalyticsSources["hackathon"],
) {
  const lastApplication = attendees.reduce(
    (latest, row) => Math.max(latest, row.timeApplied.getTime()),
    hackathon.applicationOpen.getTime(),
  );
  const end = Math.max(
    hackathon.applicationDeadline.getTime(),
    lastApplication,
  );
  const count = Math.max(
    1,
    Math.ceil((end - hackathon.applicationOpen.getTime()) / DAY_MS) + 1,
  );
  let cumulativeCount = 0;
  return Array.from({ length: count }, (_, elapsedDay) => {
    const startAt = new Date(
      hackathon.applicationOpen.getTime() + elapsedDay * DAY_MS,
    );
    const endAt = new Date(startAt.getTime() + DAY_MS);
    const intervalCount = attendees.filter((row) => {
      const time = row.timeApplied.getTime();
      return time >= startAt.getTime() && time < endAt.getTime();
    }).length;
    cumulativeCount += intervalCount;
    return { cumulativeCount, elapsedDay, endAt, intervalCount, startAt };
  });
}

function buildConfirmationBuckets(
  attendees: readonly HackathonAnalyticsAttendeeSource[],
  hackathon: HackathonAnalyticsSources["hackathon"],
) {
  const timestamps = attendees
    .filter(
      (
        row,
      ): row is HackathonAnalyticsAttendeeSource & { timeConfirmed: Date } =>
        isConfirmed(row.status) && row.timeConfirmed !== null,
    )
    .map((row) => row.timeConfirmed);
  const lastConfirmation = timestamps.reduce(
    (latest, timestamp) => Math.max(latest, timestamp.getTime()),
    hackathon.applicationOpen.getTime(),
  );
  const end = Math.max(
    hackathon.confirmationDeadline.getTime(),
    lastConfirmation,
  );
  const count = Math.max(
    1,
    Math.ceil((end - hackathon.applicationOpen.getTime()) / DAY_MS) + 1,
  );
  let cumulativeCount = 0;
  return Array.from({ length: count }, (_, elapsedDay) => {
    const startAt = new Date(
      hackathon.applicationOpen.getTime() + elapsedDay * DAY_MS,
    );
    const endAt = new Date(startAt.getTime() + DAY_MS);
    const intervalCount = timestamps.filter((timestamp) => {
      const time = timestamp.getTime();
      return time >= startAt.getTime() && time < endAt.getTime();
    }).length;
    cumulativeCount += intervalCount;
    return { cumulativeCount, elapsedDay, endAt, intervalCount, startAt };
  });
}

function buildFiveMinuteAttemptBuckets(
  attempts: readonly HackathonAnalyticsAttemptSource[],
  window: { endAt: Date; startAt: Date },
) {
  if (window.endAt.getTime() <= window.startAt.getTime()) return [];
  const start =
    Math.floor(window.startAt.getTime() / FIVE_MINUTES_MS) * FIVE_MINUTES_MS;
  const buckets: {
    attemptCount: number;
    endAt: Date;
    startAt: Date;
    successCount: number;
  }[] = [];
  for (
    let cursor = start;
    cursor < window.endAt.getTime();
    cursor += FIVE_MINUTES_MS
  ) {
    const bucketStart = Math.max(cursor, window.startAt.getTime());
    const bucketEnd = Math.min(
      cursor + FIVE_MINUTES_MS,
      window.endAt.getTime(),
    );
    const rows = attempts.filter((row) => {
      const time = row.attemptedAt.getTime();
      return time >= bucketStart && time < bucketEnd;
    });
    buckets.push({
      attemptCount: rows.length,
      endAt: new Date(bucketEnd),
      startAt: new Date(bucketStart),
      successCount: rows.filter((row) => row.outcome === "checked_in").length,
    });
  }
  return buckets;
}

function safeRoleErrorFamily(error: string | null | undefined) {
  const value = (error ?? "").toLocaleLowerCase();
  if (/429|rate.?limit/.test(value)) return "rate_limited";
  if (/timeout|network|socket|fetch/.test(value)) return "timeout_or_network";
  if (/permission|forbidden|403/.test(value)) return "missing_permission";
  if (value.includes("role") && /missing|not found|unknown/.test(value))
    return "role_unavailable";
  if (/user|member/.test(value) && /missing|not found|unknown/.test(value))
    return "user_unavailable";
  if (/discord|api|5\d\d/.test(value)) return "discord_api";
  return "unknown";
}

function resolveLiveWindow(
  input: HackathonAnalyticsBuildInput,
  hackathon: HackathonAnalyticsSources["hackathon"],
  events: readonly HackathonAnalyticsEventSource[],
  attempts: readonly HackathonAnalyticsAttemptSource[],
) {
  if (input.liveWindow === "since_event_start" && input.eventId === null) {
    throw new Error("Since-event-start requires one selected event.");
  }
  const selectedEvent = events.find((event) => event.id === input.eventId);
  const latestAttemptAt = attempts.reduce<Date | null>(
    (latest, row) =>
      latest === null || row.attemptedAt.getTime() > latest.getTime()
        ? row.attemptedAt
        : latest,
    null,
  );
  const boundedObservationEnd =
    input.liveWindow === "since_event_start" && selectedEvent
      ? new Date(
          Math.min(
            input.referenceDate.getTime(),
            Math.max(
              selectedEvent.endAt.getTime(),
              latestAttemptAt?.getTime() ?? selectedEvent.endAt.getTime(),
            ),
          ),
        )
      : input.liveWindow === "whole_hackathon"
        ? new Date(
            Math.min(
              input.referenceDate.getTime(),
              Math.max(
                hackathon.endDate.getTime(),
                latestAttemptAt?.getTime() ?? hackathon.endDate.getTime(),
              ),
            ),
          )
        : input.referenceDate;
  const endAt = boundedObservationEnd;
  const startAt =
    input.liveWindow === "last_15_minutes"
      ? new Date(endAt.getTime() - 15 * 60 * 1000)
      : input.liveWindow === "last_hour"
        ? new Date(endAt.getTime() - 60 * 60 * 1000)
        : input.liveWindow === "since_event_start" && selectedEvent
          ? selectedEvent.startAt
          : hackathon.startDate;
  return { endAt, startAt };
}

function eventWeekday(startAt: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
  }).format(startAt);
}

function eventStartTimeBand(startAt: Date) {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      hour12: false,
      timeZone: "America/New_York",
    }).format(startAt),
  );
  if (hour < 6) return "Overnight (12-5:59 AM)";
  if (hour < 12) return "Morning (6-11:59 AM)";
  if (hour < 17) return "Afternoon (12-4:59 PM)";
  if (hour < 21) return "Evening (5-8:59 PM)";
  return "Late night (9-11:59 PM)";
}

function eventDurationBand(event: HackathonAnalyticsEventSource) {
  const minutes = (event.endAt.getTime() - event.startAt.getTime()) / 60_000;
  if (minutes < 0) return "Invalid schedule";
  if (minutes < 30) return "Under 30 minutes";
  if (minutes <= 60) return "30-60 minutes";
  if (minutes <= 120) return "61-120 minutes";
  return "Over 2 hours";
}

function buildEventGrouping(
  events: readonly HackathonAnalyticsEventSource[],
  attendances: readonly HackathonAnalyticsAttendanceSource[],
  onSiteIds: ReadonlySet<string>,
  categoryForEvent: (event: HackathonAnalyticsEventSource) => string,
) {
  const categories = new Map<string, HackathonAnalyticsEventSource[]>();
  events.forEach((event) => {
    const category = categoryForEvent(event);
    const rows = categories.get(category) ?? [];
    rows.push(event);
    categories.set(category, rows);
  });
  return [...categories]
    .map(([category, groupedEvents]) => {
      const eventIds = new Set(groupedEvents.map((event) => event.id));
      const groupedAttendances = attendances.filter((row) =>
        eventIds.has(row.eventId),
      );
      const attendeeIds = new Set(
        groupedAttendances.map((row) => row.hackerAttId),
      );
      const onSiteAttendeeCount = [...attendeeIds].filter((id) =>
        onSiteIds.has(id),
      ).length;
      return {
        category,
        distinctAttendance: new Set(
          groupedAttendances.map(
            (row) => `${row.eventId}\u0000${row.hackerAttId}`,
          ),
        ).size,
        distinctAttendeeCount: attendeeIds.size,
        eventCount: groupedEvents.length,
        eventReach: ratio(onSiteAttendeeCount, onSiteIds.size),
        onSiteAttendeeCount,
        occurrenceCount: groupedAttendances.length,
      };
    })
    .sort(
      (left, right) =>
        right.distinctAttendance - left.distinctAttendance ||
        left.category.localeCompare(right.category),
    );
}

function buildEventTimeline(
  attendances: readonly HackathonAnalyticsAttendanceSource[],
  hackathon: HackathonAnalyticsSources["hackathon"],
) {
  const timestamps = attendances
    .map((row) => row.checkedInAt)
    .filter((value): value is Date => value !== null);
  const last = timestamps.reduce(
    (latest, timestamp) => Math.max(latest, timestamp.getTime()),
    hackathon.endDate.getTime(),
  );
  const observedDuration = last - hackathon.startDate.getTime();
  const width = observedDuration <= 7 * DAY_MS ? 3_600_000 : DAY_MS;
  const start = Math.floor(hackathon.startDate.getTime() / width) * width;
  const end = Math.max(start + width, Math.ceil(last / width) * width);
  let cumulativeOccurrenceCount = 0;
  return {
    bucketWidthMinutes: width / 60_000,
    buckets: Array.from(
      { length: Math.max(1, Math.ceil((end - start) / width)) },
      (_, index) => {
        const startAt = new Date(start + index * width);
        const endAt = new Date(startAt.getTime() + width);
        const rows = attendances.filter((row) => {
          const time = row.checkedInAt?.getTime();
          return (
            time !== undefined &&
            time >= startAt.getTime() &&
            time < endAt.getTime()
          );
        });
        cumulativeOccurrenceCount += rows.length;
        return {
          cumulativeOccurrenceCount,
          distinctAttendance: new Set(
            rows.map((row) => `${row.eventId}\u0000${row.hackerAttId}`),
          ).size,
          endAt,
          occurrenceCount: rows.length,
          startAt,
        };
      },
    ),
    timestampCoverage: {
      denominator: attendances.length,
      numerator: timestamps.length,
      rate: ratio(timestamps.length, attendances.length),
    },
  };
}

export function buildHackathonAnalyticsReport(
  sources: HackathonAnalyticsSources,
  input: HackathonAnalyticsBuildInput,
) {
  assertScope(sources);
  const { attendees, attendances, attempts, events, hackathon } = sources;
  const selected = attendees.filter((row) => isSelected(row.status));
  const confirmed = attendees.filter((row) => isConfirmed(row.status));
  const knownConfirmed = attendees.filter(hasKnownConfirmation);
  const onSite = attendees.filter(isOnSite);
  const confirmedIds = new Set(confirmed.map((row) => row.hackerAttId));
  const onSiteIds = new Set(onSite.map((row) => row.hackerAttId));
  const onSiteCurrentConfirmed = onSite.filter((row) =>
    confirmedIds.has(row.hackerAttId),
  ).length;

  const trustedEvents = events.filter(isTrustedProgramEvent);
  const displayEvents = events.filter(
    (event) =>
      matchesEventPurpose(event, input.eventPurpose ?? "program") &&
      (input.eventId === null || event.id === input.eventId) &&
      (input.eventTags.length === 0 || input.eventTags.includes(event.tag)),
  );
  const purposeEvents = events.filter((event) =>
    matchesEventPurpose(event, input.eventPurpose ?? "program"),
  );
  const purposeEventIds = new Set(purposeEvents.map((event) => event.id));
  const validPurposeAttendances = attendances.filter(
    (row) => row.voidedAt === null && purposeEventIds.has(row.eventId),
  );
  const trustedIds = new Set(trustedEvents.map((row) => row.id));
  const filteredTrustedIds = new Set(
    trustedEvents
      .filter(
        (event) =>
          (input.eventId === null || event.id === input.eventId) &&
          (input.eventTags.length === 0 || input.eventTags.includes(event.tag)),
      )
      .map((row) => row.id),
  );
  const displayEventIds = new Set(displayEvents.map((event) => event.id));
  const validDisplayAttendances = attendances.filter(
    (row) => row.voidedAt === null && displayEventIds.has(row.eventId),
  );
  const distinctPairs = new Map<string, HackathonAnalyticsAttendanceSource>();
  validDisplayAttendances.forEach((row) =>
    distinctPairs.set(`${row.eventId}\u0000${row.hackerAttId}`, row),
  );
  const eventsByHacker = new Map<string, Set<string>>();
  distinctPairs.forEach((row) => {
    const set = eventsByHacker.get(row.hackerAttId) ?? new Set<string>();
    set.add(row.eventId);
    eventsByHacker.set(row.hackerAttId, set);
  });
  const eventEngaged = new Set(eventsByHacker.keys());
  const eventEngagedOnSite = [...eventEngaged].filter((id) =>
    onSiteIds.has(id),
  ).length;
  const repeatEventEngaged = [...eventsByHacker.values()].filter(
    (set) => set.size >= 2,
  ).length;
  const perEventDistinctCounts = [...displayEventIds]
    .map(
      (eventId) =>
        new Set(
          validDisplayAttendances
            .filter((row) => row.eventId === eventId)
            .map((row) => row.hackerAttId),
        ).size,
    )
    .sort((left, right) => left - right);
  const eventMedian =
    perEventDistinctCounts.length === 0
      ? null
      : perEventDistinctCounts.length % 2 === 1
        ? (perEventDistinctCounts[
            Math.floor(perEventDistinctCounts.length / 2)
          ] ?? null)
        : ((perEventDistinctCounts[perEventDistinctCounts.length / 2 - 1] ??
            0) +
            (perEventDistinctCounts[perEventDistinctCounts.length / 2] ?? 0)) /
          2;
  const coveredEventPoints = validDisplayAttendances.filter(
    (row) => row.pointsAwarded !== null,
  );
  const orderedTrustedEvents = purposeEvents.sort(
    (left, right) =>
      left.startAt.getTime() - right.startAt.getTime() ||
      left.id.localeCompare(right.id),
  );
  const trustedEventOrder = new Map(
    orderedTrustedEvents.map((event, index) => [event.id, index]),
  );
  const firstTrustedEventByHacker = new Map<string, string>();
  const allTrustedEventsByHacker = new Map<string, Set<string>>();
  validPurposeAttendances.forEach((row) => {
    const eventIds =
      allTrustedEventsByHacker.get(row.hackerAttId) ?? new Set<string>();
    eventIds.add(row.eventId);
    allTrustedEventsByHacker.set(row.hackerAttId, eventIds);
  });
  allTrustedEventsByHacker.forEach((eventIds, hackerAttId) => {
    const firstEventId = [...eventIds].sort(
      (left, right) =>
        (trustedEventOrder.get(left) ?? Number.MAX_SAFE_INTEGER) -
        (trustedEventOrder.get(right) ?? Number.MAX_SAFE_INTEGER),
    )[0];
    if (firstEventId) firstTrustedEventByHacker.set(hackerAttId, firstEventId);
  });

  const confirmationRecorded = confirmed.filter(
    (row) => row.timeConfirmed !== null,
  ).length;
  const confirmationBeforeApplicationOpenCount = confirmed.filter(
    (row) =>
      row.timeConfirmed !== null &&
      row.timeConfirmed.getTime() < hackathon.applicationOpen.getTime(),
  ).length;
  const confirmationAtOrAfterDeadlineCount = confirmed.filter(
    (row) =>
      row.timeConfirmed !== null &&
      row.timeConfirmed.getTime() >= hackathon.confirmationDeadline.getTime(),
  ).length;
  const finalSevenStart = hackathon.applicationDeadline.getTime() - 7 * DAY_MS;
  const finalSevenDayCount = attendees.filter((row) => {
    const time = row.timeApplied.getTime();
    return (
      time >= finalSevenStart && time < hackathon.applicationDeadline.getTime()
    );
  }).length;
  const beforeApplicationOpenCount = attendees.filter(
    (row) => row.timeApplied.getTime() < hackathon.applicationOpen.getTime(),
  ).length;
  const atOrAfterApplicationDeadlineCount = attendees.filter(
    (row) =>
      row.timeApplied.getTime() >= hackathon.applicationDeadline.getTime(),
  ).length;
  const pendingSevenDayCount = attendees.filter(
    (row) =>
      row.status === "pending" &&
      input.referenceDate.getTime() >= row.timeApplied.getTime() + 7 * DAY_MS,
  ).length;
  const nextApplicationDeadline = [
    { at: hackathon.applicationDeadline, kind: "application" as const },
    { at: hackathon.confirmationDeadline, kind: "confirmation" as const },
  ]
    .filter(({ at }) => at.getTime() > input.referenceDate.getTime())
    .sort((left, right) => left.at.getTime() - right.at.getTime())[0];
  const applicationBreakdowns = Object.fromEntries(
    HACKATHON_DEMOGRAPHICS.map((dimension) => [
      dimension,
      countBy(attendees, (row) =>
        categoryFor(row, dimension, hackathon.startDate),
      ).map(({ category, count: applicantCount }) => {
        const categoryRows = attendees.filter(
          (row) =>
            categoryFor(row, dimension, hackathon.startDate) === category,
        );
        const currentSelectedCount = categoryRows.filter((row) =>
          isSelected(row.status),
        ).length;
        const currentConfirmedCount = categoryRows.filter((row) =>
          isConfirmed(row.status),
        ).length;
        const categoryOnSiteCount = categoryRows.filter(isOnSite).length;
        const categoryKnownConfirmed =
          categoryRows.filter(hasKnownConfirmation);
        const categoryKnownConfirmedIds = new Set(
          categoryKnownConfirmed.map((row) => row.hackerAttId),
        );
        const categoryOnSiteKnownConfirmedCount = categoryRows.filter(
          (row) =>
            isOnSite(row) && categoryKnownConfirmedIds.has(row.hackerAttId),
        ).length;
        const onSiteCurrentConfirmedCount = categoryRows.filter(
          (row) => isOnSite(row) && isConfirmed(row.status),
        ).length;
        return {
          acceptedCount: categoryRows.filter((row) => row.status === "accepted")
            .length,
          applicantCount,
          applicantShare: ratio(applicantCount, attendees.length),
          category,
          checkedInCount: categoryOnSiteCount,
          confirmedCount: categoryRows.filter(
            (row) => row.status === "confirmed",
          ).length,
          currentConfirmedCount,
          currentConfirmedRate: ratio(
            currentConfirmedCount,
            currentSelectedCount,
          ),
          currentSelectedCount,
          currentSelectedRate: ratio(currentSelectedCount, applicantCount),
          knownConfirmedCheckedInCount: categoryOnSiteKnownConfirmedCount,
          knownConfirmedCount: categoryKnownConfirmed.length,
          knownConfirmedToCheckInRate: ratio(
            categoryOnSiteKnownConfirmedCount,
            categoryKnownConfirmed.length,
          ),
          onSiteCount: categoryOnSiteCount,
          onSiteOutsideCurrentConfirmedCount:
            categoryOnSiteCount - onSiteCurrentConfirmedCount,
          onSiteRate: ratio(onSiteCurrentConfirmedCount, currentConfirmedCount),
        };
      }),
    ]),
  ) as Record<
    HackathonAnalyticsDemographic,
    {
      applicantCount: number;
      acceptedCount: number;
      applicantShare: number | null;
      category: string;
      checkedInCount: number;
      confirmedCount: number;
      currentConfirmedCount: number;
      currentConfirmedRate: number | null;
      currentSelectedCount: number;
      currentSelectedRate: number | null;
      knownConfirmedCheckedInCount: number;
      knownConfirmedCount: number;
      knownConfirmedToCheckInRate: number | null;
      onSiteCount: number;
      onSiteOutsideCurrentConfirmedCount: number;
      onSiteRate: number | null;
    }[]
  >;

  const issueOutcomes = new Set([
    "invalid_qr",
    "hacker_not_found",
    "wrong_status",
    "not_checked_in",
    "wrong_class",
    "not_ready",
  ]);
  const failureCoverageStartsAt = new Date(
    input.referenceDate.getTime() - 30 * DAY_MS,
  );
  const liveEventIds = new Set(displayEvents.map((event) => event.id));
  const relevantLiveAttempts = attempts.filter((row) =>
    liveEventIds.has(row.eventId),
  );
  const liveWindow = resolveLiveWindow(
    input,
    hackathon,
    events,
    relevantLiveAttempts,
  );
  const liveAttempts = attempts.filter((row) => {
    const time = row.attemptedAt.getTime();
    return (
      liveEventIds.has(row.eventId) &&
      time >= liveWindow.startAt.getTime() &&
      time < liveWindow.endAt.getTime()
    );
  });
  const operatorIds = [
    ...new Set(
      liveAttempts
        .map((row) => row.operatorId)
        .filter((value): value is string => value !== null),
    ),
  ].sort();
  const issueCount = liveAttempts.filter((row) =>
    issueOutcomes.has(row.outcome),
  ).length;
  const liveSuccesses = liveAttempts.filter(
    (row) => row.outcome === "checked_in",
  );
  const liveDurationMinutes = Math.max(
    0,
    (liveWindow.endAt.getTime() - liveWindow.startAt.getTime()) / 60_000,
  );
  const liveBuckets = buildFiveMinuteAttemptBuckets(liveAttempts, liveWindow);
  const peakThroughput = liveBuckets.reduce<
    (typeof liveBuckets)[number] | null
  >(
    (peak, bucket) =>
      peak === null || bucket.successCount > peak.successCount ? bucket : peak,
    null,
  );

  const demographic = input.demographic ?? "level_of_study";
  const selectedIds = new Set(selected.map((row) => row.hackerAttId));
  const onSiteCoveredEventPoints = coveredEventPoints.filter((row) =>
    onSiteIds.has(row.hackerAttId),
  );
  const onSiteAwardedPoints = onSiteCoveredEventPoints.reduce(
    (sum, row) => sum + (row.pointsAwarded ?? 0),
    0,
  );
  const categories = new Map<string, HackathonAnalyticsAttendeeSource[]>();
  attendees.forEach((row) => {
    const category = categoryFor(row, demographic, hackathon.startDate);
    const values = categories.get(category) ?? [];
    values.push(row);
    categories.set(category, values);
  });
  const audienceRows = [...categories.entries()]
    .map(([category, rows]) => {
      const rowIds = new Set(rows.map((row) => row.hackerAttId));
      const categoryOnSite = rows.filter(isOnSite).length;
      const categoryCurrentSelected = rows.filter((row) =>
        selectedIds.has(row.hackerAttId),
      ).length;
      const categoryCurrentConfirmed = rows.filter((row) =>
        confirmedIds.has(row.hackerAttId),
      ).length;
      const categoryKnownConfirmed = rows.filter(hasKnownConfirmation);
      const categoryKnownConfirmedIds = new Set(
        categoryKnownConfirmed.map((row) => row.hackerAttId),
      );
      const categoryOnSiteKnownConfirmed = rows.filter(
        (row) =>
          onSiteIds.has(row.hackerAttId) &&
          categoryKnownConfirmedIds.has(row.hackerAttId),
      ).length;
      const categoryOnSiteCurrentConfirmed = rows.filter(
        (row) =>
          onSiteIds.has(row.hackerAttId) && confirmedIds.has(row.hackerAttId),
      ).length;
      const categoryEventEngagedOnSite = [...eventEngaged].filter(
        (id) => rowIds.has(id) && onSiteIds.has(id),
      ).length;
      const categoryEventEngagedOutsideOnSite = [...eventEngaged].filter(
        (id) => rowIds.has(id) && !onSiteIds.has(id),
      ).length;
      const categoryRepeatEventEngagedOnSite = [...eventsByHacker].filter(
        ([id, eventIds]) =>
          rowIds.has(id) && onSiteIds.has(id) && eventIds.size >= 2,
      ).length;
      const categoryPairs = [...distinctPairs.values()].filter(
        (row) => rowIds.has(row.hackerAttId) && onSiteIds.has(row.hackerAttId),
      ).length;
      const categoryPointRows = onSiteCoveredEventPoints.filter((row) =>
        rowIds.has(row.hackerAttId),
      );
      const categoryAwardedPoints = categoryPointRows.reduce(
        (sum, row) => sum + (row.pointsAwarded ?? 0),
        0,
      );
      const applicantShare = ratio(rows.length, attendees.length);
      const onSiteShare = ratio(categoryOnSite, onSite.length);
      return {
        acceptedCount: rows.filter((row) => row.status === "accepted").length,
        applicantCount: rows.length,
        applicantShare,
        awardedPointShare: ratio(categoryAwardedPoints, onSiteAwardedPoints),
        awardedPoints: categoryAwardedPoints,
        category,
        checkedInCount: categoryOnSite,
        confirmedCount: rows.filter((row) => row.status === "confirmed").length,
        currentConfirmedCount: categoryCurrentConfirmed,
        currentConfirmedRate: ratio(
          categoryCurrentConfirmed,
          categoryCurrentSelected,
        ),
        currentSelectedCount: categoryCurrentSelected,
        currentSelectedRate: ratio(categoryCurrentSelected, rows.length),
        eventEngagedCount: categoryEventEngagedOnSite,
        eventEngagedOutsideOnSiteCount: categoryEventEngagedOutsideOnSite,
        eventReach: ratio(categoryEventEngagedOnSite, categoryOnSite),
        eventsPerOnSite: ratio(categoryPairs, categoryOnSite),
        knownConfirmedCheckedInCount: categoryOnSiteKnownConfirmed,
        knownConfirmedCount: categoryKnownConfirmed.length,
        knownConfirmedToCheckInRate: ratio(
          categoryOnSiteKnownConfirmed,
          categoryKnownConfirmed.length,
        ),
        onSiteCount: categoryOnSite,
        onSiteCurrentConfirmedCount: categoryOnSiteCurrentConfirmed,
        onSiteOutsideCurrentConfirmedCount:
          categoryOnSite - categoryOnSiteCurrentConfirmed,
        onSiteRate: ratio(
          categoryOnSiteCurrentConfirmed,
          categoryCurrentConfirmed,
        ),
        onSiteShare,
        pointSnapshotCoverage: {
          denominator: validDisplayAttendances.filter(
            (row) =>
              rowIds.has(row.hackerAttId) && onSiteIds.has(row.hackerAttId),
          ).length,
          numerator: categoryPointRows.length,
          rate: ratio(
            categoryPointRows.length,
            validDisplayAttendances.filter(
              (row) =>
                rowIds.has(row.hackerAttId) && onSiteIds.has(row.hackerAttId),
            ).length,
          ),
        },
        repeatEventEngagedCount: categoryRepeatEventEngagedOnSite,
        repeatEventEngagedRate: ratio(
          categoryRepeatEventEngagedOnSite,
          categoryEventEngagedOnSite,
        ),
        representationGap:
          onSiteShare === null || applicantShare === null
            ? null
            : onSiteShare - applicantShare,
      };
    })
    .sort(
      (left, right) =>
        right.applicantCount - left.applicantCount ||
        left.category.localeCompare(right.category),
    );

  const compositionBase =
    input.compositionCohort === "pending" ||
    input.compositionCohort === "accepted" ||
    input.compositionCohort === "confirmed"
      ? attendees.filter((row) => row.status === input.compositionCohort)
      : input.compositionCohort === "on_site"
        ? onSite
        : input.compositionCohort === "event_engaged"
          ? attendees.filter((row) => eventEngaged.has(row.hackerAttId))
          : attendees;
  const compositionCounts = new Map<string, number>();
  compositionBase.forEach((row) => {
    const category = categoryFor(row, demographic, hackathon.startDate);
    compositionCounts.set(category, (compositionCounts.get(category) ?? 0) + 1);
  });
  const compositionSlices = buildCompositionSlices(
    [...compositionCounts].map(([category, count]) => ({ category, count })),
  );
  const compositionRows = [...compositionCounts]
    .map(([category, count]) => ({
      category,
      color: stableCategoryColor(category),
      count,
      protected: PROTECTED_TRUTH_CATEGORIES.has(category),
      share: ratio(count, compositionBase.length),
    }))
    .sort(
      (left, right) =>
        right.count - left.count || left.category.localeCompare(right.category),
    );
  const usableCategoryCount = [...compositionCounts]
    .filter(
      ([category]) =>
        !["Missing", "Invalid", "Unknown", "Not applicable"].includes(category),
    )
    .reduce((sum, [, count]) => sum + count, 0);

  const selectedEvent =
    input.eventId === null
      ? null
      : (events.find((event) => event.id === input.eventId) ?? null);
  const arrivals =
    selectedEvent === null
      ? null
      : buildArrivals({ attempts, attendances, event: selectedEvent });

  const dietaryTags = new Map<string, number>();
  let dietaryMissing = 0;
  let dietaryOther = 0;
  attendees.forEach((row) => {
    const parsed = parseDietaryResponse(row.foodAllergies ?? null);
    if (parsed.tags[0] === "No response recorded") dietaryMissing += 1;
    else {
      parsed.tags.forEach((tag) =>
        dietaryTags.set(tag, (dietaryTags.get(tag) ?? 0) + 1),
      );
    }
    if (parsed.hasOtherResponse) dietaryOther += 1;
  });

  const attendanceFrequencyRows = [
    { key: "none", max: 1, min: 0 },
    { key: "one", max: 2, min: 1 },
    { key: "two_to_three", max: 4, min: 2 },
    { key: "four_to_six", max: 7, min: 4 },
    { key: "seven_plus", max: Number.POSITIVE_INFINITY, min: 7 },
  ].map(({ key, max, min }) => ({
    count: onSite.filter((row) => {
      const eventCount = eventsByHacker.get(row.hackerAttId)?.size ?? 0;
      return eventCount >= min && eventCount < max;
    }).length,
    key,
  }));
  const classParticipationRows = countBy(onSite, (row) =>
    textCategory(row.className ?? null),
  ).map(({ category, count: onSiteCount }) => {
    const classIds = new Set(
      onSite
        .filter((row) => textCategory(row.className ?? null) === category)
        .map((row) => row.hackerAttId),
    );
    const eventEngagedCount = [...eventEngaged].filter((id) =>
      classIds.has(id),
    ).length;
    return {
      category,
      eventEngagedCount,
      eventReach: ratio(eventEngagedCount, onSiteCount),
      onSiteCount,
      onSiteShare: ratio(onSiteCount, onSite.length),
    };
  });
  const eventGroupings = {
    duration: buildEventGrouping(
      displayEvents,
      validDisplayAttendances,
      onSiteIds,
      eventDurationBand,
    ),
    location: buildEventGrouping(
      displayEvents,
      validDisplayAttendances,
      onSiteIds,
      (event) => textCategory(event.location),
    ),
    startTime: buildEventGrouping(
      displayEvents,
      validDisplayAttendances,
      onSiteIds,
      (event) => eventStartTimeBand(event.startAt),
    ),
    tag: buildEventGrouping(
      displayEvents,
      validDisplayAttendances,
      onSiteIds,
      (event) => textCategory(event.tag),
    ),
    weekday: buildEventGrouping(
      displayEvents,
      validDisplayAttendances,
      onSiteIds,
      (event) => eventWeekday(event.startAt),
    ),
  };

  const liveEventById = new Map(events.map((event) => [event.id, event]));
  const roleRows = [...new Set(sources.roleGrants.map((row) => row.kind))]
    .sort()
    .map((kind) => {
      const rows = sources.roleGrants.filter((row) => row.kind === kind);
      return {
        failedCount: rows.filter((row) => row.state === "failed").length,
        kind,
        pendingCount: rows.filter((row) => row.state === "pending").length,
        retryCount: rows.reduce(
          (sum, row) => sum + Math.max(0, (row.attemptCount ?? 1) - 1),
          0,
        ),
        stateRows: countBy(rows, (row) => row.state).map(
          ({ category, count }) => ({ count, state: category }),
        ),
      };
    });
  const unresolvedRoleRows = sources.roleGrants.filter((row) =>
    ["pending", "failed"].includes(row.state),
  );
  const oldestUnresolvedRoleAt = unresolvedRoleRows
    .map((row) => row.createdAt)
    .filter((value): value is Date => value !== undefined)
    .sort((left, right) => left.getTime() - right.getTime())[0];
  const oldestUnresolvedRoleAttemptAt = unresolvedRoleRows
    .map((row) => row.lastAttemptAt)
    .filter((value): value is Date => value instanceof Date)
    .sort((left, right) => left.getTime() - right.getTime())[0];
  const roleErrorRows = countBy(
    unresolvedRoleRows.filter((row) => row.state === "failed"),
    (row) => safeRoleErrorFamily(row.lastError),
  ).map(({ category, count }) => ({ count, family: category }));

  const actionKinds = [
    "manage_application_demand",
    "advance_application_funnel",
    "prepare_people_and_supplies",
    "staff_live_operations",
    "strengthen_event_engagement",
    "improve_measurement",
  ] as const;
  const actionNavigation = [
    "applications",
    "applications",
    "applications",
    "live_operations",
    "events",
    "audience",
  ] as const;
  const actionEvidence = [
    [
      { key: "applicants", value: attendees.length },
      { key: "final_seven_day_applications", value: finalSevenDayCount },
      {
        key: "pending_review",
        value: attendees.filter((row) => row.status === "pending").length,
      },
      { key: "pending_review_7d_plus", value: pendingSevenDayCount },
    ],
    [
      {
        key: "pending_review",
        value: attendees.filter((row) => row.status === "pending").length,
      },
      {
        key: "accepted_current_status",
        value: attendees.filter((row) => row.status === "accepted").length,
      },
      {
        key: "confirmed_current_status",
        value: attendees.filter((row) => row.status === "confirmed").length,
      },
      { key: "checked_in", value: onSite.length },
      { key: "known_confirmation_evidence", value: knownConfirmed.length },
      {
        key: "known_confirmed_to_check_in_rate",
        value: ratio(
          onSite.filter((row) => hasKnownConfirmation(row)).length,
          knownConfirmed.length,
        ),
      },
    ],
    [
      { key: "known_confirmation_evidence", value: knownConfirmed.length },
      { key: "checked_in", value: onSite.length },
      { key: "dietary_recorded", value: attendees.length - dietaryMissing },
      {
        key: "shirt_size_recorded",
        value: attendees.filter(
          (row) => textCategory(row.shirtSize) !== "Missing",
        ).length,
      },
      { key: "demographic_coverage", value: usableCategoryCount },
    ],
    [
      { key: "retained_issues", value: issueCount },
      {
        key: "failure_coverage_partial",
        value:
          liveWindow.startAt.getTime() < failureCoverageStartsAt.getTime()
            ? 1
            : 0,
      },
      {
        key: "peak_successful_throughput",
        value: peakThroughput?.successCount ?? null,
      },
      { key: "active_operators", value: operatorIds.length },
      {
        key: "unresolved_role_grants",
        value: sources.roleGrants.filter((row) =>
          ["pending", "failed"].includes(row.state),
        ).length,
      },
    ],
    [
      { key: "matching_events", value: displayEvents.length },
      {
        key: "legacy_events",
        value: displayEvents.filter((event) => event.legacy).length,
      },
      { key: "on_site", value: onSite.length },
      { key: "event_engaged_on_site", value: eventEngagedOnSite },
      {
        key: "event_reach",
        value: ratio(eventEngagedOnSite, onSite.length),
      },
      { key: "repeat_event_engaged", value: repeatEventEngaged },
      {
        key: "repeat_event_engaged_rate",
        value: ratio(repeatEventEngaged, eventEngaged.size),
      },
    ],
    [
      { key: "confirmation_timestamp_coverage", value: confirmationRecorded },
      {
        key: "arrival_timestamp_coverage",
        value: arrivals?.timestampCoverage.numerator ?? null,
      },
      {
        key: "arrival_class_coverage",
        value: arrivals?.classCoverage.numerator ?? null,
      },
      {
        key: "first_time_coverage",
        value: attendees.filter(
          (row) => (row.isFirstTime ?? row.hackerFirstTime) !== null,
        ).length,
      },
      { key: "demographic_coverage", value: usableCategoryCount },
      {
        key: "event_point_snapshot_coverage",
        value: coveredEventPoints.length,
      },
    ],
  ] as const;

  return {
    applications: {
      anomalies: {
        atOrAfterDeadline: atOrAfterApplicationDeadlineCount,
        beforeOpen: beforeApplicationOpenCount,
        confirmationAtOrAfterDeadline: confirmationAtOrAfterDeadlineCount,
        confirmationBeforeApplicationOpen:
          confirmationBeforeApplicationOpenCount,
      },
      breakdowns: applicationBreakdowns,
      confirmationBuckets: buildConfirmationBuckets(attendees, hackathon),
      dailyBuckets: buildApplicationBuckets(attendees, hackathon),
      deadlineMarkers: [
        {
          at: hackathon.applicationDeadline,
          elapsedDay:
            (hackathon.applicationDeadline.getTime() -
              hackathon.applicationOpen.getTime()) /
            DAY_MS,
          kind: "application" as const,
        },
        {
          at: hackathon.confirmationDeadline,
          elapsedDay:
            (hackathon.confirmationDeadline.getTime() -
              hackathon.applicationOpen.getTime()) /
            DAY_MS,
          kind: "confirmation" as const,
        },
      ],
      dietary: {
        missing: dietaryMissing,
        other: dietaryOther,
        recorded: attendees.length - dietaryMissing,
        tags: [...dietaryTags]
          .map(([tag, count]) => ({ count, tag }))
          .sort(
            (left, right) =>
              right.count - left.count || left.tag.localeCompare(right.tag),
          ),
      },
      confirmationTimeCoverage: {
        denominator: confirmed.length,
        numerator: confirmationRecorded,
        rate: ratio(confirmationRecorded, confirmed.length),
      },
      finalSevenDayCount,
      firstTimeRows: applicationBreakdowns.first_time_status,
      firstTimeState: {
        coverage: {
          denominator: attendees.length,
          numerator: attendees.filter(
            (row) => (row.isFirstTime ?? row.hackerFirstTime) !== null,
          ).length,
          rate: ratio(
            attendees.filter(
              (row) => (row.isFirstTime ?? row.hackerFirstTime) !== null,
            ).length,
            attendees.length,
          ),
        },
        nativeVsLegacyDerivedProvenance: "unavailable" as const,
      },
      nextDeadline:
        nextApplicationDeadline === undefined
          ? null
          : {
              ...nextApplicationDeadline,
              millisecondsRemaining:
                nextApplicationDeadline.at.getTime() -
                input.referenceDate.getTime(),
            },
      rates: {
        confirmation: ratio(confirmed.length, selected.length),
        selection: ratio(selected.length, attendees.length),
      },
      pendingAgeRows: [
        { key: "under_24h", maxDays: 1, minDays: 0 },
        { key: "1_2d", maxDays: 3, minDays: 1 },
        { key: "3_6d", maxDays: 7, minDays: 3 },
        { key: "7d_plus", maxDays: Number.POSITIVE_INFINITY, minDays: 7 },
      ]
        .map(({ key, maxDays, minDays }) => ({
          count: attendees.filter((row) => {
            if (row.status !== "pending") return false;
            const ageDays =
              (input.referenceDate.getTime() - row.timeApplied.getTime()) /
              DAY_MS;
            return ageDays >= minDays && ageDays < maxDays;
          }).length,
          key,
        }))
        .concat({
          count: attendees.filter(
            (row) =>
              row.status === "pending" &&
              input.referenceDate.getTime() < row.timeApplied.getTime(),
          ).length,
          key: "invalid_future",
        }),
      statusRows: HACKER_STATUSES.map((status) => ({
        count: attendees.filter((row) => row.status === status).length,
        status,
      })),
      shirtSizeRows: applicationBreakdowns.shirt_size,
      shirtSizeCoverage: {
        denominator: attendees.length,
        numerator: attendees.filter(
          (row) => textCategory(row.shirtSize) !== "Missing",
        ).length,
        rate: ratio(
          attendees.filter((row) => textCategory(row.shirtSize) !== "Missing")
            .length,
          attendees.length,
        ),
      },
    },
    audience: {
      anomalies: {
        eventEngagedOutsideOnSite: [...eventEngaged].filter(
          (id) => !onSiteIds.has(id),
        ).length,
        onSiteOutsideCurrentConfirmed: onSite.length - onSiteCurrentConfirmed,
      },
      composition: {
        cohort: input.compositionCohort ?? "applicants",
        rows: compositionRows,
        slices: compositionSlices,
        total: compositionBase.length,
      },
      coverage: {
        denominator: compositionBase.length,
        numerator: usableCategoryCount,
        rate: ratio(usableCategoryCount, compositionBase.length),
      },
      demographic,
      dietary: {
        missing: dietaryMissing,
        other: dietaryOther,
        recorded: attendees.length - dietaryMissing,
        tags: [...dietaryTags]
          .map(([tag, count]) => ({ count, tag }))
          .sort(
            (left, right) =>
              right.count - left.count || left.tag.localeCompare(right.tag),
          ),
      },
      rows: audienceRows,
      totals: {
        applicants: attendees.length,
        eventEngagedOnSite,
        onSite: onSite.length,
        onSiteAwardedPoints,
        repeatEventEngagedOnSite: [...eventsByHacker].filter(
          ([id, eventIds]) => onSiteIds.has(id) && eventIds.size >= 2,
        ).length,
      },
    },
    events: {
      arrivals,
      classParticipationRows,
      demographicRows: audienceRows,
      eventRows: displayEvents
        .map((event) => {
          const rows = attendances.filter(
            (row) => row.eventId === event.id && row.voidedAt === null,
          );
          const attendeeIds = new Set(rows.map((row) => row.hackerAttId));
          const firstAttendanceCount = [...attendeeIds].filter(
            (id) => firstTrustedEventByHacker.get(id) === event.id,
          ).length;
          const hasTrustedClassification = displayEventIds.has(event.id);
          return {
            distinctAttendance: new Set(rows.map((row) => row.hackerAttId))
              .size,
            firstAttendanceCount: hasTrustedClassification
              ? firstAttendanceCount
              : null,
            id: event.id,
            legacy: event.legacy,
            location: event.location ?? null,
            name: event.name,
            occurrenceCount: rows.length,
            published: event.publishedAt !== null,
            purpose: event.legacy ? "legacy_unknown" : event.purpose,
            returningAttendanceCount: hasTrustedClassification
              ? attendeeIds.size - firstAttendanceCount
              : null,
            startAt: event.startAt,
            tag: event.tag,
          };
        })
        .sort(
          (left, right) =>
            right.distinctAttendance - left.distinctAttendance ||
            left.name.localeCompare(right.name),
        ),
      firstReturningRows: [
        {
          count: [...distinctPairs.values()].filter(
            (row) =>
              firstTrustedEventByHacker.get(row.hackerAttId) === row.eventId,
          ).length,
          key: "first",
        },
        {
          count: [...distinctPairs.values()].filter(
            (row) =>
              firstTrustedEventByHacker.get(row.hackerAttId) !== row.eventId,
          ).length,
          key: "returning",
        },
      ],
      frequencyRows: attendanceFrequencyRows,
      groupings: eventGroupings,
      summary: {
        distinctAttendance: distinctPairs.size,
        distinctEventAttendees: eventEngaged.size,
        eventMedian,
        eventEngagedOnSite,
        eventEngagedOutsideOnSite: [...eventEngaged].filter(
          (id) => !onSiteIds.has(id),
        ).length,
        eventReach: ratio(eventEngagedOnSite, onSite.length),
        occurrenceCount: validDisplayAttendances.length,
        pointSnapshotCoverage: {
          denominator: validDisplayAttendances.length,
          numerator: coveredEventPoints.length,
          rate: ratio(
            coveredEventPoints.length,
            validDisplayAttendances.length,
          ),
        },
        pointsAwarded: coveredEventPoints.reduce(
          (sum, row) => sum + (row.pointsAwarded ?? 0),
          0,
        ),
        legacyUnknownPurposeEvents: events.filter((row) => row.legacy).length,
        repeatEventEngaged,
        repeatEventEngagedRate: ratio(repeatEventEngaged, eventEngaged.size),
        selectedEvents: displayEvents.length,
        selectedTrustedProgramEvents: filteredTrustedIds.size,
        trustedProgramEvents: trustedIds.size,
      },
      timeline: buildEventTimeline(validDisplayAttendances, hackathon),
    },
    live: {
      activeOperatorCount: operatorIds.length,
      attemptCount: liveAttempts.length,
      attemptsPerMinute: ratio(liveAttempts.length, liveDurationMinutes),
      classRows: countBy(liveAttempts, (row) => textCategory(row.className)),
      eventRows: countBy(
        liveAttempts,
        (row) =>
          row.eventName ??
          liveEventById.get(row.eventId)?.name ??
          "Unknown event",
      ),
      failureCoverageStartsAt,
      failureCoverageState:
        liveWindow.startAt.getTime() < failureCoverageStartsAt.getTime()
          ? "partial"
          : "complete_within_retention",
      issueCount,
      minorRows: [
        {
          count: liveAttempts.filter((row) => row.wasMinor === true).length,
          key: "minor",
        },
        {
          count: liveAttempts.filter((row) => row.wasMinor === false).length,
          key: "adult",
        },
        {
          count: liveAttempts.filter(
            (row) => row.wasMinor === null || row.wasMinor === undefined,
          ).length,
          key: "unknown",
        },
      ],
      modeRows: ["scanner", "manual"].map((mode) => ({
        count: liveAttempts.filter((row) => row.mode === mode).length,
        mode,
      })),
      oldestRetainedFailedAttemptAt:
        liveAttempts
          .filter((row) => issueOutcomes.has(row.outcome))
          .sort(
            (left, right) =>
              left.attemptedAt.getTime() - right.attemptedAt.getTime(),
          )[0]?.attemptedAt ?? null,
      operatorRows: [
        ...operatorIds.map((operatorId, index) => ({
          count: liveAttempts.filter((row) => row.operatorId === operatorId)
            .length,
          label: `Operator ${index + 1}`,
        })),
        ...(liveAttempts.some((row) => row.operatorId === null)
          ? [
              {
                count: liveAttempts.filter((row) => row.operatorId === null)
                  .length,
                label: "Unknown operator",
              },
            ]
          : []),
      ],
      outcomeRows: CHECK_IN_OUTCOMES.map((outcome) => ({
        count: liveAttempts.filter((row) => row.outcome === outcome).length,
        outcome,
      })),
      repeatOccurrenceCount: liveAttempts.filter(
        (row) => row.isRepeatOccurrence === true,
      ).length,
      roleHealth: {
        errorRows: roleErrorRows,
        oldestUnresolvedAgeMilliseconds:
          oldestUnresolvedRoleAt === undefined
            ? null
            : Math.max(
                0,
                input.referenceDate.getTime() -
                  oldestUnresolvedRoleAt.getTime(),
              ),
        oldestUnresolvedAt: oldestUnresolvedRoleAt ?? null,
        oldestUnresolvedLastAttemptAt: oldestUnresolvedRoleAttemptAt ?? null,
        retryCount: roleRows.reduce((sum, row) => sum + row.retryCount, 0),
        rows: roleRows,
      },
      successCount: liveSuccesses.length,
      successRate: ratio(liveSuccesses.length, liveAttempts.length),
      throughputBuckets: liveBuckets,
      peakThroughput,
      unresolvedRoleGrantCount: sources.roleGrants.filter((row) =>
        ["pending", "failed"].includes(row.state),
      ).length,
      vipRows: [
        {
          count: liveAttempts.filter((row) => row.isVip === true).length,
          key: "vip",
        },
        {
          count: liveAttempts.filter((row) => row.isVip === false).length,
          key: "non_vip",
        },
        {
          count: liveAttempts.filter((row) => row.isVip === undefined).length,
          key: "unknown",
        },
      ],
      window: liveWindow,
    },
    overview: {
      actionBrief: actionKinds.map((kind, index) => {
        const evidence = actionEvidence[index] ?? [];
        return {
          available: evidence.every(
            (item) =>
              typeof item.value === "number" && Number.isFinite(item.value),
          ),
          evidence,
          kind,
          navigation: {
            section: actionNavigation[index] ?? "audience",
          },
        };
      }),
      nextLifecycleDeadline:
        [hackathon.applicationDeadline, hackathon.confirmationDeadline]
          .filter((date) => date.getTime() > input.referenceDate.getTime())
          .sort((left, right) => left.getTime() - right.getTime())[0] ?? null,
      publishedProgramEventCount: trustedEvents.filter(
        (event) => event.publishedAt !== null,
      ).length,
      pipeline: {
        accepted: attendees.filter((row) => row.status === "accepted").length,
        applicants: attendees.length,
        checkedIn: onSite.length,
        confirmed: attendees.filter((row) => row.status === "confirmed").length,
        currentConfirmed: confirmed.length,
        currentSelected: selected.length,
        historicalAcceptanceConversionAvailable: false,
        knownConfirmedCheckedIn: onSite.filter((row) =>
          hasKnownConfirmation(row),
        ).length,
        knownConfirmed: knownConfirmed.length,
        knownConfirmedToCheckInRate: ratio(
          onSite.filter((row) => hasKnownConfirmation(row)).length,
          knownConfirmed.length,
        ),
        pending: attendees.filter((row) => row.status === "pending").length,
        onSite: onSite.length,
        onSiteCurrentConfirmed,
        onSiteOutsideCurrentConfirmed: onSite.length - onSiteCurrentConfirmed,
        onSiteRate: ratio(onSiteCurrentConfirmed, confirmed.length),
        confirmationRate: ratio(confirmed.length, selected.length),
        selectionRate: ratio(selected.length, attendees.length),
        pendingReview: attendees.filter((row) => row.status === "pending")
          .length,
        withdrawn: attendees.filter((row) => row.status === "withdrawn").length,
      },
    },
    points: {
      participantCount: attendees.length,
      pointsCoverage: {
        denominator: validDisplayAttendances.length,
        numerator: coveredEventPoints.length,
        rate: ratio(coveredEventPoints.length, validDisplayAttendances.length),
      },
      topPoints: attendees.reduce((top, row) => Math.max(top, row.points), 0),
    },
  };
}

/** Named rows are intentionally built for the separately authorized endpoint. */
export function buildHackathonIdentifiedRows(
  sources: HackathonAnalyticsSources,
  input: HackathonAnalyticsBuildInput,
) {
  assertScope(sources);
  const trustedEventIds = new Set(
    sources.events
      .filter(isTrustedProgramEvent)
      .filter(
        (event) =>
          (input.eventId === null || event.id === input.eventId) &&
          (input.eventTags.length === 0 || input.eventTags.includes(event.tag)),
      )
      .map((event) => event.id),
  );
  const eventById = new Map(sources.events.map((event) => [event.id, event]));
  const ranked = [...sources.attendees].sort(
    (left, right) =>
      right.points - left.points ||
      `${left.firstName} ${left.lastName}`
        .normalize("NFKC")
        .localeCompare(
          `${right.firstName} ${right.lastName}`.normalize("NFKC"),
        ) ||
      left.hackerAttId.localeCompare(right.hackerAttId),
  );
  let previousPoints: number | null = null;
  let previousRank = 0;
  return {
    points: ranked.map((row, index) => {
      const rank = row.points === previousPoints ? previousRank : index + 1;
      previousPoints = row.points;
      previousRank = rank;
      const occurrences = sources.attendances
        .filter(
          (attendance) =>
            attendance.hackerAttId === row.hackerAttId &&
            attendance.voidedAt === null &&
            trustedEventIds.has(attendance.eventId),
        )
        .sort(
          (left, right) =>
            (right.checkedInAt?.getTime() ?? 0) -
            (left.checkedInAt?.getTime() ?? 0),
        );
      const awarded = occurrences.filter(
        (attendance) => attendance.pointsAwarded !== null,
      );
      const last = occurrences[0];
      const lastEvent = last ? eventById.get(last.eventId) : undefined;
      return {
        attendeeId: row.hackerAttId,
        classColor: row.classColor ?? null,
        className: row.className ?? null,
        distinctEvents: new Set(occurrences.map((item) => item.eventId)).size,
        eventAwardedPoints: awarded.reduce(
          (sum, item) => sum + (item.pointsAwarded ?? 0),
          0,
        ),
        eventPointCoverage: {
          denominator: occurrences.length,
          numerator: awarded.length,
          rate: ratio(awarded.length, occurrences.length),
        },
        lastAttendance:
          last?.checkedInAt && lastEvent
            ? {
                checkedInAt: last.checkedInAt,
                eventName: lastEvent.name,
              }
            : null,
        name: `${row.firstName} ${row.lastName}`.trim(),
        points: row.points,
        rank,
        vip: row.isVip ?? false,
      };
    }),
  };
}
