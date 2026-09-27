import type {
  ReducedTravelBreak,
  SchedulePlacement,
  ScheduleProblem,
  ScheduleScore,
} from "./model";

export function scheduleProblemErrors(problem: ScheduleProblem): string[] {
  const errors: string[] = [];
  for (const value of [
    problem.durationMinutes,
    problem.windowMinutes,
    problem.sameBuildingBreakMinutes,
    problem.differentBuildingBreakMinutes,
  ]) {
    if (!Number.isSafeInteger(value) || value < 1)
      errors.push("Durations and breaks must be positive whole minutes.");
  }
  if (problem.differentBuildingBreakMinutes < problem.sameBuildingBreakMinutes)
    errors.push(
      "Cross-building breaks cannot be shorter than same-building breaks.",
    );
  if (
    new Set(problem.rooms.map((room) => room.id)).size !== problem.rooms.length
  )
    errors.push("Room IDs must be unique.");
  if (problem.rooms.some((room) => !room.buildingId || !room.challengeId))
    errors.push("Every room requires a building and a challenge.");
  if (
    new Set(
      problem.tasks.map((task) =>
        JSON.stringify([task.projectId, task.challengeId]),
      ),
    ).size !== problem.tasks.length
  )
    errors.push("Each project presents only once per challenge.");
  return errors;
}

/** Deliberately independent of search domains, pruning, and cached occupancy. */
export function validateSchedule(
  problem: ScheduleProblem,
  placements: SchedulePlacement[],
  relaxed: boolean,
) {
  const errors = scheduleProblemErrors(problem);
  const reducedBreaks: ReducedTravelBreak[] = [];
  const tasks = new Set<number>();
  const occupied = new Set<string>();
  const projectAppointments = new Map<string, SchedulePlacement[]>();
  if (placements.length !== problem.tasks.length)
    errors.push("Every required presentation must have an appointment.");
  for (const placement of placements) {
    const task = problem.tasks[placement.taskIndex];
    const room = problem.rooms[placement.roomIndex];
    if (
      !Number.isInteger(placement.taskIndex) ||
      !Number.isInteger(placement.roomIndex) ||
      !task ||
      !room
    ) {
      errors.push("Unknown project presentation or room.");
      continue;
    }
    if (tasks.has(placement.taskIndex))
      errors.push("A presentation has more than one appointment.");
    tasks.add(placement.taskIndex);
    if (room.challengeId !== task.challengeId)
      errors.push("The room judges a different challenge.");
    if (
      !Number.isInteger(placement.slot) ||
      placement.slot < 0 ||
      (placement.slot + 1) * problem.durationMinutes > problem.windowMinutes
    )
      errors.push("An appointment is outside the window or off the slot grid.");
    const cell = `${placement.roomIndex}:${placement.slot}`;
    if (occupied.has(cell)) errors.push("A room has overlapping appointments.");
    occupied.add(cell);
    const appointments = projectAppointments.get(task.projectId) ?? [];
    appointments.push(placement);
    projectAppointments.set(task.projectId, appointments);
  }
  for (const [projectId, appointments] of projectAppointments) {
    appointments.sort((a, b) => a.slot - b.slot);
    for (let index = 1; index < appointments.length; index += 1) {
      const before = appointments[index - 1];
      const after = appointments[index];
      if (!before || !after) continue;
      const gap = (after.slot - before.slot - 1) * problem.durationMinutes;
      const differentBuilding =
        problem.rooms[before.roomIndex]?.buildingId !==
        problem.rooms[after.roomIndex]?.buildingId;
      const strictMinimum = differentBuilding
        ? problem.differentBuildingBreakMinutes
        : problem.sameBuildingBreakMinutes;
      const minimum = relaxed
        ? problem.sameBuildingBreakMinutes
        : strictMinimum;
      if (gap < minimum)
        errors.push(
          `Project ${projectId} has insufficient time between appointments.`,
        );
      if (
        differentBuilding &&
        gap < strictMinimum &&
        gap >= problem.sameBuildingBreakMinutes
      ) {
        reducedBreaks.push({
          projectId,
          beforeTaskIndex: before.taskIndex,
          afterTaskIndex: after.taskIndex,
          breakMinutes: gap,
        });
      }
    }
  }
  return {
    errors: [...new Set(errors)],
    reducedBreaks,
    valid: errors.length === 0,
  };
}

export function scoreSchedule(
  problem: ScheduleProblem,
  placements: SchedulePlacement[],
): ScheduleScore {
  let sponsorFinish = 0;
  let overallFinish = 0;
  let sponsorIdle = 0;
  let buildingChanges = 0;
  let totalBreak = 0;
  const sponsorRooms = new Map<number, number[]>();
  const projects = new Map<string, SchedulePlacement[]>();
  for (const placement of placements) {
    const task = problem.tasks[placement.taskIndex];
    if (!task) throw new Error("Cannot score an unknown presentation.");
    const end = (placement.slot + 1) * problem.durationMinutes;
    overallFinish = Math.max(overallFinish, end);
    if (task.sponsor) {
      sponsorFinish = Math.max(sponsorFinish, end);
      const slots = sponsorRooms.get(placement.roomIndex) ?? [];
      slots.push(placement.slot);
      sponsorRooms.set(placement.roomIndex, slots);
    }
    const appointments = projects.get(task.projectId) ?? [];
    appointments.push(placement);
    projects.set(task.projectId, appointments);
  }
  for (const slots of sponsorRooms.values()) {
    sponsorIdle +=
      (Math.max(...slots) - Math.min(...slots) + 1 - slots.length) *
      problem.durationMinutes;
  }
  for (const appointments of projects.values()) {
    appointments.sort((a, b) => a.slot - b.slot);
    for (let index = 1; index < appointments.length; index += 1) {
      const before = appointments[index - 1];
      const after = appointments[index];
      if (!before || !after) continue;
      if (
        problem.rooms[before.roomIndex]?.buildingId !==
        problem.rooms[after.roomIndex]?.buildingId
      )
        buildingChanges += 1;
      totalBreak += (after.slot - before.slot - 1) * problem.durationMinutes;
    }
  }
  return [
    sponsorFinish,
    sponsorIdle,
    overallFinish,
    buildingChanges,
    -totalBreak,
  ];
}
