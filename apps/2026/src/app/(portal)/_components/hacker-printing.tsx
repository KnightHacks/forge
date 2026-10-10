"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Box, Clock3, Paperclip, Printer } from "lucide-react";

import type { HackerPrintJobDto } from "@forge/hacker-sdk";
import { PRINTING } from "@forge/consts";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@forge/ui/tabs";
import { toast } from "@forge/ui/toast";

import {
  useHackerDashboardFlow,
  useHackerPrintingFlow,
} from "~/lib/hacker-portal";
import styles from "./hacker-printing.module.css";
import { StatusStage } from "./khix-dashboard";
import dashboardStyles from "./khix-dashboard.module.css";
import { NewPrintJobForm } from "./new-print-job-form";

export function HackerPrinting() {
  const { dashboard, dashboardQuery } = useHackerDashboardFlow();

  if (dashboardQuery.isPending) {
    return (
      <section className={styles.page} aria-busy="true">
        <div className={styles.skeleton} />
      </section>
    );
  }

  if (dashboardQuery.isError || !dashboard) {
    return (
      <StatusStage
        action={
          <Button asChild className={dashboardStyles.primaryButton}>
            <Link href="/dashboard/printing">Try again</Link>
          </Button>
        }
        body="Refresh the page or try again in a moment."
        greeting="Knight Hacks IX"
        headline="Could not load 3D printing."
      />
    );
  }

  if (dashboard.participant?.status !== "checkedin") {
    return (
      <StatusStage
        action={
          <Button asChild className={dashboardStyles.primaryButton}>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        }
        body="Send files to the on-site 3D printer once you arrive and check in."
        greeting="3D printing unlocks at check-in"
        headline="Check in to start printing."
        statusClassName={dashboardStyles.statusPending}
        statusLabel="Locked"
      />
    );
  }

  return <PrintingWorkshop timeZone={dashboard.hackathon.timezone} />;
}

