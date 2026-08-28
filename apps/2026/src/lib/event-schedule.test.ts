import { describe, expect, it } from "vitest";

import type { PortalScheduleEvent } from "./event-schedule";
import { formatScheduleTimeRange, groupScheduleByDay } from "./event-schedule";

function event(
  id: string,
  startAt: string,
  endAt: string,
): PortalScheduleEvent {
  return {
    description: "",
    endDateTime: new Date(endAt),
    id,
    location: "Pegasus Ballroom",
    name: `Event ${id}`,
    points: 10,
    purpose: "event",
    startDateTime: new Date(startAt),
    tag: "Workshop",
  };
}

describe("KH IX event schedule presentation", () => {
  it("sorts events and groups them by the hackathon-local day", () => {
    const days = groupScheduleByDay(
      [
        event("late", "2026-10-10T15:00:00.000Z", "2026-10-10T16:00:00.000Z"),
        event("first", "2026-10-10T03:30:00.000Z", "2026-10-10T04:00:00.000Z"),
        event("next", "2026-10-10T05:30:00.000Z", "2026-10-10T06:00:00.000Z"),
      ],
      "America/New_York",
    );

    expect(days).toHaveLength(2);
    expect(days[0]).toMatchObject({
      dateLabel: "Friday, October 9",
      key: "2026-10-09",
    });
    expect(days[0]?.events.map(({ id }) => id)).toEqual(["first"]);
    expect(days[1]?.events.map(({ id }) => id)).toEqual(["next", "late"]);
  });

  it("formats same-day and overnight time ranges in the hackathon timezone", () => {
    expect(
      formatScheduleTimeRange(
        new Date("2026-10-10T15:00:00.000Z"),
        new Date("2026-10-10T16:30:00.000Z"),
        "America/New_York",
      ),
    ).toBe("11:00 AM – 12:30 PM");

    expect(
      formatScheduleTimeRange(
        new Date("2026-10-10T03:30:00.000Z"),
        new Date("2026-10-10T05:30:00.000Z"),
        "America/New_York",
      ),
    ).toBe("11:30 PM – Oct 10, 1:30 AM");
  });
});
