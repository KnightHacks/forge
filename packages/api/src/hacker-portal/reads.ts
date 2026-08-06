import { and, asc, eq, isNull } from "@forge/db";
import { db } from "@forge/db/client";
import { User } from "@forge/db/schemas/auth";
import {
  Event,
  HackathonClass,
  HackerAttendee,
  HackerEventAttendee,
  HackerProfile,
  HackerProfileRevision,
} from "@forge/db/schemas/knight-hacks";

import type { HackerPortalContext } from "./trpc";
import {
  deriveAgeOnDate,
  getParticipantCapabilities,
  rankLeaderboardRows,
  toLeaderboardName,
} from "../utils/hacker-portal/policy";
import {
  agreementAcceptanceDto,
  agreementDto,
  applicationDto,
  loadActiveAgreements,
  loadAgreementAcceptances,
  loadParticipantApplication,
  loadParticipantProfile,
  loadResumeMetadata,
  profileDto,
  requirePortalHackathon,
} from "./data";
import { portalFailure } from "./trpc";

type AuthenticatedPortalContext = HackerPortalContext & {
  client: NonNullable<HackerPortalContext["client"]>;
  session: NonNullable<HackerPortalContext["session"]>;
};

export async function getPublicHackathon(ctx: HackerPortalContext) {
  if (!ctx.client) throw new Error("Portal client guard did not run.");
  const hackathon = await requirePortalHackathon(ctx.client.hackathonId);
  const agreements = await loadActiveAgreements(hackathon.id);
  return {
    agreements: agreements.map(agreementDto),
    applicationDeadline: hackathon.applicationDeadline.toISOString(),
    applicationOpen: hackathon.applicationOpen.toISOString(),
    applicationUrl: hackathon.applicationUrl,
    confirmationCapacity: hackathon.confirmationCapacity,
    confirmationDeadline: hackathon.confirmationDeadline.toISOString(),
    displayName: hackathon.displayName,
    endDate: hackathon.endDate.toISOString(),
    id: hackathon.id,
    name: hackathon.name,
    startDate: hackathon.startDate.toISOString(),
    theme: hackathon.theme,
    timezone: hackathon.timezone,
  };
}

export async function getPortalSession(ctx: HackerPortalContext) {
  if (!ctx.session) {
    return { authenticated: false, displayName: null, expiresAt: null };
  }
  const [user] = await db
    .select({ name: User.name })
    .from(User)
    .where(eq(User.id, ctx.session.userId))
    .limit(1);
  return {
    authenticated: true,
    displayName: user?.name ?? null,
    expiresAt: null,
  };
}

async function participantState(ctx: AuthenticatedPortalContext) {
  const [hackathon, profile, application] = await Promise.all([
    requirePortalHackathon(ctx.session.hackathonId),
    loadParticipantProfile(ctx.session.userId),
    loadParticipantApplication(ctx.session.userId, ctx.session.hackathonId),
  ]);
  const resume = await loadResumeMetadata(profile?.resumeUrl);
  return { application, hackathon, profile, resume };
}

export async function getApplicationContext(ctx: AuthenticatedPortalContext) {
  const state = await participantState(ctx);
  const agreements = await loadActiveAgreements(
    ctx.session.hackathonId,
    "application",
  );
  const agreementAcceptances = state.application
    ? await loadAgreementAcceptances(state.application.attendeeId)
    : [];
  const now = new Date();
  const editable = state.application
    ? getParticipantCapabilities({
        confirmationDeadline: state.hackathon.confirmationDeadline,
        now,
        start: state.hackathon.startDate,
        status: state.application.status,
      }).canEdit
    : now >= state.hackathon.applicationOpen &&
      now <= state.hackathon.applicationDeadline &&
      now < state.hackathon.startDate;
  return {
    application: state.application ? applicationDto(state.application) : null,
    agreementAcceptances: agreementAcceptances.map(agreementAcceptanceDto),
    agreements: agreements.map(agreementDto),
    editable,
    profile: state.profile ? profileDto(state.profile) : null,
    resume: state.resume,
  };
}

function action(
  name:
    | "apply"
    | "confirm"
    | "edit_application"
    | "edit_profile"
    | "get_check_in_pass"
    | "view_leaderboard"
    | "view_schedule"
    | "withdraw",
  allowed: boolean,
  reason: string | null,
) {
  return { action: name, allowed, reason: allowed ? null : reason };
}

