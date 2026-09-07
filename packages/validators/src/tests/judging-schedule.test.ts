import { describe, expect, it } from "vitest";

import { judgingScheduleTimingSchema } from "../judging-schedule";

const window = {
  startsAt: new Date("2026-10-04T16:00:00Z"),
  endsAt: new Date("2026-10-04T20:00:00Z"),
};

describe("judging schedule timing", () => {
  it("defaults to 2/6/2 with ten and twenty minute breaks", () => {
    expect(judgingScheduleTimingSchema.parse(window)).toMatchObject({
      setupMinutes: 2,
      judgingMinutes: 6,
      teardownMinutes: 2,
      sameBuildingBreakMinutes: 10,
      differentBuildingBreakMinutes: 20,
    });
  });
  it("accepts seven and twelve minute appointments", () => {
    for (const judgingMinutes of [3, 8])
      expect(
        judgingScheduleTimingSchema.safeParse({ ...window, judgingMinutes })
          .success,
      ).toBe(true);
  });
  it("rejects second-based times, fractional phases, invalid breaks and empty windows", () => {
    for (const override of [
      { startsAt: new Date("2026-10-04T16:00:30Z") },
      { setupMinutes: 0.5 },
      { judgingMinutes: 0 },
      { sameBuildingBreakMinutes: 0 },
      { differentBuildingBreakMinutes: 9 },
      { endsAt: window.startsAt },
    ])
      expect(
        judgingScheduleTimingSchema.safeParse({ ...window, ...override })
          .success,
      ).toBe(false);
  });
});
