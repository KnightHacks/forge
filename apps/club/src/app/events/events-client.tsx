"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
} from "lucide-react";

import { cn } from "@forge/ui";

import type { EventsStatus, PublicClubEvent } from "../_lib/club-events";
import {
  formatEventDate,
  formatEventTime,
  formatMonthLabel,
  getClubCurrentMonth,
  getClubDateKey,
  getEventDateKey,
  getEventMonth,
  loadClubEvents,
} from "../_lib/club-events";

const EVENT_FILTERS = [
  { key: "all", label: "All", tags: null },
  { key: "workshops", label: "Workshops", tags: ["Workshop"] },
  {
    key: "meetings",
    label: "Meetings",
    tags: [
      "Collabs",
      "Class Support",
      "Hello World",
      "Kickstart",
      "Project Launch",
      "Social",
      "Tech Exploration",
    ],
  },
  { key: "ops", label: "Operations", tags: ["OPS"] },
  { key: "gbms", label: "GBMs", tags: ["GBM"] },
  {
    key: "sponsor",
    label: "Sponsors",
    tags: ["CAREER-FAIR", "RSO-FAIR", "Sponsorship"],
  },
] as const;

const PAGE_SIZE = 4;
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"] as const;

type FilterKey = (typeof EVENT_FILTERS)[number]["key"];

interface MonthCursor {
  year: number;
  monthIndex: number;
}

interface CalendarCell {
  dateKey: string;
  day: number;
  eventCount: number;
  inMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
  key: string;
}

function getCurrentMonth(): MonthCursor {
  return getClubCurrentMonth();
}

function shiftMonth(month: MonthCursor, offset: number): MonthCursor {
  const shifted = new Date(month.year, month.monthIndex + offset, 1);

  return {
    year: shifted.getFullYear(),
    monthIndex: shifted.getMonth(),
  };
}

function getLocalDateKey(year: number, monthIndex: number, day: number) {
  return [
    year,
    String(monthIndex + 1).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

function getTodayKey() {
  return getClubDateKey();
}

function buildCalendarCells({
  eventCounts,
  month,
  selectedDateKey,
}: {
  eventCounts: Map<string, number>;
  month: MonthCursor;
  selectedDateKey: string | null;
}): CalendarCell[] {
  const firstDay = new Date(month.year, month.monthIndex, 1).getDay();
  const daysInMonth = new Date(month.year, month.monthIndex + 1, 0).getDate();
  const previousMonthDays = new Date(month.year, month.monthIndex, 0).getDate();
  const todayKey = getTodayKey();

  return Array.from({ length: 42 }, (_, index) => {
    const dayOffset = index - firstDay + 1;
    let cellYear = month.year;
    let cellMonth = month.monthIndex;
    let day = dayOffset;
    let inMonth = true;

    if (dayOffset < 1) {
      const previousMonth = shiftMonth(month, -1);
      cellYear = previousMonth.year;
      cellMonth = previousMonth.monthIndex;
      day = previousMonthDays + dayOffset;
      inMonth = false;
    } else if (dayOffset > daysInMonth) {
      const nextMonth = shiftMonth(month, 1);
      cellYear = nextMonth.year;
      cellMonth = nextMonth.monthIndex;
      day = dayOffset - daysInMonth;
      inMonth = false;
    }

    const dateKey = getLocalDateKey(cellYear, cellMonth, day);

    return {
      dateKey,
      day,
      eventCount: eventCounts.get(dateKey) ?? 0,
      inMonth,
      isSelected: selectedDateKey === dateKey,
      isToday: todayKey === dateKey,
      key: `${dateKey}-${index}`,
    };
  });
}

function eventMatchesFilter(event: PublicClubEvent, filterKey: FilterKey) {
  const filter = EVENT_FILTERS.find((item) => item.key === filterKey);

  if (!filter?.tags) return true;

  return (filter.tags as readonly string[]).includes(event.tag);
}

function eventMatchesMonth(event: PublicClubEvent, month: MonthCursor) {
  const eventMonth = getEventMonth(event.startDateTime);

  return (
    eventMonth?.year === month.year &&
    eventMonth.monthIndex === month.monthIndex
  );
}

function EventMeta({ event }: { event: PublicClubEvent }) {
  const eventTime = formatEventTime(event.startDateTime);
  const meta = [eventTime, event.location].filter(Boolean);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-black uppercase text-[var(--club-gold)]">
      {eventTime ? (
        <span className="inline-flex items-center gap-1.5">
          <Clock3 aria-hidden="true" className="size-3" />
          {eventTime}
        </span>
      ) : null}
      {event.location ? (
        <span className="inline-flex items-center gap-1.5">
          <MapPin aria-hidden="true" className="size-3" />
          {event.location}
        </span>
      ) : null}
      {meta.length === 0 ? <span>{event.tag}</span> : null}
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(20rem,24rem)_minmax(0,1fr)] lg:items-start">
      <div className="h-[25rem] w-full animate-pulse border-[3px] border-black bg-white/80 shadow-[8px_8px_0_rgba(0,0,0,0.38)]" />
      <div className="space-y-5">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-lg bg-[#59168b]/30"
          />
        ))}
      </div>
    </div>
  );
}