export async function getDashboard(ctx: AuthenticatedPortalContext) {
  const state = await participantState(ctx);
  const now = new Date();
  const applicationOpen =
    now >= state.hackathon.applicationOpen &&
    now <= state.hackathon.applicationDeadline &&
    now < state.hackathon.startDate;
  const capabilities = state.application
    ? getParticipantCapabilities({
        confirmationDeadline: state.hackathon.confirmationDeadline,
        now,
        start: state.hackathon.startDate,
        status: state.application.status,
      })
    : null;
  const reason = state.application
    ? `status_${state.application.status}`
    : "application_missing";
  return {
    allowedActions: [
      action(
        "apply",
        !state.application && applicationOpen,
        applicationOpen ? reason : "application_closed",
      ),
      action("confirm", capabilities?.canConfirm ?? false, reason),
      action("edit_application", capabilities?.canEdit ?? false, reason),
      action("edit_profile", capabilities?.canEdit ?? false, reason),
      action("get_check_in_pass", capabilities?.canGetPass ?? false, reason),
      action(
        "view_leaderboard",
        capabilities?.canViewLeaderboard ?? false,
        reason,
      ),
      action("view_schedule", capabilities?.canViewSchedule ?? false, reason),
      action("withdraw", capabilities?.canWithdraw ?? false, reason),
    ],
    application: state.application ? applicationDto(state.application) : null,
    isMinorAtHackStart: state.profile
      ? (deriveAgeOnDate(state.profile.dob, state.hackathon.startDate) ?? 18) <
        18
      : null,
    profile: state.profile ? profileDto(state.profile) : null,
    resume: state.resume,
  };
}

async function requireApplicationWithStatuses(
  ctx: AuthenticatedPortalContext,
  statuses: readonly string[],
) {
  const application = await loadParticipantApplication(
    ctx.session.userId,
    ctx.session.hackathonId,
  );
  if (!application || !statuses.includes(application.status)) {
    portalFailure(
      "FORBIDDEN_STATUS",
      "This participant status cannot access that data.",
      {
        trpcCode: "FORBIDDEN",
      },
    );
  }
  return application;
}

export async function getSchedule(ctx: AuthenticatedPortalContext) {
  await requireApplicationWithStatuses(ctx, ["checkedin"]);
  const events = await db
    .select({
      description: Event.description,
      endAt: Event.end_datetime,
      id: Event.id,
      location: Event.location,
      name: Event.name,
      points: Event.points,
      purpose: Event.purpose,
      startAt: Event.start_datetime,
      tag: Event.tag,
    })
    .from(Event)
    .where(
      and(
        eq(Event.hackathonId, ctx.session.hackathonId),
        isNull(Event.deletionIntentAt),
      ),
    )
    .orderBy(asc(Event.start_datetime), asc(Event.name));
  return {
    events: events.map((event) => ({
      ...event,
      endAt: event.endAt.toISOString(),
      points: Math.max(0, event.points ?? 0),
      startAt: event.startAt.toISOString(),
    })),
  };
}

async function activeAttendance(ctx: AuthenticatedPortalContext) {
  const application = await requireApplicationWithStatuses(ctx, ["checkedin"]);
  return db
    .select({
      checkedInAt: HackerEventAttendee.checkedInAt,
      eventId: Event.id,
      eventName: Event.name,
      isInitialAttendance: HackerEventAttendee.isInitialAttendance,
      pointsAwarded: HackerEventAttendee.pointsAwarded,
    })
    .from(HackerEventAttendee)
    .innerJoin(
      Event,
      and(
        eq(Event.id, HackerEventAttendee.eventId),
        eq(Event.hackathonId, HackerEventAttendee.hackathonId),
      ),
    )
    .where(
      and(
        eq(HackerEventAttendee.hackerAttId, application.attendeeId),
        eq(HackerEventAttendee.hackathonId, ctx.session.hackathonId),
        isNull(HackerEventAttendee.voidedAt),
      ),
    )
    .orderBy(asc(HackerEventAttendee.checkedInAt));
}

