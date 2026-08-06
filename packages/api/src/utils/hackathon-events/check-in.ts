import { TRPCError } from "@trpc/server";

import type { HackathonEventCheckInInput } from "@forge/validators";
import { and, asc, count, eq, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { User } from "@forge/db/schemas/auth";
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
import { parseHackathonQrPayload } from "@forge/validators";

import type { AuditActor, AuditSubjectInput } from "../audit/service";
import { createAdminAuditEvent } from "../audit/service";

const FAILURE_RETENTION_MS = 30 * 24 * 60 * 60 * 1_000;
const CHECK_IN_TIME_ZONE = "America/New_York";

type CheckInOutcome =
  | "already_checked_in"
  | "checked_in"
  | "hacker_not_found"
  | "invalid_qr"
  | "not_checked_in"
  | "not_ready"
  | "wrong_class"
  | "wrong_status";

function calendarDateParts(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(value);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    day: Number(map.day),
    month: Number(map.month),
    year: Number(map.year),
  };
}

export function isMinorAt(dob: string, at: Date) {
  const [year, month, day] = dob.split("-").map(Number);
  const current = calendarDateParts(at, CHECK_IN_TIME_ZONE);
  let age = current.year - (year ?? current.year);
  if (
    current.month < (month ?? current.month) ||
    (current.month === month && current.day < (day ?? current.day))
  ) {
    age -= 1;
  }
  return age < 18;
}

interface ResolvedHacker {
  attendeeId: string;
  checkedInAt: Date | null;
  classId: string | null;
  discordUserId: string;
  dob: string;
  firstName: string;
  hackerId: string;
  isFirstTime: boolean | null;
  isVip: boolean;
  lastName: string;
  profileIsFirstTime: boolean | null;
  status: string;
  userId: string;
}

function publicIdentity(hacker: ResolvedHacker) {
  return {
    attendeeId: hacker.attendeeId,
    dateOfBirth: hacker.dob,
    name: `${hacker.firstName} ${hacker.lastName}`.trim(),
  };
}

export function hackathonCheckInAuditSubjects({
  attendanceId,
  attemptId,
  event,
  hacker,
  hackathon,
}: {
  attendanceId: string | null;
  attemptId: string;
  event: { id: string; name: string };
  hacker: { attendeeId: string; name: string } | null;
  hackathon: { id: string; name: string };
}): AuditSubjectInput[] {
  const related: AuditSubjectInput[] = [
    ...(hacker
      ? [
          {
            relation: "secondary" as const,
            targetId: event.id,
            targetLabel: event.name,
            targetType: "event" as const,
          },
        ]
      : []),
    {
      relation: "secondary",
      targetId: hackathon.id,
      targetLabel: hackathon.name,
      targetType: "hackathon",
    },
    ...(attendanceId
      ? [
          {
            relation: "secondary" as const,
            targetId: attendanceId,
            targetLabel: hacker
              ? `${event.name} attendance for ${hacker.name}`
              : `${event.name} attendance`,
            targetType: "attendance" as const,
          },
        ]
      : []),
    {
      relation: "secondary",
      targetId: attemptId,
      targetLabel: hacker
        ? `Check-in attempt for ${hacker.name}`
        : "Unresolved check-in attempt",
      targetType: "check_in_attempt",
    },
  ];

  return [
    hacker
      ? {
          relation: "primary",
          targetId: hacker.attendeeId,
          targetLabel: hacker.name,
          targetType: "hacker_attendee",
        }
      : {
          relation: "primary",
          targetId: event.id,
          targetLabel: event.name,
          targetType: "event",
        },
    ...related,
  ];
}

