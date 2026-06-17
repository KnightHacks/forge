"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Button } from "@forge/ui/button";

import type { EventsStatus, PublicClubEvent } from "../_lib/club-events";
import {
  formatEventDate,
  formatEventTime,
  loadClubEvents,
} from "../_lib/club-events";

const HOME_EVENT_LIMIT = 3;

function ExternalArrow() {
  return <ArrowUpRight aria-hidden="true" className="ml-2 size-4" />;
}

function getSafeEventLimit(limit: number) {
  if (!Number.isFinite(limit)) return HOME_EVENT_LIMIT;

  return Math.max(1, Math.floor(limit));
}

function LoadingRows({ eventLimit }: { eventLimit: number }) {
  return (
    <div className="mt-14" aria-hidden="true">
      {Array.from({ length: eventLimit }).map((_, index) => (
        <article
          key={index}
          className="grid grid-cols-[4rem_4.5rem_1fr] items-center gap-4 border-b border-white/10 py-8 md:grid-cols-[5rem_5.5rem_1fr_15rem] md:gap-6"
        >
          <div className="space-y-2">
            <div className="mx-auto h-3 w-8 animate-pulse rounded-sm bg-white/20" />
            <div className="mx-auto h-3 w-7 animate-pulse rounded-sm bg-white/15" />
          </div>
          <div className="h-12 w-16 animate-pulse rounded-sm bg-white/20 md:h-16" />
          <div className="space-y-3">
            <div className="bg-[var(--club-gold)]/35 h-3 w-36 animate-pulse rounded-sm" />
            <div className="h-6 w-44 animate-pulse rounded-sm bg-white/20" />
            <div className="h-4 max-w-[21rem] animate-pulse rounded-sm bg-white/15" />
          </div>
          <div className="col-span-3 hidden aspect-[1.65] animate-pulse rounded-lg bg-[#59168b]/55 md:col-span-1 md:block" />
        </article>
      ))}
    </div>
  );
}

function EventRow({ event }: { event: PublicClubEvent }) {
  const eventDate = formatEventDate(event.startDateTime);
  const eventTime = formatEventTime(event.startDateTime);
  const meta = [eventTime, event.location].filter(Boolean).join(" | ");

  return (
    <article className="club-event-row grid grid-cols-[4rem_4.5rem_1fr] items-center gap-4 border-b border-white/10 py-8 md:grid-cols-[5rem_5.5rem_1fr_15rem] md:gap-6">
      <div className="club-event-row-date text-center text-xs font-bold uppercase leading-4 text-white/70">
        <p>{eventDate.month}</p>
        <p>{eventDate.dayName}</p>
      </div>
      <p className="club-event-row-day text-5xl font-black leading-none text-white md:text-6xl">
        {eventDate.day}
      </p>
      <div className="club-event-row-copy">
        <p className="text-xs font-bold uppercase text-[var(--club-gold)]">
          {meta}
        </p>
        <h3 className="mt-2 text-2xl font-black leading-tight text-white">
          {event.name}
        </h3>
        <p className="mt-2 line-clamp-2 max-w-[21rem] text-sm leading-5 text-[var(--club-muted)]">
          {event.description}
        </p>
      </div>
      <div className="club-event-tag-card col-span-3 hidden aspect-[1.65] items-center justify-center rounded-lg bg-[#59168b]/55 px-5 text-center md:col-span-1 md:flex">
        <span className="text-white/72 text-xs font-black uppercase">
          {event.tag}
        </span>
      </div>
    </article>
  );
}

export function HomeEvents({
  allEventsHref,
  allEventsLabel = "View All Events",
  bladeUrl,
  eventLimit = HOME_EVENT_LIMIT,
}: {
  allEventsHref: string;
  allEventsLabel?: string;
  bladeUrl: string;
  eventLimit?: number;
}) {
  const [events, setEvents] = useState<PublicClubEvent[]>([]);
  const [status, setStatus] = useState<EventsStatus>("loading");
  const safeEventLimit = getSafeEventLimit(eventLimit);

  useEffect(() => {
    const abortController = new AbortController();

    async function loadEvents() {
      setStatus("loading");

      try {
        const bladeEvents = await loadClubEvents({
          bladeUrl,
          limit: safeEventLimit,
          signal: abortController.signal,
        });

        setEvents(bladeEvents);
        setStatus("ready");
      } catch {
        if (abortController.signal.aborted) return;

        setEvents([]);
        setStatus("error");
      }
    }

    void loadEvents();

    return () => abortController.abort();
  }, [bladeUrl, safeEventLimit]);

  const homeEvents = useMemo(
    () => events.slice(0, safeEventLimit),
    [events, safeEventLimit],
  );

  return (
    <>
      {status === "loading" ? (
        <LoadingRows eventLimit={safeEventLimit} />
      ) : homeEvents.length > 0 ? (
        <div className="mt-14" data-stagger>
          {homeEvents.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <div className="mt-14 border-b border-white/10 py-12 text-center">
          <p className="text-base font-bold text-[var(--club-muted)]">
            {status === "error"
              ? "Blade events are unavailable right now."
              : "No upcoming Blade events are published yet."}
          </p>
        </div>
      )}

      <div className="mt-12 text-center" data-reveal="pop">
        <Button
          asChild
          size="lg"
          className="club-button bg-white text-black shadow-[4px_4px_0_var(--club-gold)]"
        >
          <Link href={allEventsHref}>
            {allEventsLabel}
            <ExternalArrow />
          </Link>
        </Button>
      </div>
    </>
  );
}
