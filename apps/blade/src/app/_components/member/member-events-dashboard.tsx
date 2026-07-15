import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  History,
  LockKeyhole,
  MapPin,
  Trophy,
  UsersRound,
} from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { MarkdownContent } from "@forge/ui/markdown-content";

import { formatEventDateTime } from "~/lib/event-dates";

export type MemberEventItem =
  RouterOutputs["event"]["listMemberEvents"][number];
export type MemberAttendanceItem =
  RouterOutputs["event"]["listMemberAttendance"][number];

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

function checkInLabel(count: number) {
  return `${count} ${count === 1 ? "check-in" : "check-ins"}`;
}

function compactUtc(iso: string) {
  return new Date(iso)
    .toISOString()
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replace(/\.\d{3}Z$/, "Z");
}

export function googleCalendarUrl(event: MemberEventItem) {
  const query = new URLSearchParams({
    action: "TEMPLATE",
    dates: `${compactUtc(event.startAt)}/${compactUtc(event.endAt)}`,
    details: event.description,
    location: event.location,
    text: `[${event.tag}] ${event.name}`,
  });
  return `https://calendar.google.com/calendar/render?${query.toString()}`;
}

function DescriptionDetails({ description }: { description: string }) {
  if (!description.trim()) return null;
  return (
    <details className="group rounded-md border border-white/10 bg-card/45 px-3 py-2">
      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-0">
        View description
      </summary>
      <MarkdownContent className="mt-2 text-sm leading-6 text-muted-foreground">
        {description}
      </MarkdownContent>
    </details>
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
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Member schedule</p>
          <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">Events</h1>
        </div>
        <Button asChild variant="outline" className="min-h-11 gap-2">
          <Link href="/member/dashboard">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to dashboard
          </Link>
        </Button>
      </header>

      <section
        aria-labelledby="upcoming-events-heading"
        className="rounded-lg border border-white/10 bg-card/95 shadow-2xl shadow-black/25"
      >
        <div className="flex items-center gap-3 border-b border-border/70 p-4 sm:p-5">
          <CalendarDays className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 id="upcoming-events-heading" className="text-lg font-semibold">
            Upcoming events
          </h2>
        </div>

        <div
          data-member-events-layout="stacked"
          className="grid min-w-0 gap-3 p-3 sm:p-5"
        >
          {events.length === 0 ? (
            <div className="rounded-md border border-dashed border-white/10 p-8 text-center text-sm text-muted-foreground">
              No upcoming events are available for your account.
            </div>
          ) : (
            events.map((event) => (
              <article
                key={event.id}
                className="relative min-w-0 overflow-hidden rounded-lg border border-white/10 bg-background/60 p-4 pl-6"
              >
                <span
                  className="absolute inset-y-0 left-0 w-1"
                  style={{ backgroundColor: event.tagColor }}
                  aria-hidden="true"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <TagPill color={event.tagColor} name={event.tag} />
                  {event.internal && <Badge variant="outline">Internal</Badge>}
                  {event.locked && (
                    <Badge variant="outline" className="gap-1.5">
                      <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
                      Dues required
                    </Badge>
                  )}
                </div>

                <h3 className="mt-4 break-words text-xl font-semibold leading-tight">
                  {event.name}
                </h3>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                  <span className="flex items-start gap-2">
                    <CalendarDays
                      className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    {formatEventDateTime(event.startAt)}
                  </span>
                  <span className="flex min-w-0 items-start gap-2">
                    <MapPin
                      className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <span className="break-words">{event.location}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <UsersRound
                      className="h-4 w-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    {checkInLabel(event.attendanceCount)}
                  </span>
                </div>

                <div className="mt-4">
                  <DescriptionDetails description={event.description} />
                </div>

                <div className="flex flex-wrap gap-2 pt-4">
                  {event.discordUrl && (
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="min-h-11 sm:min-h-8"
                    >
                      <a
                        href={event.discordUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open in Discord
                        <ExternalLink
                          className="ml-2 h-4 w-4"
                          aria-hidden="true"
                        />
                      </a>
                    </Button>
                  )}
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="min-h-11 sm:min-h-8"
                  >
                    <a
                      href={googleCalendarUrl(event)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Add to Google Calendar
                      <ExternalLink
                        className="ml-2 h-4 w-4"
                        aria-hidden="true"
                      />
                    </a>
                  </Button>
                  {event.locked && (
                    <Button asChild size="sm" className="min-h-11 sm:min-h-8">
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
          <h2 id="attendance-history-heading" className="text-lg font-semibold">
            Attendance history
          </h2>
        </div>

        <div
          data-member-attendance-layout="stacked"
          className="grid gap-3 p-3 sm:p-5"
        >
          {attendance.length === 0 ? (
            <div className="rounded-md border border-dashed border-white/10 p-8 text-center text-sm text-muted-foreground">
              Your attendance history is empty.
            </div>
          ) : (
            attendance.map((record) => (
              <article
                key={record.attendanceId}
                className="min-w-0 rounded-lg border border-white/10 bg-background/60 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <TagPill color={record.tagColor} name={record.tag} />
                  <div className="flex items-center gap-2 rounded-md border border-white/10 bg-card/60 px-3 py-2">
                    <Trophy
                      className="h-4 w-4 text-primary"
                      aria-hidden="true"
                    />
                    <span className="font-mono text-sm">
                      {record.pointsAwarded ?? "Unknown"} points
                    </span>
                  </div>
                </div>
                <h3 className="mt-4 break-words text-lg font-semibold">
                  {record.name}
                </h3>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                  <span className="flex items-start gap-2">
                    <CalendarDays
                      className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    {formatEventDateTime(record.startAt)}
                  </span>
                  <span className="flex min-w-0 items-start gap-2">
                    <MapPin
                      className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <span className="break-words">{record.location}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <UsersRound
                      className="h-4 w-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    {checkInLabel(record.attendanceCount)}
                  </span>
                  {record.checkedInAt && (
                    <span>
                      Checked in {formatEventDateTime(record.checkedInAt)}
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <DescriptionDetails description={record.description} />
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
