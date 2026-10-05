import { describe, expect, it } from "vitest";

import type { HackerScheduleDto } from "@forge/hacker-sdk/contracts";

import { getCurrentEvents } from "./current-events";

function event(
  id: string,
  startAt: string,
  endAt: string,
): HackerScheduleDto["events"][number] {
  return {
    id,
    startAt,
    endAt,
    name: id,
    location: "Student Union",
    description: "",
    points: 0,
    purpose: "event",
    tag: "Workshop",
  };
}

describe("dashboard current events", () => {
  const now = Date.parse("2026-10-05T04:00:00Z");

  it("includes a starting event, excludes finished/future events, and sorts simultaneous events by ending time", () => {
    const events = [
      event("starts-now", "2026-10-05T04:00:00Z", "2026-10-05T05:00:00Z"),
      event("ends-now", "2026-10-05T03:00:00Z", "2026-10-05T04:00:00Z"),
      event("future", "2026-10-05T04:00:00.001Z", "2026-10-05T05:00:00Z"),
      event(
        "overnight",
        "2026-10-04T23:30:00-04:00",
        "2026-10-05T00:30:00-04:00",
      ),
    ];
    expect(getCurrentEvents(events, now).map(({ id }) => id)).toEqual([
      "overnight",
      "starts-now",
    ]);
    expect(events[0]?.id).toBe("starts-now");
  });

  it("returns empty when nothing is running, including invalid or zero-length events", () => {
    expect(getCurrentEvents([], now)).toEqual([]);
    expect(
      getCurrentEvents(
        [
          event("old", "2026-10-04T02:00:00Z", "2026-10-04T03:00:00Z"),
          event("invalid", "bad-date", "2026-10-05T05:00:00Z"),
          event("instant", "2026-10-05T04:00:00Z", "2026-10-05T04:00:00Z"),
        ],
        now,
      ),
    ).toEqual([]);
  });

  it("drops an event when its end time is reached", () => {
    const active = [
      event("workshop", "2026-10-05T04:00:00Z", "2026-10-05T05:00:00Z"),
    ];
    expect(getCurrentEvents(active, now)).toHaveLength(1);
    expect(
      getCurrentEvents(active, Date.parse("2026-10-05T05:00:00Z")),
    ).toEqual([]);
  });
});
