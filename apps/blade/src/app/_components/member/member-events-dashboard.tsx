import Link from "next/link";
import {
  CalendarDays,
  History,
  LockKeyhole,
  MapPin,
  Trophy,
} from "lucide-react";

import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";

import { formatEventDateTime } from "~/lib/event-dates";

export interface MemberEventItem {
  audience: "dues" | "public" | "roles";
  description: string;
  endDateTime: string;
  id: string;
  internal: boolean;
  location: string;
  locked: boolean;
  name: string;
  startDateTime: string;
  tag: string;
  tagColor: string;
}

export interface MemberAttendanceItem {
  attendanceId: string;
  checkedInAt: string | null;
  estimated: boolean;
  eventId: string;
  eventName: string;
  pointsAwarded: number | null;
  startDateTime: string;
  tag: string;
  tagColor: string;
}

function TagPill({ color, name }: { color: string; name: string }) {
  return (
    <Badge
      variant="outline"
      className="gap-2 rounded-full border-white/10 bg-background/60"
    >
      <span
        className="h-2.5 w-2.5 rounded-full border border-white/20"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      {name}
    </Badge>
  );
}

export function MemberEventsDashboard({
  attendance,
  events,
}: {
  attendance: MemberAttendanceItem[];
  events: MemberEventItem[];
}) {
  return (
    <main className="container min-w-0 space-y-5 pb-16 pt-5 sm:space-y-6 sm:pt-8">
      <header>
        <p className="text-sm font-medium text-primary">Member schedule</p>
        <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">Events</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Find upcoming club events and review your check-in history.
        </p>
      </header>

      <section
        aria-labelledby="upcoming-events-heading"
        className="rounded-lg border border-white/10 bg-card/95 shadow-2xl shadow-black/25"
      >
        <div className="flex items-center gap-3 border-b border-border/70 p-4 sm:p-5">
          <CalendarDays className="h-5 w-5 text-primary" aria-hidden="true" />
          <div>
            <h2 id="upcoming-events-heading" className="text-lg font-semibold">
              Upcoming events
            </h2>
            <p className="text-sm text-muted-foreground">
              Times are shown in America/New_York.
            </p>
          </div>
        </div>

        <div className="grid min-w-0 gap-3 p-3 sm:p-5">
          {events.length === 0 ? (
            <div className="rounded-md border border-dashed border-white/10 p-8 text-center text-sm text-muted-foreground">
              No upcoming events are available for your account.
            </div>
          ) : (
            events.map((event) => (
              <article
                key={event.id}
                className="relative min-w-0 overflow-hidden rounded-md border border-white/10 bg-background/60 p-3 pl-5 sm:p-4 sm:pl-6"
              >
                <span
                  className="absolute inset-y-0 left-0 w-1"
                  style={{ backgroundColor: event.tagColor }}
                  aria-hidden="true"
                />
                <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <TagPill color={event.tagColor} name={event.tag} />
                      {event.internal && (
                        <Badge variant="outline">Internal</Badge>
                      )}
                      {event.locked && (
                        <Badge variant="outline" className="gap-1.5">
                          <LockKeyhole
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          Dues required
                        </Badge>
                      )}
                    </div>
                    <h3 className="mt-3 break-words text-lg font-semibold">
                      {event.name}
                    </h3>
                    <p className="mt-1 line-clamp-3 text-sm leading-6 text-muted-foreground">
                      {event.description}
                    </p>
                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                      <span className="flex items-start gap-2">
                        <CalendarDays
                          className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                          aria-hidden="true"
                        />
                        {formatEventDateTime(event.startDateTime)}
                      </span>
                      <span className="flex min-w-0 items-start gap-2">
                        <MapPin
                          className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                          aria-hidden="true"
                        />
                        <span className="break-words">{event.location}</span>
                      </span>
                    </div>
                  </div>
                  {event.locked && (
                    <Button asChild className="min-h-11 w-full sm:w-auto">
                      <Link href="/member/dues">Pay dues</Link>
                    </Button>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section
        aria-labelledby="attendance-history-heading"
        className="rounded-lg border border-white/10 bg-card/95 shadow-xl shadow-black/20"
      >
        <div className="flex items-center gap-3 border-b border-border/70 p-4 sm:p-5">
          <History className="h-5 w-5 text-primary" aria-hidden="true" />
          <div>
            <h2
              id="attendance-history-heading"
              className="text-lg font-semibold"
            >
              Attendance history
            </h2>
            <p className="text-sm text-muted-foreground">
              Points stay tied to the value awarded at check-in.
            </p>
          </div>
        </div>

        <div className="grid gap-2 p-3 sm:p-5">
          {attendance.length === 0 ? (
            <div className="rounded-md border border-dashed border-white/10 p-8 text-center text-sm text-muted-foreground">
              Your attendance history is empty.
            </div>
          ) : (
            attendance.map((record) => (
              <div
                key={record.attendanceId}
                className="grid min-w-0 gap-3 rounded-md border border-white/10 bg-background/60 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <TagPill color={record.tagColor} name={record.tag} />
                    {record.estimated && (
                      <Badge
                        variant="outline"
                        className="border-[hsl(var(--chart-3)/0.35)] text-[hsl(var(--chart-3))]"
                      >
                        Estimated
                      </Badge>
                    )}
                  </div>
                  <h3 className="mt-2 truncate text-sm font-medium">
                    {record.eventName}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {record.checkedInAt
                      ? `Checked in ${formatEventDateTime(record.checkedInAt)}`
                      : `${record.estimated ? "Legacy check-in time unavailable" : "Check-in time unavailable"} · Event ${formatEventDateTime(record.startDateTime)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-md border border-white/10 bg-card/60 px-3 py-2">
                  <Trophy className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span className="font-mono text-sm">
                    {record.pointsAwarded ?? "Unknown"} points
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