export async function performHackathonEventCheckIn({
  actor,
  input,
  now = new Date(),
}: {
  actor: AuditActor;
  input: HackathonEventCheckInInput;
  now?: Date;
}) {
  const internal = await db.transaction(async (tx) => {
    const [event] = await tx
      .select({
        deletionIntentAt: Event.deletionIntentAt,
        hackathonId: Event.hackathonId,
        hackathonName: Hackathon.displayName,
        id: Event.id,
        legacy: Event.legacy,
        name: Event.name,
        points: Event.points,
        publishedAt: Event.publishedAt,
        purpose: Event.purpose,
      })
      .from(Event)
      .innerJoin(Hackathon, eq(Hackathon.id, Event.hackathonId))
      .where(
        and(
          eq(Event.id, input.eventId),
          eq(Event.hackathonId, input.hackathonId),
        ),
      )
      .for("share")
      .limit(1);
    if (!event) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
    }
    if (event.deletionIntentAt || (!event.legacy && !event.publishedAt)) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This event is not ready for check-in.",
      });
    }

    const qr =
      input.source === "scanner"
        ? parseHackathonQrPayload(input.qrPayload)
        : null;
    const resolveBy =
      input.source === "manual"
        ? eq(HackerAttendee.id, input.attendeeId)
        : qr
          ? eq(Hacker.userId, qr.userId)
          : undefined;

    let hacker: ResolvedHacker | null = null;
    if (resolveBy) {
      const [row] = await tx
        .select({
          attendeeId: HackerAttendee.id,
          checkedInAt: HackerAttendee.checkedInAt,
          classId: HackerAttendee.classId,
          discordUserId: User.discordUserId,
          dob: Hacker.dob,
          firstName: Hacker.firstName,
          hackerId: Hacker.id,
          isFirstTime: HackerAttendee.isFirstTime,
          isVip: HackerAttendee.isVip,
          lastName: Hacker.lastName,
          profileIsFirstTime: Hacker.isFirstTime,
          status: HackerAttendee.status,
          userId: Hacker.userId,
        })
        .from(HackerAttendee)
        .innerJoin(Hacker, eq(Hacker.id, HackerAttendee.hackerId))
        .innerJoin(User, eq(User.id, Hacker.userId))
        .where(
          and(eq(HackerAttendee.hackathonId, input.hackathonId), resolveBy),
        )
        .for("update", { of: HackerAttendee })
        .limit(1);
      hacker = row ?? null;
    }

    const expiresAt = new Date(now.getTime() + FAILURE_RETENTION_MS);
    const writeAttempt = async ({
      attendanceId = null,
      classRecord = null,
      hackerRecord = hacker,
      isRepeatOccurrence = false,
      outcome,
      pointsAwarded = 0,
    }: {
      attendanceId?: string | null;
      classRecord?: { color: string; id: string; name: string } | null;
      hackerRecord?: ResolvedHacker | null;
      isRepeatOccurrence?: boolean;
      outcome: CheckInOutcome;
      pointsAwarded?: number;
    }) => {
      const successful = outcome === "checked_in";
      const [attempt] = await tx
        .insert(HackerCheckInAttempt)
        .values({
          attendanceId,
          attemptedAt: now,
          classColorSnapshot: classRecord?.color ?? null,
          classId: classRecord?.id ?? null,
          classNameSnapshot: classRecord?.name ?? null,
          eventId: event.id,
          eventNameSnapshot: event.name,
          eventPurpose: event.purpose,
          expiresAt: successful ? null : expiresAt,
          hackerAttendeeId: hackerRecord?.attendeeId ?? null,
          hackerNameSnapshot: hackerRecord
            ? `${hackerRecord.firstName} ${hackerRecord.lastName}`.trim()
            : null,
          hackathonId: input.hackathonId,
          isRepeatOccurrence,
          isVipSnapshot: hackerRecord?.isVip ?? false,
          mode: input.source,
          operatorDisplayNameSnapshot: actor.name ?? null,
          operatorId: actor.id,
          outcome,
          pointsAwarded,
          wasMinorAtAttempt: hackerRecord
            ? isMinorAt(hackerRecord.dob, now)
            : null,
        })
        .returning({ id: HackerCheckInAttempt.id });
      if (!attempt) throw new Error("Check-in attempt insertion failed.");
      await createAdminAuditEvent(
        {
          actionKey: "hackathon_event.checked_in",
          actor,
          metadata: {
            method: input.source,
            outcome,
            pointsAwarded,
            purpose: event.purpose,
            repeatAllowed:
              input.source === "scanner" ? input.allowRepeat : false,
          },
          subjects: hackathonCheckInAuditSubjects({
            attendanceId,
            attemptId: attempt.id,
            event,
            hacker: hackerRecord
              ? {
                  attendeeId: hackerRecord.attendeeId,
                  name: `${hackerRecord.firstName} ${hackerRecord.lastName}`.trim(),
                }
              : null,
            hackathon: {
              id: input.hackathonId,
              name: event.hackathonName,
            },
          }),
        },
        tx,
      );
      return attempt.id;
    };

    if (input.source === "scanner" && !qr) {
      const attemptId = await writeAttempt({
        hackerRecord: null,
        outcome: "invalid_qr",
      });
      return {
        attemptId,
        discordUserId: null,
        hackerAttendeeId: null,
        result: { status: "invalid_qr" as const },
      };
    }
    if (!hacker) {
      const attemptId = await writeAttempt({
        hackerRecord: null,
        outcome: "hacker_not_found",
      });
      return {
        attemptId,
        discordUserId: null,
        hackerAttendeeId: null,
        result: { status: "hacker_not_found" as const },
      };
    }

    const existingClass = hacker.classId
      ? await tx.query.HackathonClass.findFirst({
          columns: { color: true, id: true, name: true },
          where: and(
            eq(HackathonClass.id, hacker.classId),
            eq(HackathonClass.hackathonId, input.hackathonId),
            eq(HackathonClass.kind, "class"),
          ),
        })
      : null;

    if (event.purpose === "primary_check_in") {
      if (hacker.status === "checkedin") {
        const attemptId = await writeAttempt({
          classRecord: existingClass,
          outcome: "already_checked_in",
        });
        return {
          attemptId,
          discordUserId: hacker.discordUserId,
          hackerAttendeeId: hacker.attendeeId,
          result: {
            ...publicIdentity(hacker),
            checkedInAt: hacker.checkedInAt,
            class: existingClass,
            firstTimeStatus:
              (hacker.isFirstTime ?? hacker.profileIsFirstTime) === true
                ? ("first" as const)
                : (hacker.isFirstTime ?? hacker.profileIsFirstTime) === false
                  ? ("returning" as const)
                  : ("unknown" as const),
            isVip: hacker.isVip,
            pointsAwarded: 0,
            status: "already_checked_in" as const,
            wasMinorAtAttempt: isMinorAt(hacker.dob, now),
          },
        };
      }
      if (hacker.status !== "confirmed") {
        const attemptId = await writeAttempt({
          classRecord: existingClass,
          outcome: "wrong_status",
        });
        return {
          attemptId,
          discordUserId: null,
          hackerAttendeeId: hacker.attendeeId,
          result: {
            ...publicIdentity(hacker),
            currentStatus: hacker.status,
            status: "wrong_status" as const,
            wasMinorAtAttempt: isMinorAt(hacker.dob, now),
          },
        };
      }

      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`blade:hackathon-allocation:${input.hackathonId}`}, 0))`,
      );
      const [hackathonConfig] = await tx
        .select({
          displayName: Hackathon.displayName,
          generalRoleId: Hackathon.generalHackerDiscordRoleId,
        })
        .from(Hackathon)
        .where(eq(Hackathon.id, input.hackathonId))
        .for("share")
        .limit(1);
      const classes = await tx
        .select({
          color: HackathonClass.color,
          discordRoleId: HackathonClass.discordRoleId,
          id: HackathonClass.id,
          kind: HackathonClass.kind,
          name: HackathonClass.name,
        })
        .from(HackathonClass)
        .where(eq(HackathonClass.hackathonId, input.hackathonId))
        .orderBy(asc(HackathonClass.id));
      const normalClasses = classes.filter((entry) => entry.kind === "class");
      const vipEntry = classes.find((entry) => entry.kind === "vip") ?? null;
      if (
        !hackathonConfig?.generalRoleId ||
        normalClasses.length === 0 ||
        (hacker.isVip && !vipEntry)
      ) {
        const attemptId = await writeAttempt({ outcome: "not_ready" });
        return {
          attemptId,
          discordUserId: null,
          hackerAttendeeId: hacker.attendeeId,
          result: {
            ...publicIdentity(hacker),
            status: "not_ready" as const,
            wasMinorAtAttempt: isMinorAt(hacker.dob, now),
          },
        };
      }
      const counts = await tx
        .select({ classId: HackerAttendee.classId, value: count() })
        .from(HackerAttendee)
        .where(
          and(
            eq(HackerAttendee.hackathonId, input.hackathonId),
            eq(HackerAttendee.status, "checkedin"),
          ),
        )
        .groupBy(HackerAttendee.classId);
      const countByClass = new Map(
        counts.map((entry) => [entry.classId, entry.value]),
      );
      const assigned = [...normalClasses].sort(
        (left, right) =>
          (countByClass.get(left.id) ?? 0) -
            (countByClass.get(right.id) ?? 0) ||
          left.id.localeCompare(right.id),
      )[0];
      if (!assigned) throw new Error("Configured class selection failed.");

      // The application answer is the canonical per-hack snapshot. The
      // reusable Hacker profile is only a bridge for legacy attendees whose
      // snapshot has not been recorded yet.
      const firstTime = hacker.isFirstTime ?? hacker.profileIsFirstTime;
      await tx
        .update(HackerAttendee)
        .set({
          checkedInAt: now,
          checkedInBy: actor.id,
          classId: assigned.id,
          isFirstTime: firstTime,
          points: sql`${HackerAttendee.points} + ${event.points ?? 0}`,
          status: "checkedin",
        })
        .where(eq(HackerAttendee.id, hacker.attendeeId));
      if (hacker.profileIsFirstTime === true && firstTime !== null) {
        await tx
          .update(Hacker)
          .set({ isFirstTime: false })
          .where(eq(Hacker.id, hacker.hackerId));
      }
      const [attendance] = await tx
        .insert(HackerEventAttendee)
        .values({
          checkedInAt: now,
          checkedInBy: actor.id,
          eventId: event.id,
          hackerAttId: hacker.attendeeId,
          hackathonId: input.hackathonId,
          isInitialAttendance: true,
          pointsAwarded: event.points ?? 0,
        })
        .returning({ id: HackerEventAttendee.id });
      if (!attendance) throw new Error("Attendance insertion failed.");
      const attemptId = await writeAttempt({
        attendanceId: attendance.id,
        classRecord: assigned,
        outcome: "checked_in",
        pointsAwarded: event.points ?? 0,
      });
      const desiredRoles = [
        {
          kind: "general" as const,
          roleId: hackathonConfig.generalRoleId,
        },
        { kind: "class" as const, roleId: assigned.discordRoleId },
        ...(hacker.isVip && vipEntry
          ? [{ kind: "vip" as const, roleId: vipEntry.discordRoleId }]
          : []),
      ];
      for (const desired of desiredRoles) {
        await tx
          .insert(HackerDiscordRoleGrant)
          .values({
            desiredRoleId: desired.roleId,
            hackerAttendeeId: hacker.attendeeId,
            hackathonId: input.hackathonId,
            kind: desired.kind,
            sourceAttendanceId: attendance.id,
            sourceEventId: event.id,
          })
          .onConflictDoUpdate({
            set: {
              desiredRoleId: desired.roleId,
              lastError: null,
              sourceAttendanceId: attendance.id,
              sourceEventId: event.id,
              state: "pending",
              succeededAt: null,
            },
            target: [
              HackerDiscordRoleGrant.hackerAttendeeId,
              HackerDiscordRoleGrant.kind,
            ],
          });
      }
      return {
        attemptId,
        discordUserId: hacker.discordUserId,
        hackerAttendeeId: hacker.attendeeId,
        result: {
          ...publicIdentity(hacker),
          checkedInAt: now,
          class: {
            color: assigned.color,
            id: assigned.id,
            name: assigned.name,
          },
          firstTimeStatus:
            firstTime === true
              ? ("first" as const)
              : firstTime === false
                ? ("returning" as const)
                : ("unknown" as const),
          isVip: hacker.isVip,
          pointsAwarded: event.points ?? 0,
          status: "checked_in" as const,
          wasMinorAtAttempt: isMinorAt(hacker.dob, now),
        },
      };
    }

    if (hacker.status !== "checkedin") {
      const attemptId = await writeAttempt({
        classRecord: existingClass,
        outcome: "not_checked_in",
      });
      return {
        attemptId,
        discordUserId: null,
        hackerAttendeeId: hacker.attendeeId,
        result: {
          ...publicIdentity(hacker),
          status: "not_checked_in" as const,
          wasMinorAtAttempt: isMinorAt(hacker.dob, now),
        },
      };
    }
    const calledClass = input.calledClassId
      ? await tx.query.HackathonClass.findFirst({
          columns: { color: true, id: true, name: true },
          where: and(
            eq(HackathonClass.id, input.calledClassId),
            eq(HackathonClass.hackathonId, input.hackathonId),
            eq(HackathonClass.kind, "class"),
          ),
        })
      : null;
    if (input.calledClassId && !calledClass) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Class not found." });
    }
    if (calledClass && hacker.classId !== calledClass.id && !hacker.isVip) {
      const attemptId = await writeAttempt({
        classRecord: existingClass,
        outcome: "wrong_class",
      });
      return {
        attemptId,
        discordUserId: null,
        hackerAttendeeId: hacker.attendeeId,
        result: {
          ...publicIdentity(hacker),
          class: existingClass,
          isVip: hacker.isVip,
          status: "wrong_class" as const,
          wasMinorAtAttempt: isMinorAt(hacker.dob, now),
        },
      };
    }
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`blade:hackathon-attendance:${event.id}:${hacker.attendeeId}`}, 0))`,
    );
    const attendanceHistory = await tx
      .select({
        id: HackerEventAttendee.id,
        isInitialAttendance: HackerEventAttendee.isInitialAttendance,
        voidedAt: HackerEventAttendee.voidedAt,
      })
      .from(HackerEventAttendee)
      .where(
        and(
          eq(HackerEventAttendee.eventId, event.id),
          eq(HackerEventAttendee.hackerAttId, hacker.attendeeId),
        ),
      );
    const hasActiveAttendance = attendanceHistory.some(
      ({ voidedAt }) => voidedAt === null,
    );
    // Pre-migration attendance may not have isInitialAttendance populated.
    // The existence of any historical occurrence is enough to prevent a
    // second points award after a void/correction or a repeat scan.
    const hasHistoricalAttendance = attendanceHistory.length > 0;
    const repeatAllowed =
      input.source === "scanner" ? input.allowRepeat : false;
    if (hasActiveAttendance && !repeatAllowed) {
      const attemptId = await writeAttempt({
        classRecord: existingClass,
        outcome: "already_checked_in",
      });
      return {
        attemptId,
        discordUserId: null,
        hackerAttendeeId: hacker.attendeeId,
        result: {
          ...publicIdentity(hacker),
          class: existingClass,
          isVip: hacker.isVip,
          pointsAwarded: 0,
          status: "already_checked_in" as const,
          wasMinorAtAttempt: isMinorAt(hacker.dob, now),
        },
      };
    }
    const pointsAwarded = hasHistoricalAttendance ? 0 : (event.points ?? 0);
    const [attendance] = await tx
      .insert(HackerEventAttendee)
      .values({
        checkedInAt: now,
        checkedInBy: actor.id,
        eventId: event.id,
        hackerAttId: hacker.attendeeId,
        hackathonId: input.hackathonId,
        isInitialAttendance: !hasHistoricalAttendance,
        pointsAwarded,
      })
      .returning({ id: HackerEventAttendee.id });
    if (!attendance) throw new Error("Attendance insertion failed.");
    if (pointsAwarded !== 0) {
      await tx
        .update(HackerAttendee)
        .set({ points: sql`${HackerAttendee.points} + ${pointsAwarded}` })
        .where(eq(HackerAttendee.id, hacker.attendeeId));
    }
    const attemptId = await writeAttempt({
      attendanceId: attendance.id,
      classRecord: existingClass,
      isRepeatOccurrence: hasHistoricalAttendance,
      outcome: "checked_in",
      pointsAwarded,
    });
    return {
      attemptId,
      discordUserId: null,
      hackerAttendeeId: hacker.attendeeId,
      result: {
        ...publicIdentity(hacker),
        checkedInAt: now,
        class: existingClass,
        isRepeatOccurrence: hasHistoricalAttendance,
        isVip: hacker.isVip,
        pointsAwarded,
        status: "checked_in" as const,
        wasMinorAtAttempt: isMinorAt(hacker.dob, now),
      },
    };
  });

  return internal;
}
