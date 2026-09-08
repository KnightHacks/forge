export interface ScheduleRoom {
  id: string;
  challengeId: string;
  buildingId: string;
}

export interface ScheduleTask {
  projectId: string;
  challengeId: string;
  sponsor: boolean;
}

/** All offsets and durations are integer minutes relative to the window start. */
export interface ScheduleProblem {
  durationMinutes: number;
  windowMinutes: number;
  sameBuildingBreakMinutes: number;
  differentBuildingBreakMinutes: number;
  rooms: ScheduleRoom[];
  tasks: ScheduleTask[];
}

export interface SchedulePlacement {
  taskIndex: number;
  roomIndex: number;
  slot: number;
}

/** Lexicographic minimization. The last entry is negative total breathing time. */
export type ScheduleScore = [number, number, number, number, number];

export interface ReducedTravelBreak {
  projectId: string;
  beforeTaskIndex: number;
  afterTaskIndex: number;
  breakMinutes: number;
}

export function scheduleSlotCount(problem: ScheduleProblem) {
  return Math.floor(problem.windowMinutes / problem.durationMinutes);
}

export function compareScheduleScores(
  left: ScheduleScore,
  right: ScheduleScore,
) {
  for (let index = 0; index < left.length; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}
