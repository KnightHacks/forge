"use client";

import {
  ArrowRight,
  Building2,
  CalendarDays,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Github,
  Globe2,
  History,
  Linkedin,
  MapPin,
  Settings,
  Sparkles,
  Trophy,
} from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { cn } from "@forge/ui";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Card, CardContent } from "@forge/ui/card";
import { MEMBER_DUES_PATH, MEMBER_SETTINGS_PATH } from "@forge/validators";

import type {
  MemberAttendanceItem,
  MemberEventItem,
} from "~/app/_components/member/member-events-dashboard";
import type { CurrentMember } from "~/hooks/use-member";
import { MemberProfilePictureUpload } from "~/app/_components/member/member-profile-picture-upload";
import { MemberQRCodeDialog } from "~/app/_components/member/member-qr-code-dialog";
import { MemberResumeUpload } from "~/app/_components/member/member-resume-upload";
import { MemberRouteTransitionLink } from "~/app/_components/member/member-route-transition-link";
import { formatEventDateTime } from "~/lib/event-dates";

export const dashboardGridClass =
  "grid w-full gap-4 md:gap-6 lg:min-h-[calc(100svh-8rem)] lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-stretch xl:grid-cols-[minmax(0,1fr)_28rem]";
export const dashboardPanelClass =
  "overflow-hidden border-white/10 bg-card/95 py-0 shadow-2xl shadow-black/25 lg:h-full lg:min-h-[calc(100svh-8rem)] lg:max-h-[calc(100svh-8rem)]";
export const dashboardNestedSurfaceClass =
  "rounded-md border border-white/10 bg-background/60";

export type CurrentDuesStatus = RouterOutputs["dues"]["getStatus"];

