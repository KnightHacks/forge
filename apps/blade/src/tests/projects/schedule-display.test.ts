import { describe, expect, it } from "vitest";

import {
  judgingWindowMinutes,
  judgingWindowStart,
} from "~/lib/judging/schedule-display";

const start = new Date("2026-09-07T16:03:00Z");
describe("whole-slot judging window", () => {
  it.each([7, 10, 12])(
    "advances only at a %i-minute appointment boundary relative to the configured start",
    (duration) => {
      const end = new Date(start.getTime() + duration * 60_000);
      expect(
        judgingWindowStart(start, new Date(end.getTime() - 1), duration),
      ).toEqual(start);
      expect(judgingWindowStart(start, end, duration)).toEqual(end);
      expect(
        judgingWindowStart(start, new Date(end.getTime() + 1), duration),
      ).toEqual(end);
    },
  );
  it.each([7, 12, 45, 90])(
    "navigates a full displayed grid for %i-minute appointments",
    (duration) => {
      const minutes = judgingWindowMinutes(duration);
      const next = new Date(start.getTime() + minutes * 60_000);
      expect(minutes).toBeGreaterThanOrEqual(60);
      expect(minutes % duration).toBe(0);
      expect(judgingWindowStart(start, next, duration)).toEqual(next);
      expect(
        judgingWindowStart(
          start,
          new Date(next.getTime() - minutes * 60_000),
          duration,
        ),
      ).toEqual(start);
    },
  );
  it("aligns manual navigation to the same reservation grid", () => {
    expect(
      judgingWindowStart(start, new Date("2026-09-07T17:03:00Z"), 7),
    ).toEqual(new Date("2026-09-07T16:59:00Z"));
    expect(
      judgingWindowStart(start, new Date("2026-09-07T16:02:59Z"), 7),
    ).toEqual(new Date("2026-09-07T15:56:00Z"));
  });
});
