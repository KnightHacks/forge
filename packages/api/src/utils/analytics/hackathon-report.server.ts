import { TRPCError } from "@trpc/server";

import type {
  HackathonAnalyticsDemographic,
  HackathonAnalyticsReportInput,
} from "@forge/validators";
import { and, eq, isNull } from "@forge/db";
import { db } from "@forge/db/client";
import {
  Event,
  Hackathon,
  HackathonClass,
  Hacker,
  HackerAttendee,
  HackerCheckInAttempt,
  HackerDiscordRoleGrant,
  HackerEventAttendee,
} from "@forge/db/schemas/knight-hacks";
import { graduationTermYearFromDate } from "@forge/validators";

import type { HackathonReport } from "./hackathon-export";
import type { HackathonAnalyticsSources } from "./hackathon-report";
import { deriveAgeBand, inferAcademicYear } from "./demographics";
import {
  DOCUMENTED_HACKATHON_DEMOGRAPHICS,
  normalizeHackathonExportReportInput,
  serializeHackathonAnalyticsExport,
} from "./hackathon-export";
import {
  buildHackathonAnalyticsReport,
  buildHackathonIdentifiedRows,
} from "./hackathon-report";

export interface HackathonAnalyticsOption {
  applicationDeadline: Date;
  applicationOpen: Date;
  confirmationDeadline: Date;
  displayName: string;
  endDate: Date;
  id: string;
  startDate: Date;
}

/** Resolves URL defaults without relying on the retired Hackathon slug. */
export function resolveHackathonAnalyticsOptions(
  rows: readonly HackathonAnalyticsOption[],
  referenceDate: Date,
) {
  const namedRows = rows.filter(
    (row) => !/^Portal [0-9a-f]{6}$/i.test(row.displayName.trim()),
  );
  const reportableRows = namedRows.length > 0 ? namedRows : rows;
  const byNewest = [...reportableRows].sort(
    (left, right) =>
      right.startDate.getTime() - left.startDate.getTime() ||
      left.id.localeCompare(right.id),
  );
  const active = byNewest.filter(
    (row) =>
      row.startDate.getTime() <= referenceDate.getTime() &&
      referenceDate.getTime() < row.endDate.getTime(),
  );
  const past = byNewest.filter(
    (row) => row.startDate.getTime() <= referenceDate.getTime(),
  );
  const future = [...reportableRows]
    .filter((row) => row.startDate.getTime() > referenceDate.getTime())
    .sort(
      (left, right) =>
        left.startDate.getTime() - right.startDate.getTime() ||
        left.id.localeCompare(right.id),
    );
  const selected = active[0] ?? past[0] ?? future[0] ?? null;
  const chronological = [...reportableRows].sort(
    (left, right) =>
      left.startDate.getTime() - right.startDate.getTime() ||
      left.id.localeCompare(right.id),
  );
  const comparisonByHackathonId = Object.fromEntries(
    chronological.map((row, index) => [
      row.id,
      chronological[index - 1]?.id ?? null,
    ]),
  );
  return {
    comparisonByHackathonId,
    defaultHackathonId: selected?.id ?? null,
    options: byNewest,
  };
}

export async function listHackathonAnalyticsOptions(
  referenceDate = new Date(),
) {
  const rows = await db
    .select({
      applicationDeadline: Hackathon.applicationDeadline,
      applicationOpen: Hackathon.applicationOpen,
      confirmationDeadline: Hackathon.confirmationDeadline,
      displayName: Hackathon.displayName,
      endDate: Hackathon.endDate,
      id: Hackathon.id,
      startDate: Hackathon.startDate,
    })
    .from(Hackathon);
  return resolveHackathonAnalyticsOptions(rows, referenceDate);
}