function DashboardContent({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

function EmptyValue({ children = "Not set" }: { children?: string }) {
  return <span className="text-muted-foreground">{children}</span>;
}

function DuesStatusBadge({ duesStatus }: { duesStatus: CurrentDuesStatus }) {
  if (duesStatus.paid) {
    return (
      <Badge
        variant="outline"
        className="border-[hsl(var(--chart-2)/0.35)] bg-[hsl(var(--chart-2)/0.14)] text-[hsl(var(--chart-2))]"
      >
        Paid
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="border-white/10 bg-muted/20 text-muted-foreground"
    >
      Unpaid
    </Badge>
  );
}

function DuesStatusTile({
  className,
  compact = false,
  duesStatus,
}: {
  className?: string;
  compact?: boolean;
  duesStatus: CurrentDuesStatus;
}) {
  return (
    <DashboardContent
      role="group"
      aria-label="Dues status"
      className={cn(
        dashboardNestedSurfaceClass,
        "space-y-3 p-3 md:p-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <CreditCard className="h-4 w-4 text-primary" aria-hidden="true" />
            Dues
          </div>
          <p
            className={cn(
              "text-sm leading-5 text-muted-foreground",
              compact && "line-clamp-2",
            )}
          >
            {duesStatus.paid
              ? `Paid for the ${duesStatus.paymentAcademicYear.label}.`
              : `Dues unpaid for the ${duesStatus.payableAcademicYear.label}.`}
          </p>
        </div>
        <DuesStatusBadge duesStatus={duesStatus} />
      </div>

      {!duesStatus.paid && (
        <Button asChild size={compact ? "sm" : "md"} className="w-full gap-2">
          <MemberRouteTransitionLink href={MEMBER_DUES_PATH}>
            Pay dues
          </MemberRouteTransitionLink>
        </Button>
      )}
    </DashboardContent>
  );
}

function EventsOverview({
  attendance,
  className,
  events,
  unavailable = false,
}: {
  attendance: MemberAttendanceItem[];
  className?: string;
  events: MemberEventItem[];
  unavailable?: boolean;
}) {
  const upcoming = events.slice(0, 2);
  const recent = attendance.slice(0, 3);

  return (
    <DashboardContent
      role="region"
      aria-label="Events overview"
      data-dashboard-events-layout="stacked"
      className={cn(
        dashboardNestedSurfaceClass,
        "flex flex-col p-3 md:p-4",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-medium">
          <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
          Events
        </div>
        <MemberRouteTransitionLink
          href="/member/events"
          className="flex min-h-11 items-center gap-1 rounded-md px-2 text-sm font-medium text-primary transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          View all
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </MemberRouteTransitionLink>
      </div>

      {unavailable ? (
        <p
          role="status"
          className="mt-3 rounded-md border border-dashed border-white/10 p-3 text-sm text-muted-foreground"
        >
          Event information is temporarily unavailable. Your profile and dues
          information are still available.
        </p>
      ) : (
        <div className="mt-3 grid gap-4">
          <section aria-labelledby="dashboard-upcoming-events">
            <h3
              id="dashboard-upcoming-events"
              className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              Up next
            </h3>
            <div className="grid gap-2">
              {upcoming.length === 0 ? (
                <p className="rounded-md border border-dashed border-white/10 p-3 text-sm text-muted-foreground">
                  No upcoming events right now.
                </p>
              ) : (
                upcoming.map((event) => (
                  <article
                    key={event.id}
                    className="relative overflow-hidden rounded-md border border-white/10 bg-card/50 p-3 pl-4"
                  >
                    <span
                      className="absolute inset-y-0 left-0 w-1"
                      style={{ backgroundColor: event.tagColor }}
                      aria-hidden="true"
                    />
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h4 className="min-w-0 break-words text-sm font-semibold">
                        {event.name}
                      </h4>
                      {event.locked && (
                        <Badge variant="outline" className="shrink-0">
                          Dues required
                        </Badge>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {formatEventDateTime(event.startAt)}
                    </p>
                    <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin
                        className="h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="truncate">{event.location}</span>
                    </p>
                  </article>
                ))
              )}
            </div>
          </section>

          <section aria-labelledby="dashboard-recent-events">
            <h3
              id="dashboard-recent-events"
              className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              <History className="h-3.5 w-3.5" aria-hidden="true" />
              Recently attended
            </h3>
            <div className="grid gap-2">
              {recent.length === 0 ? (
                <p className="rounded-md border border-dashed border-white/10 p-3 text-sm text-muted-foreground">
                  Your attendance history is empty.
                </p>
              ) : (
                recent.map((record) => (
                  <article
                    key={record.attendanceId}
                    className="rounded-md border border-white/10 bg-card/50 p-3"
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-medium">
                          {record.name}
                        </h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatEventDateTime(
                            record.checkedInAt ?? record.startAt,
                          )}
                        </p>
                      </div>
                      <span className="flex shrink-0 items-center gap-1 font-mono text-sm text-primary">
                        <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                        {record.pointsAwarded ?? "?"}
                      </span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </DashboardContent>
  );
}

function GuildProfileCard({
  attendance,
  duesStatus,
  events,
  eventsUnavailable,
  member,
}: {
  attendance: MemberAttendanceItem[];
  duesStatus: CurrentDuesStatus;
  events: MemberEventItem[];
  eventsUnavailable: boolean;
  member: CurrentMember;
}) {
  const displayName = `${member.firstName} ${member.lastName}`.trim();
  const isPublic = member.guildProfileVisible;
  const links = [
    {
      href: member.githubProfileUrl,
      icon: Github,
      label: "GitHub",
    },
    {
      href: member.linkedinProfileUrl,
      icon: Linkedin,
      label: "LinkedIn",
    },
    {
      href: member.websiteUrl,
      icon: Globe2,
      label: "Portfolio",
    },
  ];

  return (
    <Card
      role="region"
      aria-label="Guild profile"
      className={cn(dashboardPanelClass, "order-1 flex flex-col lg:order-2")}
    >
      <CardContent className="flex min-h-[calc(100svh-6rem)] flex-1 flex-col gap-4 p-4 pt-5 md:gap-6 md:p-6 md:pt-8 lg:min-h-0 lg:overflow-y-auto">
        <DashboardContent className="relative flex flex-col items-center text-center">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 shrink-0 text-muted-foreground hover:text-foreground"
          >
            <MemberRouteTransitionLink
              href={MEMBER_SETTINGS_PATH}
              aria-label="Edit profile"
            >
              <Settings
                className="h-5 w-5 transition-transform duration-200 group-hover:rotate-45 group-data-[exiting=true]:-rotate-90 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </MemberRouteTransitionLink>
          </Button>
          <MemberProfilePictureUpload
            avatarClassName="h-[36vw] w-[36vw] min-h-32 min-w-32 max-h-44 max-w-44 lg:h-32 lg:w-32 lg:min-h-0 lg:min-w-0 lg:max-h-none lg:max-w-none"
            displayName={displayName}
            initialProfilePictureUrl={member.profilePictureUrl}
          />
          <div className="mt-2 space-y-2">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <h2 className="text-xl font-semibold tracking-normal md:text-2xl">
                {displayName}
              </h2>
              <Badge
                variant="outline"
                className="hidden gap-1 rounded-full border-primary/30 bg-primary/10 px-2 py-0.5 text-[0.7rem] text-primary sm:inline-flex"
              >
                {isPublic ? (
                  <Eye className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <EyeOff className="h-3 w-3" aria-hidden="true" />
                )}
                {isPublic ? "Public" : "Private"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {member.tagline || <EmptyValue>Add a Guild tagline</EmptyValue>}
            </p>
          </div>
        </DashboardContent>

        <DashboardContent className="lg:hidden">
          <MemberQRCodeDialog variant="mobile" />
        </DashboardContent>

        <DuesStatusTile compact duesStatus={duesStatus} className="lg:hidden" />

        <EventsOverview
          attendance={attendance}
          events={events}
          unavailable={eventsUnavailable}
          className="lg:hidden"
        />

        <DashboardContent
          role="group"
          aria-label="Company"
          className={cn(dashboardNestedSurfaceClass, "p-3 lg:hidden")}
        >
          <div className="mb-2 flex items-center gap-2 text-xs uppercase text-muted-foreground">
            <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
            Company
          </div>
          <p className="break-words text-sm font-medium">
            {member.company || <EmptyValue>Not listed</EmptyValue>}
          </p>
        </DashboardContent>

        <DashboardContent
          className={cn(
            dashboardNestedSurfaceClass,
            "hidden max-h-36 min-h-0 overflow-y-auto p-3 md:p-4 lg:block lg:flex-1",
          )}
        >
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            About
          </div>
          <p className="break-words text-sm leading-6 text-muted-foreground">
            {member.about || <EmptyValue>No Guild bio yet</EmptyValue>}
          </p>
        </DashboardContent>

        <DashboardContent className="hidden gap-3 sm:grid-cols-2 lg:grid lg:grid-cols-1 xl:grid-cols-2">
          <div className={cn(dashboardNestedSurfaceClass, "p-3 md:p-4")}>
            <div className="mb-2 flex items-center gap-2 text-xs uppercase text-muted-foreground">
              <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
              Company
            </div>
            <p className="break-words text-sm font-medium">
              {member.company || <EmptyValue>Not listed</EmptyValue>}
            </p>
          </div>
          <div className={cn(dashboardNestedSurfaceClass, "p-3 md:p-4")}>
            <div className="mb-2 flex items-center gap-2 text-xs uppercase text-muted-foreground">
              {isPublic ? (
                <Eye className="h-4 w-4 text-primary" aria-hidden="true" />
              ) : (
                <EyeOff className="h-4 w-4 text-primary" aria-hidden="true" />
              )}
              Visibility
            </div>
            <p className="text-sm font-medium">
              {isPublic ? "Members + sponsors" : "Sponsors only"}
            </p>
          </div>
        </DashboardContent>

        <DashboardContent className="space-y-2">
          <p className="text-xs uppercase text-muted-foreground">Links</p>
          <div className="grid gap-2">
            {links.map((link) => {
              const Icon = link.icon;

              if (!link.href) {
                return (
                  <div
                    key={link.label}
                    className={cn(
                      dashboardNestedSurfaceClass,
                      "flex items-center justify-between px-3 py-2 text-sm text-muted-foreground",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {link.label}
                    </span>
                    <span>Not set</span>
                  </div>
                );
              }

              return (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    dashboardNestedSurfaceClass,
                    "flex items-center justify-between px-3 py-2 text-sm transition hover:border-primary/40 hover:bg-primary/10",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate">{link.label}</span>
                  </span>
                  <ExternalLink
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </a>
              );
            })}
          </div>
        </DashboardContent>

        <DashboardContent className={cn(dashboardNestedSurfaceClass, "p-3")}>
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
            Resume
          </div>
          <MemberResumeUpload
            initialResumeUrl={member.resumeUrl}
            variant="compact"
          />
        </DashboardContent>
      </CardContent>
    </Card>
  );
}

export function MemberDashboard({
  attendance,
  duesStatus,
  events,
  eventsUnavailable = false,
  member,
}: {
  attendance: MemberAttendanceItem[];
  duesStatus: CurrentDuesStatus;
  events: MemberEventItem[];
  eventsUnavailable?: boolean;
  member: CurrentMember;
}) {
  return (
    <main className="container py-4 md:py-8 lg:flex lg:min-h-[calc(100svh-4rem)] lg:items-stretch">
      <section className={dashboardGridClass}>
        <Card
          role="region"
          aria-label="Member details"
          className={cn(
            dashboardPanelClass,
            "order-2 hidden lg:order-1 lg:flex",
          )}
        >
          <CardContent className="flex h-full flex-col justify-start gap-4 p-4 md:gap-6 md:p-6 lg:overflow-y-auto lg:p-8">
            <DashboardContent className="flex flex-wrap items-start justify-between gap-3">
              <h1 className="text-2xl font-semibold tracking-normal md:text-5xl">
                Welcome, {member.firstName}
              </h1>
              <MemberQRCodeDialog />
            </DashboardContent>

            <DuesStatusTile duesStatus={duesStatus} />

            <EventsOverview
              attendance={attendance}
              events={events}
              unavailable={eventsUnavailable}
            />
          </CardContent>
        </Card>

        <GuildProfileCard
          attendance={attendance}
          duesStatus={duesStatus}
          events={events}
          eventsUnavailable={eventsUnavailable}
          member={member}
        />
      </section>
    </main>
  );
}
