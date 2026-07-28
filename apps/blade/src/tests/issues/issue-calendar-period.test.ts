import { describe, expect, it } from "vitest";

import {
  formatIssueCalendarPeriod,
  issueCalendarFocus,
} from "~/app/_components/admin/issues/issue-calendar-period";

describe("Issue calendar focus", () => {
  it("anchors the focus day at noon UTC so no zone can shift it", () => {
    expect(issueCalendarFocus("2026-07-15").toISOString()).toBe(
      "2026-07-15T12:00:00.000Z",
    );
  });

  it("keeps the requested day on the first and last of a month", () => {
    expect(issueCalendarFocus("2026-07-01").getUTCDate()).toBe(1);
    expect(issueCalendarFocus("2026-07-31").getUTCDate()).toBe(31);
  });
});

describe("Issue calendar period label", () => {
  const focus = issueCalendarFocus("2026-07-15");

  it("names the month in month mode", () => {
    expect(formatIssueCalendarPeriod("month", focus)).toBe("July 2026");
  });

  it("names the week's first day in week mode", () => {
    expect(formatIssueCalendarPeriod("week", focus)).toBe(
      "Week of Jul 15, 2026",
    );
  });

  it("names the full day in day mode", () => {
    expect(formatIssueCalendarPeriod("day", focus)).toBe(
      "Wednesday, July 15, 2026",
    );
  });
});
