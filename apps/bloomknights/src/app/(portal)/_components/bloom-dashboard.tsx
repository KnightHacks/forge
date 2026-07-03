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
  accepted: "Accepted — action needed",
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
  accepted: "border-[#9f2f70] bg-[#fff0f8] text-[#7d2056]",
  checkedin: "border-[#17653a] bg-[#e7f5e6] text-[#124b2d]",
  confirmed: "border-[#17653a] bg-[#e7f5e6] text-[#124b2d]",
  denied: "border-[#7a4a44] bg-[#f8ece8] text-[#633730]",
  pending: "border-[#836315] bg-[#fff7d7] text-[#654b0d]",
  waitlisted: "border-[#5f568a] bg-[#f1efff] text-[#49406f]",
  withdrawn: "border-[#656d68] bg-[#eff2ef] text-[#4b534e]",
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
          <Button
            asChild
            className="bk-bloom-cta-action rounded-lg bg-[#8f285f]"
          >
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
    <div className="space-y-5 text-[#173b28] sm:space-y-6">
      <section className="overflow-hidden rounded-2xl border border-[#173b28]/20 bg-[#fffaf0] shadow-[0_24px_70px_rgba(12,52,29,0.18)]">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="p-5 sm:p-8 lg:p-10">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8f285f]">
              Participant field notes · BloomKnights 2026
            </p>
            <h1 className="mt-3 max-w-3xl text-3xl font-black leading-[1.05] tracking-[-0.035em] text-[#173b28] sm:text-5xl">
              Hey {participant.firstName}, here&apos;s where you stand.
            </h1>
            <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <span
                className={`inline-flex min-h-8 items-center rounded-md border px-3 py-1 text-sm font-extrabold ${statusTone[participant.status]}`}
              >
                {statusLabels[participant.status]}
              </span>
              <p className="max-w-2xl text-sm font-medium leading-6 text-[#405c4a]">
                {statusMessages[participant.status]}
              </p>
            </div>
          </div>

          <aside className="border-t border-[#173b28]/15 bg-[#e4ebcf] p-5 sm:p-7 lg:border-l lg:border-t-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#49623d]">
              Event details
            </p>
            <dl className="mt-5 space-y-5 text-sm">
              <div className="grid grid-cols-[1.25rem_1fr] gap-3">
                <CalendarDays aria-hidden="true" className="mt-0.5 size-5" />
                <div>
                  <dt className="font-extrabold">Date</dt>
                  <dd className="mt-0.5 text-[#405c4a]">
                    {dayFormatter.format(hackathon.startDate)}
                  </dd>
                </div>
              </div>
              <div className="grid grid-cols-[1.25rem_1fr] gap-3">
                <Clock3 aria-hidden="true" className="mt-0.5 size-5" />
                <div>
                  <dt className="font-extrabold">Hours</dt>
                  <dd className="mt-0.5 text-[#405c4a]">
                    {timeFormatter.format(hackathon.startDate)}–
                    {timeFormatter.format(hackathon.endDate)} ET
                  </dd>
                </div>
              </div>
              <div className="grid grid-cols-[1.25rem_1fr] gap-3">
                <MapPin aria-hidden="true" className="mt-0.5 size-5" />
                <div>
                  <dt className="font-extrabold">Location</dt>
                  <dd className="mt-0.5 text-[#405c4a]">UCF Business I</dd>
                </div>
              </div>
            </dl>
          </aside>
        </div>

        {participant.status === "accepted" && (
          <div className="grid gap-5 border-t border-[#173b28]/15 bg-[#fff3f9] p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8f285f]">
                Next step
              </p>
              <h2 className="mt-1 text-xl font-black">Confirm your place</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[#405c4a]">
                Read the event terms and confirm by{" "}
                {dateFormatter.format(hackathon.confirmationDeadline)}.
              </p>
              <a
                href={config.termsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-sm font-extrabold text-[#7d2056] underline decoration-2 underline-offset-4 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7d2056]"
              >
                Read the event terms <ArrowUpRight className="size-4" />
              </a>
            </div>
            <Button
              className="bk-bloom-cta-action min-h-11 min-w-48 rounded-lg bg-[#8f285f] px-5 text-white hover:bg-[#75204f]"
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
          <div className="grid gap-5 border-t border-[#173b28]/15 bg-[#edf5df] p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#17653a]">
                You&apos;re on the list
              </p>
              <h2 className="mt-1 text-xl font-black">
                Your place is confirmed.
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#405c4a]">
                Plans changed? Withdraw here so another hacker can attend.
              </p>
            </div>
            <Button
              variant="outline"
              className="min-h-11 min-w-48 rounded-lg border-[#173b28]/35 bg-transparent text-[#173b28] hover:bg-white/70"
              disabled={actionPending}
              onClick={() => void handleWithdraw()}
            >
              {actionPending && <Loader2 className="size-4 animate-spin" />}
              Withdraw attendance
            </Button>
          </div>
        )}
      </section>

      <section aria-labelledby="portal-tools-heading">
        <div className="mb-3 flex items-end justify-between gap-4 px-1">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f6e8c9]">
              Your toolkit
            </p>
            <h2
              id="portal-tools-heading"
              className="mt-1 text-2xl font-black text-white"
            >
              Participant essentials
            </h2>
          </div>
          <p className="hidden text-sm font-semibold text-white/80 sm:block">
            Four tools, always in the same place.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
        <section className="rounded-2xl border border-[#173b28]/20 bg-[#fffaf0] p-5 shadow-[0_20px_60px_rgba(12,52,29,0.16)] sm:p-8">
          <div className="flex flex-col gap-4 border-b border-[#173b28]/15 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8f285f]">
                Live at BloomKnights
              </p>
              <h2 className="mt-1 text-2xl font-black sm:text-3xl">
                Event schedule
              </h2>
            </div>
            <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="min-h-11 rounded-lg border-[#173b28]/35 bg-transparent text-[#173b28]"
                >
                  <LifeBuoy className="size-4" /> Report an issue
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-xl border-[#173b28]/25 bg-[#fffaf0] text-[#173b28]">
                <DialogHeader>
                  <DialogTitle>Report an issue</DialogTitle>
                  <DialogDescription className="text-[#526658]">
                    Tell the organizer team what is happening and where you are.
                  </DialogDescription>
                </DialogHeader>
                <Textarea
                  aria-label="Issue details"
                  value={issue}
                  onChange={(event) => setIssue(event.target.value)}
                  maxLength={2000}
                  className="min-h-32 rounded-lg border-[#173b28]/30 bg-white"
                />
                <DialogFooter>
                  <Button
                    className="min-w-32 rounded-lg bg-[#173b28]"
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

          <div className="mt-5 divide-y divide-[#173b28]/15 border-y border-[#173b28]/15">
            {schedule.length === 0 ? (
              <p className="py-6 text-sm font-medium text-[#526658]">
                The live schedule will appear here when it is published.
              </p>
            ) : (
              schedule.map((event) => (
                <article
                  key={event.id}
                  className="grid gap-3 py-5 md:grid-cols-[10rem_1fr_auto] md:items-start"
                >
                  <p className="text-sm font-extrabold text-[#405c4a]">
                    {timeFormatter.format(event.startDateTime)}
                  </p>
                  <div>
                    <h3 className="text-lg font-black">{event.name}</h3>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-[#526658]">
                      {event.description}
                    </p>
                    <p className="mt-2 text-sm font-extrabold">
                      {event.location}
                    </p>
                  </div>
                  <Badge className="w-fit rounded-md bg-[#dce8c6] text-[#173b28] hover:bg-[#dce8c6]">
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
      className="mx-auto max-w-2xl rounded-2xl border border-[#173b28]/20 bg-[#fffaf0] p-6 text-center text-[#173b28] shadow-[0_24px_70px_rgba(12,52,29,0.18)] sm:p-9"
    >
      <div className="mx-auto flex size-11 items-center justify-center rounded-lg bg-[#dce8c6]">
        {icon}
      </div>
      <h1 className="mt-5 text-2xl font-black tracking-[-0.02em] sm:text-4xl">
        {title}
      </h1>
      {body && <p className="mt-3 text-[#526658]">{body}</p>}
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
      className="bk-bloom-cta-action group flex min-h-40 flex-col rounded-xl border border-[#173b28]/20 bg-[#fffaf0] p-4 text-left text-[#173b28] shadow-[0_12px_30px_rgba(12,52,29,0.14)] transition-[border-color,background-color,box-shadow] hover:border-[#8f285f]/60 hover:bg-white hover:shadow-[0_16px_36px_rgba(12,52,29,0.2)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#fffaf0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#173b28] sm:min-h-44 sm:p-5"
    >
      <span className="flex size-9 items-center justify-center rounded-md bg-[#dce8c6] [&_svg]:size-5">
        {icon}
      </span>
      <span className="mt-4 text-base font-black sm:text-lg">{label}</span>
      <span className="mt-1 line-clamp-3 text-xs font-medium leading-5 text-[#526658] sm:text-sm">
        {description}
      </span>
      <ArrowUpRight
        aria-hidden="true"
        className="mt-auto size-4 self-end text-[#8f285f]"
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
        className="flex min-h-40 flex-col rounded-xl border border-[#173b28]/15 bg-[#eef0e7] p-4 text-left text-[#173b28] shadow-[0_10px_24px_rgba(12,52,29,0.1)] sm:min-h-44 sm:p-5"
      >
        <span className="flex size-9 items-center justify-center rounded-md bg-[#dde1d5] text-[#526658]">
          <LockKeyhole className="size-5" />
        </span>
        <span className="mt-4 text-base font-black sm:text-lg">
          Check-in QR
        </span>
        <span className="mt-1 text-xs font-medium leading-5 text-[#647168] sm:text-sm">
          Available after your attendance is confirmed.
        </span>
        <span className="mt-auto text-xs font-extrabold uppercase tracking-[0.12em] text-[#647168]">
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
          className="bk-bloom-cta-action group flex min-h-40 flex-col rounded-xl border border-[#173b28]/20 bg-[#fffaf0] p-4 text-left text-[#173b28] shadow-[0_12px_30px_rgba(12,52,29,0.14)] transition-[border-color,background-color,box-shadow] hover:border-[#8f285f]/60 hover:bg-white hover:shadow-[0_16px_36px_rgba(12,52,29,0.2)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#fffaf0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#173b28] sm:min-h-44 sm:p-5"
          onClick={() => void loadQRCode()}
        >
          <span className="flex size-9 items-center justify-center rounded-md bg-[#dce8c6]">
            {isLoading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <QrCode className="size-5" />
            )}
          </span>
          <span className="mt-4 text-base font-black sm:text-lg">
            Check-in QR
          </span>
          <span className="mt-1 text-xs font-medium leading-5 text-[#526658] sm:text-sm">
            Open your code for organizer check-in.
          </span>
          <ArrowUpRight
            aria-hidden="true"
            className="mt-auto size-4 self-end text-[#8f285f]"
          />
        </button>
      </DialogTrigger>
      <DialogContent className="rounded-xl border-[#173b28]/25 bg-[#fffaf0] text-[#173b28]">
        <DialogHeader>
          <DialogTitle>Your check-in QR code</DialogTitle>
          <DialogDescription className="text-[#526658]">
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
