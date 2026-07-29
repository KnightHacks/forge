import type { IssueSearchInput } from "./params";
import { formatUtcDate, formatUtcFullDate, formatUtcMonth } from "~/lib/dates";

/**
 * The calendar's focus day, anchored at noon UTC. The calendar grid is built and
 * labelled in UTC so a `YYYY-MM-DD` position cannot slip onto a neighbouring day
 * for a viewer west of UTC.
 */
export function issueCalendarFocus(date: string) {
  return new Date(`${date}T12:00:00.000Z`);
}

/** The heading above the calendar: `July 2026`, `Week of Jul 15, 2026`, or the full day. */
export function formatIssueCalendarPeriod(
  mode: IssueSearchInput["calendarMode"],
  focus: Date,
) {
  return mode === "month"
    ? formatUtcMonth(focus)
    : mode === "week"
      ? `Week of ${formatUtcDate(focus)}`
      : formatUtcFullDate(focus);
}
