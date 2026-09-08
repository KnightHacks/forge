"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { Button } from "@forge/ui/button";

import {
  appointmentStatusLabels,
  appointmentStatusStyles,
  judgingTime,
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
  startsAt,
  endsAt,
  durationMinutes,
  mode,
  now,
  onSelect,
}: {
  appointments: BoardAppointment[];
  rooms: Data["source"]["rooms"];
  timeZone: string;
  startsAt: Date;
  endsAt: Date;
  durationMinutes: number;
  mode: "timeline" | "agenda";
  now: Date;
  onSelect: (id: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const windowMinutes = Math.max(
    durationMinutes,
    (endsAt.getTime() - startsAt.getTime()) / 60_000,
  );
  const slotCount = windowMinutes / durationMinutes;
  const nowPercent =
    ((now.getTime() - startsAt.getTime()) / (windowMinutes * 60_000)) * 100;
  return (
    <>
      {mode === "timeline" ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Scroll down through the full schedule. Swipe sideways or use Shift +
            mouse wheel for more rooms.
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              className="min-h-11"
              aria-label="Earlier rooms"
              title="Scroll left through rooms"
              onClick={() =>
                scrollRef.current?.scrollBy({
                  left: -scrollRef.current.clientWidth * 0.8,
                })
              }
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="min-h-11"
              title="Scroll to the current time"
              onClick={() =>
                scrollRef.current?.scrollTo({
                  top: Math.max(
                    0,
                    ((now.getTime() - startsAt.getTime()) /
                      (durationMinutes * 60_000)) *
                      128,
                  ),
                })
              }
            >
              Now
            </Button>
            <Button
              variant="outline"
              className="min-h-11"
              aria-label="Later rooms"
              title="Scroll right through rooms"
              onClick={() =>
                scrollRef.current?.scrollBy({
                  left: scrollRef.current.clientWidth * 0.8,
                })
              }
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
      <div
        ref={scrollRef}
        className="max-h-[72vh] overflow-auto rounded-lg border border-white/10 bg-card/95 shadow-xl"
        role="region"
        aria-label={
          mode === "timeline"
            ? "Judging room timeline"
            : "Full judging room agendas"
        }
        tabIndex={0}
      >
        <div
          className={
            mode === "timeline" && rooms.length
              ? "grid auto-cols-[minmax(220px,1fr)] grid-flow-col grid-rows-[auto_1fr]"
              : undefined
          }
        >
          {rooms.map((room) => {
            const items = appointments.filter(
              (appointment) =>
                appointment.roomId === room.id &&
                (mode === "agenda" ||
                  (appointment.startsAt < endsAt &&
                    appointment.endsAt > startsAt)),
            );
            return (
              <section
                key={room.id}
                className={
                  mode === "timeline"
                    ? "row-span-2 grid grid-rows-subgrid border-r border-white/10 last:border-0"
                    : "border-b border-white/10 p-4 last:border-0"
                }
                aria-label={`${room.buildingName ?? "No building"} ${room.name}`}
              >
                <div
                  className={
                    mode === "timeline"
                      ? "sticky top-0 z-20 flex flex-col gap-1 border-b border-white/10 bg-card p-3"
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
                    mode === "timeline"
                      ? "relative"
                      : "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
                  }
                  style={
                    mode === "timeline"
                      ? { height: slotCount * 128 }
                      : undefined
                  }
                >
                  {mode === "timeline" &&
                  nowPercent >= 0 &&
                  nowPercent <= 100 ? (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-10 h-px bg-primary"
                      style={{ top: `${nowPercent}%` }}
                      aria-label="Current time"
                    />
                  ) : null}
                  {items.map((appointment) => {
                    const top = Math.max(
                      0,
                      ((appointment.startsAt.getTime() - startsAt.getTime()) /
                        (windowMinutes * 60_000)) *
                        100,
                    );
                    const bottom = Math.min(
                      100,
                      ((appointment.endsAt.getTime() - startsAt.getTime()) /
                        (windowMinutes * 60_000)) *
                        100,
                    );
                    return (
                      <Button
                        key={appointment.id}
                        variant="ghost"
                        className={`h-auto min-h-28 flex-col items-start justify-start gap-1 overflow-hidden whitespace-normal rounded-md border p-2 text-left ${appointmentStatusStyles[appointment.status]} ${mode === "timeline" ? "absolute left-2 right-2 transition-[top] duration-300 motion-reduce:transition-none" : "w-full"}`}
                        style={
                          mode === "timeline"
                            ? {
                                top: `calc(${top}% + 4px)`,
                                height: `calc(${bottom - top}% - 8px)`,
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
                    <p className="p-3 text-sm text-muted-foreground">
                      Open time
                    </p>
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
    </>
  );
}
