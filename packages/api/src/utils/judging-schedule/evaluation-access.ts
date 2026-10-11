import { TRPCError } from "@trpc/server";

import { and, desc, eq, gt, isNull, lte } from "@forge/db";
import {
  JudgingAppointment,
  JudgingRoom,
  JudgingRoomPresence,
  JudgingSchedule,
  ProjectChallenge,
  ProjectEvaluation,
} from "@forge/db/schemas/knight-hacks";

import type { WriteDb } from "../db";

export async function evaluationTimingAccess(
  tx: WriteDb,
  input: {
    hackathonId: string;
    judgeId: string | null;
    projectId: string;
    challengeId: string;
  },
  now = new Date(),
) {
  const schedule = await tx.query.JudgingSchedule.findFirst({
    where: eq(JudgingSchedule.hackathonId, input.hackathonId),
  });
  const existing = input.judgeId
    ? await tx.query.ProjectEvaluation.findFirst({
        where: and(
          eq(ProjectEvaluation.hackathonId, input.hackathonId),
          eq(ProjectEvaluation.projectId, input.projectId),
          eq(ProjectEvaluation.challengeId, input.challengeId),
          eq(ProjectEvaluation.judgeId, input.judgeId),
        ),
      })
    : undefined;
  const base = {
    serverNow: now,
    appointmentId: existing?.appointmentId ?? null,
    deadlineAt: null as Date | null,
    lockAt: null as Date | null,
    evaluationId: existing?.id ?? null,
    evaluationRevision: existing?.revision ?? 0,
    isComplete: existing?.isComplete ?? false,
  };
  if (!schedule) return { ...base, canEdit: true, reason: null, timed: false };
  const challenge = await tx.query.ProjectChallenge.findFirst({
    columns: { isScheduled: true },
    where: and(
      eq(ProjectChallenge.id, input.challengeId),
      eq(ProjectChallenge.hackathonId, input.hackathonId),
    ),
  });
  if (!challenge) throw new TRPCError({ code: "NOT_FOUND" });
  const [presence] = input.judgeId
    ? await tx
        .select({
          roomId: JudgingRoom.id,
          challengeId: JudgingRoom.challengeId,
        })
        .from(JudgingRoomPresence)
        .innerJoin(JudgingRoom, eq(JudgingRoom.id, JudgingRoomPresence.roomId))
        .where(
          and(
            eq(JudgingRoomPresence.judgeId, input.judgeId),
            eq(JudgingRoomPresence.hackathonId, input.hackathonId),
            isNull(JudgingRoomPresence.leftAt),
            isNull(JudgingRoom.archivedAt),
          ),
        )
        .limit(1)
    : [];
  const current = presence
    ? await tx.query.JudgingAppointment.findFirst({
        where: and(
          eq(JudgingAppointment.scheduleId, schedule.id),
          eq(JudgingAppointment.roomId, presence.roomId),
          lte(JudgingAppointment.startsAt, now),
          gt(JudgingAppointment.endsAt, now),
        ),
      })
    : undefined;
  const past = presence
    ? await tx.query.JudgingAppointment.findFirst({
        where: and(
          eq(JudgingAppointment.scheduleId, schedule.id),
          eq(JudgingAppointment.roomId, presence.roomId),
          eq(JudgingAppointment.projectId, input.projectId),
          eq(JudgingAppointment.challengeId, input.challengeId),
          lte(JudgingAppointment.endsAt, now),
        ),
        orderBy: desc(JudgingAppointment.endsAt),
      })
    : undefined;
  if (existing) {
    return {
      ...base,
      canEdit: true,
      reason: null,
      timed: false,
    };
  }
  // Unscheduled challenges remain untimed, but a judge cannot evade their currently occupied
  // scheduled room by selecting an unrelated challenge in the project browser.
  if (!challenge.isScheduled && !current)
    return { ...base, canEdit: true, reason: null, timed: false };
  if (presence?.challengeId !== input.challengeId)
    return {
      ...base,
      canEdit: false,
      reason: "Join the assigned room to evaluate this project.",
      timed: true,
    };
  const active =
    current?.projectId === input.projectId &&
    current.challengeId === input.challengeId
      ? current
      : undefined;
  if (!active && !past)
    return {
      ...base,
      canEdit: false,
      reason:
        "This project can be evaluated during or after its appointment in your room.",
      timed: true,
    };
  if (!active)
    return {
      ...base,
      appointmentId: past?.id ?? null,
      canEdit: true,
      reason: null,
      timed: false,
    };
  return {
    ...base,
    appointmentId: active.id,
    deadlineAt: now < active.deadlineAt ? active.deadlineAt : null,
    canEdit: true,
    reason: null,
    timed: now < active.deadlineAt,
  };
}

export function requireEvaluationTiming(
  access: Awaited<ReturnType<typeof evaluationTimingAccess>>,
) {
  if (!access.canEdit)
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: access.reason ?? "This evaluation is unavailable right now.",
    });
  return access;
}
