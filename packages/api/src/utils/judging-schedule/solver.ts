import type {
  SchedulePlacement,
  ScheduleProblem,
  ScheduleScore,
} from "./model";
import { compareScheduleScores, scheduleSlotCount } from "./model";
import {
  scheduleProblemErrors,
  scoreSchedule,
  validateSchedule,
} from "./validate";

interface SearchFrame {
  taskIndex: number;
  candidates: number[];
  next: number;
}

/** Plain JSON permits bounded request continuations without a resident worker. */
export interface ScheduleSearch {
  assignments: SchedulePlacement[];
  stack: SearchFrame[];
  incumbent: SchedulePlacement[] | null;
  score: ScheduleScore | null;
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
  return {
    assignments: [],
    stack: [],
    incumbent: null,
    score: null,
    nodes: 0,
    exhausted: diagnostics.length > 0,
    relaxed,
    diagnostics,
  };
}

function candidatesFor(
  problem: ScheduleProblem,
  search: ScheduleSearch,
  taskIndex: number,
  sponsorLimitMinutes = problem.windowMinutes,
) {
  const task = problem.tasks[taskIndex];
  if (!task) throw new Error("Unknown presentation in search.");
  const slots = scheduleSlotCount(problem);
  const candidates: number[] = [];
  const occupied = new Set(
    search.assignments.map(
      (assignment) => assignment.roomIndex * slots + assignment.slot,
    ),
  );
  const siblings = search.assignments.filter(
    (assignment) =>
      problem.tasks[assignment.taskIndex]?.projectId === task.projectId,
  );
  for (let slot = 0; slot < slots; slot += 1) {
    if (
      task.sponsor &&
      (slot + 1) * problem.durationMinutes >
        Math.min(
          search.score?.[0] ?? problem.windowMinutes,
          sponsorLimitMinutes,
        )
    )
      break;
    for (let roomIndex = 0; roomIndex < problem.rooms.length; roomIndex += 1) {
      const room = problem.rooms[roomIndex];
      if (
        room?.challengeId !== task.challengeId ||
        occupied.has(roomIndex * slots + slot)
      )
        continue;
      const valid = siblings.every((sibling) => {
        const differentBuilding =
          room.buildingId !== problem.rooms[sibling.roomIndex]?.buildingId;
        const minimum =
          differentBuilding && !search.relaxed
            ? problem.differentBuildingBreakMinutes
            : problem.sameBuildingBreakMinutes;
        return (
          (Math.abs(slot - sibling.slot) - 1) * problem.durationMinutes >=
          minimum
        );
      });
      if (valid) candidates.push(roomIndex * slots + slot);
    }
  }
  return candidates;
}

/** Minimum remaining values with forward checking; sponsor work wins ties. */
function nextFrame(
  problem: ScheduleProblem,
  search: ScheduleSearch,
  sponsorLimitMinutes?: number,
): SearchFrame | null {
  const assigned = new Set(
    search.assignments.map((assignment) => assignment.taskIndex),
  );
  let best: SearchFrame | null = null;
  for (let taskIndex = 0; taskIndex < problem.tasks.length; taskIndex += 1) {
    if (assigned.has(taskIndex)) continue;
    const candidates = candidatesFor(
      problem,
      search,
      taskIndex,
      sponsorLimitMinutes,
    );
    if (candidates.length === 0) return null;
    if (
      !best ||
      candidates.length < best.candidates.length ||
      (candidates.length === best.candidates.length &&
        problem.tasks[taskIndex]?.sponsor &&
        !problem.tasks[best.taskIndex]?.sponsor)
    ) {
      best = { taskIndex, candidates, next: 0 };
    }
  }
  return best;
}

function recordCandidate(problem: ScheduleProblem, search: ScheduleSearch) {
  const validation = validateSchedule(
    problem,
    search.assignments,
    search.relaxed,
  );
  if (!validation.valid)
    throw new Error(
      `Search produced an invalid schedule: ${validation.errors.join(" ")}`,
    );
  const score = scoreSchedule(problem, search.assignments);
  if (!search.score || compareScheduleScores(score, search.score) < 0) {
    search.incumbent = search.assignments.map((assignment) => ({
      ...assignment,
    }));
    search.score = score;
  }
}

