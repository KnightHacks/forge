"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@forge/ui";
import { Button } from "@forge/ui/button";

import { formatUtcDate, formatUtcMonth } from "~/lib/dates";

/**
 * A month-by-month Discord activity heatmap for one account.
 *
 * Shared, because the hacker detail panel needs the identical thing the member
 * dashboard shows: an organiser deciding how to reach someone whose email
 * bounced wants to know whether that person is actually in the server and when
 * they were last around. Rewriting it would have produced two heatmaps that
 * drift apart.
 */
export interface DiscordActivityDay {
  count: number;
  date: string;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

/** Day keys are date-only, so they stay in UTC rather than shifting to club time. */
function formatDate(value: string | undefined) {
  return value ? formatUtcDate(value, "Not provided") : "Not provided";
}

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

interface DiscordActivityMonth {
  days: { count: number; date: string }[];
  leadingDays: number;
  id: string;
  label: string;
}

function monthStart(value: string) {
  return `${value.slice(0, 7)}-01`;
}

function shiftMonth(value: string, months: number) {
  const date = new Date(`${monthStart(value)}T12:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

function discordActivityMonths(
  activityEndDate: string,
  activity: DiscordActivityDay[],
): DiscordActivityMonth[] {
  const countByDate = new Map(activity.map((row) => [row.date, row.count]));
  const firstActivityDate = activity.reduce(
    (earliest, row) => (row.date < earliest ? row.date : earliest),
    activityEndDate,
  );
  const endMonth = monthStart(activityEndDate);
  const months: DiscordActivityMonth[] = [];

  for (
    let cursor = monthStart(firstActivityDate);
    cursor <= endMonth;
    cursor = shiftMonth(cursor, 1)
  ) {
    const date = new Date(`${cursor}T12:00:00.000Z`);
    const lastDay =
      cursor === endMonth
        ? Number(activityEndDate.slice(8, 10))
        : new Date(
            Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
          ).getUTCDate();
    months.push({
      days: Array.from({ length: lastDay }, (_, index) => {
        const day = shiftDate(cursor, index);
        return { count: countByDate.get(day) ?? 0, date: day };
      }),
      id: cursor.slice(0, 7),
      label: formatUtcMonth(date),
      leadingDays: date.getUTCDay(),
    });
  }

  return months;
}

function activityColor(count: number, peak: number) {
  if (count === 0) return "bg-muted/40";
  const ratio = count / Math.max(1, peak);
  if (ratio <= 0.25) return "bg-primary/25";
  if (ratio <= 0.5) return "bg-primary/45";
  if (ratio <= 0.75) return "bg-primary/70";
  return "bg-primary";
}

export function DiscordActivityTracker({
  activity,
  activityEndDate,
}: {
  activity: DiscordActivityDay[];
  activityEndDate: string;
}) {
  const months = useMemo(
    () => discordActivityMonths(activityEndDate, activity),
    [activity, activityEndDate],
  );
  const [monthIndex, setMonthIndex] = useState(months.length - 1);
  const safeMonthIndex = Math.min(monthIndex, months.length - 1);
  const month = months[safeMonthIndex];
  if (!month) return null;
  const peak = Math.max(1, ...month.days.map((day) => day.count));
  const total = month.days.reduce((sum, day) => sum + day.count, 0);

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-border/70 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div>
          <p className="text-sm font-medium">Daily activity</p>
          <p className="text-sm text-muted-foreground">
            Browse retained message activity by calendar month.
          </p>
        </div>
        <div
          aria-label="Discord activity month"
          className="grid grid-cols-[2.75rem_minmax(8.5rem,1fr)_2.75rem] items-center gap-1"
          role="group"
        >
          <Button
            aria-label="Previous month"
            className="size-11 p-0 sm:size-8"
            disabled={safeMonthIndex === 0}
            onClick={() => setMonthIndex((index) => Math.max(0, index - 1))}
            type="button"
            variant="outline"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
          <span className="text-center text-sm font-medium" aria-live="polite">
            {month.label}
          </span>
          <Button
            aria-label="Next month"
            className="size-11 p-0 sm:size-8"
            disabled={safeMonthIndex === months.length - 1}
            onClick={() =>
              setMonthIndex((index) => Math.min(months.length - 1, index + 1))
            }
            type="button"
            variant="outline"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
      <div className="px-3 py-4 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="text-muted-foreground">
            {formatDate(month.days[0]?.date)} –{" "}
            {formatDate(month.days.at(-1)?.date)}
          </p>
          <p className="font-mono tabular-nums">
            {formatNumber(total)} messages
          </p>
        </div>
        <div
          aria-label={`Discord message activity for ${month.label}`}
          className="mt-3 grid w-full grid-cols-7 gap-1.5"
          role="img"
        >
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((weekday) => (
            <span
              key={weekday}
              className="pb-1 text-center text-[10px] font-medium text-muted-foreground"
              aria-hidden="true"
            >
              {weekday}
            </span>
          ))}
          {Array.from({ length: month.leadingDays }, (_, index) => (
            <span
              key={`leading-${month.id}-${index}`}
              className="h-8 w-full sm:h-9"
              aria-hidden="true"
            />
          ))}
          {month.days.map((day) => (
            <span
              key={day.date}
              aria-hidden="true"
              className={cn(
                "flex h-8 w-full items-start rounded-[3px] border border-white/5 px-1.5 py-1 text-[10px] font-medium sm:h-9",
                activityColor(day.count, peak),
              )}
              title={`${formatDate(day.date)}: ${formatNumber(day.count)} messages`}
            >
              {Number(day.date.slice(8, 10))}
            </span>
          ))}
        </div>
        <div className="sr-only">
          {month.days.map((day) => (
            <p key={day.date}>
              {formatDate(day.date)}: {formatNumber(day.count)} messages
            </p>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <span
              key={level}
              className={cn("size-3 rounded-[2px]", activityColor(level, 4))}
              aria-hidden="true"
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </>
  );
}
