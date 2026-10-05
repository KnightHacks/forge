"use client";

import { useEffect, useId, useRef } from "react";
import { ArrowLeft, ArrowUpRight, ChevronUp, X } from "lucide-react";

import type { PlottedScheduleEvent } from "~/lib/venue-map";
import { formatScheduleTimeRange } from "~/lib/event-schedule";
import { findVenueRoom } from "~/lib/venue-floor-plans";
import { isKhixEventRoom } from "~/lib/venue-room-directory";
import styles from "./khix-map-events.module.css";

export interface MapEventsDockProps {
  events: PlottedScheduleEvent[];
  filter: "live" | "upcoming";
  onFilterChange: (filter: "live" | "upcoming") => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  selectedEvent: PlottedScheduleEvent | null;
  onCloseEvent: () => void;
  onSelectEvent: (event: PlottedScheduleEvent) => void;
  scheduleState: "pending" | "error" | "ready";
  canViewSchedule: boolean;
  onRetry: () => void;
  timeZone: string;
}

function mappedRoom(event: PlottedScheduleEvent) {
  return event.venueLocation.room &&
    isKhixEventRoom(event.venueLocation.buildingId, event.venueLocation.room)
    ? findVenueRoom(event.venueLocation.buildingId, event.venueLocation.room)
    : null;
}

function eventTime(event: PlottedScheduleEvent, timeZone: string) {
  const day = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone,
  }).format(event.startDateTime);

  return `${day} · ${formatScheduleTimeRange(event.startDateTime, event.endDateTime, timeZone)}`;
}