export async function getMyAttendance(ctx: AuthenticatedPortalContext) {
  const rows = await activeAttendance(ctx);
  return {
    occurrences: rows
      .filter(
        (
          row,
        ): row is typeof row & {
          checkedInAt: Date;
          isInitialAttendance: boolean;
        } => row.checkedInAt !== null && row.isInitialAttendance !== null,
      )
      .map((row) => ({
        checkedInAt: row.checkedInAt.toISOString(),
        eventId: row.eventId,
        eventName: row.eventName,
        isInitialAttendance: row.isInitialAttendance,
        pointsAwarded: Math.max(0, row.pointsAwarded ?? 0),
      })),
  };
}

export async function getMyPoints(ctx: AuthenticatedPortalContext) {
  const rows = await activeAttendance(ctx);
  const entries = rows
    .filter(
      (row): row is typeof row & { checkedInAt: Date } =>
        row.checkedInAt !== null &&
        row.isInitialAttendance === true &&
        (row.pointsAwarded ?? 0) > 0,
    )
    .map((row) => ({
      awardedAt: row.checkedInAt.toISOString(),
      eventId: row.eventId,
      eventName: row.eventName,
      points: row.pointsAwarded ?? 0,
    }));
  return {
    entries,
    total: entries.reduce((sum, entry) => sum + entry.points, 0),
  };
}

export async function getLeaderboard(
  ctx: AuthenticatedPortalContext,
  input: { classId?: string; scope: "overall" | "class" },
) {
  if (input.scope === "class" && !input.classId) {
    portalFailure("FORBIDDEN", "Choose a valid hackathon class.", {
      trpcCode: "BAD_REQUEST",
    });
  }
  const selectedClassId = input.classId;
  if (input.scope === "class" && selectedClassId) {
    const [selectedClass] = await db
      .select({ id: HackathonClass.id })
      .from(HackathonClass)
      .where(
        and(
          eq(HackathonClass.id, selectedClassId),
          eq(HackathonClass.hackathonId, ctx.session.hackathonId),
          eq(HackathonClass.kind, "class"),
        ),
      )
      .limit(1);
    if (!selectedClass) {
      portalFailure("FORBIDDEN", "Choose a valid hackathon class.", {
        trpcCode: "BAD_REQUEST",
      });
    }
  }
  const viewer = await requireApplicationWithStatuses(ctx, [
    "confirmed",
    "checkedin",
  ]);
  const participants = await db
    .select({
      attendeeId: HackerAttendee.id,
      classId: HackerAttendee.classId,
      firstName: HackerProfileRevision.firstName,
      lastName: HackerProfileRevision.lastName,
      userId: HackerProfile.userId,
    })
    .from(HackerAttendee)
    .innerJoin(
      HackerProfileRevision,
      eq(HackerProfileRevision.id, HackerAttendee.profileRevisionId),
    )
    .innerJoin(HackerProfile, eq(HackerProfile.id, HackerAttendee.profileId))
    .where(
      and(
        eq(HackerAttendee.hackathonId, ctx.session.hackathonId),
        eq(HackerAttendee.status, "checkedin"),
        input.scope === "class" && selectedClassId
          ? eq(HackerAttendee.classId, selectedClassId)
          : undefined,
      ),
    );
  const attendance = await db
    .select({
      attendeeId: HackerEventAttendee.hackerAttId,
      points: HackerEventAttendee.pointsAwarded,
    })
    .from(HackerEventAttendee)
    .where(
      and(
        eq(HackerEventAttendee.hackathonId, ctx.session.hackathonId),
        eq(HackerEventAttendee.isInitialAttendance, true),
        isNull(HackerEventAttendee.voidedAt),
      ),
    );
  const totals = new Map<string, number>();
  for (const row of attendance) {
    totals.set(
      row.attendeeId,
      (totals.get(row.attendeeId) ?? 0) + Math.max(0, row.points ?? 0),
    );
  }
  const ranked = rankLeaderboardRows(
    participants.map((participant) => ({
      ...participant,
      id: participant.attendeeId,
      points: totals.get(participant.attendeeId) ?? 0,
    })),
  );
  const rows = ranked.map((row) => ({
    classId: row.classId,
    displayName: toLeaderboardName(row.firstName, row.lastName),
    isCurrentUser: row.userId === ctx.session.userId,
    points: row.points,
    rank: row.rank,
  }));
  return {
    rows,
    viewerRank:
      viewer.status === "checkedin"
        ? (rows.find((row) => row.isCurrentUser)?.rank ?? null)
        : null,
  };
}
