import { describe, expect, it } from "vitest";

import {
  flattenCheckInHistoryPages,
  showHackathonRepeatControl,
} from "~/app/_components/admin/hackathon-events/hackathon-check-in-workspace";

describe("hackathon check-in history pagination", () => {
  it("keeps every fetched page in newest-first page order", () => {
    expect(
      flattenCheckInHistoryPages([
        { rows: [{ attemptId: "newest" }, { attemptId: "newer" }] },
        { rows: [{ attemptId: "older" }] },
      ]),
    ).toEqual([
      { attemptId: "newest" },
      { attemptId: "newer" },
      { attemptId: "older" },
    ]);
  });

  it("starts empty before the first history page arrives", () => {
    expect(flattenCheckInHistoryPages(undefined)).toEqual([]);
  });

  it("only exposes repeat attendance at scanner stations", () => {
    expect(showHackathonRepeatControl(false, "scanner")).toBe(true);
    expect(showHackathonRepeatControl(false, "manual")).toBe(false);
    expect(showHackathonRepeatControl(true, "scanner")).toBe(false);
  });
});
