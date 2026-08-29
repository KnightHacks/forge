import { TRPCError } from "@trpc/server";

import type {
  AnalyticsDemographic,
  AnalyticsPeriod,
  AnalyticsReportInput,
} from "@forge/validators";
import { EVENTS, FORMS } from "@forge/consts";
import { buildDuesAcademicYear, getDuesAcademicYear } from "@forge/validators";

import { deriveAgeBand, inferAcademicYear } from "./demographics";

const DAY_MS = 24 * 60 * 60 * 1000;
const METRIC_VERSION = "club-analytics-v2";
const RELIABLE_FEEDBACK_COUNT = 5;

export interface AnalyticsMemberSource {
  dateCreated: Date | string;
  dob: Date | string | null;
  firstName: string;
  gender: string | null;
  gradDate: Date | string | null;
  id: string;
  lastName: string;
  levelOfStudy: string | null;
  major: string | null;
  points: number;
  raceOrEthnicity: string | null;
  school: string | null;
  shirtSize: string | null;
}

export interface AnalyticsEventSource {
  endAt: Date;
  hackathonId: string | null;
  id: string;
  location: string;
  name: string;
  startAt: Date;
  tag: string;
}

export interface AnalyticsAttendanceSource {
  eventId: string;
  memberId: string;
}

export interface AnalyticsDuesSource {
  active: boolean;
  id: string;
  memberId: string;
  recordedAt: Date;
  year: number;
}

export interface AnalyticsFeedbackSource {
  answers: unknown;
  eventId: string;
  memberId: string | null;
  responseId: string;
}

export interface ResolvedPeriod {
  end: Date;
  kind: AnalyticsPeriod["kind"];
  label: string;
  observationEnd: Date;
  start: Date | null;
}

export interface CountRateSummary {
  averageAttendance: number | null;
  distinctAttendanceCount: number;
  distinctAttendeeCount: number;
  eventCount: number;
  medianAttendance: number | null;
  memberReach: number | null;
  repeatAttendeeRate: number | null;
}

export interface AnalyticsFeedbackMetric {
  averageFun: number | null;
  averageLearning: number | null;
  averageOverall: number | null;
  discovery: { count: number; label: string; rate: number }[];
  discoveryResponseCount: number;
  funResponseCount: number;
  learningResponseCount: number;
  overallResponseCount: number;
  responseCount: number;
  responseRate: number | null;
  unmatchedResponseCount: number;
}

export interface AnalyticsEventRow {
  attendanceCount: number;
  date: Date;
  durationMinutes: number;
  feedback: AnalyticsFeedbackMetric;
  firstTimeCount: number;
  id: string;
  location: string;
  name: string;
  returningCount: number;
  tag: string;
}

export interface DemographicRow {
  attendeeCount: number;
  audienceShare: number | null;
  baseCount: number;
  baseShare: number | null;
  category: string;
  duesPaidRate: number | null;
  participationRate: number | null;
  repeatAttendeeRate: number | null;
  representationGap: number | null;
}

export interface NamedMemberRow {
  attendanceCount: number;
  category: string;
  lastEventAt: Date | null;
  lastEventName: string | null;
  memberId: string;
  name: string;
  paid: boolean;
}

export interface UnpaidMemberRow {
  attendanceCount: number;
  graduationYear: string;
  lastEventAt: Date | null;
  lastEventName: string | null;
  memberId: string;
  name: string;
  points: number;
}

export type AnalyticsHighlightGroup =
  | "membership"
  | "engagement"
  | "programming"
  | "audience"
  | "dues"
  | "measurement";

export interface AnalyticsHighlight {
  destination: "audience" | "dues" | "events";
  filters: {
    demographic?: AnalyticsDemographic;
    eventTag?: string;
  };
  group: AnalyticsHighlightGroup;
  kind: string;
  message: string;
}

function ratio(numerator: number, denominator: number) {
  return denominator === 0 ? null : numerator / denominator;
}

function average(values: readonly number[]) {
  return values.length === 0
    ? null
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: readonly number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted.at(middle);
  const lower = sorted.at(middle - 1);
  if (upper === undefined) return null;
  return sorted.length % 2 === 0 && lower !== undefined
    ? (lower + upper) / 2
    : upper;
}

function dateValue(value: Date | string | null) {
  if (value === null) return null;
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value,
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function localParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    month: "2-digit",
    timeZone: EVENTS.CALENDAR_TIME_ZONE,
    weekday: "long",
    year: "numeric",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    day: Number(value("day")),
    hour: Number(value("hour")),
    month: Number(value("month")),
    weekday: value("weekday"),
    year: Number(value("year")),
  };
}

function zonedMidnight(year: number, monthIndex: number, day: number) {
  const target = Date.UTC(year, monthIndex, day);
  let candidate = new Date(target);
  for (let pass = 0; pass < 3; pass += 1) {
    const parts = localParts(candidate);
    const represented = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
    );
    candidate = new Date(candidate.getTime() - (represented - target));
  }
  return candidate;
}

function memberCreatedAt(value: Date | string) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    if (year !== undefined && month !== undefined && day !== undefined) {
      return zonedMidnight(year, month - 1, day);
    }
  }
  return dateValue(value);
}

function formatRangeLabel(start: Date | null, end: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: EVENTS.CALENDAR_TIME_ZONE,
  });
  return start
    ? `${formatter.format(start)} – ${formatter.format(new Date(end.getTime() - 1))}`
    : `All time through ${formatter.format(end)}`;
}

function academicYearStart(referenceDate: Date) {
  const parts = localParts(referenceDate);
  return parts.month >= 8 ? parts.year : parts.year - 1;
}

export function resolveAnalyticsPeriod(
  period: AnalyticsPeriod,
  referenceDate: Date,
): ResolvedPeriod {
  if (period.kind === "all_time") {
    return {
      end: referenceDate,
      kind: period.kind,
      label: formatRangeLabel(null, referenceDate),
      observationEnd: referenceDate,
      start: null,
    };
  }

  let start: Date;
  let end: Date;
  let label: string | null = null;

  if (period.kind === "custom") {
    start = period.from;
    end = period.to;
  } else if (
    period.kind === "academic_year" ||
    period.kind === "current_academic_year"
  ) {
    const startYear =
      period.kind === "academic_year"
        ? period.startYear
        : academicYearStart(referenceDate);
    start = zonedMidnight(startYear, 7, 1);
    end = zonedMidnight(startYear + 1, 7, 1);
    label = buildDuesAcademicYear(startYear).label;
  } else {
    const parts = localParts(referenceDate);
    const starts = Object.entries(FORMS.SEMESTER_START_DATES).map(
      ([name, value]) => ({
        day: value.day,
        month: value.month,
        name,
      }),
    );
    let currentIndex = -1;
    starts.forEach((candidate, index) => {
      if (
        parts.month - 1 > candidate.month ||
        (parts.month - 1 === candidate.month && parts.day >= candidate.day)
      ) {
        currentIndex = index;
      }
    });
    const selectedIndex = Math.max(currentIndex, 0);
    const selected = starts[selectedIndex];
    const first = starts[0];
    if (!selected || !first)
      throw new Error("Semester starts are not configured.");
    const next = starts[selectedIndex + 1];
    start = zonedMidnight(parts.year, selected.month, selected.day);
    end = next
      ? zonedMidnight(parts.year, next.month, next.day)
      : zonedMidnight(parts.year + 1, first.month, first.day);
    const firstLetter = selected.name.charAt(0).toUpperCase();
    label = `${firstLetter}${selected.name.slice(1)} ${parts.year}`;
  }

  return {
    end,
    kind: period.kind,
    label: label ?? formatRangeLabel(start, end),
    observationEnd:
      end.getTime() < referenceDate.getTime() ? end : referenceDate,
    start,
  };
}

