import { TRPCError } from "@trpc/server";

import { asc, eq, inArray } from "@forge/db";
import {
  JudgingAppointment,
  JudgingSchedule,
  ProjectEvaluation,
  ProjectMember,
} from "@forge/db/schemas/knight-hacks";

import type { WriteDb } from "../db";
import type { SchedulePlacement, ScheduleProblem } from "./model";
import { isSponsorChallenge } from "../projects/challenge-labels";
import { compareScheduleScores } from "./model";
import { readScheduleSource } from "./source";
import { scoreSchedule, validateSchedule } from "./validate";

export function appointmentStatus(
  appointment: { startsAt: Date; endsAt: Date },
  evaluations: { isComplete: boolean }[],
  now: Date,
) {
  if (evaluations.some((evaluation) => evaluation.isComplete))
    return "complete" as const;
  if (evaluations.length) return "incomplete" as const;
  if (now >= appointment.endsAt) return "missed" as const;
  if (now >= appointment.startsAt) return "pending" as const;
  return "future" as const;
}

export async function readSavedSchedule(
  tx: WriteDb,
  hackathonId: string,
  now = new Date(),
) {
  const schedule = await tx.query.JudgingSchedule.findFirst({
    where: eq(JudgingSchedule.hackathonId, hackathonId),
  });
  const source = await readScheduleSource(tx, hackathonId, now);
  if (!schedule)
    return { schedule: null, appointments: [], source, serverNow: now };
  const rows = await tx
    .select()
    .from(JudgingAppointment)
    .where(eq(JudgingAppointment.scheduleId, schedule.id))
    .orderBy(asc(JudgingAppointment.startsAt), asc(JudgingAppointment.roomId));
  const evaluations = await tx
    .select({
      projectId: ProjectEvaluation.projectId,
      challengeId: ProjectEvaluation.challengeId,
      isComplete: ProjectEvaluation.isComplete,
      appointmentId: ProjectEvaluation.appointmentId,
    })
    .from(ProjectEvaluation)
    .where(eq(ProjectEvaluation.hackathonId, hackathonId));
  const taskByKey = new Map(
    source.tasks.map((task) => [`${task.projectId}:${task.challengeId}`, task]),
  );
  const roomById = new Map(source.rooms.map((room) => [room.id, room]));
  const resultsByKey = new Map<string, typeof evaluations>();
  const resultAppointmentIds = new Set<string>();
  for (const evaluation of evaluations) {
    const key = `${evaluation.projectId}:${evaluation.challengeId}`;
    const results = resultsByKey.get(key) ?? [];
    results.push(evaluation);
    resultsByKey.set(key, results);
    if (evaluation.appointmentId)
      resultAppointmentIds.add(evaluation.appointmentId);
  }
  const appointments = rows.map((row) => {
    const key = `${row.projectId}:${row.challengeId}`;
    const task = taskByKey.get(key);
    const room = roomById.get(row.roomId);
    const results = resultsByKey.get(key) ?? [];
    const status = appointmentStatus(row, results, now);
    return {
      ...row,
      title: task?.title ?? "Unavailable project",
      challengeLabel: task?.challengeLabel ?? "Unavailable challenge",
      roomName: room?.name ?? "Unavailable room",
      buildingName: room?.buildingName ?? "No building",
      staffed: room?.staffed ?? false,
      status,
      canMove:
        !resultAppointmentIds.has(row.id) &&
        (row.startsAt >= now || status === "missed"),
    };
  });
  return { schedule, appointments, source, serverNow: now };
}

