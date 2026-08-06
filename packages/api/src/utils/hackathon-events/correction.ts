import { TRPCError } from "@trpc/server";

import { and, eq, isNull, ne, sql } from "@forge/db";
import { db } from "@forge/db/client";
import {
  Event,
  Hackathon,
  Hacker,
  HackerAttendee,
  HackerEventAttendee,
} from "@forge/db/schemas/knight-hacks";

import type { AuditActor } from "../audit/service";
import type { TransactionDb } from "../db";
import { createAdminAuditEvent } from "../audit/service";

export interface CorrectHackathonEventAttendanceInput {
  attendanceId: string;
  hackathonId: string;
  operator: AuditActor;
  reason: string;
}

function attendanceNotFound(): never {
  throw new TRPCError({ code: "NOT_FOUND", message: "Attendance not found." });
}

function correctionConflict(message: string): never {
  throw new TRPCError({ code: "CONFLICT", message });
}

async function correctAttendanceInTransaction(
  tx: TransactionDb,
  input: CorrectHackathonEventAttendanceInput,
  reason: string,
  now: Date,
) {
  // Resolve only identifiers first. Every authoritative field is re-read after
  // the same lock sequence used by check-in: event, attendee, pair advisory.
  const [source] = await tx
    .select({
      eventId: HackerEventAttendee.eventId,
      hackerAttendeeId: HackerEventAttendee.hackerAttId,
    })
    .from(HackerEventAttendee)
    .where(
      and(
        eq(HackerEventAttendee.id, input.attendanceId),
        eq(HackerEventAttendee.hackathonId, input.hackathonId),
      ),
    )
    .limit(1);
  if (!source) {
    attendanceNotFound();
  }

  const [event] = await tx
    .select({
      hackathonId: Event.hackathonId,
      hackathonName: Hackathon.displayName,
      id: Event.id,
      name: Event.name,
      purpose: Event.purpose,
    })
    .from(Event)
    .innerJoin(Hackathon, eq(Hackathon.id, Event.hackathonId))
    .where(
      and(
        eq(Event.id, source.eventId),
        eq(Event.hackathonId, input.hackathonId),
      ),
    )
    .for("share")
    .limit(1);
  if (!event) {
    attendanceNotFound();
  }
  if (event.purpose === "primary_check_in") {
    correctionConflict(
      "Primary hackathon admission cannot be undone in this release.",
    );
  }

  const [attendee] = await tx
    .select({
      firstName: Hacker.firstName,
      id: HackerAttendee.id,
      lastName: Hacker.lastName,
    })
    .from(HackerAttendee)
    .innerJoin(Hacker, eq(Hacker.id, HackerAttendee.hackerId))
    .where(
      and(
        eq(HackerAttendee.id, source.hackerAttendeeId),
        eq(HackerAttendee.hackathonId, input.hackathonId),
      ),
    )
    .for("update")
    .limit(1);
  if (!attendee) {
    attendanceNotFound();
  }

  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`blade:hackathon-attendance:${event.id}:${attendee.id}`}, 0))`,
  );

  const [attendance] = await tx
    .select({
      checkedInAt: HackerEventAttendee.checkedInAt,
      id: HackerEventAttendee.id,
      isInitialAttendance: HackerEventAttendee.isInitialAttendance,
      pointsAwarded: HackerEventAttendee.pointsAwarded,
      voidedAt: HackerEventAttendee.voidedAt,
    })
    .from(HackerEventAttendee)
    .where(
      and(
        eq(HackerEventAttendee.id, input.attendanceId),
        eq(HackerEventAttendee.eventId, event.id),
        eq(HackerEventAttendee.hackerAttId, attendee.id),
        eq(HackerEventAttendee.hackathonId, input.hackathonId),
      ),
    )
    .for("update")
    .limit(1);
  if (!attendance) {
    attendanceNotFound();
  }
  if (attendance.voidedAt) {
    correctionConflict("Attendance was already corrected.");
  }
  if (
    attendance.checkedInAt === null ||
    attendance.isInitialAttendance === null ||
    attendance.pointsAwarded === null
  ) {
    correctionConflict(
      "Legacy attendance without a trustworthy occurrence and point snapshot cannot be corrected.",
    );
  }

  if (attendance.isInitialAttendance && attendance.pointsAwarded > 0) {
    const [activeRepeat] = await tx
      .select({ id: HackerEventAttendee.id })
      .from(HackerEventAttendee)
      .where(
        and(
          eq(HackerEventAttendee.eventId, event.id),
          eq(HackerEventAttendee.hackerAttId, attendee.id),
          eq(HackerEventAttendee.hackathonId, input.hackathonId),
          ne(HackerEventAttendee.id, attendance.id),
          isNull(HackerEventAttendee.voidedAt),
        ),
      )
      .limit(1);
    if (activeRepeat) {
      correctionConflict(
        "Void the later repeat occurrences before correcting the point-bearing first attendance.",
      );
    }
  }

  const [voided] = await tx
    .update(HackerEventAttendee)
    .set({
      voidReason: reason,
      voidedAt: now,
      voidedBy: input.operator.id,
    })
    .where(
      and(
        eq(HackerEventAttendee.id, attendance.id),
        isNull(HackerEventAttendee.voidedAt),
      ),
    )
    .returning({ id: HackerEventAttendee.id });
  if (!voided) {
    correctionConflict("Attendance was already corrected.");
  }

  const [updatedAttendee] = await tx
    .update(HackerAttendee)
    .set({
      points: sql`${HackerAttendee.points} - ${attendance.pointsAwarded}`,
    })
    .where(eq(HackerAttendee.id, attendee.id))
    .returning({ points: HackerAttendee.points });
  if (!updatedAttendee) {
    throw new Error("Attendance owner disappeared during correction.");
  }

  await createAdminAuditEvent(
    {
      actionKey: "hackathon_event.attendance_voided",
      actor: input.operator,
      metadata: {
        pointsReversed: attendance.pointsAwarded,
        reason,
      },
      occurredAt: now,
      subjects: [
        {
          relation: "primary",
          targetId: attendance.id,
          targetLabel: `${event.name} attendance`,
          targetType: "attendance",
        },
        {
          relation: "secondary",
          targetId: event.id,
          targetLabel: event.name,
          targetType: "event",
        },
        {
          relation: "secondary",
          targetId: attendee.id,
          targetLabel: `${attendee.firstName} ${attendee.lastName}`.trim(),
          targetType: "hacker_attendee",
        },
        {
          relation: "secondary",
          targetId: input.hackathonId,
          targetLabel: event.hackathonName,
          targetType: "hackathon",
        },
      ],
    },
    tx,
  );

  return {
    attendanceId: attendance.id,
    eventId: event.id,
    hackerAttendeeId: attendee.id,
    pointsRemaining: updatedAttendee.points,
    pointsReversed: attendance.pointsAwarded,
    status: "voided" as const,
    voidedAt: now,
  };
}

/**
 * Soft-voids one trustworthy ordinary-event occurrence and reverses exactly its
 * stored point snapshot. Permission enforcement belongs to the router; this
 * service owns scope, history, and transactional integrity.
 */
export async function correctHackathonEventAttendance(
  input: CorrectHackathonEventAttendanceInput,
  now = new Date(),
) {
  const reason = input.reason.trim();
  if (!reason || reason.length > 300) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A correction reason between 1 and 300 characters is required.",
    });
  }

  return db.transaction((tx) =>
    correctAttendanceInTransaction(tx, input, reason, now),
  );
}