function resolveComparison(
  selected: ResolvedPeriod,
  comparison: AnalyticsReportInput["comparison"],
) {
  if (comparison === "none" || selected.start === null) return null;
  if (comparison === "previous_period") {
    const duration = selected.end.getTime() - selected.start.getTime();
    const end = selected.start;
    const start = new Date(end.getTime() - duration);
    return {
      end,
      kind: "custom" as const,
      label: formatRangeLabel(start, end),
      observationEnd: end,
      start,
    };
  }
  const startYear = academicYearStart(selected.start) - 1;
  const start = zonedMidnight(startYear, 7, 1);
  const end = zonedMidnight(startYear + 1, 7, 1);
  const selectedElapsed = Math.max(
    0,
    selected.observationEnd.getTime() - selected.start.getTime(),
  );
  return {
    end,
    kind: "academic_year" as const,
    label: buildDuesAcademicYear(startYear).label,
    observationEnd: new Date(
      Math.min(end.getTime(), start.getTime() + selectedElapsed),
    ),
    start,
  };
}

function inPeriod(date: Date, period: ResolvedPeriod) {
  return (
    (period.start === null || date.getTime() >= period.start.getTime()) &&
    date.getTime() < period.end.getTime()
  );
}

function deduplicateAttendance(
  attendances: readonly AnalyticsAttendanceSource[],
  validMemberIds: ReadonlySet<string>,
  validEventIds: ReadonlySet<string>,
) {
  const seen = new Set<string>();
  return attendances.filter((row) => {
    if (!validMemberIds.has(row.memberId) || !validEventIds.has(row.eventId))
      return false;
    const key = `${row.eventId}:${row.memberId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function selectedEventsFor(
  events: readonly AnalyticsEventSource[],
  period: ResolvedPeriod,
  input: AnalyticsReportInput,
) {
  return events.filter(
    (event) =>
      inPeriod(event.startAt, period) &&
      (input.eventId === null || event.id === input.eventId) &&
      (input.eventTags.length === 0 || input.eventTags.includes(event.tag)),
  );
}

function attendanceMap(rows: readonly AnalyticsAttendanceSource[]) {
  const result = new Map<string, Set<string>>();
  rows.forEach((row) => {
    const members = result.get(row.eventId) ?? new Set<string>();
    members.add(row.memberId);
    result.set(row.eventId, members);
  });
  return result;
}

function memberAttendanceMap(rows: readonly AnalyticsAttendanceSource[]) {
  const result = new Map<string, Set<string>>();
  rows.forEach((row) => {
    const events = result.get(row.memberId) ?? new Set<string>();
    events.add(row.eventId);
    result.set(row.memberId, events);
  });
  return result;
}

function buildSummary({
  eventRows,
  memberCount,
}: {
  eventRows: readonly AnalyticsEventRow[];
  memberCount: number;
}): CountRateSummary {
  const attendanceCounts = eventRows.map((event) => event.attendanceCount);
  const distinctAttendanceCount = attendanceCounts.reduce(
    (sum, count) => sum + count,
    0,
  );
  const memberCounts = new Map<string, number>();
  // Populated by a non-enumerable implementation detail attached below.
  eventRows.forEach((row) => {
    const ids = (row as AnalyticsEventRow & { attendeeIds?: string[] })
      .attendeeIds;
    ids?.forEach((id) => memberCounts.set(id, (memberCounts.get(id) ?? 0) + 1));
  });
  const distinctAttendeeCount = memberCounts.size;
  const repeatCount = [...memberCounts.values()].filter(
    (count) => count >= 2,
  ).length;
  return {
    averageAttendance: average(attendanceCounts),
    distinctAttendanceCount,
    distinctAttendeeCount,
    eventCount: eventRows.length,
    medianAttendance: median(attendanceCounts),
    memberReach: ratio(distinctAttendeeCount, memberCount),
    repeatAttendeeRate: ratio(repeatCount, distinctAttendeeCount),
  };
}

function firstEventByMember(
  rows: readonly AnalyticsAttendanceSource[],
  eventById: ReadonlyMap<string, AnalyticsEventSource>,
) {
  const ordered = [...rows].sort((left, right) => {
    const leftEvent = eventById.get(left.eventId);
    const rightEvent = eventById.get(right.eventId);
    if (!leftEvent || !rightEvent)
      return left.eventId.localeCompare(right.eventId);
    return (
      leftEvent.startAt.getTime() - rightEvent.startAt.getTime() ||
      left.eventId.localeCompare(right.eventId)
    );
  });
  const result = new Map<string, string>();
  ordered.forEach((row) => {
    if (!result.has(row.memberId)) result.set(row.memberId, row.eventId);
  });
  return result;
}

function feedbackAnswers(value: unknown) {
  if (typeof value !== "object" || value === null) return null;
  return value as Record<string, unknown>;
}

function validRating(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 5
  );
}

function eventFeedback(
  responses: readonly AnalyticsFeedbackSource[],
  attendeeIds: ReadonlySet<string>,
): AnalyticsFeedbackMetric {
  const parsed = responses.map((response) => ({
    answers: feedbackAnswers(response.answers),
    memberId: response.memberId,
  }));
  const ratings = (key: "fun" | "learning" | "overall") =>
    parsed.flatMap(({ answers }) => {
      const value = answers?.[key];
      return validRating(value) ? [value] : [];
    });
  const discoveryCounts = new Map<string, number>();
  parsed.forEach(({ answers }) => {
    const value = answers?.discovery;
    if (typeof value !== "string" || value.trim() === "") return;
    const label = value.trim();
    discoveryCounts.set(label, (discoveryCounts.get(label) ?? 0) + 1);
  });
  const discoveryResponseCount = [...discoveryCounts.values()].reduce(
    (sum, count) => sum + count,
    0,
  );
  const fun = ratings("fun");
  const learning = ratings("learning");
  const overall = ratings("overall");
  const unmatchedResponseCount = parsed.filter(
    ({ memberId }) => memberId === null || !attendeeIds.has(memberId),
  ).length;
  return {
    averageFun: average(fun),
    averageLearning: average(learning),
    averageOverall: average(overall),
    discovery: [...discoveryCounts.entries()]
      .map(([label, count]) => ({
        count,
        label,
        rate: count / discoveryResponseCount,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    discoveryResponseCount,
    funResponseCount: fun.length,
    learningResponseCount: learning.length,
    overallResponseCount: overall.length,
    responseCount: responses.length,
    responseRate:
      attendeeIds.size === 0
        ? null
        : Math.min(responses.length / attendeeIds.size, 1),
    unmatchedResponseCount,
  };
}

function aggregateFeedback(eventRows: readonly AnalyticsEventRow[]) {
  const rating = (
    averageKey: "averageFun" | "averageLearning" | "averageOverall",
    countKey:
      | "funResponseCount"
      | "learningResponseCount"
      | "overallResponseCount",
  ) => {
    const count = eventRows.reduce(
      (sum, row) => sum + row.feedback[countKey],
      0,
    );
    const weighted = eventRows.reduce((sum, row) => {
      const value = row.feedback[averageKey];
      return value === null ? sum : sum + value * row.feedback[countKey];
    }, 0);
    return { average: count === 0 ? null : weighted / count, count };
  };
  const fun = rating("averageFun", "funResponseCount");
  const learning = rating("averageLearning", "learningResponseCount");
  const overall = rating("averageOverall", "overallResponseCount");
  const discoveryCounts = new Map<string, number>();
  eventRows.forEach((row) => {
    row.feedback.discovery.forEach((item) => {
      discoveryCounts.set(
        item.label,
        (discoveryCounts.get(item.label) ?? 0) + item.count,
      );
    });
  });
  const discoveryResponseCount = [...discoveryCounts.values()].reduce(
    (sum, count) => sum + count,
    0,
  );
  const responseCount = eventRows.reduce(
    (sum, row) => sum + row.feedback.responseCount,
    0,
  );
  const attendanceCount = eventRows.reduce(
    (sum, row) => sum + row.attendanceCount,
    0,
  );
  return {
    averageFun: fun.average,
    averageLearning: learning.average,
    averageOverall: overall.average,
    discovery: [...discoveryCounts.entries()]
      .map(([label, count]) => ({
        count,
        label,
        rate: count / discoveryResponseCount,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    discoveryResponseCount,
    funResponseCount: fun.count,
    learningResponseCount: learning.count,
    overallResponseCount: overall.count,
    responseCount,
    responseRate: ratio(responseCount, attendanceCount),
    unmatchedResponseCount: eventRows.reduce(
      (sum, row) => sum + row.feedback.unmatchedResponseCount,
      0,
    ),
  } satisfies AnalyticsFeedbackMetric;
}

function buildEventRows({
  allAttendance,
  feedback,
  firstByMember,
  selectedEvents,
}: {
  allAttendance: readonly AnalyticsAttendanceSource[];
  feedback: readonly AnalyticsFeedbackSource[];
  firstByMember: ReadonlyMap<string, string>;
  selectedEvents: readonly AnalyticsEventSource[];
}) {
  const byEvent = attendanceMap(allAttendance);
  const feedbackByEvent = new Map<string, AnalyticsFeedbackSource[]>();
  feedback.forEach((row) => {
    const rows = feedbackByEvent.get(row.eventId) ?? [];
    rows.push(row);
    feedbackByEvent.set(row.eventId, rows);
  });
  return [...selectedEvents]
    .sort(
      (a, b) =>
        a.startAt.getTime() - b.startAt.getTime() || a.id.localeCompare(b.id),
    )
    .map((event) => {
      const attendeeIds = byEvent.get(event.id) ?? new Set<string>();
      const firstTimeCount = [...attendeeIds].filter(
        (memberId) => firstByMember.get(memberId) === event.id,
      ).length;
      const row: AnalyticsEventRow & { attendeeIds: string[] } = {
        attendanceCount: attendeeIds.size,
        attendeeIds: [...attendeeIds],
        date: event.startAt,
        durationMinutes: Math.round(
          (event.endAt.getTime() - event.startAt.getTime()) / 60_000,
        ),
        feedback: eventFeedback(
          feedbackByEvent.get(event.id) ?? [],
          attendeeIds,
        ),
        firstTimeCount,
        id: event.id,
        location: event.location,
        name: event.name,
        returningCount: attendeeIds.size - firstTimeCount,
        tag: event.tag,
      };
      return row;
    });
}

function groupRows(
  eventRows: readonly AnalyticsEventRow[],
  key: (row: AnalyticsEventRow) => string,
) {
  const groups = new Map<
    string,
    { attendanceCount: number; eventCount: number }
  >();
  eventRows.forEach((row) => {
    const label = key(row);
    const current = groups.get(label) ?? {
      attendanceCount: 0,
      eventCount: 0,
    };
    current.attendanceCount += row.attendanceCount;
    current.eventCount += 1;
    groups.set(label, current);
  });
  return [...groups.entries()]
    .map(([label, values]) => ({ label, ...values }))
    .sort(
      (a, b) =>
        b.attendanceCount - a.attendanceCount || a.label.localeCompare(b.label),
    );
}

function startTimeBand(date: Date) {
  const { hour } = localParts(date);
  if (hour < 12) return "Before noon";
  if (hour < 17) return "Noon–4:59 PM";
  if (hour < 20) return "5–7:59 PM";
  return "8 PM or later";
}

function durationBand(minutes: number) {
  if (minutes < 0) return "Invalid";
  if (minutes < 60) return "Under 1 hour";
  if (minutes < 120) return "1–under 2 hours";
  if (minutes < 240) return "2–under 4 hours";
  return "4 hours or more";
}

function trendRows(
  eventRows: readonly AnalyticsEventRow[],
  period: ResolvedPeriod,
) {
  const duration = period.start
    ? period.end.getTime() - period.start.getTime()
    : Number.POSITIVE_INFINITY;
  const grain = duration <= 120 * DAY_MS ? "week" : "month";
  const groups = new Map<
    string,
    { attendanceCount: number; eventCount: number }
  >();
  eventRows.forEach((row) => {
    let label: string;
    if (grain === "month") {
      const parts = localParts(row.date);
      label = `${parts.year}-${String(parts.month).padStart(2, "0")}`;
    } else {
      const start = period.start ?? row.date;
      const index = Math.floor(
        (row.date.getTime() - start.getTime()) / (7 * DAY_MS),
      );
      label = new Date(start.getTime() + index * 7 * DAY_MS)
        .toISOString()
        .slice(0, 10);
    }
    const current = groups.get(label) ?? { attendanceCount: 0, eventCount: 0 };
    current.attendanceCount += row.attendanceCount;
    current.eventCount += 1;
    groups.set(label, current);
  });
  if (grain === "week" && period.start) {
    const bucketCount = Math.ceil(duration / (7 * DAY_MS));
    for (let index = 0; index < bucketCount; index += 1) {
      const label = new Date(period.start.getTime() + index * 7 * DAY_MS)
        .toISOString()
        .slice(0, 10);
      if (!groups.has(label))
        groups.set(label, { attendanceCount: 0, eventCount: 0 });
    }
  }
  return {
    grain,
    rows: [...groups.entries()]
      .map(([label, values]) => ({ label, ...values }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  };
}

function returnCohorts({
  allAttendance,
  eventById,
  firstByMember,
  observationEnd,
  selectedEventIds,
}: {
  allAttendance: readonly AnalyticsAttendanceSource[];
  eventById: ReadonlyMap<string, AnalyticsEventSource>;
  firstByMember: ReadonlyMap<string, string>;
  observationEnd: Date;
  selectedEventIds: ReadonlySet<string>;
}) {
  const byMember = memberAttendanceMap(allAttendance);
  const selectedFirst = [...firstByMember.entries()].filter(([, eventId]) =>
    selectedEventIds.has(eventId),
  );
  return [30, 60, 90].map((days) => {
    const mature = selectedFirst.filter(([, eventId]) => {
      const first = eventById.get(eventId);
      if (!first) return false;
      return (
        observationEnd.getTime() - first.startAt.getTime() >= days * DAY_MS
      );
    });
    const returnedCount = mature.filter(([memberId, firstEventId]) => {
      const first = eventById.get(firstEventId);
      if (!first) return false;
      const deadline = first.startAt.getTime() + days * DAY_MS;
      return [...(byMember.get(memberId) ?? [])].some((eventId) => {
        if (eventId === firstEventId) return false;
        const candidate = eventById.get(eventId);
        if (!candidate) return false;
        return (
          candidate.startAt.getTime() > first.startAt.getTime() &&
          candidate.startAt.getTime() <= deadline
        );
      });
    }).length;
    return {
      days,
      matureCount: mature.length,
      rate: ratio(returnedCount, mature.length),
      returnedCount,
    };
  });
}

function textCategory(value: string | null) {
  if (value === null || value.trim() === "") return "Missing";
  return value.trim();
}

function graduationCategory(value: Date | string | null) {
  const date = dateValue(value);
  return date ? String(date.getUTCFullYear()) : "Invalid";
}

function isUsableDemographicCategory(category: string) {
  return !["Missing", "Invalid", "Unknown", "Not applicable"].includes(
    category,
  );
}

function demographicCategory(
  member: AnalyticsMemberSource,
  demographic: AnalyticsDemographic,
  referenceDate: Date,
) {
  switch (demographic) {
    case "age":
      return deriveAgeBand(member.dob ?? null, referenceDate);
    case "school":
      return textCategory(member.school);
    case "major":
      return textCategory(member.major);
    case "level_of_study":
      return textCategory(member.levelOfStudy);
    case "inferred_year_of_study":
      return inferAcademicYear(
        member.gradDate,
        member.levelOfStudy,
        referenceDate,
      );
    case "graduation":
      return graduationCategory(member.gradDate);
    case "gender":
      return textCategory(member.gender);
    case "race_or_ethnicity":
      return textCategory(member.raceOrEthnicity);
    case "shirt_size":
      return textCategory(member.shirtSize);
  }
}

function demographicRows({
  attendedByMember,
  demographic,
  members,
  paidByMember,
  referenceDate,
}: {
  attendedByMember: ReadonlyMap<string, Set<string>>;
  demographic: AnalyticsDemographic;
  members: readonly AnalyticsMemberSource[];
  paidByMember: ReadonlyMap<string, boolean>;
  referenceDate: Date;
}) {
  const attendeeCount = [...attendedByMember.values()].filter(
    (events) => events.size > 0,
  ).length;
  const categories = new Map<string, AnalyticsMemberSource[]>();
  members.forEach((member) => {
    const category = demographicCategory(member, demographic, referenceDate);
    const rows = categories.get(category) ?? [];
    rows.push(member);
    categories.set(category, rows);
  });
  return [...categories.entries()]
    .map(([category, categoryMembers]): DemographicRow => {
      const attendees = categoryMembers.filter(
        (member) => (attendedByMember.get(member.id)?.size ?? 0) > 0,
      );
      const repeat = attendees.filter(
        (member) => (attendedByMember.get(member.id)?.size ?? 0) >= 2,
      ).length;
      const paid = categoryMembers.filter(
        (member) => paidByMember.get(member.id) === true,
      ).length;
      const baseShare = ratio(categoryMembers.length, members.length);
      const audienceShare = ratio(attendees.length, attendeeCount);
      return {
        attendeeCount: attendees.length,
        audienceShare,
        baseCount: categoryMembers.length,
        baseShare,
        category,
        duesPaidRate: ratio(paid, categoryMembers.length),
        participationRate: ratio(attendees.length, categoryMembers.length),
        repeatAttendeeRate: ratio(repeat, attendees.length),
        representationGap:
          baseShare === null || audienceShare === null
            ? null
            : audienceShare - baseShare,
      };
    })
    .sort(
      (a, b) =>
        b.baseCount - a.baseCount || a.category.localeCompare(b.category),
    );
}

function affinityRows({
  attendance,
  demographic,
  eventById,
  memberById,
  referenceDate,
}: {
  attendance: readonly AnalyticsAttendanceSource[];
  demographic: AnalyticsDemographic;
  eventById: ReadonlyMap<string, AnalyticsEventSource>;
  memberById: ReadonlyMap<string, AnalyticsMemberSource>;
  referenceDate: Date;
}) {
  const groups = new Map<
    string,
    {
      attendanceCount: number;
      category: string;
      eventIds: Set<string>;
      label: string;
      memberIds: Set<string>;
    }
  >();
  attendance.forEach((row) => {
    const event = eventById.get(row.eventId);
    const member = memberById.get(row.memberId);
    if (!event || !member) return;
    const category = demographicCategory(member, demographic, referenceDate);
    const key = `${category}\u0000${event.tag}`;
    const group = groups.get(key) ?? {
      attendanceCount: 0,
      category,
      eventIds: new Set<string>(),
      label: event.tag,
      memberIds: new Set<string>(),
    };
    group.attendanceCount += 1;
    group.eventIds.add(event.id);
    group.memberIds.add(member.id);
    groups.set(key, group);
  });
  return [...groups.values()]
    .map((group) => ({
      attendanceCount: group.attendanceCount,
      category: group.category,
      eventCount: group.eventIds.size,
      label: group.label,
      memberCount: group.memberIds.size,
    }))
    .sort(
      (a, b) =>
        b.attendanceCount - a.attendanceCount ||
        a.category.localeCompare(b.category) ||
        a.label.localeCompare(b.label),
    );
}

function memberLastEvents(
  attendance: readonly AnalyticsAttendanceSource[],
  eventById: ReadonlyMap<string, AnalyticsEventSource>,
) {
  const result = new Map<string, AnalyticsEventSource>();
  attendance.forEach((row) => {
    const event = eventById.get(row.eventId);
    if (!event) return;
    const previous = result.get(row.memberId);
    if (
      !previous ||
      event.startAt.getTime() > previous.startAt.getTime() ||
      (event.startAt.getTime() === previous.startAt.getTime() &&
        event.id.localeCompare(previous.id) > 0)
    )
      result.set(row.memberId, event);
  });
  return result;
}

function currentDues(
  members: readonly AnalyticsMemberSource[],
  dues: readonly AnalyticsDuesSource[],
  referenceDate: Date,
) {
  const currentYear = getDuesAcademicYear(referenceDate).startYear;
  const paidMemberIds = new Set(
    dues
      .filter((row) => row.active && row.year === currentYear)
      .map((row) => row.memberId),
  );
  return new Map(
    members.map((member) => [member.id, paidMemberIds.has(member.id)]),
  );
}

function academicYearHistory(
  members: readonly AnalyticsMemberSource[],
  dues: readonly AnalyticsDuesSource[],
  referenceDate: Date,
) {
  const currentYear = getDuesAcademicYear(referenceDate).startYear;
  const years = new Set([
    currentYear,
    currentYear - 1,
    ...dues.map((row) => row.year),
  ]);
  return [...years]
    .sort((a, b) => b - a)
    .map((year) => {
      const yearEnd = zonedMidnight(year + 1, 7, 1);
      const denominator = members.filter((member) => {
        const created = memberCreatedAt(member.dateCreated);
        return created !== null && created.getTime() < yearEnd.getTime();
      }).length;
      const rows = [
        ...new Map(
          dues
            .filter((row) => row.year === year)
            .map((row) => [row.memberId, row] as const),
        ).values(),
      ].sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
      let activeCount = 0;
      let staleCount = 0;
      const curve = rows.map((row) => {
        if (row.active) activeCount += 1;
        else staleCount += 1;
        return {
          activeCount,
          date: row.recordedAt,
          elapsedDays: Math.max(
            0,
            Math.floor(
              (row.recordedAt.getTime() - zonedMidnight(year, 7, 1).getTime()) /
                DAY_MS,
            ),
          ),
          recordedCount: activeCount + staleCount,
          staleCount,
        };
      });
      const milestones = [0.25, 0.5, 0.75, 0.9].map((threshold) => {
        const required = Math.ceil(denominator * threshold);
        const reached =
          required === 0
            ? null
            : curve.find((point) => point.recordedCount >= required);
        return { date: reached?.date ?? null, threshold };
      });
      return {
        activeCount,
        denominator,
        label: buildDuesAcademicYear(year).shortLabel,
        milestones,
        recordedCount: rows.length,
        recordedRate: ratio(rows.length, denominator),
        staleCount,
        startYear: year,
        curve,
      };
    });
}

function profileActivation({
  eventById,
  firstByMember,
  members,
  period,
}: {
  eventById: ReadonlyMap<string, AnalyticsEventSource>;
  firstByMember: ReadonlyMap<string, string>;
  members: readonly AnalyticsMemberSource[];
  period: ResolvedPeriod;
}) {
  const created = members.flatMap((member) => {
    const createdAt = memberCreatedAt(member.dateCreated);
    return createdAt !== null && inPeriod(createdAt, period)
      ? [{ createdAt, memberId: member.id }]
      : [];
  });
  const mature = created.filter(
    ({ createdAt }) =>
      period.observationEnd.getTime() - createdAt.getTime() >= 30 * DAY_MS,
  );
  const activatedCount = mature.filter(({ createdAt, memberId }) => {
    const firstEventId = firstByMember.get(memberId);
    const firstEvent = firstEventId ? eventById.get(firstEventId) : undefined;
    if (!firstEvent) return false;
    const elapsed = firstEvent.startAt.getTime() - createdAt.getTime();
    return elapsed >= 0 && elapsed <= 30 * DAY_MS;
  }).length;
  return {
    activatedCount,
    createdCount: created.length,
    matureCount: mature.length,
    rate: ratio(activatedCount, mature.length),
  };
}

function gatewayReturnRows({
  allAttendance,
  eventById,
  firstByMember,
  observationEnd,
  selectedEventIds,
}: {
  allAttendance: readonly AnalyticsAttendanceSource[];
  eventById: ReadonlyMap<string, AnalyticsEventSource>;
  firstByMember: ReadonlyMap<string, string>;
  observationEnd: Date;
  selectedEventIds: ReadonlySet<string>;
}) {
  const byMember = memberAttendanceMap(allAttendance);
  const groups = new Map<
    string,
    { matureCount: number; returnedCount: number }
  >();
  firstByMember.forEach((firstEventId, memberId) => {
    if (!selectedEventIds.has(firstEventId)) return;
    const firstEvent = eventById.get(firstEventId);
    if (
      !firstEvent ||
      observationEnd.getTime() - firstEvent.startAt.getTime() < 30 * DAY_MS
    )
      return;
    const group = groups.get(firstEvent.tag) ?? {
      matureCount: 0,
      returnedCount: 0,
    };
    group.matureCount += 1;
    const deadline = firstEvent.startAt.getTime() + 30 * DAY_MS;
    if (
      [...(byMember.get(memberId) ?? [])].some((eventId) => {
        if (eventId === firstEventId) return false;
        const candidate = eventById.get(eventId);
        return (
          candidate !== undefined &&
          candidate.startAt.getTime() > firstEvent.startAt.getTime() &&
          candidate.startAt.getTime() <= deadline
        );
      })
    )
      group.returnedCount += 1;
    groups.set(firstEvent.tag, group);
  });
  return [...groups.entries()]
    .map(([label, row]) => ({
      label,
      ...row,
      rate: ratio(row.returnedCount, row.matureCount),
    }))
    .sort(
      (a, b) =>
        (b.rate ?? 0) - (a.rate ?? 0) ||
        b.matureCount - a.matureCount ||
        a.label.localeCompare(b.label),
    );
}

function duesLifecycle({
  dues,
  members,
  referenceDate,
}: {
  dues: readonly AnalyticsDuesSource[];
  members: readonly AnalyticsMemberSource[];
  referenceDate: Date;
}) {
  const currentYear = getDuesAcademicYear(referenceDate).startYear;
  const elapsedDays = Math.max(
    0,
    Math.floor(
      (referenceDate.getTime() - zonedMidnight(currentYear, 7, 1).getTime()) /
        DAY_MS,
    ),
  );
  const memberIds = new Set(members.map((member) => member.id));
  const recordedBy = (year: number) =>
    new Set(
      dues
        .filter(
          (row) =>
            memberIds.has(row.memberId) &&
            row.year === year &&
            Math.floor(
              (row.recordedAt.getTime() - zonedMidnight(year, 7, 1).getTime()) /
                DAY_MS,
            ) <= elapsedDays,
        )
        .map((row) => row.memberId),
    );
  const current = recordedBy(currentYear);
  const previous = recordedBy(currentYear - 1);
  const older = new Set(
    dues
      .filter(
        (row) => memberIds.has(row.memberId) && row.year < currentYear - 1,
      )
      .map((row) => row.memberId),
  );
  const renewedCount = [...previous].filter((id) => current.has(id)).length;
  const notYetRenewedCount = [...previous].filter(
    (id) => !current.has(id),
  ).length;
  const firstTimeCount = [...current].filter(
    (id) => !previous.has(id) && !older.has(id),
  ).length;
  const reactivatedCount = [...current].filter(
    (id) => !previous.has(id) && older.has(id),
  ).length;
  return {
    currentCount: current.size,
    difference: current.size - previous.size,
    firstTimeCount,
    notYetRenewedCount,
    previousCount: previous.size,
    reactivatedCount,
    renewedCount,
    renewalRate: ratio(renewedCount, previous.size),
  };
}

function delta(current: number | null, previous: number | null) {
  if (current === null || previous === null)
    return { absolute: null, percent: null };
  return {
    absolute: current - previous,
    percent: previous === 0 ? null : (current - previous) / previous,
  };
}

function measuredDecimal(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function percentagePoints(value: number) {
  const rounded = Math.round(Math.abs(value) * 1000) / 10;
  return measuredDecimal(rounded);
}

function plural(value: number, singular: string, pluralForm = `${singular}s`) {
  return value === 1 ? singular : pluralForm;
}

function buildHighlights({
  comparisonProfileActivation,
  comparisonRows,
  demographic,
  demographicCoverage,
  demographicRows: audienceRows,
  duesLifecycleRow,
  eventRows,
  feedback,
  gatewayRows,
  memberCount,
  paidCount,
  profileActivationRow,
  returnCohortRows,
  unpaidProfileCount,
  unpaidReachedCount,
  unpaidRepeatCount,
}: {
  comparisonProfileActivation: ReturnType<typeof profileActivation> | null;
  comparisonRows: readonly AnalyticsEventRow[];
  demographic: AnalyticsDemographic;
  demographicCoverage: number | null;
  demographicRows: readonly DemographicRow[];
  duesLifecycleRow: ReturnType<typeof duesLifecycle>;
  eventRows: readonly AnalyticsEventRow[];
  feedback: AnalyticsFeedbackMetric;
  gatewayRows: ReturnType<typeof gatewayReturnRows>;
  memberCount: number;
  paidCount: number;
  profileActivationRow: ReturnType<typeof profileActivation>;
  returnCohortRows: ReturnType<typeof returnCohorts>;
  unpaidProfileCount: number;
  unpaidReachedCount: number;
  unpaidRepeatCount: number;
}) {
  const highlights: AnalyticsHighlight[] = [];
  if (profileActivationRow.createdCount > 0) {
    const comparisonCreated = comparisonProfileActivation?.createdCount ?? 0;
    const difference = profileActivationRow.createdCount - comparisonCreated;
    const comparisonCopy =
      comparisonProfileActivation === null
        ? ""
        : comparisonCreated === 0
          ? "; the comparison period had none"
          : difference === 0
            ? `, the same as the comparison period (${comparisonCreated})`
            : `, ${Math.abs(difference)} ${difference > 0 ? "more than" : "fewer than"} the comparison period (${comparisonCreated})`;
    highlights.push({
      destination: "audience",
      filters: {},
      group: "membership",
      kind: "profile_creation",
      message: `${profileActivationRow.createdCount} retained Member ${plural(profileActivationRow.createdCount, "profile")} ${profileActivationRow.createdCount === 1 ? "was" : "were"} created in the selected period${comparisonCopy}.`,
    });
  }
  if (
    profileActivationRow.matureCount > 0 &&
    profileActivationRow.rate !== null
  ) {
    const comparisonRate = comparisonProfileActivation?.rate ?? null;
    const comparisonCopy =
      comparisonRate === null ||
      (comparisonProfileActivation?.matureCount ?? 0) < 5 ||
      profileActivationRow.matureCount < 5
        ? ""
        : `, ${percentagePoints(profileActivationRow.rate - comparisonRate)} percentage ${plural(Number(percentagePoints(profileActivationRow.rate - comparisonRate)), "point")} ${profileActivationRow.rate >= comparisonRate ? "above" : "below"} the comparison cohort`;
    highlights.push({
      destination: "audience",
      filters: {},
      group: "membership",
      kind: "profile_activation",
      message: `${Math.round(profileActivationRow.rate * 100)}% of mature profiles created in the selected period recorded a first Club-event attendance within 30 days (${profileActivationRow.activatedCount} of ${profileActivationRow.matureCount})${comparisonCopy}.`,
    });
  }

  const currentTags = new Map(
    groupRows(eventRows, (row) => row.tag).map((row) => [row.label, row]),
  );
  const previousTags = new Map(
    groupRows(comparisonRows, (row) => row.tag).map((row) => [row.label, row]),
  );
  const tagChanges = [...currentTags.entries()].flatMap(([label, current]) => {
    const previous = previousTags.get(label);
    return previous === undefined || previous.attendanceCount === 0
      ? []
      : [
          {
            change:
              (current.attendanceCount - previous.attendanceCount) /
              previous.attendanceCount,
            currentAttendance: current.attendanceCount,
            currentAverage: current.attendanceCount / current.eventCount,
            currentEventCount: current.eventCount,
            label,
            previousAttendance: previous.attendanceCount,
            previousAverage: previous.attendanceCount / previous.eventCount,
            previousEventCount: previous.eventCount,
          },
        ];
  });
  const tagChangeMessage = (
    row: (typeof tagChanges)[number],
    direction: "decreased" | "increased",
  ) => {
    const attendanceDifference = Math.abs(
      row.currentAttendance - row.previousAttendance,
    );
    const averageChange =
      (row.currentAverage - row.previousAverage) / row.previousAverage;
    return `${row.label} attendance ${direction} by ${attendanceDifference} (${row.currentAttendance} across ${row.currentEventCount} ${plural(row.currentEventCount, "event")} versus ${row.previousAttendance} across ${row.previousEventCount}; ${Math.abs(Math.round(row.change * 100))}%). Average turnout ${averageChange >= 0 ? "increased" : "decreased"} ${Math.abs(Math.round(averageChange * 100))}% to ${measuredDecimal(row.currentAverage)} per event.`;
  };
  const strongestGrowth = [...tagChanges].sort(
    (a, b) => b.change - a.change,
  )[0];
  if (strongestGrowth && strongestGrowth.change > 0) {
    highlights.push({
      destination: "events",
      filters: { eventTag: strongestGrowth.label },
      group: "programming",
      kind: "event_tag_growth",
      message: tagChangeMessage(strongestGrowth, "increased"),
    });
  }
  const largestDecline = [...tagChanges].sort((a, b) => a.change - b.change)[0];
  if (largestDecline && largestDecline.change < 0) {
    highlights.push({
      destination: "events",
      filters: { eventTag: largestDecline.label },
      group: "programming",
      kind: "event_tag_decline",
      message: tagChangeMessage(largestDecline, "decreased"),
    });
  }

  const tagMedians = new Map(
    [...new Set(eventRows.map((row) => row.tag))].map((tag) => [
      tag,
      median(
        eventRows
          .filter((row) => row.tag === tag)
          .map((row) => row.attendanceCount),
      ) ?? 0,
    ]),
  );
  const adjustedScheduleGroups = new Map<
    string,
    { indexes: number[]; tags: Set<string> }
  >();
  eventRows.forEach((row) => {
    const tagMedian = tagMedians.get(row.tag) ?? 0;
    if (tagMedian <= 0) return;
    const label = `${localParts(row.date).weekday} · ${startTimeBand(row.date)}`;
    const group = adjustedScheduleGroups.get(label) ?? {
      indexes: [],
      tags: new Set<string>(),
    };
    group.indexes.push(row.attendanceCount / tagMedian);
    group.tags.add(row.tag);
    adjustedScheduleGroups.set(label, group);
  });
  const adjustedSchedule = [...adjustedScheduleGroups.entries()]
    .flatMap(([label, row]) => {
      const index = median(row.indexes);
      return row.indexes.length >= 5 && row.tags.size >= 2 && index !== null
        ? [
            {
              eventCount: row.indexes.length,
              index,
              label,
              tagCount: row.tags.size,
            },
          ]
        : [];
    })
    .sort(
      (a, b) =>
        b.index - a.index ||
        b.eventCount - a.eventCount ||
        a.label.localeCompare(b.label),
    )[0];
  if (adjustedSchedule) {
    highlights.push({
      destination: "events",
      filters: {},
      group: "programming",
      kind: "schedule_performance",
      message: `${adjustedSchedule.label} events measured ${adjustedSchedule.index.toFixed(2)}× their event-type medians across ${adjustedSchedule.eventCount} events and ${adjustedSchedule.tagCount} event types, the strongest qualifying schedule window.`,
    });
  } else {
    const schedule = groupRows(
      eventRows,
      (row) => `${localParts(row.date).weekday} · ${startTimeBand(row.date)}`,
    )
      .filter((row) => row.eventCount >= 3)
      .sort(
        (a, b) =>
          b.attendanceCount / b.eventCount - a.attendanceCount / a.eventCount ||
          b.attendanceCount - a.attendanceCount ||
          a.label.localeCompare(b.label),
      )[0];
    if (schedule) {
      const averageAttendance = schedule.attendanceCount / schedule.eventCount;
      highlights.push({
        destination: "events",
        filters: {},
        group: "programming",
        kind: "schedule_performance",
        message: `${schedule.label} averaged ${measuredDecimal(averageAttendance)} attendees across ${schedule.eventCount} ${plural(schedule.eventCount, "event")}, the highest measured per-event turnout among schedule windows with at least three events.`,
      });
    }
  }

  const currentAttendeeIds = new Set(
    eventRows.flatMap(
      (row) =>
        (row as AnalyticsEventRow & { attendeeIds?: string[] }).attendeeIds ??
        [],
    ),
  );
  const comparisonAttendeeIds = new Set(
    comparisonRows.flatMap(
      (row) =>
        (row as AnalyticsEventRow & { attendeeIds?: string[] }).attendeeIds ??
        [],
    ),
  );
  if (comparisonAttendeeIds.size > 0) {
    const continuedCount = [...comparisonAttendeeIds].filter((id) =>
      currentAttendeeIds.has(id),
    ).length;
    const noCurrentAttendanceCount =
      comparisonAttendeeIds.size - continuedCount;
    highlights.push({
      destination: "audience",
      filters: {},
      group: "engagement",
      kind: "attendee_continuation",
      message: `${Math.round((continuedCount / comparisonAttendeeIds.size) * 100)}% of comparison-period attendees also attended in the selected period (${continuedCount} of ${comparisonAttendeeIds.size}); ${noCurrentAttendanceCount} had no selected-period attendance.`,
    });
  }
  const returnCohort = returnCohortRows.find(
    (row) => row.days === 30 && row.matureCount > 0 && row.rate !== null,
  );
  if (returnCohort?.rate !== null && returnCohort) {
    highlights.push({
      destination: "events",
      filters: {},
      group: "engagement",
      kind: "first_attendee_return",
      message: `${Math.round(returnCohort.rate * 100)}% of mature first-time attendees returned within 30 days (${returnCohort.returnedCount} of ${returnCohort.matureCount}).`,
    });
  }
  const gateway = gatewayRows.find((row) => row.matureCount >= 5);
  if (gateway?.rate !== null && gateway) {
    highlights.push({
      destination: "events",
      filters: { eventTag: gateway.label },
      group: "programming",
      kind: "gateway_event_type",
      message: `${gateway.label} first-time attendees had a ${Math.round(gateway.rate * 100)}% measured 30-day return rate (${gateway.returnedCount} of ${gateway.matureCount}), the highest among event types with at least five mature first-time attendees.`,
    });
  }

  const qualifyingAudienceRows = audienceRows.filter(
    (row) => row.baseCount >= 5 && row.representationGap !== null,
  );
  const overrepresented = [...qualifyingAudienceRows].sort(
    (a, b) =>
      (b.representationGap ?? 0) - (a.representationGap ?? 0) ||
      a.category.localeCompare(b.category),
  )[0];
  if (
    overrepresented?.representationGap !== null &&
    overrepresented &&
    overrepresented.representationGap > 0
  ) {
    highlights.push({
      destination: "audience",
      filters: { demographic },
      group: "audience",
      kind: "audience_overrepresented",
      message: `${overrepresented.category} is overrepresented among attendees by ${percentagePoints(overrepresented.representationGap)} percentage ${plural(Number(percentagePoints(overrepresented.representationGap)), "point")}.`,
    });
  }
  const underrepresented = [...qualifyingAudienceRows].sort(
    (a, b) =>
      (a.representationGap ?? 0) - (b.representationGap ?? 0) ||
      a.category.localeCompare(b.category),
  )[0];
  if (
    underrepresented?.representationGap !== null &&
    underrepresented &&
    underrepresented.representationGap < 0
  ) {
    highlights.push({
      destination: "audience",
      filters: { demographic },
      group: "audience",
      kind: "audience_underrepresented",
      message: `${underrepresented.category} is underrepresented among attendees by ${percentagePoints(underrepresented.representationGap)} percentage ${plural(Number(percentagePoints(underrepresented.representationGap)), "point")}.`,
    });
  }

  if (duesLifecycleRow.currentCount + duesLifecycleRow.previousCount > 0) {
    const paceCopy =
      duesLifecycleRow.difference === 0
        ? "even with"
        : `${Math.abs(duesLifecycleRow.difference)} ${duesLifecycleRow.difference > 0 ? "ahead of" : "behind"}`;
    const lifecycleCopy =
      duesLifecycleRow.previousCount === 0
        ? `${duesLifecycleRow.firstTimeCount} first-recorded and ${duesLifecycleRow.reactivatedCount} reactivated. No prior-year payer cohort is available to measure renewal.`
        : `${duesLifecycleRow.renewedCount} renewed, ${duesLifecycleRow.firstTimeCount} first-recorded, ${duesLifecycleRow.reactivatedCount} reactivated, and ${duesLifecycleRow.notYetRenewedCount} prior-year payers not yet renewed.`;
    highlights.push({
      destination: "dues",
      filters: {},
      group: "dues",
      kind: "dues_pace",
      message: `Recorded dues credits are ${paceCopy} the comparable day last academic year: ${lifecycleCopy}`,
    });
  }
  if (unpaidProfileCount > 0 && unpaidReachedCount > 0) {
    highlights.push({
      destination: "dues",
      filters: {},
      group: "dues",
      kind: "unpaid_event_reach",
      message: `${unpaidReachedCount} of ${unpaidProfileCount} currently unpaid profiles attended at least one selected-period event (${Math.round((unpaidReachedCount / unpaidProfileCount) * 100)}%); ${unpaidRepeatCount} attended at least twice.`,
    });
  }
  const nextDuesThreshold = [0.25, 0.5, 0.75, 0.9].find(
    (threshold) => paidCount < Math.ceil(memberCount * threshold),
  );
  if (memberCount > 0 && nextDuesThreshold !== undefined) {
    const required = Math.ceil(memberCount * nextDuesThreshold);
    const remaining = required - paidCount;
    highlights.push({
      destination: "dues",
      filters: {},
      group: "dues",
      kind: "next_dues_milestone",
      message: `${remaining} more current ${plural(remaining, "profile")} ${remaining === 1 ? "needs" : "need"} an active dues credit to reach ${Math.round(nextDuesThreshold * 100)}%.`,
    });
  }

  if (eventRows.length > 0) {
    const feedbackMessage =
      feedback.responseCount === 0
        ? "No linked feedback responses are available for the selected events, so rating and discovery patterns cannot be measured."
        : feedback.responseCount < RELIABLE_FEEDBACK_COUNT
          ? `Only ${feedback.responseCount} linked feedback ${plural(feedback.responseCount, "response")} are available; at least ${RELIABLE_FEEDBACK_COUNT} are required for reliable event ranking.`
          : feedback.responseRate !== null && feedback.responseRate < 0.1
            ? `Linked feedback covers ${Math.round(feedback.responseRate * 100)}% of selected-period attendances (${feedback.responseCount} responses).`
            : null;
    if (feedbackMessage !== null) {
      highlights.push({
        destination: "events",
        filters: {},
        group: "measurement",
        kind: "feedback_coverage",
        message: feedbackMessage,
      });
    }
  }
  if (
    memberCount > 0 &&
    demographicCoverage !== null &&
    demographicCoverage < 0.8
  ) {
    const recordedCount = Math.round(demographicCoverage * memberCount);
    const demographicLabel = demographic.replaceAll("_", " ");
    highlights.push({
      destination: "audience",
      filters: { demographic },
      group: "measurement",
      kind: "demographic_coverage",
      message: `${recordedCount} of ${memberCount} current profiles have a usable ${demographicLabel} value (${Math.round(demographicCoverage * 100)}% coverage).`,
    });
  }
  return highlights;
}

export function buildClubAnalyticsReport({
  attendances,
  dues,
  events,
  feedback,
  input,
  members,
  referenceDate,
}: {
  attendances: readonly AnalyticsAttendanceSource[];
  dues: readonly AnalyticsDuesSource[];
  events: readonly AnalyticsEventSource[];
  feedback: readonly AnalyticsFeedbackSource[];
  input: AnalyticsReportInput;
  members: readonly AnalyticsMemberSource[];
  referenceDate: Date;
}) {
  const period = resolveAnalyticsPeriod(input.period, referenceDate);
  const comparisonPeriod = resolveComparison(
    period,
    input.period.kind === "all_time" ? "none" : input.comparison,
  );
  const clubEvents = events.filter((event) => event.hackathonId === null);
  if (
    input.eventId !== null &&
    !clubEvents.some((event) => event.id === input.eventId)
  ) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
  }
  const memberIds = new Set(members.map((member) => member.id));
  const memberById = new Map(members.map((member) => [member.id, member]));
  const eventIds = new Set(clubEvents.map((event) => event.id));
  const cleanAttendance = deduplicateAttendance(
    attendances,
    memberIds,
    eventIds,
  );
  const eventById = new Map(clubEvents.map((event) => [event.id, event]));
  const firstByMember = firstEventByMember(cleanAttendance, eventById);
  const selectedEvents = selectedEventsFor(clubEvents, period, input);
  const selectedEventIds = new Set(selectedEvents.map((event) => event.id));
  const selectedAttendance = cleanAttendance.filter((row) =>
    selectedEventIds.has(row.eventId),
  );
  const selectedFeedback = feedback.filter((row) =>
    selectedEventIds.has(row.eventId),
  );
  const eventRows = buildEventRows({
    allAttendance: cleanAttendance,
    feedback: selectedFeedback,
    firstByMember,
    selectedEvents,
  });
  const summary = buildSummary({ eventRows, memberCount: members.length });
  const comparisonEvents = comparisonPeriod
    ? selectedEventsFor(clubEvents, comparisonPeriod, input)
    : [];
  const comparisonRows = buildEventRows({
    allAttendance: cleanAttendance,
    feedback,
    firstByMember,
    selectedEvents: comparisonEvents,
  });
  const comparisonSummary = comparisonPeriod
    ? buildSummary({ eventRows: comparisonRows, memberCount: members.length })
    : null;
  const attendedByMember = memberAttendanceMap(selectedAttendance);
  const paidByMember = currentDues(members, dues, referenceDate);
  const lastEvents = memberLastEvents(selectedAttendance, eventById);
  const allDemographics = Object.fromEntries(
    (
      [
        "age",
        "school",
        "major",
        "level_of_study",
        "inferred_year_of_study",
        "graduation",
        "gender",
        "race_or_ethnicity",
        "shirt_size",
      ] as const
    ).map((demographic) => [
      demographic,
      {
        coverageRate: ratio(
          members.filter((member) =>
            isUsableDemographicCategory(
              demographicCategory(member, demographic, referenceDate),
            ),
          ).length,
          members.length,
        ),
        rows: demographicRows({
          attendedByMember,
          demographic,
          members,
          paidByMember,
          referenceDate,
        }),
      },
    ]),
  ) as Record<
    AnalyticsDemographic,
    { coverageRate: number | null; rows: DemographicRow[] }
  >;
  const memberRows: NamedMemberRow[] = members
    .map((member) => {
      const lastEvent = lastEvents.get(member.id) ?? null;
      return {
        attendanceCount: attendedByMember.get(member.id)?.size ?? 0,
        category: demographicCategory(member, input.demographic, referenceDate),
        lastEventAt: lastEvent?.startAt ?? null,
        lastEventName: lastEvent?.name ?? null,
        memberId: member.id,
        name: `${member.firstName} ${member.lastName}`.trim(),
        paid: paidByMember.get(member.id) === true,
      };
    })
    .sort(
      (a, b) =>
        b.attendanceCount - a.attendanceCount || a.name.localeCompare(b.name),
    );
  const paidCount = [...paidByMember.values()].filter(Boolean).length;
  const unpaidMembers: UnpaidMemberRow[] = members
    .filter((member) => paidByMember.get(member.id) !== true)
    .map((member) => {
      const lastEvent = lastEvents.get(member.id) ?? null;
      return {
        attendanceCount: attendedByMember.get(member.id)?.size ?? 0,
        graduationYear: graduationCategory(member.gradDate),
        lastEventAt: lastEvent?.startAt ?? null,
        lastEventName: lastEvent?.name ?? null,
        memberId: member.id,
        name: `${member.firstName} ${member.lastName}`.trim(),
        points: member.points,
      };
    })
    .sort(
      (a, b) =>
        b.attendanceCount - a.attendanceCount || a.name.localeCompare(b.name),
    );
  const frequency = [
    { label: "0", min: 0, max: 0 },
    { label: "1", min: 1, max: 1 },
    { label: "2–3", min: 2, max: 3 },
    { label: "4–6", min: 4, max: 6 },
    { label: "7+", min: 7, max: Number.POSITIVE_INFINITY },
  ].map((band) => ({
    count: members.filter((member) => {
      const count = attendedByMember.get(member.id)?.size ?? 0;
      return count >= band.min && count <= band.max;
    }).length,
    label: band.label,
  }));
  const academicYears = academicYearHistory(members, dues, referenceDate);
  const paidEngagement = (paid: boolean) => {
    const population = members.filter(
      (member) => (paidByMember.get(member.id) === true) === paid,
    );
    const reached = population.filter(
      (member) => (attendedByMember.get(member.id)?.size ?? 0) > 0,
    );
    const repeat = reached.filter(
      (member) => (attendedByMember.get(member.id)?.size ?? 0) >= 2,
    );
    return {
      distinctAttendanceCount: population.reduce(
        (sum, member) => sum + (attendedByMember.get(member.id)?.size ?? 0),
        0,
      ),
      profileCount: population.length,
      reachedCount: reached.length,
      reachRate: ratio(reached.length, population.length),
      repeatCount: repeat.length,
      repeatRate: ratio(repeat.length, reached.length),
    };
  };
  const paidEngagementSummary = paidEngagement(true);
  const unpaidEngagementSummary = paidEngagement(false);
  const feedbackMetric = aggregateFeedback(eventRows);
  const returnCohortRows = returnCohorts({
    allAttendance: cleanAttendance,
    eventById,
    firstByMember,
    observationEnd: period.observationEnd,
    selectedEventIds,
  });
  const gatewayRows = gatewayReturnRows({
    allAttendance: cleanAttendance,
    eventById,
    firstByMember,
    observationEnd: period.observationEnd,
    selectedEventIds,
  });
  const profileActivationRow = profileActivation({
    eventById,
    firstByMember,
    members,
    period,
  });
  const comparisonProfileActivation = comparisonPeriod
    ? profileActivation({
        eventById,
        firstByMember,
        members,
        period: comparisonPeriod,
      })
    : null;
  const duesLifecycleRow = duesLifecycle({ dues, members, referenceDate });
  const feedbackValues = eventRows.flatMap((row) => {
    const value = row.feedback.averageOverall;
    return value === null
      ? []
      : Array.from({ length: row.feedback.overallResponseCount }, () => value);
  });
  const newProfiles = profileActivationRow.createdCount;
  const highlights = buildHighlights({
    comparisonProfileActivation,
    comparisonRows,
    demographic: input.demographic,
    demographicCoverage: allDemographics[input.demographic].coverageRate,
    demographicRows: allDemographics[input.demographic].rows,
    duesLifecycleRow,
    eventRows,
    feedback: feedbackMetric,
    gatewayRows,
    memberCount: members.length,
    paidCount,
    profileActivationRow,
    returnCohortRows,
    unpaidProfileCount: unpaidEngagementSummary.profileCount,
    unpaidReachedCount: unpaidEngagementSummary.reachedCount,
    unpaidRepeatCount: unpaidEngagementSummary.repeatCount,
  });
  return {
    audience: {
      demographics: allDemographics,
      memberRows,
      selectedDemographic: input.demographic,
      summary: {
        attendeeCount: summary.distinctAttendeeCount,
        dataCoverage: allDemographics[input.demographic].coverageRate,
        memberProfileCount: members.length,
        newProfileCount: newProfiles,
        repeatAttendeeCount: members.filter(
          (member) => (attendedByMember.get(member.id)?.size ?? 0) >= 2,
        ).length,
      },
      affinity: affinityRows({
        attendance: selectedAttendance,
        demographic: input.demographic,
        eventById,
        memberById,
        referenceDate,
      }),
    },
    dues: {
      academicYears,
      engagement: {
        paid: paidEngagementSummary,
        unpaid: unpaidEngagementSummary,
      },
      summary: {
        paidCount,
        paidRate: ratio(paidCount, members.length),
        profileCount: members.length,
        unpaidCount: members.length - paidCount,
      },
      unpaidMembers,
    },
    events: {
      feedback: feedbackMetric,
      frequency,
      groupings: {
        duration: groupRows(eventRows, (row) =>
          durationBand(row.durationMinutes),
        ),
        location: groupRows(eventRows, (row) => textCategory(row.location)),
        month: groupRows(eventRows, (row) => {
          const parts = localParts(row.date);
          return `${parts.year}-${String(parts.month).padStart(2, "0")}`;
        }),
        startTime: groupRows(eventRows, (row) => startTimeBand(row.date)),
        tag: groupRows(eventRows, (row) => row.tag),
        weekday: groupRows(eventRows, (row) => localParts(row.date).weekday),
      },
      reliableTopRated: eventRows
        .flatMap((row) => {
          const averageOverall = row.feedback.averageOverall;
          return averageOverall !== null &&
            row.feedback.overallResponseCount >= RELIABLE_FEEDBACK_COUNT
            ? [
                {
                  averageOverall,
                  id: row.id,
                  name: row.name,
                  responseCount: row.feedback.overallResponseCount,
                  attendanceCount: row.attendanceCount,
                },
              ]
            : [];
        })
        .sort(
          (a, b) =>
            b.averageOverall - a.averageOverall ||
            b.attendanceCount - a.attendanceCount,
        )
        .map(({ attendanceCount: _attendanceCount, ...row }) => row),
      returnCohorts: returnCohortRows,
      rows: eventRows.map(({ attendeeIds: _attendeeIds, ...row }) => row),
      summary,
      trend: trendRows(eventRows, period),
    },
    filterOptions: {
      events: clubEvents
        .map(({ id, name, startAt, tag }) => ({ id, name, startAt, tag }))
        .sort((a, b) => b.startAt.getTime() - a.startAt.getTime()),
      tags: [...new Set(clubEvents.map((event) => event.tag))].sort(),
    },
    highlights,
    metadata: {
      comparisonPeriod,
      filters: {
        demographic: input.demographic,
        eventId: input.eventId,
        eventTags: input.eventTags,
      },
      generatedAt: referenceDate,
      metricVersion: METRIC_VERSION,
      period,
    },
    overview: {
      comparison: comparisonSummary
        ? {
            attendance: delta(
              summary.distinctAttendanceCount,
              comparisonSummary.distinctAttendanceCount,
            ),
            attendees: delta(
              summary.distinctAttendeeCount,
              comparisonSummary.distinctAttendeeCount,
            ),
            events: delta(summary.eventCount, comparisonSummary.eventCount),
            reach: delta(summary.memberReach, comparisonSummary.memberReach),
          }
        : null,
      feedback: {
        averageOverall: average(feedbackValues),
        responseCount: eventRows.reduce(
          (sum, row) => sum + row.feedback.responseCount,
          0,
        ),
      },
      memberProfileCount: members.length,
      summary,
    },
    reports: {
      internalKinds: ["overview", "events", "audience", "dues"] as const,
      sponsorSuppressionThreshold: 5,
    },
  };
}

export type ClubAnalyticsReport = ReturnType<typeof buildClubAnalyticsReport>;
