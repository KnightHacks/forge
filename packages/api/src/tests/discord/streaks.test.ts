import { describe, expect, it } from "vitest";

import { calculateActivityStreaks } from "../../utils/discord/streaks";

describe("calculateActivityStreaks", () => {
  it("reports current and longest consecutive activity", () => {
    expect(
      calculateActivityStreaks(
        ["2026-08-01", "2026-08-02", "2026-08-04", "2026-08-05", "2026-08-06"],
        "2026-08-07",
      ),
    ).toEqual({ currentStreakDays: 3, longestStreakDays: 3 });
  });

  it("ends a current streak after a missed day", () => {
    expect(
      calculateActivityStreaks(
        ["2026-08-01", "2026-08-02", "2026-08-03"],
        "2026-08-07",
      ),
    ).toEqual({ currentStreakDays: 0, longestStreakDays: 3 });
  });

  it("deduplicates days and ignores invalid date keys", () => {
    expect(
      calculateActivityStreaks(
        ["2026-08-06", "2026-08-06", "not-a-date"],
        "2026-08-06",
      ),
    ).toEqual({ currentStreakDays: 1, longestStreakDays: 1 });
  });
});
