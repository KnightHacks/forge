"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
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
  accepted: "Accepted",
  checkedin: "Checked in",
  confirmed: "Confirmed",
  denied: "Not selected",
  pending: "Application under review",
  waitlisted: "Waitlisted",
  withdrawn: "Withdrawn",
};

const statusMessages: Record<HackerStatus, string> = {
  accepted: "Your application was accepted. Confirm your spot below.",
  checkedin: "You are checked in. Your event tools are ready below.",
  confirmed: "Your place at BloomKnights is confirmed.",
  denied:
    "We could not offer you a place at this event. Thank you for applying.",
  pending: "The organizer team is reviewing your application.",
  waitlisted: "You are on the waitlist. Watch this portal for updates.",
  withdrawn: "You withdrew your attendance for this event.",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
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
        body="Please refresh the page or try again in a moment."
      />
    );
  }

  const { hackathon, participant } = dashboard;
  const now = new Date();
  const lifecycleState = getHackerLifecycleState({
    applicationDeadline: hackathon.applicationDeadline,
    applicationOpen: hackathon.applicationOpen,
    confirmationCapacity: hackathon.confirmationCapacity,
    confirmationDeadline: hackathon.confirmationDeadline,
    confirmedCount: dashboard.confirmedCount,
    now,
    status: participant?.status ?? null,
  });

  if (!participant) {
    if (lifecycleState === "application-before-open") {
      return (
        <PortalMessage
          icon={<CalendarDays />}
          title={`Applications open ${dateFormatter.format(hackathon.applicationOpen)}.`}
          body="Come back then to begin your BloomKnights application."
        />
      );
    }

    if (lifecycleState === "application-closed") {
      return (
        <PortalMessage
          icon={<CalendarDays />}
          title="BloomKnights applications are closed."
          body="Join the Knight Hacks Discord for future event announcements."
        />
      );
    }

    return (
      <PortalMessage
        icon={<FileText />}
        title="Your BloomKnights journey starts here."
        body="Submit your hacker application and return here for status updates."
        action={
          <Button
            asChild
            className="bk-bloom-cta-action rounded-full bg-[#f384d4]"
          >
            <Link href="/apply">Start application</Link>
          </Button>
        }
      />
    );
  }

  const confirmationClosed = lifecycleState === "accepted-confirmation-closed";
  const atCapacity = lifecycleState === "accepted-at-capacity";
  const actionPending = confirmMutation.isPending || withdrawMutation.isPending;

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
    <div className="space-y-6 text-[#42602A]">
      <section className="rounded-[2rem] border border-white/70 bg-[#B9D79A]/95 p-6 shadow-xl backdrop-blur sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#53634A]">
              Welcome, {participant.firstName}
            </p>
            <h1 className="mt-2 text-3xl font-black sm:text-5xl">
              Your BloomKnights portal
            </h1>
            <Badge className="mt-4 bg-[#FFFDF1] px-4 py-2 text-base text-[#42602A] hover:bg-[#FFFDF1]">
              {statusLabels[participant.status]}
            </Badge>
            <p className="mt-3 max-w-2xl text-sm font-semibold text-[#53634A]">
              {statusMessages[participant.status]}
            </p>
          </div>
          <div className="grid gap-2 text-sm font-semibold sm:text-right">
            <span>{dateFormatter.format(hackathon.startDate)}</span>
            <span>to {dateFormatter.format(hackathon.endDate)}</span>
          </div>
        </div>

        {participant.status === "accepted" && (
          <div className="mt-7 rounded-2xl bg-[#FFFDF1] p-5">
            <h2 className="text-xl font-black">Confirm your spot</h2>
            <p className="mt-2 text-sm text-[#53634A]">
              Review the event terms and confirm before{" "}
              {dateFormatter.format(hackathon.confirmationDeadline)}.
            </p>
            <a
              href={config.termsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex text-sm font-bold text-[#f384d4] underline"
            >
              Read the event terms
            </a>
            <Button
              className="bk-bloom-cta-action mt-4 rounded-full bg-[#f384d4] text-white hover:bg-[#e06bc0]"
              disabled={actionPending || confirmationClosed || atCapacity}
              onClick={() => void handleConfirm()}
            >
              {actionPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <CheckCircle2 />
              )}
              {confirmationClosed || atCapacity
                ? "Confirmation closed"
                : "Agree and confirm"}
            </Button>
          </div>
        )}

        {participant.status === "confirmed" && (
          <div className="mt-7 flex flex-col gap-3 rounded-2xl bg-[#FFFDF1] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black">You are confirmed!</h2>
              <p className="text-sm text-[#53634A]">
                We cannot wait to see you at BloomKnights.
              </p>
            </div>
            <Button
              variant="outline"
              className="rounded-full"
              disabled={actionPending}
              onClick={() => void handleWithdraw()}
            >
              Withdraw attendance
            </Button>
          </div>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ActionCard
          href="/dashboard/profile"
          icon={<UserRound />}
          label="Edit profile"
        />
        <ActionCard
          href={resumeUrl ?? "/dashboard/profile"}
          external={Boolean(resumeUrl)}
          icon={<FileText />}
          label={resumeUrl ? "View resume" : "Add resume"}
        />
        {(participant.status === "confirmed" ||
          participant.status === "checkedin") && (
          <Dialog>
            <DialogTrigger asChild>
              <button
                className="bk-bloom-cta-action flex min-h-32 flex-col items-center justify-center gap-3 rounded-3xl border border-white/80 bg-[#FFFDF1] p-5 font-black shadow-lg transition hover:-translate-y-1"
                onClick={() => void loadQRCode()}
              >
                {qrMutation.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <QrCode />
                )}
                Hacker QR code
              </button>
            </DialogTrigger>
            <DialogContent className="border-[#B9D79A] bg-[#FFFDF1] text-[#42602A]">
              <DialogHeader>
                <DialogTitle>Your hacker QR code</DialogTitle>
                <DialogDescription>
                  Use this code at organizer check-in stations.
                </DialogDescription>
              </DialogHeader>
              {qrCode ? (
                <Image
                  src={qrCode}
                  alt="BloomKnights hacker QR code"
                  width={320}
                  height={320}
                  className="mx-auto"
                  unoptimized
                />
              ) : (
                <Loader2 className="mx-auto animate-spin" />
              )}
            </DialogContent>
          </Dialog>
        )}
        <ActionCard
          href={config.guideUrl}
          external
          icon={<ExternalLink />}
          label="Hacker guide"
        />
      </section>

      {participant.status === "checkedin" && (
        <section className="rounded-[2rem] bg-[#FFFDF1]/95 p-6 shadow-xl sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#f384d4]">
                You are checked in
              </p>
              <h2 className="mt-1 text-3xl font-black">Event schedule</h2>
            </div>
            <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="rounded-full">
                  <AlertCircle /> Report an issue
                </Button>
              </DialogTrigger>
              <DialogContent className="border-[#B9D79A] bg-[#FFFDF1] text-[#42602A]">
                <DialogHeader>
                  <DialogTitle>Report an issue</DialogTitle>
                  <DialogDescription>
                    Tell the organizer team what is happening.
                  </DialogDescription>
                </DialogHeader>
                <Textarea
                  value={issue}
                  onChange={(event) => setIssue(event.target.value)}
                  maxLength={2000}
                  className="min-h-32"
                />
                <DialogFooter>
                  <Button
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
                    Submit
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {schedule.length === 0 ? (
              <p className="text-[#53634A]">
                No scheduled events are available yet.
              </p>
            ) : (
              schedule.map((event) => (
                <article
                  key={event.id}
                  className="rounded-2xl border border-[#B9D79A] bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-black">{event.name}</h3>
                    <Badge className="bg-[#2F8B57] text-white">
                      {event.tag}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-[#53634A]">
                    {event.description}
                  </p>
                  <p className="mt-4 text-sm font-bold">
                    {dateFormatter.format(event.startDateTime)} ·{" "}
                    {event.location}
                  </p>
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
    <section className="mx-auto max-w-2xl rounded-[2rem] border border-white/70 bg-[#FFFDF1]/95 p-8 text-center text-[#42602A] shadow-xl">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#B9D79A]">
        {icon}
      </div>
      <h1 className="mt-5 text-2xl font-black sm:text-4xl">{title}</h1>
      {body && <p className="mt-3 text-[#53634A]">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </section>
  );
}

function ActionCard({
  href,
  icon,
  label,
  external = false,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="bk-bloom-cta-action flex min-h-32 flex-col items-center justify-center gap-3 rounded-3xl border border-white/80 bg-[#FFFDF1] p-5 text-center font-black shadow-lg transition hover:-translate-y-1"
    >
      {icon}
      {label}
    </Link>
  );
}
