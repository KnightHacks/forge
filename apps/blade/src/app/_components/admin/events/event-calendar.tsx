"use client";

import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import { CalendarDays, MapPin } from "lucide-react";

import type { EventListItem } from "./types";
import { EventTag, formatEventDateTime } from "./event-presenters";

export function EventCalendar({
  events,
  initialDate,
  onOpenEvent,
  onRangeChange,
}: {
  events: EventListItem[];
  initialDate?: string;
  onOpenEvent: (eventId: string) => void;
  onRangeChange?: (range: { end: string; start: string }) => void;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-white/10 bg-card/95 shadow-2xl shadow-black/25">
      <div className="hidden min-w-0 p-5 md:block">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          initialDate={initialDate}
          height="auto"
          events={events.map((event) => ({
            backgroundColor: event.tagColor,
            borderColor: event.tagColor,
            end: event.endDateTime,
            id: event.id,
            start: event.startDateTime,
            title: event.name,
          }))}
          eventClick={({ event }) => onOpenEvent(event.id)}
          datesSet={({ end, start }) =>
            onRangeChange?.({
              end: end.toISOString(),
              start: start.toISOString(),
            })
          }
          headerToolbar={{
            center: "title",
            end: "next",
            start: "prev today",
          }}
        />
      </div>

      <div
        className="grid gap-2 p-3 md:hidden"
        aria-label="Event calendar agenda"
      >
        {events.length === 0 ? (
          <div className="rounded-md border border-dashed border-white/10 p-8 text-center text-sm text-muted-foreground">
            No events match this calendar window.
          </div>
        ) : (
          events.map((event) => (
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
