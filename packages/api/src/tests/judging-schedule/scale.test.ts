import { expect, it } from "vitest";

import type { ScheduleProblem } from "../../utils/judging-schedule/model";
import {
  createScheduleSearch,
  runScheduleSearch,
} from "../../utils/judging-schedule/solver";
import { validateSchedule } from "../../utils/judging-schedule/validate";

it("finds and independently validates a 200-project schedule within the generation budget", async () => {
  const problem: ScheduleProblem = {
    durationMinutes: 10,
    windowMinutes: 240,
    sameBuildingBreakMinutes: 10,
    differentBuildingBreakMinutes: 20,
    rooms: [
      ...Array.from({ length: 9 }, (_, index) => ({
        id: `general-${index}`,
        challengeId: "general",
        buildingId: "ENG",
      })),
      ...Array.from({ length: 2 }, (_, index) => ({
        id: `sponsor-${index}`,
        challengeId: "sponsor",
        buildingId: "HEC",
      })),
    ],
    tasks: Array.from({ length: 200 }, (_, index) => [
      { projectId: String(index), challengeId: "general", sponsor: false },
      ...(index < 40
        ? [{ projectId: String(index), challengeId: "sponsor", sponsor: true }]
        : []),
    ]).flat(),
  };
  const state = createScheduleSearch(problem);
  await runScheduleSearch(problem, state, {
    deadline: new Date(Date.now() + 20_000),
  });
  expect(
    state.incumbent,
    `No incumbent after ${state.nodes} nodes`,
  ).not.toBeNull();
  expect(validateSchedule(problem, state.incumbent ?? [], false).valid).toBe(
    true,
  );
  expect(state.score?.[0]).toBe(200);
}, 25_000);

it.each([32, 200])(
  "reaches sponsor and overall bounds with %i projects using the native model",
  async (projectCount) => {
    const problem: ScheduleProblem = {
      durationMinutes: 10,
      windowMinutes: 240,
      sameBuildingBreakMinutes: 10,
      differentBuildingBreakMinutes: 20,
      rooms: [
        ...Array.from({ length: 9 }, (_, index) => ({
          id: `general-${index}`,
          challengeId: "general",
          buildingId: "ENG",
        })),
        { id: "a", challengeId: "a", buildingId: "ENG" },
        { id: "b", challengeId: "b", buildingId: "ENG" },
      ],
      tasks: Array.from({ length: projectCount }, (_, index) => [
        { projectId: String(index), challengeId: "general", sponsor: false },
        ...(index < 9
          ? [
              { projectId: String(index), challengeId: "a", sponsor: true },
              { projectId: String(index), challengeId: "b", sponsor: true },
            ]
          : []),
      ]).flat(),
    };
    const state = createScheduleSearch(problem);
    await runScheduleSearch(problem, state, {
      deadline: new Date(Date.now() + 10_000),
    });
    expect(validateSchedule(problem, state.incumbent ?? [], false).valid).toBe(
      true,
    );
    // Nine appointments per sponsor room need 90 minutes, idle cannot be negative,
    // General needs ceil(projectCount / 9) slots across its nine rooms.
    expect(state.score?.slice(0, 3)).toEqual([
      90,
      0,
      Math.max(90, Math.ceil(projectCount / 9) * 10),
    ]);
  },
  15_000,
);