async function loadHackathonAnalyticsSources(hackathonId: string) {
  const [hackathon] = await db
    .select({
      applicationDeadline: Hackathon.applicationDeadline,
      applicationOpen: Hackathon.applicationOpen,
      confirmationDeadline: Hackathon.confirmationDeadline,
      displayName: Hackathon.displayName,
      endDate: Hackathon.endDate,
      id: Hackathon.id,
      startDate: Hackathon.startDate,
    })
    .from(Hackathon)
    .where(eq(Hackathon.id, hackathonId))
    .limit(1);
  if (!hackathon) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Hackathon not found." });
  }

  const [attendees, events, attendances, attempts, roleGrants] =
    await Promise.all([
      db
        .select({
          checkedInAt: HackerAttendee.checkedInAt,
          classColor: HackathonClass.color,
          className: HackathonClass.name,
          country: Hacker.country,
          dob: Hacker.dob,
          firstName: Hacker.firstName,
          foodAllergies: Hacker.foodAllergies,
          gender: Hacker.gender,
          gradDate: Hacker.gradDate,
          hackerAttId: HackerAttendee.id,
          hackerFirstTime: Hacker.isFirstTime,
          hackathonId: HackerAttendee.hackathonId,
          isFirstTime: HackerAttendee.isFirstTime,
          isVip: HackerAttendee.isVip,
          lastName: Hacker.lastName,
          levelOfStudy: Hacker.levelOfStudy,
          major: Hacker.major,
          points: HackerAttendee.points,
          raceOrEthnicity: Hacker.raceOrEthnicity,
          school: Hacker.school,
          shirtSize: Hacker.shirtSize,
          status: HackerAttendee.status,
          timeApplied: HackerAttendee.timeApplied,
          timeConfirmed: HackerAttendee.timeConfirmed,
        })
        .from(HackerAttendee)
        .innerJoin(Hacker, eq(Hacker.id, HackerAttendee.hackerId))
        .leftJoin(HackathonClass, eq(HackathonClass.id, HackerAttendee.classId))
        .where(eq(HackerAttendee.hackathonId, hackathonId)),
      db
        .select({
          deletionIntentAt: Event.deletionIntentAt,
          endAt: Event.end_datetime,
          hackathonId: Event.hackathonId,
          id: Event.id,
          legacy: Event.legacy,
          location: Event.location,
          name: Event.name,
          publishedAt: Event.publishedAt,
          purpose: Event.purpose,
          startAt: Event.start_datetime,
          tag: Event.tag,
        })
        .from(Event)
        .where(eq(Event.hackathonId, hackathonId)),
      db
        .select({
          attendanceId: HackerEventAttendee.id,
          checkedInAt: HackerEventAttendee.checkedInAt,
          eventId: HackerEventAttendee.eventId,
          hackerAttId: HackerEventAttendee.hackerAttId,
          hackathonId: HackerEventAttendee.hackathonId,
          pointsAwarded: HackerEventAttendee.pointsAwarded,
          voidedAt: HackerEventAttendee.voidedAt,
        })
        .from(HackerEventAttendee)
        .where(eq(HackerEventAttendee.hackathonId, hackathonId)),
      db
        .select({
          attendanceId: HackerCheckInAttempt.attendanceId,
          attemptedAt: HackerCheckInAttempt.attemptedAt,
          classColor: HackerCheckInAttempt.classColorSnapshot,
          className: HackerCheckInAttempt.classNameSnapshot,
          eventId: HackerCheckInAttempt.eventId,
          eventName: HackerCheckInAttempt.eventNameSnapshot,
          hackathonId: HackerCheckInAttempt.hackathonId,
          isRepeatOccurrence: HackerCheckInAttempt.isRepeatOccurrence,
          isVip: HackerCheckInAttempt.isVipSnapshot,
          mode: HackerCheckInAttempt.mode,
          operatorId: HackerCheckInAttempt.operatorId,
          outcome: HackerCheckInAttempt.outcome,
          pointsAwarded: HackerCheckInAttempt.pointsAwarded,
          wasMinor: HackerCheckInAttempt.wasMinorAtAttempt,
        })
        .from(HackerCheckInAttempt)
        .where(eq(HackerCheckInAttempt.hackathonId, hackathonId)),
      db
        .select({
          attemptCount: HackerDiscordRoleGrant.attemptCount,
          createdAt: HackerDiscordRoleGrant.createdAt,
          kind: HackerDiscordRoleGrant.kind,
          hackathonId: HackerDiscordRoleGrant.hackathonId,
          lastError: HackerDiscordRoleGrant.lastError,
          lastAttemptAt: HackerDiscordRoleGrant.lastAttemptAt,
          state: HackerDiscordRoleGrant.state,
        })
        .from(HackerDiscordRoleGrant)
        .where(eq(HackerDiscordRoleGrant.hackathonId, hackathonId)),
    ]);

  return {
    attendees,
    attendances,
    attempts,
    events: events.map((event) => ({
      ...event,
      hackathonId: event.hackathonId ?? hackathonId,
    })),
    hackathon,
    roleGrants,
  } satisfies HackathonAnalyticsSources;
}

