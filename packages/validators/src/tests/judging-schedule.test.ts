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
  it("accepts total appointment lengths of seven and twelve minutes with two-minute setup and teardown", () => {
    for (const judgingMinutes of [3, 8])
      expect(
        judgingScheduleTimingSchema.safeParse({ ...window, judgingMinutes })
          .success,
      ).toBe(true);
  });
  it("accepts whole-minute phases and breaks beyond the former arbitrary caps", () => {
    expect(
      judgingScheduleTimingSchema.parse({
        ...window,
        setupMinutes: 61,
        judgingMinutes: 121,
        teardownMinutes: 58,
        sameBuildingBreakMinutes: 300,
        differentBuildingBreakMinutes: 400,
      }),
    ).toMatchObject({
      setupMinutes: 61,
      judgingMinutes: 121,
      sameBuildingBreakMinutes: 300,
    });
    expect(
      judgingScheduleTimingSchema.safeParse({
        ...window,
        setupMinutes: Number.MAX_SAFE_INTEGER,
        judgingMinutes: Number.MAX_SAFE_INTEGER,
      }).success,
    ).toBe(false);
  });
  it("bounds the derived grid and persisted integer fields before generation", () => {
    expect(
      judgingScheduleTimingSchema.safeParse({
        startsAt: window.startsAt,
        endsAt: new Date("2126-10-04T16:00:00Z"),
        setupMinutes: 0,
        judgingMinutes: 1,
        teardownMinutes: 0,
      }).success,
    ).toBe(false);
    expect(
      judgingScheduleTimingSchema.safeParse({
        ...window,
        sameBuildingBreakMinutes: 2147483648,
        differentBuildingBreakMinutes: 2147483648,
      }).success,
    ).toBe(false);
    expect(
      judgingScheduleTimingSchema.safeParse({
        ...window,
        endsAt: new Date("2026-10-06T16:00:00Z"),
        judgingMinutes: 8,
      }).success,
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
