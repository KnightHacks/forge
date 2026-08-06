"use client";

import { useMemo, useState } from "react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import luxonPlugin from "@fullcalendar/luxon3";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin } from "lucide-react";

import { Button } from "@forge/ui/button";

import type { EventListItem } from "./types";
import { localNewYorkDateTime } from "~/lib/dates";
import { EventTag, formatEventDateTime } from "./event-presenters";

export function EventCalendar({
  events,
  initialDate,
  initialView = "month",
  onOpenEvent,
  onRangeChange,
}: {
  events: EventListItem[];
  initialDate?: string;
  initialView?: "day" | "month";
  onOpenEvent: (eventId: string) => void;
  onRangeChange?: (range: {
    end: string;
    start: string;
    view: "day" | "month";
  }) => void;
}) {
  const initialSelectedDay = eventCalendarDayKey(
    initialDate ?? events[0]?.startDateTime ?? new Date().toISOString(),
  );
  const [daySelection, setDaySelection] = useState(() => ({
    initialDay: initialSelectedDay,
    selectedDay: initialSelectedDay,
  }));
  const selectedDay =
    daySelection.initialDay === initialSelectedDay
      ? daySelection.selectedDay
      : initialSelectedDay;
  const setSelectedDay = (next: string) =>
    setDaySelection({ initialDay: initialSelectedDay, selectedDay: next });
  const selectedEvents = useMemo(
    () =>
      events
        .filter(
          (event) => eventCalendarDayKey(event.startDateTime) === selectedDay,
        )
        .sort(
          (left, right) =>
            Date.parse(left.startDateTime) - Date.parse(right.startDateTime),
        ),
    [events, selectedDay],
  );

  function moveDay(delta: number) {
    const next = new Date(`${selectedDay}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + delta);
    selectMobileDay(next.toISOString().slice(0, 10));
  }

  function selectMobileDay(next: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(next)) return;
    setSelectedDay(next);
    onRangeChange?.({ ...eventCalendarDayRange(next), view: "day" });
  }

  return (
    <section className="overflow-hidden rounded-lg border border-white/10 bg-card/95 shadow-2xl shadow-black/25">
      <div className="hidden min-w-0 p-5 md:block">
        <FullCalendar
          key={`${initialView}:${initialDate ?? "current"}`}
          plugins={[
            dayGridPlugin,
            interactionPlugin,
            luxonPlugin,
            timeGridPlugin,
          ]}
          initialView={initialView === "day" ? "timeGridDay" : "dayGridMonth"}
          initialDate={initialDate}
          height="65vh"
          events={events.map((event) => ({
            backgroundColor: event.tagColor,
            borderColor: event.tagColor,
            end: event.endDateTime,
            id: event.id,
            start: event.startDateTime,
            title: event.name,
          }))}
          eventClick={({ event }) => onOpenEvent(event.id)}
          dateClick={({ date, view }) => {
            setSelectedDay(eventCalendarDayKey(date));
            if (view.type === "dayGridMonth") {
              view.calendar.changeView("timeGridDay", date);
            }
          }}
          datesSet={({ end, start, view }) =>
            onRangeChange?.({
              end: end.toISOString(),
              start: start.toISOString(),
              view: view.type === "timeGridDay" ? "day" : "month",
            })
          }
          headerToolbar={{
            center: "title",
            end: "dayGridMonth,timeGridDay next",
            start: "prev today",
          }}
          buttonText={{ day: "Day", month: "Month", today: "Today" }}
          nowIndicator
          timeZone="America/New_York"
          scrollTime="00:00:00"
          slotDuration="01:00:00"
          slotMinTime="00:00:00"
          slotMaxTime="24:00:00"
        />
      </div>

      <div
        className="grid gap-2 p-3 md:hidden"
        aria-label="Event calendar agenda"
      >
        <div className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-background/60 p-2">
          <Button
            aria-label="Previous day"
            onClick={() => moveDay(-1)}
            size="icon"
            variant="ghost"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
          <label className="min-w-0 flex-1 text-center text-sm font-medium">
            <span className="sr-only">Calendar day</span>
            <input
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-center"
              onChange={(event) => selectMobileDay(event.target.value)}
              type="date"
              value={selectedDay}
            />
          </label>
          <Button
            aria-label="Next day"
            onClick={() => moveDay(1)}
            size="icon"
            variant="ghost"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
        {selectedEvents.length === 0 ? (
          <div className="rounded-md border border-dashed border-white/10 p-8 text-center text-sm text-muted-foreground">
            No events on this day.
          </div>
        ) : (
          selectedEvents.map((event) => (
            <button
              key={event.id}
              type="button"
              className="grid min-w-0 gap-3 rounded-md border border-white/10 bg-background/60 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => onOpenEvent(event.id)}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <EventTag color={event.tagColor} name={event.tag} />
                <span className="text-sm text-muted-foreground">
                  {formatEventDateTime(event.startDateTime)}
                </span>
              </div>
              <h3 className="break-words text-base font-semibold">
                {event.name}
              </h3>
              <p className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{event.location}</span>
              </p>
            </button>
          ))
        )}
      </div>

      <div className="sr-only">
        <CalendarDays /> Event calendar
      </div>
    </section>
  );
}

export function eventCalendarDayKey(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/New_York",
    year: "numeric",
  }).formatToParts(date);
  const part = (type: "day" | "month" | "year") =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function eventCalendarDayRange(day: string) {
  const next = new Date(`${day}T12:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const nextDay = next.toISOString().slice(0, 10);
  return {
    end: new Date(localNewYorkDateTime(`${nextDay}T00:00:00`)).toISOString(),
    start: new Date(localNewYorkDateTime(`${day}T00:00:00`)).toISOString(),
  };
}
