import { describe, expect, it } from "vitest";

import {
  assertSelectedEventScope,
  resolveHackathonAnalyticsOptions,
} from "../../utils/analytics/hackathon-report.server";

const option = (id: string, start: string, end: string) => ({
  applicationDeadline: new Date(start),
  applicationOpen: new Date(start),
  confirmationDeadline: new Date(start),
  displayName: id,
  endDate: new Date(end),
  id,
  startDate: new Date(start),
});

describe("Hackathon Analytics option resolution", () => {
  it("chooses active, then latest past, then earliest future deterministically", () => {
    const active = [
      option("b", "2026-10-01T00:00:00Z", "2026-10-05T00:00:00Z"),
      option("a", "2026-10-01T00:00:00Z", "2026-10-05T00:00:00Z"),
      option("past", "2025-10-01T00:00:00Z", "2025-10-05T00:00:00Z"),
    ];
    expect(
      resolveHackathonAnalyticsOptions(active, new Date("2026-10-03T00:00:00Z"))
        .defaultHackathonId,
    ).toBe("a");
    expect(
      resolveHackathonAnalyticsOptions(
        active.filter((row) => row.id === "past"),
        new Date("2026-10-03T00:00:00Z"),
      ).defaultHackathonId,
    ).toBe("past");
    expect(
      resolveHackathonAnalyticsOptions(
        [option("future", "2027-10-01T00:00:00Z", "2027-10-05T00:00:00Z")],
        new Date("2026-10-03T00:00:00Z"),
      ).defaultHackathonId,
    ).toBe("future");
  });

  it("returns the immediately previous hackathon and an empty state", () => {
    const rows = [
      option("new", "2026-10-01T00:00:00Z", "2026-10-05T00:00:00Z"),
      option("old", "2025-10-01T00:00:00Z", "2025-10-05T00:00:00Z"),
    ];
    const resolved = resolveHackathonAnalyticsOptions(
      rows,
      new Date("2026-10-03T00:00:00Z"),
    );
    expect(resolved.comparisonByHackathonId).toEqual({ new: "old", old: null });
    expect(
      resolveHackathonAnalyticsOptions([], new Date()).defaultHackathonId,
    ).toBeNull();
  });

  it("keeps synthetic Portal fixtures out of organizer selectors", () => {
    const rows = [
      option("Knight Hacks IX", "2026-10-01T00:00:00Z", "2026-10-05T00:00:00Z"),
      {
        ...option("portal", "2026-11-01T00:00:00Z", "2026-11-05T00:00:00Z"),
        displayName: "Portal a1b2c3",
      },
    ];
    const resolved = resolveHackathonAnalyticsOptions(
      rows,
      new Date("2026-12-01T00:00:00Z"),
    );
    expect(resolved.options.map((row) => row.displayName)).toEqual([
      "Knight Hacks IX",
    ]);
  });
});

describe("Hackathon Analytics child scope", () => {
  it("returns NOT_FOUND for an event outside the selected hackathon", () => {
    expect(() =>
      assertSelectedEventScope({ events: [] }, "outside-event"),
    ).toThrowError(
      expect.objectContaining({
        code: "NOT_FOUND",
      }),
    );
  });
});
