"use client";

import type { RouterOutputs } from "@forge/api";
import { Button } from "@forge/ui/button";

import {
  appointmentStatusLabels,
  appointmentStatusStyles,
  judgingTime,
  judgingWindowMinutes,
} from "~/lib/judging/schedule-display";

type Data = RouterOutputs["judging"]["listScheduleAdmin"];
export type BoardAppointment = Pick<
  Data["appointments"][number],
  | "id"
  | "projectId"
  | "challengeId"
  | "roomId"
  | "startsAt"
  | "endsAt"
  | "title"
  | "challengeLabel"
  | "status"
  | "canMove"
>;

export function ScheduleBoard({
  appointments,
  rooms,
  timeZone,
  windowStart,
  durationMinutes,
  mode,
  now,
  onSelect,
}: {
  appointments: BoardAppointment[];
  rooms: Data["source"]["rooms"];
  timeZone: string;
  windowStart: Date;
  durationMinutes: number;
  mode: "hour" | "agenda";
  now: Date;
  onSelect: (id: string) => void;
}) {
  const windowMinutes = judgingWindowMinutes(durationMinutes);
  const slotCount = windowMinutes / durationMinutes;
  const end = new Date(windowStart.getTime() + windowMinutes * 60_000);
  const nowPercent =
    ((now.getTime() - windowStart.getTime()) / (windowMinutes * 60_000)) * 100;
  return (
    <div
      className="max-h-[72vh] overflow-auto rounded-lg border border-white/10 bg-card/95 shadow-xl"
      role="region"
      aria-label={
        mode === "hour" ? "Judging room timeline" : "Full judging room agendas"
      }
      tabIndex={0}
    >
      <div
        style={
          mode === "hour"
            ? { minWidth: Math.max(880, 180 + slotCount * 140) }
            : undefined
        }
      >
        {mode === "hour" ? (
          <div className="sticky top-0 z-20 grid grid-cols-[180px_1fr] border-b border-white/10 bg-card p-3 text-sm">
            <span className="font-semibold">Room</span>
            <div className="flex justify-between font-mono">
              {Array.from({ length: slotCount + 1 }, (_, index) => (
                <span key={index}>
                  {judgingTime(
                    new Date(
                      windowStart.getTime() + index * durationMinutes * 60_000,
                    ),
                    timeZone,
                  )}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        {rooms.map((room) => {
          const items = appointments.filter(
            (appointment) =>
              appointment.roomId === room.id &&
              (mode === "agenda" ||
                (appointment.startsAt < end &&
                  appointment.endsAt > windowStart)),
          );
          return (
            <section
              key={room.id}
              className={
                mode === "hour"
                  ? "grid grid-cols-[180px_1fr] border-b border-white/10 last:border-0"
                  : "border-b border-white/10 p-4 last:border-0"
              }
              aria-label={`${room.buildingName ?? "No building"} ${room.name}`}
            >
              <div
                className={
                  mode === "hour"
                    ? "sticky left-0 z-10 flex flex-col gap-1 border-r border-white/10 bg-card p-3"
                    : "mb-3 flex flex-wrap items-center gap-2"
                }
              >
                <h3 className="text-sm font-semibold">
                  {room.buildingName} {room.name}
                </h3>
                <p className="break-words text-sm text-muted-foreground">
                  {room.challengeLabel}
                </p>
                {!room.staffed ? (
                  <span className="text-sm text-amber-200">
                    No judges joined
                  </span>
                ) : null}
              </div>
              <div
                className={
                  mode === "hour"
                    ? "relative min-h-32"
                    : "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
                }
              >
                {mode === "hour" && nowPercent >= 0 && nowPercent <= 100 ? (
                  <div
                    className="pointer-events-none absolute inset-y-0 z-10 w-px bg-primary"
                    style={{ left: `${nowPercent}%` }}
                    aria-label="Current time"
                  />
                ) : null}
                {items.map((appointment) => {
                  const left = Math.max(
                    0,
                    ((appointment.startsAt.getTime() - windowStart.getTime()) /
                      (windowMinutes * 60_000)) *
                      100,
                  );
                  const right = Math.min(
                    100,
                    ((appointment.endsAt.getTime() - windowStart.getTime()) /
                      (windowMinutes * 60_000)) *
                      100,
                  );
                  return (
                    <Button
                      key={appointment.id}
                      variant="ghost"
                      className={`h-auto min-h-28 flex-col items-start justify-start gap-1 overflow-hidden whitespace-normal rounded-md border p-2 text-left ${appointmentStatusStyles[appointment.status]} ${mode === "hour" ? "absolute bottom-2 top-2 transition-[left] duration-300 motion-reduce:transition-none" : "w-full"}`}
                      style={
                        mode === "hour"
                          ? {
                              left: `${left}%`,
                              width: `calc(${right - left}% - 4px)`,
                            }
                          : undefined
                      }
                      onClick={() => onSelect(appointment.id)}
                      aria-label={`${appointment.title}, ${appointment.challengeLabel}, ${judgingTime(appointment.startsAt, timeZone)}, ${appointmentStatusLabels[appointment.status]}`}
                    >
                      <span className="font-mono text-sm">
                        {judgingTime(appointment.startsAt, timeZone)}
                      </span>
                      <span className="line-clamp-2 break-words text-sm font-semibold">
                        {appointment.title}
                      </span>
                      <span className="text-sm">
                        {appointmentStatusLabels[appointment.status]}
                      </span>
                    </Button>
                  );
                })}
                {!items.length ? (
                  <p className="p-3 text-sm text-muted-foreground">Open time</p>
                ) : null}
              </div>
            </section>
          );
        })}
        {!rooms.length ? (
          <p className="p-5 text-sm text-muted-foreground">
            No schedulable rooms match this view.
          </p>
        ) : null}
      </div>
    </div>
  );
}