export function assertSelectedEventScope(
  sources: Pick<HackathonAnalyticsSources, "events">,
  eventId: string | null,
) {
  if (
    eventId !== null &&
    !sources.events.some((event) => event.id === eventId)
  ) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "The selected event does not belong to this hackathon.",
    });
  }
}

function builderInput(
  input: HackathonAnalyticsReportInput,
  referenceDate: Date,
) {
  const usesEventFilters =
    input.section === "events" || input.section === "live_operations";
  return {
    compositionCohort:
      input.audienceView === "engagement"
        ? ("applicants" as const)
        : input.compositionCohort,
    demographic: input.demographic,
    eventId: usesEventFilters ? input.eventId : null,
    eventPurpose: usesEventFilters ? input.eventPurpose : ("all" as const),
    eventTags: usesEventFilters ? input.eventTags : [],
    liveWindow: input.liveWindow,
    referenceDate,
  } as const;
}

export async function getHackathonAnalyticsReport(
  input: HackathonAnalyticsReportInput,
  referenceDate = new Date(),
) {
  const sources = await loadHackathonAnalyticsSources(input.hackathonId);
  assertSelectedEventScope(sources, input.eventId);
  const selectedReport = buildHackathonAnalyticsReport(
    sources,
    builderInput(input, referenceDate),
  );
  const comparisonSources = input.comparisonHackathonId
    ? await loadHackathonAnalyticsSources(input.comparisonHackathonId)
    : null;
  const comparisonReport = comparisonSources
    ? buildHackathonAnalyticsReport(
        comparisonSources,
        builderInput({ ...input, eventId: null }, referenceDate),
      )
    : null;
  const comparison =
    comparisonSources && comparisonReport
      ? {
          applicationDailyBuckets: comparisonReport.applications.dailyBuckets,
          hackathon: comparisonSources.hackathon,
          pipeline: Object.fromEntries(
            ["applicants", "pending", "accepted", "confirmed", "checkedIn"].map(
              (key) => {
                const typedKey = key as
                  | "applicants"
                  | "pending"
                  | "accepted"
                  | "confirmed"
                  | "checkedIn";
                const current = selectedReport.overview.pipeline[typedKey];
                const previous = comparisonReport.overview.pipeline[typedKey];
                return [
                  typedKey,
                  {
                    current,
                    delta: current - previous,
                    previous,
                    rateDelta:
                      previous === 0 ? null : (current - previous) / previous,
                  },
                ];
              },
            ),
          ) as Record<
            "applicants" | "pending" | "accepted" | "confirmed" | "checkedIn",
            {
              current: number;
              delta: number;
              previous: number;
              rateDelta: number | null;
            }
          >,
        }
      : null;
  return {
    ...selectedReport,
    comparison,
    metadata: {
      generatedAt: referenceDate,
      hackathon: sources.hackathon,
      metricVersion: "hackathon-analytics-v1" as const,
      nativeVsLegacyDerivedFirstTimeProvenance: "unavailable" as const,
    },
    options: {
      eventTags: [...new Set(sources.events.map((event) => event.tag))].sort(),
      events: sources.events
        .filter((event) => event.deletionIntentAt === null)
        .map((event) => ({
          id: event.id,
          legacy: event.legacy,
          name: event.name,
          purpose: event.purpose,
          tag: event.tag,
        })),
    },
  };
}