function PrintingWorkshop({ timeZone }: { timeZone: string }) {
  const flow = useHackerPrintingFlow();
  const queue = flow.jobsQuery.data?.queue;
  const isClosed = queue?.isOpen === false && !flow.jobsQuery.isError;
  const [view, setView] = useState("active");
  const jobs = [...(flow.jobsQuery.data?.jobs ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const active = jobs.filter(
    (job) => job.status !== "picked_up" && job.status !== "cancelled",
  );
  const history = jobs.filter(
    (job) => job.status === "picked_up" || job.status === "cancelled",
  );
  const visibleJobs = view === "active" ? active : history;

  return (
    <section
      aria-labelledby="khix-printing-title"
      className={`${styles.page} ${dashboardStyles.pageReveal}`}
    >
      <header className={styles.header}>
        <div>
          <h1 id="khix-printing-title">3D Printing</h1>
          <p>Track your 3D print requests, from model to pickup.</p>
        </div>
        <NewPrintJobForm flow={flow} onSubmitted={() => setView("active")} />
      </header>

      <aside
        aria-label="Printing availability"
        className={styles.notice}
        data-closed={isClosed}
      >
        <Clock3 aria-hidden="true" className={styles.noticeIcon} />
        <div>
          <p role="status">
            <strong>
              {flow.jobsQuery.isError
                ? "Printing availability could not be loaded."
                : queue
                  ? queue.isOpen
                    ? "Printing is open"
                    : "Printing opens soon"
                  : "Checking printing availability…"}
            </strong>
          </p>
          {isClosed ? (
            <p>
              New requests are currently closed. Please check back soon. You can
              still track your existing prints below.
            </p>
          ) : null}
          <p>
            {queue ? (
              <strong>
                {queue.waitingCount} {queue.waitingCount === 1 ? "job" : "jobs"}{" "}
                in the queue
              </strong>
            ) : (
              "Checking the print queue…"
            )}
          </p>
          <p className={styles.hint}>
            Print times vary depending on the model.
          </p>
        </div>
      </aside>

      <aside aria-label="Our printing sponsor" className={styles.sponsor}>
        <div className={styles.sponsorIdentity}>
          <span className={styles.eyebrow}>Sponsor</span>
          <Image
            src="/sponsors/shinies.svg"
            alt="Shinies Props"
            width={512}
            height={130}
            className={styles.sponsorLogo}
          />
        </div>
        <div className={styles.sponsorAbout}>
          <p>Bringing fiction to life.</p>
          <span>
            Shinies creates precision 3D-printed props, helmets and custom
            builds. Proud sponsor of 3D printing at Knight Hacks IX.
          </span>
          <div className={styles.sponsorLinks}>
            <a href="https://www.shinies.co/" target="_blank" rel="noreferrer">
              Explore Shinies <ArrowUpRight aria-hidden="true" size={16} />
            </a>
            <a
              href="https://www.instagram.com/shiniesprops/"
              target="_blank"
              rel="noreferrer"
            >
              Instagram @shiniesprops
              <ArrowUpRight aria-hidden="true" size={16} />
            </a>
          </div>
        </div>
      </aside>

      <section aria-labelledby="khix-printing-jobs" className={styles.jobs}>
        <div className={styles.jobsHeading}>
          <h2 id="khix-printing-jobs">Your prints</h2>
          <Tabs value={view} onValueChange={setView}>
            <TabsList className={styles.tabs}>
              <TabsTrigger value="active">
                In progress <span>{active.length}</span>
              </TabsTrigger>
              <TabsTrigger value="history">
                History <span>{history.length}</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {flow.jobsQuery.isPending ? (
          <div
            className={styles.skeleton}
            aria-busy="true"
            aria-label="Loading your prints"
          />
        ) : flow.jobsQuery.isError ? (
          <div className={styles.empty} role="alert">
            <p>Your print jobs could not be loaded.</p>
            <Button
              disabled={flow.jobsQuery.isFetching}
              onClick={() => void flow.jobsQuery.refetch()}
              type="button"
            >
              Try again
            </Button>
          </div>
        ) : visibleJobs.length === 0 ? (
          <div className={styles.empty}>
            <Box aria-hidden="true" size={32} />
            <h3>
              {view === "active"
                ? isClosed
                  ? "No prints in progress."
                  : "Room for your next idea."
                : "Your finished prints live here."}
            </h3>
            <p>
              {view === "active"
                ? isClosed
                  ? "Your requests will appear here once printing opens."
                  : "Choose New print to send your model to the Shinies team."
                : "Picked-up and cancelled requests stay here for reference."}
            </p>
          </div>
        ) : (
          <div
            className={styles.jobScroll}
            role="region"
            aria-label={
              view === "active" ? "Prints in progress" : "Print history"
            }
            tabIndex={0}
          >
            <ol className={styles.jobList}>
              {visibleJobs.map((job) => (
                <PrintJobCard
                  flow={flow}
                  job={job}
                  key={job.id}
                  timeZone={timeZone}
                />
              ))}
            </ol>
          </div>
        )}
      </section>
      <p className={styles.footer}>
        Model → queue → printing → pickup <span>Made possible by Shinies.</span>
      </p>
    </section>
  );
}

function PrintJobCard({
  flow,
  job,
  timeZone,
}: {
  flow: ReturnType<typeof useHackerPrintingFlow>;
  job: HackerPrintJobDto;
  timeZone: string;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const cancellable = (
    PRINTING.HACKER_CANCELLABLE_PRINT_JOB_STATUSES as readonly string[]
  ).includes(job.status);
  const submittedAt = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone,
  }).format(new Date(job.createdAt));

  async function cancel() {
    try {
      await flow.cancel(job.id);
      setConfirmOpen(false);
      toast.success("Print job cancelled.");
    } catch (error) {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "The job was not cancelled.",
      );
    }
  }

  return (
    <li className={styles.job} data-status={job.status}>
      <div className={styles.ticket}>
        {/* The number is a place in line, so only a waiting job shows one. */}
        {job.status === "received" && job.position !== null ? (
          <>
            <span className={styles.ticketLabel}>No.</span>
            <span className={styles.ticketNumber}>{job.position}</span>
          </>
        ) : (
          <Printer aria-hidden="true" className="size-5" />
        )}
      </div>
      <div className={styles.jobBody}>
        <div className={styles.jobTop}>
          <span className={styles.status}>
            {PRINTING.PRINT_JOB_STATUS_LABELS[job.status]}
          </span>
          <span className={styles.submitted}>Sent {submittedAt}</span>
        </div>
        <p
          className={styles.description}
          tabIndex={job.description.length > 180 ? 0 : undefined}
        >
          {job.description}
        </p>

        {job.status === "needs_clarification" ? (
          <p className={styles.callout} role="note">
            <strong>Waiting on your reply.</strong> {job.statusNote}
          </p>
        ) : job.statusNote ? (
          <p className={styles.note}>
            <strong>From the organizers:</strong> {job.statusNote}
          </p>
        ) : null}

        {job.status === "received" && job.position !== null ? (
          <p className={styles.queuePosition}>
            {job.position - 1 === 0
              ? "Next in line"
              : `${job.position - 1} ${job.position - 1 === 1 ? "job" : "jobs"} ahead of yours`}
          </p>
        ) : null}

        <div className={styles.jobFooter}>
          {job.files.length > 0 ? (
            <span className={styles.files}>
              <Paperclip aria-hidden="true" className="size-3.5" />
              {job.files.map((file) => file.fileName).join(", ")}
            </span>
          ) : (
            <span />
          )}
          {cancellable ? (
            <Button
              className={styles.cancel}
              onClick={() => setConfirmOpen(true)}
              type="button"
              variant="ghost"
            >
              Cancel job
            </Button>
          ) : null}
        </div>
      </div>

      <Dialog onOpenChange={setConfirmOpen} open={confirmOpen}>
        <DialogContent
          className={`${dashboardStyles.theme} ${styles.workshopDialog}`}
        >
          <DialogHeader>
            <DialogTitle>Cancel this print job?</DialogTitle>
            <DialogDescription>
              It leaves the queue and cannot be restarted. You can send a new
              job anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setConfirmOpen(false)}
              type="button"
              variant="outline"
            >
              Keep it
            </Button>
            <Button
              disabled={flow.cancelMutation.isPending}
              onClick={() => void cancel()}
              type="button"
              variant="destructive"
            >
              Cancel job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}