export function MapEventsDock({
  events,
  filter,
  onFilterChange,
  expanded,
  onExpandedChange,
  selectedEvent,
  onCloseEvent,
  onSelectEvent,
  scheduleState,
  canViewSchedule,
  onRetry,
  timeZone,
}: MapEventsDockProps) {
  const contentId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const activeFilterRef = useRef<HTMLButtonElement>(null);
  const eventHeadingRef = useRef<HTMLHeadingElement>(null);
  const previousEventId = useRef<string | null>(null);
  const pendingFocus = useRef<"toggle" | "filter" | null>(null);
  const selectedEventId = selectedEvent?.id ?? null;

  useEffect(() => {
    if (selectedEventId && previousEventId.current !== selectedEventId) {
      eventHeadingRef.current?.focus({ preventScroll: true });
    } else if (!selectedEventId && pendingFocus.current) {
      const target =
        pendingFocus.current === "filter"
          ? activeFilterRef.current
          : toggleRef.current;
      target?.focus({ preventScroll: true });
      pendingFocus.current = null;
    }
    previousEventId.current = selectedEventId;
  }, [expanded, selectedEventId]);

  const closeDock = () => {
    pendingFocus.current = "toggle";
    if (selectedEvent) onCloseEvent();
    onExpandedChange(false);
    toggleRef.current?.focus({ preventScroll: true });
  };
  const filterLabel = filter === "live" ? "Live now" : "Upcoming";
  const heading = !canViewSchedule
    ? "Events locked"
    : scheduleState === "pending"
      ? "Loading events…"
      : scheduleState === "error"
        ? "Schedule unavailable"
        : filterLabel;
  const room = selectedEvent ? mappedRoom(selectedEvent) : null;
  const selectedFloor = room?.floor ?? selectedEvent?.venueLocation.floor;

  return (
    <section
      className={styles.dock}
      data-map-dock
      data-expanded={expanded || Boolean(selectedEvent)}
      aria-label="Map events"
      onKeyDown={(event) => {
        if (event.key === "Escape" && (expanded || selectedEvent)) {
          event.preventDefault();
          event.stopPropagation();
          closeDock();
        }
      }}
    >
      {selectedEvent ? (
        <>
          <div className={styles.detailHeader}>
            <button
              type="button"
              className={styles.backButton}
              onClick={() => {
                pendingFocus.current = "filter";
                onCloseEvent();
                onExpandedChange(true);
              }}
            >
              <ArrowLeft aria-hidden="true" />
              Events
            </button>
            <button
              type="button"
              className={styles.closeButton}
              aria-label="Close event"
              title="Close event"
              onClick={closeDock}
            >
              <X aria-hidden="true" />
            </button>
          </div>
          <div className={styles.detailBody} key={selectedEvent.id}>
            <span className={styles.detailState}>
              {selectedEvent.state === "live"
                ? "Live now"
                : selectedEvent.state === "ended"
                  ? "Ended"
                  : "Upcoming"}
            </span>
            <h2 ref={eventHeadingRef} tabIndex={-1}>
              {selectedEvent.name}
            </h2>
            <p className={styles.detailTime}>
              {eventTime(selectedEvent, timeZone)}
            </p>
            <p className={styles.detailLocation}>
              {selectedEvent.location || "Location TBA"}
              {selectedFloor ? ` · Floor ${selectedFloor}` : ""}
            </p>
            {!room && (
              <p className={styles.notice}>
                {selectedEvent.venueLocation.room &&
                !isKhixEventRoom(
                  selectedEvent.venueLocation.buildingId,
                  selectedEvent.venueLocation.room,
                )
                  ? "Showing the building. This room isn’t available for Knight Hacks."
                  : "Showing the building. Room location isn’t mapped yet."}
              </p>
            )}
            {selectedEvent.description ? (
              <p className={styles.description}>{selectedEvent.description}</p>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <button
            className={styles.toggle}
            type="button"
            ref={toggleRef}
            aria-expanded={expanded}
            aria-controls={contentId}
            onClick={() => onExpandedChange(!expanded)}
          >
            <span className={styles.heading}>
              {heading}
              {canViewSchedule && scheduleState === "ready" ? (
                <span className={styles.count}>{events.length}</span>
              ) : null}
            </span>
            <span className={styles.toggleAction}>
              <span>{expanded ? "Close" : "Events"}</span>
              <ChevronUp aria-hidden="true" />
            </span>
          </button>
          {expanded ? (
            <div className={styles.content} id={contentId}>
              {canViewSchedule ? (
                <div
                  className={styles.filters}
                  role="group"
                  aria-label="Event timing"
                >
                  <button
                    ref={filter === "live" ? activeFilterRef : undefined}
                    type="button"
                    aria-pressed={filter === "live"}
                    onClick={() => onFilterChange("live")}
                  >
                    Live now
                  </button>
                  <button
                    ref={filter === "upcoming" ? activeFilterRef : undefined}
                    type="button"
                    aria-pressed={filter === "upcoming"}
                    onClick={() => onFilterChange("upcoming")}
                  >
                    Upcoming
                  </button>
                </div>
              ) : null}
              <MapEventList
                events={events}
                filter={filter}
                onFilterChange={onFilterChange}
                onSelectEvent={onSelectEvent}
                scheduleState={scheduleState}
                canViewSchedule={canViewSchedule}
                onRetry={onRetry}
                timeZone={timeZone}
              />
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function MapEventList({
  events,
  filter,
  onFilterChange,
  onSelectEvent,
  scheduleState,
  canViewSchedule,
  onRetry,
  timeZone,
}: Pick<
  MapEventsDockProps,
  | "events"
  | "filter"
  | "onFilterChange"
  | "onSelectEvent"
  | "scheduleState"
  | "canViewSchedule"
  | "onRetry"
  | "timeZone"
>) {
  return (
    <div className={styles.eventList}>
      {!canViewSchedule ? (
        <p className={styles.emptyState}>
          Confirm your attendance to view the schedule.
        </p>
      ) : scheduleState === "pending" ? (
        <p className={styles.emptyState} role="status">
          Loading schedule…
        </p>
      ) : scheduleState === "error" ? (
        <div className={styles.emptyState}>
          <p>Couldn’t load the schedule.</p>
          <button className={styles.retry} type="button" onClick={onRetry}>
            Try again
          </button>
        </div>
      ) : events.length === 0 ? (
        <div className={styles.emptyState} role="status">
          <p>
            {filter === "live"
              ? "No events live right now."
              : "No upcoming events."}
          </p>
          {filter === "live" ? (
            <button
              className={styles.retry}
              type="button"
              onClick={() => onFilterChange("upcoming")}
            >
              See upcoming
            </button>
          ) : null}
        </div>
      ) : (
        <ul>
          {events.map((event) => (
            <li key={event.id}>
              <button
                className={styles.eventRow}
                type="button"
                aria-label={`${event.name}, ${eventTime(event, timeZone)}, ${event.location || "Location TBA"}. ${mappedRoom(event) ? "Show room" : "Show building; room not mapped"}`}
                onClick={() => onSelectEvent(event)}
              >
                <span className={styles.rowContent}>
                  <span className={styles.eventTime}>
                    {event.state === "live" ? "Live · " : ""}
                    {eventTime(event, timeZone)}
                  </span>
                  <strong>{event.name}</strong>
                  <span className={styles.eventLocation}>
                    {event.location || "Location TBA"}
                  </span>
                </span>
                <ArrowUpRight aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
