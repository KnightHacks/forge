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

/** Count reserved rooms at the live clock, independent of board filters. */
export function judgingRoomActivity(
  rooms: { id: string; scheduled: boolean }[],
  appointments: { roomId: string; startsAt: Date; endsAt: Date }[],
  now: Date,
) {
  const scheduledRooms = new Set(
    rooms.filter((room) => room.scheduled).map((room) => room.id),
  );
  const occupiedRooms = new Set(
    appointments
      .filter(
        (appointment) =>
          scheduledRooms.has(appointment.roomId) &&
          appointment.startsAt <= now &&
          now < appointment.endsAt,
      )
      .map((appointment) => appointment.roomId),
  );
  return {
    occupied: occupiedRooms.size,
    idle: scheduledRooms.size - occupiedRooms.size,
    total: scheduledRooms.size,
  };
}

export function sortJudgingRooms<
  T extends { buildingName: string | null; name: string; id: string },
>(rooms: T[]) {
  return [...rooms].sort(
    (a, b) =>
      (a.buildingName === null ? 1 : 0) - (b.buildingName === null ? 1 : 0) ||
      (a.buildingName ?? "").localeCompare(b.buildingName ?? "", "en", {
        numeric: true,
        sensitivity: "base",
      }) ||
      a.name.localeCompare(b.name, "en", {
        numeric: true,
        sensitivity: "base",
      }) ||
      a.id.localeCompare(b.id),
  );
}