/** Mutates only the private job checkpoint, never saved reservations. */
function advanceDepthFirstSearch(
  problem: ScheduleProblem,
  search: ScheduleSearch,
  limits: {
    maxNodes: number;
    maxMilliseconds: number;
    sponsorLimitMinutes?: number;
    stopAfterCandidate?: boolean;
  },
) {
  const stopAt = performance.now() + limits.maxMilliseconds;
  const stopNode = search.nodes + limits.maxNodes;
  const slots = scheduleSlotCount(problem);
  while (
    !search.exhausted &&
    search.nodes < stopNode &&
    performance.now() < stopAt
  ) {
    search.nodes += 1;
    if (search.assignments.length === problem.tasks.length) {
      recordCandidate(problem, search);
      if (limits.stopAfterCandidate) break;
      if (search.stack.length === 0) {
        search.exhausted = true;
        break;
      }
      search.assignments.pop();
    }
    if (search.stack.length === search.assignments.length) {
      const frame = nextFrame(problem, search, limits.sponsorLimitMinutes);
      if (frame) search.stack.push(frame);
      else if (search.stack.length === 0) {
        search.exhausted = true;
        break;
      } else search.assignments.pop();
    }
    const frame = search.stack.at(-1);
    if (!frame) {
      search.exhausted = true;
      break;
    }
    const candidate = frame.candidates[frame.next];
    if (candidate === undefined) {
      search.stack.pop();
      if (search.stack.length === 0) {
        search.exhausted = true;
        break;
      }
      search.assignments.pop();
      continue;
    }
    frame.next += 1;
    const slot = candidate % slots;
    if (
      problem.tasks[frame.taskIndex]?.sponsor &&
      search.score &&
      (slot + 1) * problem.durationMinutes > search.score[0]
    )
      continue;
    search.assignments.push({
      taskIndex: frame.taskIndex,
      roomIndex: Math.floor(candidate / slots),
      slot,
    });
  }
  return search;
}

/**
 * Try the sponsor capacity lower bound before exploring complete schedules.
 * Otherwise General permutations can hold the first sponsor prefix in place
 * for factorial time. Failure of this bounded probe proves nothing; the full
 * resumable search still covers the original window and decides infeasibility.
 */
export function advanceScheduleSearch(
  problem: ScheduleProblem,
  search: ScheduleSearch,
  limits: { maxNodes: number; maxMilliseconds: number },
) {
  const started = performance.now();
  let remainingNodes = limits.maxNodes;
  if (!search.exhausted && search.nodes === 0) {
    const sponsorCounts = new Map<string, number>();
    for (const task of problem.tasks) {
      if (task.sponsor)
        sponsorCounts.set(
          task.challengeId,
          (sponsorCounts.get(task.challengeId) ?? 0) + 1,
        );
    }
    const sponsorLimitMinutes = Math.max(
      0,
      ...[...sponsorCounts].map(
        ([challengeId, count]) =>
          Math.ceil(
            count /
              problem.rooms.filter((room) => room.challengeId === challengeId)
                .length,
          ) * problem.durationMinutes,
      ),
    );
    const probe = createScheduleSearch(problem, search.relaxed);
    advanceDepthFirstSearch(problem, probe, {
      maxNodes: Math.min(
        remainingNodes,
        Math.max(500, problem.tasks.length * 2),
      ),
      maxMilliseconds: Math.min(250, limits.maxMilliseconds / 2),
      sponsorLimitMinutes,
      stopAfterCandidate: true,
    });
    remainingNodes -= probe.nodes;
    search.nodes += probe.nodes;
    if (probe.incumbent) {
      search.incumbent = probe.incumbent;
      search.score = probe.score;
    }
  }
  return advanceDepthFirstSearch(problem, search, {
    maxNodes: Math.max(0, remainingNodes),
    maxMilliseconds: Math.max(
      0,
      limits.maxMilliseconds - (performance.now() - started),
    ),
  });
}
