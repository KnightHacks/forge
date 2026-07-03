"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  LifeBuoy,
  Loader2,
  LockKeyhole,
  MapPin,
  QrCode,
  UserRound,
} from "lucide-react";

import type { HackerStatus } from "@forge/hackathon";
import { getHackerLifecycleState } from "@forge/hackathon";
import { useHackerDashboardFlow } from "@forge/hackathon/client";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";
import { Textarea } from "@forge/ui/textarea";
import { toast } from "@forge/ui/toast";

const statusLabels: Record<HackerStatus, string> = {
  accepted: "Accepted: action needed",
  checkedin: "Checked in",
  confirmed: "Attendance confirmed",
  denied: "Not selected",
  pending: "In review",
  waitlisted: "Waitlisted",
  withdrawn: "Withdrawn",
};

const statusMessages: Record<HackerStatus, string> = {
  accepted:
    "Your application was accepted. Confirm your place before the deadline.",
  checkedin: "You are checked in. Your on-site tools and schedule are ready.",
  confirmed: "Your place at BloomKnights is reserved. We will see you at UCF.",
  denied:
    "We could not offer you a place at this event. Thank you for applying.",
  pending:
    "The organizer team is reviewing your application. No action is needed yet.",
  waitlisted:
    "You are on the waitlist. We will update this page if a place opens.",
  withdrawn:
    "You withdrew from this event. Your application remains on record.",
};

const statusTone: Record<HackerStatus, string> = {
  accepted: "border-[#a0789d] bg-[#f0e9f3] text-[#5c4262]",
  checkedin: "border-[#7aab5a] bg-[#e7f0d8] text-[#245f35]",
  confirmed: "border-[#7aab5a] bg-[#e7f0d8] text-[#245f35]",
  denied: "border-[#b59b86] bg-[#f2e9e2] text-[#5a4535]",
  pending: "border-[#c4a882] bg-[#fff4cf] text-[#6c501d]",
  waitlisted: "border-[#a58fb7] bg-[#eee8f3] text-[#5c4262]",
  withdrawn: "border-[#9aa99b] bg-[#edf0e8] text-[#4f5f50]",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/New_York",
});

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "full",
  timeZone: "America/New_York",
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/New_York",
});

