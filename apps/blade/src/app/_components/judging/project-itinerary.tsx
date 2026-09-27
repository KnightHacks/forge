"use client";

import { MapPin } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { Button } from "@forge/ui/button";
import { ResponsiveComboBox } from "@forge/ui/responsive-combo-box";

import type { BoardAppointment } from "./schedule-board";
import {
  appointmentStatusLabels,
  appointmentStatusStyles,
  judgingTime,
} from "~/lib/judging/schedule-display";

export function ProjectItinerary({
  appointments,
  rooms,
  projectId,
  onProjectChange,
  timeZone,
  sameBuildingBreakMinutes,
  differentBuildingBreakMinutes,
  onSelect,
}: {
  appointments: BoardAppointment[];
  rooms: RouterOutputs["judging"]["listScheduleAdmin"]["source"]["rooms"];
  projectId: string;
  onProjectChange: (id: string) => void;
  timeZone: string;
  sameBuildingBreakMinutes: number;
  differentBuildingBreakMinutes: number;
  onSelect: (id: string) => void;
}) {
  const projects = [
    ...new Map(
      appointments.map((appointment) => [
        appointment.projectId,
        { id: appointment.projectId, title: appointment.title },
      ]),
    ).values(),
  ].sort((a, b) => a.title.localeCompare(b.title));
  const items = appointments
    .filter((appointment) => appointment.projectId === projectId)
    .sort(
      (a, b) =>
        a.startsAt.getTime() - b.startsAt.getTime() || a.id.localeCompare(b.id),
    );
  const roomById = new Map(rooms.map((room) => [room.id, room]));
  return (
    <section
      aria-label="Project reservation itinerary"
      className="rounded-lg border border-white/10 bg-card/95 p-4 shadow-xl sm:p-5"
    >
      <div className="max-w-xl space-y-2">
        <h3 className="font-semibold">Follow a project's judging route</h3>
        <p className="text-sm text-muted-foreground">
          Every reservation, in time order. Breaks run from the end of one
          appointment to the start of the next.
        </p>
        <ResponsiveComboBox
          ariaLabel="Select itinerary project"
          buttonPlaceholder="Select a project"
          inputPlaceholder="Search projects"
          emptyMessage="No scheduled projects found."
          items={projects}
          value={projectId || null}
          onValueChange={onProjectChange}
          getItemLabel={(project) => project.title}
          getItemValue={(project) => project.id}
          renderItem={(project) => (
            <span className="truncate">{project.title}</span>
          )}
          triggerClassName="min-h-11"
        />
      </div>
      {items.length ? (
        <ol
          className="mt-5 max-h-[65vh] space-y-0 overflow-y-auto pr-1"
          aria-label="Reservations in time order"
        >
          {items.map((appointment, index) => {
            const room = roomById.get(appointment.roomId);
            const previous = items[index - 1];
            const previousRoom = previous
              ? roomById.get(previous.roomId)
              : undefined;
            const differentBuilding =
              !!previousRoom && previousRoom.buildingId !== room?.buildingId;
            const breakMinutes = previous
              ? (appointment.startsAt.getTime() - previous.endsAt.getTime()) /
                60_000
              : 0;
            const requiredBreak = differentBuilding
              ? differentBuildingBreakMinutes
              : sameBuildingBreakMinutes;
            return (
              <li key={appointment.id}>
                {previous ? (
                  <div className="ml-5 border-l-2 border-primary/40 py-4 pl-5 text-sm">
                    <p
                      className={
                        breakMinutes < requiredBreak
                          ? "font-medium text-amber-200"
                          : "font-medium"
                      }
                    >
                      {breakMinutes} min between presentations
                      {breakMinutes < requiredBreak ? " · Reduced break" : ""}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {differentBuilding
                        ? `${previousRoom.buildingName} to ${room?.buildingName}`
                        : `Stay in ${room?.buildingName ?? "the same building"}`}{" "}
                      · {requiredBreak} min configured minimum
                    </p>
                  </div>
                ) : null}
                <Button
                  variant="ghost"
                  className={`h-auto min-h-24 w-full items-start justify-start gap-3 whitespace-normal rounded-md border p-4 text-left sm:gap-5 ${appointmentStatusStyles[appointment.status]}`}
                  onClick={() => onSelect(appointment.id)}
                >
                  <span
                    className="flex size-7 shrink-0 items-center justify-center rounded-full border border-current text-sm"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="min-w-0 space-y-1">
                      <span className="block font-mono text-sm">
                        {judgingTime(appointment.startsAt, timeZone)} to{" "}
                        {judgingTime(appointment.endsAt, timeZone)}
                      </span>
                      <span className="block break-words font-semibold">
                        {appointment.challengeLabel}
                      </span>
                      <span className="flex items-center gap-1.5 text-sm">
                        <MapPin
                          className="size-4 shrink-0"
                          aria-hidden="true"
                        />
                        {room?.buildingName} {room?.name}
                      </span>
                      {room && !room.staffed ? (
                        <span className="block text-sm text-amber-200">
                          No judges joined · Booking kept
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-sm">
                      {appointmentStatusLabels[appointment.status]}
                    </span>
                  </span>
                </Button>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-5 text-sm text-muted-foreground">
          {projectId
            ? "This project has no reservations in this schedule."
            : "Select a project to audit its locations and breaks."}
        </p>
      )}
    </section>
  );
}
