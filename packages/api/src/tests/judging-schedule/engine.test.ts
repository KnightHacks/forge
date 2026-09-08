import type { SolutionContext } from "@ortools-node/cp-sat";
import {
  CpSolver,
  CpSolverSolutionCallback,
  CpSolverStatus,
} from "@ortools-node/cp-sat";
import { afterEach, expect, it, vi } from "vitest";

import type { ScheduleProblem } from "../../utils/judging-schedule/model";
import {
  createScheduleSearch,
  runScheduleSearch,
} from "../../utils/judging-schedule/solver";

const problem: ScheduleProblem = {
  durationMinutes: 10,
  windowMinutes: 20,
  sameBuildingBreakMinutes: 10,
  differentBuildingBreakMinutes: 20,
  rooms: [{ id: "general", challengeId: "general", buildingId: "ENG" }],
  tasks: [{ projectId: "a", challengeId: "general", sponsor: false }],
};
afterEach(() => vi.restoreAllMocks());

it("retains a validated preview when the native binding fails", async () => {
  vi.spyOn(CpSolver.prototype, "solve").mockRejectedValueOnce(
    new Error("Native binding failed"),
  );
  const state = createScheduleSearch(problem);
  state.incumbent = [{ taskIndex: 0, roomIndex: 0, slot: 0 }];
  state.score = [0, 0, 10, 0, 0];
  const previous = structuredClone(state);
  await expect(
    runScheduleSearch(problem, state, {
      deadline: new Date(Date.now() + 5000),
    }),
  ).rejects.toThrow("Native binding failed");
  expect(state).toEqual(previous);
});

it("rejects an invalid native candidate without enabling reduced travel", async () => {
  const solve = vi.spyOn(CpSolver.prototype, "solve");
  solve.mockImplementationOnce(function (this: CpSolver, model, options) {
    class InvalidCandidate extends CpSolverSolutionCallback {
      onSolutionCallback(context: SolutionContext) {
        options?.callback?.onSolutionCallback({
          ...context,
          value: () => 100n,
        });
      }
    }
    solve.mockRestore();
    return this.solve(model, {
      ...options,
      callback: new InvalidCandidate(),
    });
  });
  const state = createScheduleSearch(problem);
  await expect(
    runScheduleSearch(problem, state, {
      deadline: new Date(Date.now() + 5000),
    }),
  ).rejects.toThrow("incorrect candidate score");
  expect(state).toEqual(createScheduleSearch(problem));
});

it("cancels an in-flight native solve when its lease is lost", async () => {
  const controller = new AbortController();
  const solve = vi.spyOn(CpSolver.prototype, "solve");
  solve.mockImplementationOnce(function (this: CpSolver, model, options) {
    solve.mockRestore();
    const execution = this.solve(model, options);
    controller.abort();
    return execution;
  });
  const state = createScheduleSearch(problem);
  await expect(
    runScheduleSearch(problem, state, {
      deadline: new Date(Date.now() + 5000),
      signal: controller.signal,
    }),
  ).rejects.toThrow("aborted");
  expect(state.exhausted).toBe(false);
  expect(state.relaxed).toBe(false);
});

it("uses eight workers and propagates the remaining deadline without blocking Node", async () => {
  let deadlineObserved = false;
  vi.spyOn(CpSolver.prototype, "numBranches", "get").mockReturnValue(0);
  vi.spyOn(CpSolver.prototype, "solve").mockImplementationOnce(async function (
    this: CpSolver,
    _model,
    options,
  ) {
    expect(this.parameters.numSearchWorkers).toBe(8);
    expect(this.parameters.maxTimeInSeconds).toBeLessThanOrEqual(0.1);
    await new Promise<void>((resolve) =>
      options?.signal?.addEventListener(
        "abort",
        () => {
          deadlineObserved = true;
          resolve();
        },
        { once: true },
      ),
    );
    return CpSolverStatus.UNKNOWN;
  });
  const state = createScheduleSearch(problem);
  await runScheduleSearch(problem, state, {
    deadline: new Date(Date.now() + 100),
  });
  expect(deadlineObserved).toBe(true);
  expect(state.exhausted).toBe(false);
  expect(state.relaxed).toBe(false);
});