export async function appointmentMoveChoices(
  tx: WriteDb,
  hackathonId: string,
  appointmentId: string | null,
  now = new Date(),
  newTask?: { projectId: string; challengeId: string },
) {
  const saved = await readSavedSchedule(tx, hackathonId, now);
  if (newTask && saved.schedule) {
    const task = saved.source.tasks.find(
      (task) =>
        task.projectId === newTask.projectId &&
        task.challengeId === newTask.challengeId,
    );
    if (!task) throw new TRPCError({ code: "NOT_FOUND" });
    if (
      saved.appointments.some(
        (appointment) =>
          appointment.projectId === task.projectId &&
          appointment.challengeId === task.challengeId,
      )
    )
      throw new TRPCError({
        code: "CONFLICT",
        message: "This presentation already has an appointment.",
      });
    appointmentId = "unassigned";
    saved.appointments.push({
      id: appointmentId,
      ...newTask,
      hackathonId,
      scheduleId: saved.schedule.id,
      title: task.title,
      challengeLabel: task.challengeLabel,
      roomId: "",
      roomName: "Unassigned",
      buildingName: "",
      staffed: false,
      status: "missed",
      canMove: true,
      startsAt: new Date(0),
      deadlineAt: new Date(0),
      endsAt: new Date(0),
      createdAt: now,
      updatedAt: now,
      revision: 0,
    });
  }
  const selected = saved.appointments.find(
    (appointment) => appointment.id === appointmentId,
  );
  if (!saved.schedule || !selected) throw new TRPCError({ code: "NOT_FOUND" });
  if (!selected.canMove)
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Only future or missed appointments without a submitted result can move.",
    });
  const schedule = saved.schedule;
  const rooms = saved.source.rooms.flatMap((room) =>
    room.scheduled && room.buildingId
      ? [{ ...room, buildingId: room.buildingId }]
      : [],
  );
  const duration =
    schedule.setupMinutes + schedule.judgingMinutes + schedule.teardownMinutes;
  const problem: ScheduleProblem = {
    durationMinutes: duration,
    windowMinutes:
      (schedule.endsAt.getTime() - schedule.startsAt.getTime()) / 60_000,
    sameBuildingBreakMinutes: schedule.sameBuildingBreakMinutes,
    differentBuildingBreakMinutes: schedule.differentBuildingBreakMinutes,
    rooms: rooms.map(({ id, challengeId, buildingId }) => ({
      id,
      challengeId,
      buildingId,
    })),
    tasks: saved.appointments.map((appointment) => ({
      projectId: appointment.projectId,
      challengeId: appointment.challengeId,
      sponsor: isSponsorChallenge(appointment.challengeLabel),
    })),
  };
  const selectedIndex = saved.appointments.findIndex(
    (appointment) => appointment.id === selected.id,
  );
  const placements: SchedulePlacement[] = saved.appointments.map(
    (appointment, taskIndex) => ({
      taskIndex,
      roomIndex: rooms.findIndex((room) => room.id === appointment.roomId),
      slot:
        (appointment.startsAt.getTime() - schedule.startsAt.getTime()) /
        (duration * 60_000),
    }),
  );
  if (
    placements.some(
      (placement) =>
        placement.taskIndex !== selectedIndex && placement.roomIndex < 0,
    )
  )
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "An existing reservation has an unavailable room or building. Restore that location before reassigning.",
    });
  const choices: {
    roomId: string;
    roomName: string;
    buildingName: string;
    startsAt: Date;
    reducedBreakCount: number;
    score: ReturnType<typeof scoreSchedule>;
  }[] = [];
  for (
    let slot = 0;
    (slot + 1) * duration <= problem.windowMinutes;
    slot += 1
  ) {
    const startsAt = new Date(
      schedule.startsAt.getTime() + slot * duration * 60_000,
    );
    if (startsAt < now) continue;
    for (let roomIndex = 0; roomIndex < rooms.length; roomIndex += 1) {
      const room = rooms[roomIndex];
      if (
        !room?.staffed ||
        room.challengeId !== selected.challengeId ||
        (room.id === selected.roomId &&
          startsAt.getTime() === selected.startsAt.getTime())
      )
        continue;
      const candidate = placements.map((placement) =>
        placement.taskIndex === selectedIndex
          ? { taskIndex: selectedIndex, roomIndex, slot }
          : placement,
      );
      const validation = validateSchedule(problem, candidate, true);
      if (!validation.valid) continue;
      const reducedBreakCount = validation.reducedBreaks.filter(
        (gap) =>
          gap.beforeTaskIndex === selectedIndex ||
          gap.afterTaskIndex === selectedIndex,
      ).length;
      choices.push({
        roomId: room.id,
        roomName: room.name,
        buildingName: room.buildingName ?? "",
        startsAt,
        reducedBreakCount,
        score: scoreSchedule(problem, candidate),
      });
    }
  }
  // Existing accepted travel exceptions elsewhere are immutable. Only the two
  // transitions touching this reservation determine whether this move relaxes.
  const strict = choices.filter((choice) => choice.reducedBreakCount === 0);
  const eligible = strict.length ? strict : choices;
  eligible.sort(
    (a, b) =>
      compareScheduleScores(a.score, b.score) ||
      a.startsAt.getTime() - b.startsAt.getTime() ||
      a.roomId.localeCompare(b.roomId),
  );
  const members = await tx
    .select({ name: ProjectMember.name, email: ProjectMember.email })
    .from(ProjectMember)
    .where(eq(ProjectMember.projectId, selected.projectId))
    .orderBy(asc(ProjectMember.displayOrder));
  return {
    appointment: selected,
    members,
    choices: eligible,
    smartChoice: eligible[0] ?? null,
    schedule,
  };
}

export async function assertNoRoomReservations(tx: WriteDb, roomId: string) {
  const existing = await tx.query.JudgingAppointment.findFirst({
    columns: { id: true },
    where: eq(JudgingAppointment.roomId, roomId),
  });
  if (existing)
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "This room has saved appointments. Handle those reservations individually or drop the eligible schedule before changing its location or challenge.",
    });
}

export async function assertNoProjectReservations(
  tx: WriteDb,
  projectIds: string[],
) {
  if (!projectIds.length) return;
  const existing = await tx.query.JudgingAppointment.findFirst({
    columns: { id: true },
    where: inArray(JudgingAppointment.projectId, projectIds),
  });
  if (existing)
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "This project has saved appointments. Handle its reservations before removing it or changing its challenges.",
    });
}
