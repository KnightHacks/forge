import { describe, expect, it } from "vitest";

import { EVENTS } from "@forge/consts";

import {
  clubDateKey,
  clubDateTimeInput,
  clubDateTimeSeconds,
  clubUtcOffset,
  clubWallClock,
  formatClubDate,
  formatClubDateTime,
  formatClubDayTime,
  formatClubFullDateTime,
  formatClubLongDate,
  formatClubTime,
  formatEventDateTime,
  formatUtcDate,
  formatUtcDateTime,
  formatUtcFullDate,
  formatUtcMonth,
  formatUtcShortMonth,
} from "~/lib/dates";

// 2026-07-15T02:30Z is 2026-07-14 22:30 in club time: a UTC instant that lands
// on the *previous* club day, so anything rendered in the wrong zone is visible.
const SUMMER_INSTANT = new Date("2026-07-15T02:30:00.000Z");
// 2026-01-15T02:30Z is 2026-01-14 21:30 in club time, on the standard-time side
// of the DST boundary.
const WINTER_INSTANT = new Date("2026-01-15T02:30:00.000Z");

describe("Blade date presentation", () => {
  it("pins every club formatter to EVENTS.CALENDAR_TIME_ZONE", () => {
    expect(EVENTS.CALENDAR_TIME_ZONE).toBe("America/New_York");
    expect(formatClubDate(SUMMER_INSTANT)).toBe("Jul 14, 2026");
    expect(formatClubLongDate(SUMMER_INSTANT)).toBe("July 14, 2026");
    expect(formatClubDateTime(SUMMER_INSTANT)).toBe("Jul 14, 2026, 10:30 PM");
    expect(formatClubFullDateTime(SUMMER_INSTANT)).toBe(
      "Tuesday, July 14, 2026 at 10:30 PM",
    );
    expect(formatClubTime(SUMMER_INSTANT)).toBe("10:30 PM");
    expect(formatClubDayTime(SUMMER_INSTANT)).toBe("Jul 14, 10:30 PM");
    expect(formatEventDateTime(SUMMER_INSTANT)).toBe("Jul 14, 2026, 10:30 PM");
  });

  it("follows the daylight-saving boundary rather than a fixed offset", () => {
    expect(formatClubDateTime(WINTER_INSTANT)).toBe("Jan 14, 2026, 9:30 PM");
    expect(clubUtcOffset(SUMMER_INSTANT)).toBe("-04:00");
    expect(clubUtcOffset(WINTER_INSTANT)).toBe("-05:00");
  });

  it("ignores the viewer's own timezone", () => {
    // What a member in Tokyo would have seen before this pass, when the
    // formatter had no `timeZone` and fell back to the browser.
    const tokyo = new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Tokyo",
    }).format(SUMMER_INSTANT);
    expect(tokyo).toBe("Jul 15, 2026, 11:30 AM");
    expect(formatClubDateTime(SUMMER_INSTANT)).not.toBe(tokyo);
    expect(formatClubDateTime(SUMMER_INSTANT)).toBe("Jul 14, 2026, 10:30 PM");
  });

  it("keeps date-only columns on their stored day", () => {
    // A graduation date of 2026-05-15 must never render as May 14.
    expect(formatUtcDate("2026-05-15")).toBe("May 15, 2026");
    expect(formatUtcFullDate("2026-05-15")).toBe("Friday, May 15, 2026");
    expect(formatUtcMonth("2026-05")).toBe("May 2026");
    expect(formatUtcShortMonth("2026-05")).toBe("May 2026");
  });

  it("renders a zoneless date + time pair as the stored wall clock", () => {
    expect(formatUtcDateTime(new Date("2026-07-15T02:30:00.000Z"))).toBe(
      "Jul 15, 2026, 2:30 AM",
    );
  });

  it("falls back instead of printing Invalid Date", () => {
    expect(formatClubDate(null)).toBe("—");
    expect(formatClubDate(undefined, "Not provided")).toBe("Not provided");
    expect(formatClubDateTime("not a date", "Not recorded")).toBe(
      "Not recorded",
    );
    expect(formatEventDateTime("not a date")).toBe("Date unavailable");
  });
});

describe("Blade club wall-clock helpers", () => {
  it("reads the wall clock an officer in club time would see", () => {
    expect(clubWallClock(SUMMER_INSTANT)).toEqual({
      date: "2026-07-14",
      seconds: "22:30:00",
      time: "22:30",
    });
    expect(clubDateKey(SUMMER_INSTANT)).toBe("2026-07-14");
    expect(clubDateTimeInput(SUMMER_INSTANT)).toBe("2026-07-14T22:30");
    expect(clubDateTimeSeconds(SUMMER_INSTANT)).toBe("2026-07-14T22:30:00");
  });

  it("uses 00 rather than 24 for midnight in club time", () => {
    expect(clubDateTimeInput(new Date("2026-07-15T04:00:00.000Z"))).toBe(
      "2026-07-15T00:00",
    );
  });
});