export async function getHackathonAnalyticsIdentifiedRows(
  input: HackathonAnalyticsReportInput,
  referenceDate = new Date(),
) {
  const sources = await loadHackathonAnalyticsSources(input.hackathonId);
  assertSelectedEventScope(sources, input.eventId);
  return buildHackathonIdentifiedRows(
    sources,
    builderInput(input, referenceDate),
  );
}

export async function getHackerAnalyticsProfile(input: {
  attendeeId: string;
  hackathonId: string;
}) {
  const [row] = await db
    .select({
      attendeeId: HackerAttendee.id,
      checkedInAt: HackerAttendee.checkedInAt,
      classColor: HackathonClass.color,
      className: HackathonClass.name,
      dob: Hacker.dob,
      firstName: Hacker.firstName,
      gender: Hacker.gender,
      gradDate: Hacker.gradDate,
      hackathonStartDate: Hackathon.startDate,
      hackerFirstTime: Hacker.isFirstTime,
      isFirstTime: HackerAttendee.isFirstTime,
      isVip: HackerAttendee.isVip,
      lastName: Hacker.lastName,
      levelOfStudy: Hacker.levelOfStudy,
      major: Hacker.major,
      points: HackerAttendee.points,
      raceOrEthnicity: Hacker.raceOrEthnicity,
      school: Hacker.school,
      shirtSize: Hacker.shirtSize,
      status: HackerAttendee.status,
    })
    .from(HackerAttendee)
    .innerJoin(Hacker, eq(Hacker.id, HackerAttendee.hackerId))
    .innerJoin(Hackathon, eq(Hackathon.id, HackerAttendee.hackathonId))
    .leftJoin(HackathonClass, eq(HackathonClass.id, HackerAttendee.classId))
    .where(
      and(
        eq(HackerAttendee.id, input.attendeeId),
        eq(HackerAttendee.hackathonId, input.hackathonId),
      ),
    )
    .limit(1);
  if (!row) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Hacker analytics profile not found.",
    });
  }
  const occurrences = await db
    .select({
      checkedInAt: HackerEventAttendee.checkedInAt,
      eventId: HackerEventAttendee.eventId,
      pointsAwarded: HackerEventAttendee.pointsAwarded,
      voidedAt: HackerEventAttendee.voidedAt,
    })
    .from(HackerEventAttendee)
    .innerJoin(Event, eq(Event.id, HackerEventAttendee.eventId))
    .where(
      and(
        eq(HackerEventAttendee.hackerAttId, input.attendeeId),
        eq(HackerEventAttendee.hackathonId, input.hackathonId),
        eq(Event.hackathonId, input.hackathonId),
        eq(Event.legacy, false),
        eq(Event.purpose, "event"),
        isNull(Event.deletionIntentAt),
      ),
    );
  const validOccurrences = occurrences.filter((item) => item.voidedAt === null);
  const coveredPointOccurrences = validOccurrences.filter(
    (
      item,
    ): item is typeof item & {
      pointsAwarded: number;
    } => item.pointsAwarded !== null,
  );
  const graduation = graduationTermYearFromDate(row.gradDate);
  return {
    ageBand: deriveAgeBand(row.dob, row.hackathonStartDate),
    attendeeId: row.attendeeId,
    checkedInAt: row.checkedInAt,
    classColor: row.classColor,
    className: row.className,
    displayName: `${row.firstName} ${row.lastName}`.trim(),
    eventSummary: {
      distinctEvents: new Set(validOccurrences.map((item) => item.eventId))
        .size,
      pointCoverage: {
        denominator: validOccurrences.length,
        numerator: coveredPointOccurrences.length,
        rate:
          validOccurrences.length === 0
            ? null
            : coveredPointOccurrences.length / validOccurrences.length,
      },
      pointsAwarded:
        coveredPointOccurrences.length === 0
          ? null
          : coveredPointOccurrences.reduce(
              (sum, item) => sum + item.pointsAwarded,
              0,
            ),
    },
    firstTimeStatus:
      (row.isFirstTime ?? row.hackerFirstTime) === null
        ? "Unknown"
        : (row.isFirstTime ?? row.hackerFirstTime)
          ? "First-time hacker"
          : "Returning hacker",
    gender: row.gender,
    graduationTerm: `${graduation.gradTerm} ${graduation.gradYear}`,
    inferredYearOfStudy: inferAcademicYear(
      row.gradDate,
      row.levelOfStudy,
      row.hackathonStartDate,
    ),
    isVip: row.isVip,
    levelOfStudy: row.levelOfStudy,
    major: row.major,
    points: row.points,
    raceOrEthnicity: row.raceOrEthnicity,
    school: row.school,
    shirtSize: row.shirtSize,
    status: row.status,
  };
}