export function BloomDashboard() {
  const {
    config,
    confirmAttendance,
    confirmMutation,
    dashboard,
    dashboardQuery,
    loadQRCode,
    qrCode,
    qrMutation,
    reportIssue,
    reportIssueMutation,
    resumeUrl,
    schedule,
    withdrawAttendance,
    withdrawMutation,
  } = useHackerDashboardFlow();
  const [issue, setIssue] = useState("");
  const [issueOpen, setIssueOpen] = useState(false);

  if (dashboardQuery.isPending) {
    return (
      <PortalMessage
        icon={<Loader2 className="animate-spin" />}
        title="Loading your dashboard…"
      />
    );
  }

  if (dashboardQuery.isError || !dashboard) {
    return (
      <PortalMessage
        icon={<AlertCircle />}
        title="We could not load your dashboard."
        body="Refresh the page or try again in a moment."
      />
    );
  }

  const { hackathon, participant } = dashboard;

  // The server redirects first-time participants to /apply. This remains as a
  // resilient fallback if the client cache is briefly behind the server.
  if (!participant) {
    return (
      <PortalMessage
        icon={<FileText />}
        title="Start your BloomKnights application."
        body="Your dashboard becomes available as soon as your application is submitted."
        action={
          <Button asChild className="bk-bloom-cta-action bk-portal-button px-5">
            <Link href="/apply">Go to application</Link>
          </Button>
        }
      />
    );
  }

  const lifecycleState = getHackerLifecycleState({
    applicationDeadline: hackathon.applicationDeadline,
    applicationOpen: hackathon.applicationOpen,
    confirmationCapacity: hackathon.confirmationCapacity,
    confirmationDeadline: hackathon.confirmationDeadline,
    confirmedCount: dashboard.confirmedCount,
    now: new Date(),
    status: participant.status,
  });
  const confirmationClosed = lifecycleState === "accepted-confirmation-closed";
  const atCapacity = lifecycleState === "accepted-at-capacity";
  const actionPending = confirmMutation.isPending || withdrawMutation.isPending;
  const qrAvailable =
    participant.status === "confirmed" || participant.status === "checkedin";

  const handleConfirm = async () => {
    try {
      await confirmAttendance();
      toast.success("You are confirmed for BloomKnights!");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not confirm attendance.",
      );
    }
  };

  const handleWithdraw = async () => {
    try {
      await withdrawAttendance();
      toast.success("Your BloomKnights attendance has been withdrawn.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not withdraw attendance.",
      );
    }
  };

  return (
    <div className="bk-dashboard-stack space-y-5 text-[#3d2e1e] sm:space-y-6">
      <section className="bk-portal-panel bk-dashboard-panel bk-dashboard-hero-panel">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="bk-dashboard-hero-copy p-4 sm:p-8 lg:col-start-1 lg:row-start-1 lg:p-10">
            <p className="bk-portal-kicker">Dashboard</p>
            <h1 className="bk-portal-heading mt-2 max-w-3xl text-2xl leading-tight sm:mt-3 sm:text-5xl">
              Welcome back, {participant.firstName}!
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#5a4535] sm:mt-3 sm:text-base">
              Check your application status and get ready for BloomKnights.
            </p>
            <div className="mt-4 flex flex-col items-start gap-2 sm:mt-6 sm:flex-row sm:items-center sm:gap-3">
              <span
                className={`bk-dashboard-status font-righteous inline-flex min-h-8 items-center rounded-lg border px-3 py-1 text-xs tracking-[0.02em] ${statusTone[participant.status]}`}
              >
                {statusLabels[participant.status]}
              </span>
              <p className="max-w-2xl text-sm font-medium leading-6 text-[#5a4535]">
                {statusMessages[participant.status]}
              </p>
            </div>
          </div>

          {participant.status === "accepted" && (
            <div className="bk-dashboard-action-strip grid gap-4 border-t border-[#c4a882]/30 bg-[#c9b8d8]/20 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-5 sm:p-8 lg:col-span-2 lg:row-start-2">
              <div>
                <p className="bk-portal-kicker">Next step</p>
                <h2 className="font-righteous mt-1 text-xl text-[#245f35]">
                  Confirm your place
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-[#5a4535]">
                  Read the event terms and confirm by{" "}
                  {dateFormatter.format(hackathon.confirmationDeadline)}.
                </p>
                <a
                  href={config.termsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-[#245f35] underline decoration-2 underline-offset-4 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7aab5a]"
                >
                  Read the event terms <ArrowUpRight className="size-4" />
                </a>
              </div>
              <Button
                className="bk-bloom-cta-action bk-portal-button min-w-48 px-5 max-sm:w-full"
                disabled={actionPending || confirmationClosed || atCapacity}
                onClick={() => void handleConfirm()}
              >
                <span className="inline-flex size-4 items-center justify-center">
                  {actionPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                </span>
                {confirmationClosed || atCapacity
                  ? "Confirmation closed"
                  : "Agree and confirm"}
              </Button>
            </div>
          )}

          {participant.status === "confirmed" && (
            <div className="bk-dashboard-action-strip grid gap-4 border-t border-[#c4a882]/30 bg-[#a8c490]/20 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-5 sm:p-8 lg:col-span-2 lg:row-start-2">
              <div>
                <p className="bk-portal-kicker text-[#245f35]">
                  You&apos;re on the list
                </p>
                <h2 className="font-righteous mt-1 text-xl text-[#245f35]">
                  Your place is confirmed.
                </h2>
                <p className="mt-1 text-sm leading-6 text-[#5a4535]">
                  Plans changed? Withdraw here so another hacker can attend.
                </p>
              </div>
              <Button
                variant="outline"
                className="min-h-11 min-w-48 rounded-lg border-[#245f35]/35 bg-[#fff8de]/55 text-[#245f35] hover:border-[#b64a4a]/70 hover:bg-[#fff1ed] hover:text-[#a83232] focus-visible:text-[#245f35] max-sm:w-full"
                disabled={actionPending}
                onClick={() => void handleWithdraw()}
              >
                {actionPending && <Loader2 className="size-4 animate-spin" />}
                Withdraw attendance
              </Button>
            </div>
          )}

          <aside className="bk-dashboard-event-card border-t border-[#c4a882]/30 bg-[#daeaf5]/45 p-4 sm:p-7 lg:col-start-2 lg:row-start-1 lg:border-l lg:border-t-0">
            <p className="bk-portal-kicker text-[#245f35]">Event details</p>
            <dl className="mt-4 space-y-4 text-sm sm:mt-5 sm:space-y-5">
              <div className="bk-dashboard-detail-row grid grid-cols-[1.25rem_1fr] gap-3">
                <CalendarDays aria-hidden="true" className="mt-0.5 size-5" />
                <div>
                  <dt className="font-righteous text-[#245f35]">Date</dt>
                  <dd className="mt-0.5 text-[#5a4535]">
                    {dayFormatter.format(hackathon.startDate)}
                  </dd>
                </div>
              </div>
              <div className="bk-dashboard-detail-row grid grid-cols-[1.25rem_1fr] gap-3">
                <Clock3 aria-hidden="true" className="mt-0.5 size-5" />
                <div>
                  <dt className="font-righteous text-[#245f35]">Hours</dt>
                  <dd className="mt-0.5 text-[#5a4535]">
                    {timeFormatter.format(hackathon.startDate)} -{" "}
                    {timeFormatter.format(hackathon.endDate)} ET
                  </dd>
                </div>
              </div>
              <div className="bk-dashboard-detail-row grid grid-cols-[1.25rem_1fr] gap-3">
                <MapPin aria-hidden="true" className="mt-0.5 size-5" />
                <div>
                  <dt className="font-righteous text-[#245f35]">Location</dt>
                  <dd className="mt-0.5 text-[#5a4535]">UCF Business I</dd>
                </div>
              </div>
            </dl>
          </aside>
        </div>
      </section>

      <section
        aria-labelledby="portal-tools-heading"
        className="bk-portal-panel bk-dashboard-panel bk-dashboard-resources-panel"
      >
        <div className="border-b border-[#c4a882]/30 px-5 py-4 sm:px-6">
          <h2
            id="portal-tools-heading"
            className="bk-portal-heading mt-1 text-2xl"
          >
            Resources
          </h2>
        </div>

        <div className="bk-portal-tools-grid bk-dashboard-tools-grid">
          <ActionCard
            description="Update your contact and application details."
            href="/dashboard/profile"
            icon={<UserRound />}
            label="Profile"
          />
          <ActionCard
            description={
              resumeUrl
                ? "Open the resume attached to your application."
                : "Add a resume from your profile."
            }
            href={resumeUrl ?? "/dashboard/profile"}
            external={Boolean(resumeUrl)}
            icon={<FileText />}
            label="Resume"
          />
          <QrActionCard
            available={qrAvailable}
            isLoading={qrMutation.isPending}
            loadQRCode={loadQRCode}
            qrCode={qrCode}
          />
          <ActionCard
            description="Read arrival, venue, and event guidance."
            href={config.guideUrl}
            external
            icon={<ExternalLink />}
            label="Hacker guide"
          />
        </div>
      </section>

      {participant.status === "checkedin" && (
        <section className="bk-portal-panel bk-dashboard-panel p-5 sm:p-8">
          <div className="flex flex-col gap-4 border-b border-[#c4a882]/30 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="bk-portal-kicker">Live at BloomKnights</p>
              <h2 className="bk-portal-heading mt-1 text-2xl sm:text-3xl">
                Event schedule
              </h2>
            </div>
            <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="min-h-11 rounded-lg border-[#245f35]/35 bg-[#fff8de]/55 text-[#245f35]"
                >
                  <LifeBuoy className="size-4" /> Report an issue
                </Button>
              </DialogTrigger>
              <DialogContent
                className="rounded-xl border-[#c4a882]/45 bg-[#f8f3e8] text-[#3d2e1e]"
                style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
              >
                <DialogHeader>
                  <DialogTitle className="font-righteous text-[#245f35]">
                    Report an issue
                  </DialogTitle>
                  <DialogDescription className="text-sm font-semibold leading-6 text-[#5a4535] sm:text-base">
                    Tell the organizer team what is happening and where you are.
                  </DialogDescription>
                </DialogHeader>
                <Textarea
                  aria-label="Issue details"
                  value={issue}
                  onChange={(event) => setIssue(event.target.value)}
                  maxLength={2000}
                  className="min-h-32 rounded-lg border-[#c4a882]/45 bg-[#fffaf0]"
                />
                <DialogFooter>
                  <Button
                    className="bk-portal-button min-w-32"
                    disabled={!issue.trim() || reportIssueMutation.isPending}
                    onClick={async () => {
                      try {
                        await reportIssue(issue.trim());
                        setIssue("");
                        setIssueOpen(false);
                        toast.success("Your issue was sent to the organizers.");
                      } catch (error) {
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : "Could not report the issue.",
                        );
                      }
                    }}
                  >
                    {reportIssueMutation.isPending && (
                      <Loader2 className="size-4 animate-spin" />
                    )}
                    Send report
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="mt-5 divide-y divide-[#c4a882]/30 border-y border-[#c4a882]/30">
            {schedule.length === 0 ? (
              <p className="py-6 text-sm font-medium text-[#5a4535]">
                The live schedule will appear here when it is published.
              </p>
            ) : (
              schedule.map((event) => (
                <article
                  key={event.id}
                  className="bk-dashboard-schedule-item grid gap-3 py-5 md:grid-cols-[10rem_1fr_auto] md:items-start"
                >
                  <p className="font-righteous text-sm text-[#245f35]">
                    {timeFormatter.format(event.startDateTime)}
                  </p>
                  <div>
                    <h3 className="font-righteous text-lg text-[#245f35]">
                      {event.name}
                    </h3>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-[#5a4535]">
                      {event.description}
                    </p>
                    <p className="mt-2 text-sm font-extrabold">
                      {event.location}
                    </p>
                  </div>
                  <Badge className="w-fit rounded-md bg-[#daeaf5] text-[#245f35] hover:bg-[#daeaf5]">
                    {event.tag}
                  </Badge>
                </article>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function PortalMessage({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <section
      aria-live="polite"
      className="bk-portal-panel mx-auto max-w-2xl p-6 text-center text-[#3d2e1e] sm:p-9"
    >
      <div className="bk-portal-tool-icon mx-auto">{icon}</div>
      <h1 className="bk-portal-heading mt-5 text-2xl sm:text-4xl">{title}</h1>
      {body && <p className="mt-3 text-[#5a4535]">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </section>
  );
}

function ActionCard({
  href,
  icon,
  label,
  description,
  external = false,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  description: string;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="bk-portal-tool bk-dashboard-tool group"
    >
      <span className="bk-portal-tool-icon [&_svg]:size-5">{icon}</span>
      <span className="font-righteous mt-3 text-base text-[#245f35] sm:text-lg">
        {label}
      </span>
      <span className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-[#5a4535] sm:text-sm">
        {description}
      </span>
      <ArrowUpRight
        aria-hidden="true"
        className="mt-auto size-4 self-end text-[#7aab5a]"
      />
    </Link>
  );
}

function QrActionCard({
  available,
  isLoading,
  loadQRCode,
  qrCode,
}: {
  available: boolean;
  isLoading: boolean;
  loadQRCode: () => Promise<unknown>;
  qrCode: string | undefined;
}) {
  if (!available) {
    return (
      <div
        aria-disabled="true"
        className="bk-portal-tool bk-dashboard-tool bg-[#edf0e8]/95"
      >
        <span className="bk-portal-tool-icon opacity-70">
          <LockKeyhole className="size-5" />
        </span>
        <span className="font-righteous mt-3 text-base text-[#245f35] sm:text-lg">
          Check-in QR
        </span>
        <span className="mt-1 text-xs font-medium leading-5 text-[#5a4535]/80 sm:text-sm">
          Available after your attendance is confirmed.
        </span>
        <span className="font-righteous mt-auto text-[0.7rem] uppercase tracking-[0.08em] text-[#5a4535]/75">
          Locked
        </span>
      </div>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="bk-portal-tool bk-dashboard-tool group w-full"
          onClick={() => void loadQRCode()}
        >
          <span className="bk-portal-tool-icon">
            {isLoading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <QrCode className="size-5" />
            )}
          </span>
          <span className="font-righteous mt-3 text-base text-[#245f35] sm:text-lg">
            Check-in QR
          </span>
          <span className="mt-1 text-xs font-medium leading-5 text-[#5a4535] sm:text-sm">
            Open your code for organizer check-in.
          </span>
          <ArrowUpRight
            aria-hidden="true"
            className="mt-auto size-4 self-end text-[#7aab5a]"
          />
        </button>
      </DialogTrigger>
      <DialogContent className="rounded-xl border-[#c4a882]/45 bg-[#f8f3e8] text-[#3d2e1e]">
        <DialogHeader>
          <DialogTitle className="font-righteous text-[#245f35]">
            Your check-in QR code
          </DialogTitle>
          <DialogDescription className="text-[#5a4535]">
            Show this code at an organizer check-in station.
          </DialogDescription>
        </DialogHeader>
        <div
          className="flex min-h-72 items-center justify-center"
          aria-live="polite"
        >
          {qrCode ? (
            <Image
              src={qrCode}
              alt="BloomKnights hacker QR code"
              width={288}
              height={288}
              className="size-72"
              unoptimized
            />
          ) : (
            <Loader2 className="size-8 animate-spin" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