function CalendarPanel({
  eventCounts,
  month,
  onMonthChange,
  onSelectDate,
  selectedDateKey,
}: {
  eventCounts: Map<string, number>;
  month: MonthCursor;
  onMonthChange: (month: MonthCursor) => void;
  onSelectDate: (dateKey: string) => void;
  selectedDateKey: string | null;
}) {
  const cells = buildCalendarCells({ eventCounts, month, selectedDateKey });

  return (
    <div
      className="w-full border-[3px] border-black bg-[#f4eff5] p-5 text-[#371640] shadow-[8px_8px_0_rgba(0,0,0,0.38)] md:p-7"
    >
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-xl font-black">{formatMonthLabel(month)}</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous month"
            className="flex size-9 items-center justify-center text-[#371640] transition-colors hover:bg-[#371640]/10"
            onClick={() => onMonthChange(shiftMonth(month, -1))}
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            className="flex size-9 items-center justify-center text-[#371640] transition-colors hover:bg-[#371640]/10"
            onClick={() => onMonthChange(shiftMonth(month, 1))}
          >
            <ChevronRight aria-hidden="true" className="size-5" />
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-7 border-l border-t border-[#371640]/35 text-center text-xs font-black">
        {WEEKDAYS.map((weekday, index) => (
          <div
            key={`${weekday}-${index}`}
            className="border-b border-r border-[#371640]/35 py-2 text-[#371640]/60"
          >
            {weekday}
          </div>
        ))}
        {cells.map((cell) => {
          const hasVisibleEvent = cell.inMonth && cell.eventCount > 0;

          return (
            <button
              key={cell.key}
              type="button"
              disabled={!cell.inMonth}
              className={cn(
                "relative aspect-square border-b border-r border-[#371640]/35 text-sm font-bold transition-colors disabled:cursor-default",
                cell.inMonth
                  ? "hover:bg-[var(--club-gold)]/35 text-[#371640]"
                  : "bg-[#371640]/[0.025] text-[#371640]/20",
                hasVisibleEvent && "bg-[var(--club-gold)]/25",
                cell.isToday &&
                  cell.inMonth &&
                  "outline outline-2 -outline-offset-2 outline-[#371640]/40",
                cell.isSelected &&
                  cell.inMonth &&
                  "bg-[var(--club-gold)] text-black outline outline-2 -outline-offset-2 outline-black",
              )}
              onClick={() => onSelectDate(cell.dateKey)}
            >
              <span>{cell.day}</span>
              {hasVisibleEvent ? (
                <span className="absolute bottom-1 left-1/2 h-1.5 w-6 -translate-x-1/2 bg-[#371640]" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CalendarEventCard({ event }: { event: PublicClubEvent }) {
  const eventDate = formatEventDate(event.startDateTime);

  return (
    <article className="club-event-row grid gap-5 border-b border-white/10 bg-[#5b164d]/35 p-5 first:rounded-lg first:border-b-0 first:bg-[#6a1b57]/65 md:grid-cols-[5.25rem_1fr]">
      <div className="club-event-row-date flex items-center gap-3 md:block">
        <div className="text-xs font-black uppercase leading-4 text-white/60">
          <p>{eventDate.month}</p>
          <p>{eventDate.dayName}</p>
        </div>
        <p className="club-event-row-day text-5xl font-black leading-none text-white">
          {eventDate.day}
        </p>
      </div>
      <div className="club-event-row-copy">
        <EventMeta event={event} />
        <h3 className="mt-2 text-2xl font-black leading-tight text-white">
          {event.name}
        </h3>
        <p className="mt-1 line-clamp-2 max-w-[28rem] text-sm leading-5 text-[var(--club-muted)]">
          {event.description}
        </p>
      </div>
    </article>
  );
}

function FilterBar({
  activeFilter,
  onChange,
}: {
  activeFilter: FilterKey;
  onChange: (filter: FilterKey) => void;
}) {
  return (
    <div
      className="mx-auto mt-16 grid max-w-[46rem] grid-cols-2 gap-4 md:grid-cols-3"
      data-stagger
    >
      {EVENT_FILTERS.map((filter) => (
        <button
          key={filter.key}
          type="button"
          aria-pressed={activeFilter === filter.key}
          className={cn(
            "club-filter-button min-h-14 border-[3px] border-black px-4 text-sm font-black uppercase tracking-normal shadow-[4px_4px_0_rgba(0,0,0,0.35)] transition-transform hover:-translate-y-0.5",
            activeFilter === filter.key
              ? "bg-[#ffc6d9] text-black"
              : "bg-[#4b206d] text-white",
          )}
          onClick={() => onChange(filter.key)}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}

function UpcomingSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      {Array.from({ length: PAGE_SIZE }).map((_, index) => (
        <div
          key={index}
          className="h-32 animate-pulse border-b border-white/10 bg-white/[0.03]"
        />
      ))}
    </div>
  );
}

function UpcomingEventRow({ event }: { event: PublicClubEvent }) {
  const eventDate = formatEventDate(event.startDateTime);

  return (
    <article className="club-event-row grid gap-5 border-b border-white/10 py-8 md:grid-cols-[5rem_5rem_1fr_13rem] md:items-center md:gap-7">
      <div className="club-event-row-date flex items-center gap-3 md:block md:text-center">
        <div className="text-xs font-black uppercase leading-4 text-white/55">
          <p>{eventDate.month}</p>
          <p>{eventDate.dayName}</p>
        </div>
        <p className="club-event-row-day text-5xl font-black leading-none text-white md:hidden">
          {eventDate.day}
        </p>
      </div>
      <p className="club-event-row-day hidden text-6xl font-black leading-none text-white md:block">
        {eventDate.day}
      </p>
      <div className="club-event-row-copy">
        <EventMeta event={event} />
        <h3 className="mt-2 text-2xl font-black leading-tight text-white">
          {event.name}
        </h3>
        <p className="mt-2 line-clamp-2 max-w-[30rem] text-sm leading-5 text-[var(--club-muted)]">
          {event.description}
        </p>
      </div>
      <div className="club-event-tag-card flex min-h-24 items-center justify-center rounded-lg bg-[radial-gradient(circle_at_30%_20%,rgba(247,79,131,0.42),transparent_40%),linear-gradient(135deg,#321138,#59168b)] px-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:min-h-28">
        <span className="text-xs font-black uppercase text-white/75">
          {event.tag}
        </span>
      </div>
    </article>
  );
}

function Pagination({
  currentPage,
  onPageChange,
  totalPages,
}: {
  currentPage: number;
  onPageChange: (page: number) => void;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center gap-4 text-sm font-black text-white/60">
      {Array.from({ length: totalPages }).map((_, index) => {
        const page = index + 1;

        return (
          <button
            key={page}
            type="button"
            className={cn(
              "underline-offset-4 transition-colors hover:text-white",
              page === currentPage && "text-white underline",
            )}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        );
      })}
    </div>
  );
}

function EmptyState({ status }: { status: EventsStatus }) {
  return (
    <div className="flex min-h-[32rem] items-center justify-center border-y border-white/10 px-4 py-14 text-center">
      <p className="text-base font-bold text-[var(--club-muted)]">
        {status === "error"
          ? "Blade events are unavailable right now."
          : "No upcoming Blade events are published yet."}
      </p>
    </div>
  );
}

export function EventsClient({
  bladeUrl,
  eventsEndpoint,
}: {
  bladeUrl: string;
  eventsEndpoint: string;
}) {
  const [events, setEvents] = useState<PublicClubEvent[]>([]);
  const [status, setStatus] = useState<EventsStatus>("loading");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [calendarMonth, setCalendarMonth] =
    useState<MonthCursor>(getCurrentMonth);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const abortController = new AbortController();

    async function loadEvents() {
      setStatus("loading");

      try {
        const bladeEvents = await loadClubEvents(
          eventsEndpoint,
          abortController.signal,
        );

        setEvents(bladeEvents);
        setStatus("ready");

        const firstEvent = bladeEvents[0];
        const firstEventMonth = firstEvent
          ? getEventMonth(firstEvent.startDateTime)
          : null;
        if (firstEventMonth) {
          setCalendarMonth(firstEventMonth);
        }
      } catch {
        if (abortController.signal.aborted) return;

        setEvents([]);
        setStatus("error");
      }
    }

    void loadEvents();

    return () => abortController.abort();
  }, [eventsEndpoint]);

  const filteredEvents = useMemo(
    () => events.filter((event) => eventMatchesFilter(event, activeFilter)),
    [activeFilter, events],
  );

  const eventCounts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const event of filteredEvents) {
      const dateKey = getEventDateKey(event.startDateTime);
      if (!dateKey) continue;

      counts.set(dateKey, (counts.get(dateKey) ?? 0) + 1);
    }

    return counts;
  }, [filteredEvents]);

  const calendarEvents = useMemo(() => {
    if (selectedDateKey) {
      return filteredEvents.filter(
        (event) => getEventDateKey(event.startDateTime) === selectedDateKey,
      );
    }

    return filteredEvents.filter((event) =>
      eventMatchesMonth(event, calendarMonth),
    );
  }, [calendarMonth, filteredEvents, selectedDateKey]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const firstVisible = filteredEvents.length
    ? (currentPage - 1) * PAGE_SIZE + 1
    : 0;
  const lastVisible = Math.min(currentPage * PAGE_SIZE, filteredEvents.length);
  const visibleEvents = filteredEvents.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <section className="club-post-hero-section relative px-6 pb-28 md:px-10 lg:px-24">
      <div className="mx-auto max-w-[1040px]">
        <h2
          className="text-center text-4xl font-black uppercase leading-none text-white [text-shadow:4px_4px_0_rgba(0,0,0,0.5)] md:text-5xl"
          data-reveal="headline"
        >
          <span className="club-line">
            <span>Calendar</span>
          </span>
        </h2>

        <div className="mt-12 md:mt-14">
          {status === "loading" ? (
            <CalendarSkeleton />
          ) : (
            <div className="grid gap-8 lg:grid-cols-[minmax(20rem,24rem)_minmax(0,1fr)] lg:items-start">
              <CalendarPanel
                eventCounts={eventCounts}
                month={calendarMonth}
                selectedDateKey={selectedDateKey}
                onMonthChange={(month) => {
                  setCalendarMonth(month);
                  setSelectedDateKey(null);
                }}
                onSelectDate={(dateKey) =>
                  setSelectedDateKey((current) =>
                    current === dateKey ? null : dateKey,
                  )
                }
              />

              <div
                className="min-h-[25rem] border-y border-white/10"
                data-stagger
              >
                {calendarEvents.length > 0 ? (
                  calendarEvents
                    .slice(0, 4)
                    .map((event) => (
                      <CalendarEventCard key={event.id} event={event} />
                    ))
                ) : (
                  <div className="flex min-h-[25rem] items-center justify-center bg-white/[0.025] px-6 text-center text-sm font-bold text-[var(--club-muted)]">
                    No events in this view.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <FilterBar
          activeFilter={activeFilter}
          onChange={(filter) => {
            setActiveFilter(filter);
            setPage(1);
            setSelectedDateKey(null);
          }}
        />

        <div className="mt-24">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <h2
              className="text-4xl font-black leading-tight text-white [text-shadow:4px_4px_0_rgba(0,0,0,0.5)] md:text-5xl"
              data-reveal="headline"
            >
              <span className="club-line">
                <span>Upcoming Events</span>
              </span>
            </h2>
            <a
              href={bladeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm font-black uppercase text-[var(--club-gold)] transition-colors hover:text-white"
            >
              Open Blade
              <ArrowUpRight aria-hidden="true" className="ml-2 size-4" />
            </a>
          </div>

          <div className="mt-8 min-h-[39rem]">
            {status === "loading" ? (
              <UpcomingSkeleton />
            ) : visibleEvents.length > 0 ? (
              <>
                <div data-stagger>
                  {visibleEvents.map((event) => (
                    <UpcomingEventRow key={event.id} event={event} />
                  ))}
                </div>

                <div className="mt-8 flex flex-col gap-5 text-xs font-black uppercase text-white/70 md:flex-row md:items-center md:justify-between">
                  <p>
                    View {firstVisible}-{lastVisible} out of{" "}
                    {filteredEvents.length}
                  </p>
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setPage}
                  />
                </div>
              </>
            ) : (
              <EmptyState status={status} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
