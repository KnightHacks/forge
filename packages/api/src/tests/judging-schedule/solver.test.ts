import { describe, expect, it } from "vitest";

import type {
  SchedulePlacement,
  ScheduleProblem,
  ScheduleScore,
} from "../../utils/judging-schedule/model";
import { compareScheduleScores } from "../../utils/judging-schedule/model";
import {
  advanceScheduleSearch,
  createScheduleSearch,
  scheduleCapacityErrors,
} from "../../utils/judging-schedule/solver";
import {
  scoreSchedule,
  validateSchedule,
} from "../../utils/judging-schedule/validate";

const problem: ScheduleProblem = {
  durationMinutes: 10,
  windowMinutes: 40,
  sameBuildingBreakMinutes: 10,
  differentBuildingBreakMinutes: 20,
  rooms: [
    { id: "general", challengeId: "general", buildingId: "ENG" },
    { id: "sponsor", challengeId: "sponsor", buildingId: "HEC" },
  ],
  tasks: [
    { projectId: "a", challengeId: "general", sponsor: false },
    { projectId: "a", challengeId: "sponsor", sponsor: true },
    { projectId: "b", challengeId: "general", sponsor: false },
  ],
};

/** Exhaustive Cartesian enumeration: no MRV, domains, pruning, or search state. */
function oracle(input: ScheduleProblem, relaxed: boolean) {
  let best: ScheduleScore | null = null;
  function enumerate(placements: SchedulePlacement[]) {
    if (placements.length === input.tasks.length) {
      if (!validateSchedule(input, placements, relaxed).valid) return;
      const score = scoreSchedule(input, placements);
      if (!best || compareScheduleScores(score, best) < 0) best = score;
      return;
    }
    for (let roomIndex = 0; roomIndex < input.rooms.length; roomIndex += 1) {
      for (
        let slot = 0;
        slot < Math.floor(input.windowMinutes / input.durationMinutes);
        slot += 1
      ) {
        enumerate([
          ...placements,
          { taskIndex: placements.length, roomIndex, slot },
        ]);
      }
    }
  }
  enumerate([]);
  return best;
}

function solve(input: ScheduleProblem, relaxed = false) {
  let state = createScheduleSearch(input, relaxed);
  for (let chunk = 0; chunk < 10_000 && !state.exhausted; chunk += 1) {
    advanceScheduleSearch(input, state, { maxNodes: 7, maxMilliseconds: 100 });
    // Every chunk must be resumable after database JSON serialization.
    state = JSON.parse(JSON.stringify(state)) as typeof state;
  }
  expect(state.exhausted).toBe(true);
  return state;
}

describe("judging schedule search", () => {
  it("matches a brute-force optimum across buildings, room choices, and fallback", () => {
    for (const crossBreak of [10, 20, 40]) {
      for (const relaxed of [false, true]) {
        for (const extraRoom of [false, true]) {
          const input = {
            ...problem,
            differentBuildingBreakMinutes: crossBreak,
            rooms: extraRoom
              ? [
                  ...problem.rooms,
                  { id: "sponsor2", challengeId: "sponsor", buildingId: "ENG" },
                ]
              : problem.rooms,
          };
          expect(solve(input, relaxed).score).toEqual(oracle(input, relaxed));
        }
      }
    }
  });

  it("does not confuse search budget exhaustion with infeasibility", () => {
    const state = createScheduleSearch(problem);
    advanceScheduleSearch(problem, state, {
      maxNodes: 1,
      maxMilliseconds: 100,
    });
    expect(state.exhausted).toBe(false);
    expect(state.incumbent).toBeNull();
    expect(state.relaxed).toBe(false);
  });

  it("proves strict infeasibility before trying a shorter cross-building gap", () => {
    const input = { ...problem, windowMinutes: 30 };
    expect(solve(input).incumbent).toBeNull();
    const relaxed = solve(input, true);
    expect(relaxed.incumbent).not.toBeNull();
    const result = validateSchedule(input, relaxed.incumbent ?? [], true);
    expect(result.valid).toBe(true);
    expect(result.reducedBreaks).toHaveLength(1);
    expect(validateSchedule(input, relaxed.incumbent ?? [], false).valid).toBe(
      false,
    );
  });

  it("finishes sponsors first even when General could otherwise finish earlier", () => {
    expect(solve(problem).score).toEqual([10, 0, 40, 1, -20]);
  });

  it("uses whole slot grids when the break is not a multiple of slot duration", () => {
    const input = {
      ...problem,
      durationMinutes: 7,
      windowMinutes: 29,
      differentBuildingBreakMinutes: 10,
    };
    const state = solve(input);
    expect(state.score).toEqual(oracle(input, false));
    expect(
      state.incumbent?.every((placement) => (placement.slot + 1) * 7 <= 29),
    ).toBe(true);
  });

  it("explains capacity limits at event scale without claiming a timeout is a proof", () => {
    const input = {
      ...problem,
      windowMinutes: 240,
      tasks: Array.from({ length: 250 }, (_, index) => ({
        projectId: String(index),
        challengeId: "general",
        sponsor: false,
      })),
    };
    expect(scheduleCapacityErrors(input)).toContain(
      "Challenge general requires 250 appointments but its staffed rooms fit 24.",
    );
    const state = createScheduleSearch(input);
    expect(state.exhausted).toBe(true);
    expect(state.nodes).toBe(0);
  });

  it("independently rejects collisions, omissions, wrong rooms, fractional slots and invalid breaks", () => {
    const valid = solve(problem).incumbent ?? [];
    expect(validateSchedule(problem, valid, false).valid).toBe(true);
    expect(validateSchedule(problem, valid.slice(1), false).errors).toContain(
      "Every required presentation must have an appointment.",
    );
    expect(
      validateSchedule(
        problem,
        valid.map((value) => ({ ...value, roomIndex: 0 })),
        false,
      ).errors,
    ).toContain("The room judges a different challenge.");
    expect(
      validateSchedule(
        problem,
        valid.map((value) => ({ ...value, slot: 0 })),
        false,
      ).valid,
    ).toBe(false);
    expect(
      validateSchedule(
        problem,
        valid.map((value) => ({ ...value, slot: value.slot + 0.1 })),
        false,
      ).errors,
    ).toContain("An appointment is outside the window or off the slot grid.");
  });
});
