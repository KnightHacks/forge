import { DateTime } from "luxon";

export function judgingTime(date: Date, timeZone: string) {
  return DateTime.fromJSDate(date).setZone(timeZone).toFormat("h:mm a");
}

export function judgingDateInput(date: Date, timeZone: string) {
  return DateTime.fromJSDate(date)
    .setZone(timeZone)
    .toFormat("yyyy-MM-dd'T'HH:mm");
}

export const appointmentStatusStyles = {
  future: "border-white/15 bg-background/60 text-foreground",
  pending:
    "border-amber-400/50 bg-amber-400/10 text-amber-200 hover:bg-amber-400/15 hover:text-amber-200",
  incomplete:
    "border-amber-400/50 bg-amber-400/10 text-amber-200 hover:bg-amber-400/15 hover:text-amber-200",
  missed:
    "border-red-400/50 bg-red-400/10 text-red-200 hover:bg-red-400/15 hover:text-red-200",
  complete:
    "border-[hsl(var(--chart-2)/0.5)] bg-[hsl(var(--chart-2)/0.15)] text-[hsl(var(--chart-2))] hover:bg-[hsl(var(--chart-2)/0.2)] hover:text-[hsl(var(--chart-2))]",
} as const;

export const appointmentStatusLabels = {
  future: "Upcoming",
  pending: "In progress",
  incomplete: "Incomplete",
  missed: "Missing result",
  complete: "Judged",
} as const;

/** Advance the live board on appointment boundaries, keeping cards whole. */
export function judgingWindowStart(
  startsAt: Date,
  at: Date,
  durationMinutes: number,
) {
  const duration = durationMinutes * 60_000;
  return new Date(
    startsAt.getTime() +
      Math.floor((at.getTime() - startsAt.getTime()) / duration) * duration,
  );
}

export function judgingWindowMinutes(durationMinutes: number) {
  return Math.max(1, Math.ceil(60 / durationMinutes)) * durationMinutes;
}
