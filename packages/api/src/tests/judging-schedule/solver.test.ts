import { describe, expect, it } from "vitest";

import type {
  SchedulePlacement,
  ScheduleProblem,
  ScheduleScore,
} from "../../utils/judging-schedule/model";
import {
  scheduleCandidateKey,
  scheduleSearchSchema,
} from "../../utils/judging-schedule/checkpoint";
import { compareScheduleScores } from "../../utils/judging-schedule/model";
import {
  createScheduleSearch,
  runScheduleSearch,
  scheduleCapacityErrors,
  validateScheduleSearch,
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
function oracle(
  input: ScheduleProblem,
  relaxed: boolean,
): ScheduleScore | null {
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

async function solve(input: ScheduleProblem, relaxed = false) {
  const state = createScheduleSearch(input, relaxed);
  await runScheduleSearch(input, state, {
    deadline: new Date(Date.now() + 10_000),
  });
  expect(state.exhausted).toBe(true);
  return state;
}

describe("judging schedule search", () => {
  it("matches a brute-force optimum across buildings, room choices, and fallback", async () => {
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
          expect((await solve(input, relaxed)).score).toEqual(
            oracle(input, relaxed) ?? oracle(input, true),
          );
        }
      }
    }
  }, 20_000);

  it("matches the oracle for a three-stop itinerary and handles an empty workload", async () => {
    const input = {
      ...problem,
      windowMinutes: 70,
      rooms: [
        ...problem.rooms,
        { id: "second", challengeId: "second", buildingId: "ENG" },
      ],
      tasks: [
        ...problem.tasks.filter((task) => task.projectId === "a"),
        { projectId: "a", challengeId: "second", sponsor: true },
      ],
    };
    expect((await solve(input)).score).toEqual(oracle(input, false));
    const empty = await solve({ ...problem, tasks: [] });
    expect(empty.incumbent).toEqual([]);
    expect(empty.provenObjectives).toEqual([0, 0, 0, 0, 0]);
  });

  it("preserves the optimum with reordered equivalent rooms and unused rooms", async () => {
    const rooms = [
      ...problem.rooms,
      { id: "general2", challengeId: "general", buildingId: "ENG" },
      { id: "unused", challengeId: "unused", buildingId: "HS" },
    ];
    const expected = oracle({ ...problem, rooms }, false);
    for (const ordering of [rooms, [...rooms].reverse()]) {
      const state = await solve({ ...problem, rooms: ordering });
      expect(state.score).toEqual(expected);
      expect(state.provenObjectives).toEqual(expected);
    }
  });

  it("does not confuse search budget exhaustion with infeasibility", async () => {
    const state = createScheduleSearch(problem);
    await runScheduleSearch(problem, state, {
      deadline: new Date(Date.now() - 1),
    });
    expect(state.exhausted).toBe(false);
    expect(state.incumbent).toBeNull();
    expect(state.relaxed).toBe(false);
  });

  it("proves strict infeasibility before trying a shorter cross-building gap", async () => {
    const input = { ...problem, windowMinutes: 30 };
    expect(oracle(input, false)).toBeNull();
    const relaxed = await solve(input);
    expect(relaxed.relaxed).toBe(true);
    expect(relaxed.incumbent).not.toBeNull();
    const result = validateSchedule(input, relaxed.incumbent ?? [], true);
    expect(result.valid).toBe(true);
    expect(result.reducedBreaks).toHaveLength(1);
    expect(validateSchedule(input, relaxed.incumbent ?? [], false).valid).toBe(
      false,
    );
  });

  it("finishes sponsors first even when General could otherwise finish earlier", async () => {
    expect((await solve(problem)).score).toEqual([10, 0, 40, 1, -20]);
  });

  it("uses whole slot grids when the break is not a multiple of slot duration", async () => {
    const input = {
      ...problem,
      durationMinutes: 7,
      windowMinutes: 29,
      differentBuildingBreakMinutes: 10,
    };
    const state = await solve(input);
    expect(state.score).toEqual(oracle(input, false));
    expect(
      state.incumbent?.every((placement) => (placement.slot + 1) * 7 <= 29),
    ).toBe(true);
  });

  it("recovers proved objectives and accepts legacy candidates without changing their review key", async () => {
    const completed = await solve(problem);
    const legacy = {
      ...completed,
      assignments: [],
      stack: [],
      exhausted: false,
      provenObjectives: undefined,
    };
    const recovered = scheduleSearchSchema.parse(
      JSON.parse(JSON.stringify(legacy)),
    );
    expect(recovered.provenObjectives).toEqual([]);
    expect(scheduleCandidateKey(recovered)).toBe(
      scheduleCandidateKey(completed),
    );
    recovered.provenObjectives = completed.provenObjectives.slice(0, 3);
    await runScheduleSearch(problem, recovered, {
      deadline: new Date(Date.now() + 10_000),
    });
    expect(recovered.score).toEqual(completed.score);
    expect(recovered.provenObjectives).toEqual(completed.score);
    expect(recovered.exhausted).toBe(true);
    expect(() =>
      validateScheduleSearch(problem, { ...completed, score: [0, 0, 0, 0, 0] }),
    ).toThrow("incorrect candidate score");
    expect(() =>
      validateScheduleSearch(problem, { ...completed, provenObjectives: [0] }),
    ).toThrow("proved objectives");
    expect(() =>
      validateScheduleSearch(problem, { ...completed, provenObjectives: [] }),
    ).toThrow("all five objective proofs");
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

  it("independently rejects collisions, omissions, wrong rooms, fractional slots and invalid breaks", async () => {
    const valid = (await solve(problem)).incumbent ?? [];
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
