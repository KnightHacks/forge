import type {
  SchedulePlacement,
  ScheduleProblem,
  ScheduleScore,
} from "./model";
import { scheduleProblemSchema } from "./checkpoint";
import { compareScheduleScores, scheduleSlotCount } from "./model";
import {
  scheduleProblemErrors,
  scoreSchedule,
  validateSchedule,
} from "./validate";

/** Persist results and proofs, never native process state or credentials. */
export interface ScheduleSearch {
  incumbent: SchedulePlacement[] | null;
  score: ScheduleScore | null;
  provenObjectives: number[];
  nodes: number;
  exhausted: boolean;
  relaxed: boolean;
  diagnostics: string[];
}

/** These are necessary conditions, never a heuristic claim of infeasibility. */
export function scheduleCapacityErrors(problem: ScheduleProblem) {
  const errors = scheduleProblemErrors(problem);
  if (errors.length) return errors;
  const challengeCounts = new Map<string, number>();
  const projectCounts = new Map<string, number>();
  for (const task of problem.tasks) {
    challengeCounts.set(
      task.challengeId,
      (challengeCounts.get(task.challengeId) ?? 0) + 1,
    );
    projectCounts.set(
      task.projectId,
      (projectCounts.get(task.projectId) ?? 0) + 1,
    );
  }
  const slots = scheduleSlotCount(problem);
  for (const [challenge, count] of challengeCounts) {
    const rooms = problem.rooms.filter(
      (room) => room.challengeId === challenge,
    ).length;
    if (count > rooms * slots)
      errors.push(
        `Challenge ${challenge} requires ${count} appointments but its staffed rooms fit ${rooms * slots}.`,
      );
  }
  const gapSlots = Math.ceil(
    problem.sameBuildingBreakMinutes / problem.durationMinutes,
  );
  for (const [project, count] of projectCounts) {
    if (count + (count - 1) * gapSlots > slots)
      errors.push(
        `Project ${project} cannot fit ${count} presentations with the minimum break.`,
      );
  }
  return errors;
}

export function createScheduleSearch(
  problem: ScheduleProblem,
  relaxed = false,
): ScheduleSearch {
  const diagnostics = scheduleCapacityErrors(problem);
  const empty = !diagnostics.length && !problem.tasks.length;
  return {
    incumbent: empty ? [] : null,
    score: empty ? [0, 0, 0, 0, 0] : null,
    provenObjectives: empty ? [0, 0, 0, 0, 0] : [],
    nodes: 0,
    exhausted: diagnostics.length > 0 || empty,
    relaxed,
    diagnostics,
  };
}

/** Shared by native callbacks and recovery from stored checkpoints. */
export function validateScheduleSearch(
  problem: ScheduleProblem,
  search: ScheduleSearch,
) {
  if (search.incumbent) {
    const validation = validateSchedule(
      problem,
      search.incumbent,
      search.relaxed,
    );
    if (!validation.valid) throw new Error(validation.errors.join(" "));
    const score = scoreSchedule(problem, search.incumbent);
    if (!search.score || compareScheduleScores(score, search.score) !== 0)
      throw new Error("The solver reported an incorrect candidate score.");
    if (search.provenObjectives.some((value, index) => value !== score[index]))
      throw new Error("The candidate does not match its proved objectives.");
  } else if (search.score || search.provenObjectives.length) {
    throw new Error(
      "The solver reported objectives without a complete candidate.",
    );
  }
  if (
    search.exhausted &&
    search.incumbent &&
    search.provenObjectives.length !== 5
  )
    throw new Error(
      "The solver reported optimality without all five objective proofs.",
    );
}

/** Keep native loading and computation out of unrelated API requests. */
export async function runScheduleSearch(
  problem: ScheduleProblem,
  search: ScheduleSearch,
  options: { deadline: Date; signal?: AbortSignal },
) {
  scheduleProblemSchema.parse(problem);
  validateScheduleSearch(problem, search);
  if (search.exhausted || Date.now() >= options.deadline.getTime()) return;
  options.signal?.throwIfAborted();
  const { solveCpSat } = await import("./cp-sat");
  await solveCpSat(problem, search, options);
}
