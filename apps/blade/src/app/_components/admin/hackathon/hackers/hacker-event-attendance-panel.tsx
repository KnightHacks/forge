"use client";

import { CalendarCheck, Loader2, RotateCcw } from "lucide-react";

import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";

import { DetailSection } from "~/app/_components/admin/shared/detail-panel";
import { formatClubDateTime } from "~/lib/dates";
import { api } from "~/trpc/react";

export interface HackerEventAttendanceRow {
  attendanceId: string;
  checkedInAt: Date | string | null;
  eventName: string;
  eventPurpose: "event" | "primary_check_in";
  isInitialAttendance: boolean | null;
  operatorName: string | null;
  pointsAwarded: number | null;
  voidedAt: Date | string | null;
}

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value : null;
}

function date(value: unknown) {
  return value instanceof Date || typeof value === "string" ? value : null;
}

/**
 * Keeps wire-shape reconciliation at this panel boundary. Attendance remains
 * attendee-scoped even if the administrative event DTO later grows.
 */
export function adaptHackerEventAttendance(
  value: unknown,
): HackerEventAttendanceRow {
  const row = object(value);
  const event = object(row.event);
  const operator = object(row.operator);
  const rawPurpose = text(row.eventPurpose ?? row.purpose ?? event.purpose);

  return {
    attendanceId:
      text(row.attendanceId ?? row.id ?? row.occurrenceId) ?? "unknown",
    checkedInAt: date(row.checkedInAt ?? row.occurrenceTime ?? row.createdAt),
    eventName: text(row.eventName ?? event.name) ?? "Unnamed event",
    eventPurpose:
      rawPurpose === "primary_check_in" ? "primary_check_in" : "event",
    isInitialAttendance:
      typeof row.isInitialAttendance === "boolean"
        ? row.isInitialAttendance
        : null,
    operatorName: text(row.operatorName ?? operator.name),
    pointsAwarded:
      typeof row.pointsAwarded === "number" ? row.pointsAwarded : null,
    voidedAt: date(row.voidedAt),
  };
}

export function HackerEventAttendancePanel({
  attendeeId,
  hackathonId,
}: {
  attendeeId: string;
  hackathonId: string;
}) {
  const attendance = api.hackathonEvent.listHackerEventAttendance.useQuery(
    { attendeeId, hackathonId, limit: 50 },
    { enabled: attendeeId !== "" && hackathonId !== "" },
  );
  const response = attendance.data as unknown;
  const responseObject = object(response);
  const rawRows = Array.isArray(response)
    ? response
    : Array.isArray(responseObject.rows)
      ? responseObject.rows
      : Array.isArray(responseObject.items)
        ? responseObject.items
        : [];
  const rows = rawRows.map(adaptHackerEventAttendance);

  return (
    <DetailSection
      description="Check-ins for the hackathon currently selected in Hacker management."
      icon={CalendarCheck}
      title="Hackathon events"
    >
      {attendeeId === "" || hackathonId === "" ? (
        <p className="px-3 py-6 text-center text-sm text-muted-foreground sm:px-4">
          Event attendance is unavailable without a selected hackathon and
          attendee.
        </p>
      ) : attendance.isPending ? (
        <p className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground sm:px-4">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Loading event attendance…
        </p>
      ) : attendance.isError ? (
        <div className="grid justify-items-center gap-3 px-3 py-6 text-center sm:px-4">
          <p className="text-sm text-destructive">
            Event attendance could not be loaded.
          </p>
          <Button
            className="min-h-11 gap-2"
            onClick={() => void attendance.refetch()}
            size="sm"
            variant="secondary"
          >
            <RotateCcw className="size-4" aria-hidden="true" /> Try again
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <p className="px-3 py-6 text-center text-sm text-muted-foreground sm:px-4">
          No attendance recorded for this hackathon.
        </p>
      ) : (
        <ol className="divide-y divide-border/70">
          {rows.map((row, index) => (
            <li
              className="grid gap-2 px-3 py-3 sm:px-4"
              key={`${row.attendanceId}-${index}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="break-words font-medium">{row.eventName}</span>
                <span className="flex flex-wrap items-center gap-1.5">
                  {row.eventPurpose === "primary_check_in" ? (
                    <Badge variant="outline">Primary admission</Badge>
                  ) : null}
                  {row.isInitialAttendance === false ? (
                    <Badge variant="secondary">Repeat attendance</Badge>
                  ) : null}
                  {row.voidedAt ? (
                    <Badge variant="destructive">Removed</Badge>
                  ) : null}
                  <Badge variant="secondary">
                    {row.pointsAwarded === null
                      ? "Points not recorded"
                      : `${row.pointsAwarded} pts`}
                  </Badge>
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {formatClubDateTime(row.checkedInAt, "Time not recorded")}
                {row.operatorName ? ` · ${row.operatorName}` : ""}
              </p>
            </li>
          ))}
        </ol>
      )}
    </DetailSection>
  );
}