/** Builds a policy-specific Hackathon Analytics CSV. */
export async function buildHackathonAnalyticsExportFile(input: {
  kind:
    | "overview"
    | "applications"
    | "events"
    | "live_operations"
    | "audience"
    | "points_leaderboard"
    | "institutional_summary"
    | "sponsor";
  report: HackathonAnalyticsReportInput;
}) {
  const generatedAt = new Date();
  const sources = await loadHackathonAnalyticsSources(input.report.hackathonId);
  assertSelectedEventScope(sources, input.report.eventId);
  const externalSummary =
    input.kind === "institutional_summary" || input.kind === "sponsor";
  const effectiveReportInput = normalizeHackathonExportReportInput(
    input.kind,
    input.report,
  );
  const comparisonHackathon = effectiveReportInput.comparisonHackathonId
    ? (
        await db
          .select({
            displayName: Hackathon.displayName,
            id: Hackathon.id,
          })
          .from(Hackathon)
          .where(eq(Hackathon.id, effectiveReportInput.comparisonHackathonId))
          .limit(1)
      )[0]
    : null;
  if (
    effectiveReportInput.comparisonHackathonId !== null &&
    !comparisonHackathon
  ) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Comparison hackathon not found.",
    });
  }
  const report = buildHackathonAnalyticsReport(
    sources,
    builderInput(effectiveReportInput, generatedAt),
  );
  const compositions = new Map<
    HackathonAnalyticsDemographic,
    HackathonReport
  >();
  const demographics = externalSummary
    ? DOCUMENTED_HACKATHON_DEMOGRAPHICS
    : [input.report.demographic];
  const compositionCohort = effectiveReportInput.compositionCohort;
  demographics.forEach((demographic) => {
    compositions.set(
      demographic,
      buildHackathonAnalyticsReport(sources, {
        ...builderInput(effectiveReportInput, generatedAt),
        compositionCohort,
        demographic,
      }),
    );
  });
  const serialized = serializeHackathonAnalyticsExport({
    compositions,
    context: {
      comparisonHackathon,
      generatedAt,
      hackathon: sources.hackathon,
      reportInput: effectiveReportInput,
    },
    identifiedRows:
      input.kind === "points_leaderboard"
        ? buildHackathonIdentifiedRows(
            sources,
            builderInput(effectiveReportInput, generatedAt),
          )
        : undefined,
    kind: input.kind,
    report,
  });
  return {
    content: serialized.content,
    fileName: `${input.kind}-hackathon-analytics-${sources.hackathon.id}-${generatedAt.toISOString().slice(0, 10)}.csv`,
    mimeType: "text/csv;charset=utf-8" as const,
    rowCount: serialized.rowCount,
  };
}
