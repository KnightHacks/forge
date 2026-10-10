"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  ChevronRight,
  Clock3,
  Paperclip,
  Printer,
  Search,
} from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { PRINTING } from "@forge/consts";
import { cn } from "@forge/ui";
import { Input } from "@forge/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@forge/ui/tabs";

import {
  AdminPageHeader,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";
import { useNavigationRouter as useRouter } from "~/app/_components/shared/route-transition-link";
import { PrintJobDialog } from "./print-job-dialog";
import { formatPrintDateTime, formatPrintTime } from "./print-queue-format";
import { PrintStatusPill } from "./print-status-pill";
import { PrintingSettingsDialog } from "./printing-settings-dialog";

type Queue = RouterOutputs["printing"]["list"];
type Hackathon = RouterOutputs["printing"]["listHackathons"][number];
type PrintJobStatus = PRINTING.PrintJobStatus;
/** `active` is the default; it has no `status` param in the URL. */
type QueueView = PrintJobStatus | "active" | "all";

const panelClassName =
  "rounded-lg border border-white/10 bg-card/95 shadow-2xl shadow-black/25";

export function PrintingQueueWorkspace({
  configuration,
  hackathons,
  queue,
  selected,
  view,
}: {
  configuration: RouterOutputs["printing"]["getConfiguration"];
  hackathons: Hackathon[];
  queue: Queue;
  selected: Hackathon;
  view: QueueView;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, startTransition] = useTransition();
  const [openJobId, setOpenJobId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const matchingJobs = queue.jobs.filter((job) =>
    [
      job.submitter.name,
      job.submitter.email,
      job.description,
      ...job.files.map((file) => file.fileName),
    ].some((value) =>
      value?.toLowerCase().includes(search.trim().toLowerCase()),
    ),
  );
  const openJob = queue.jobs.find((job) => job.id === openJobId) ?? null;
  const waiting = queue.counts.received + queue.counts.printing;
  const activeCount = PRINTING.PRINT_JOB_OPEN_STATUSES.reduce(
    (sum, value) => sum + queue.counts[value],
    0,
  );

  function navigate(next: { hackathon?: string; view?: QueueView }) {
    const params = new URLSearchParams({
      hackathon: next.hackathon ?? selected.id,
    });
    const nextView = next.view ?? view;
    if (nextView !== "active") params.set("status", nextView);
    startTransition(() => router.replace(`${pathname}?${params.toString()}`));
  }

  return (
    <main className={adminPageLayoutClassName}>
      {selected.displayName === "Knight Hacks IX" ? <PrintingPartner /> : null}
      <AdminPageHeader
        actions={
          <>
            <Select
              disabled={isNavigating}
              onValueChange={(hackathon) =>
                navigate({ hackathon, view: "active" })
              }
              value={selected.id}
            >
              <SelectTrigger
                aria-label="Hackathon"
                className="min-h-11 w-full min-w-0 sm:w-64"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {hackathons.map((hackathon) => (
                  <SelectItem key={hackathon.id} value={hackathon.id}>
                    {hackathon.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <PrintingSettingsDialog
              configuration={configuration}
              hackathonId={selected.id}
            />
          </>
        }
        description="Review incoming models, update progress and keep pickup moving."
        eyebrow="Hackathon"
        icon={Printer}
        title="Printing queue"
      />

      <section
        aria-busy={isNavigating}
        aria-label="Print jobs"
        className={cn(panelClassName, "min-w-0 space-y-4 p-3 sm:p-5")}
      >
        <div className="flex flex-col gap-4 border-b border-border pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Printer aria-hidden="true" className="size-4" />
              <strong className="font-mono text-foreground">
                {waiting}
              </strong>{" "}
              in queue
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock3 aria-hidden="true" className="size-4" />
              {queue.settings.printMinutes} min / print ·{" "}
              {queue.settings.printerCount}{" "}
              {queue.settings.printerCount === 1 ? "printer" : "printers"}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
                configuration.submissions.isOpen
                  ? "border-[hsl(var(--chart-2)/0.35)] bg-[hsl(var(--chart-2)/0.08)] text-[hsl(var(--chart-2))]"
                  : "border-destructive/40 bg-destructive/10 text-destructive dark:text-red-300",
              )}
            >
              {configuration.submissions.isOpen
                ? "Submissions open"
                : "Submissions closed"}
            </span>
          </div>
          <div className="relative w-full lg:w-72">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground"
            />
            <Input
              aria-label="Search print jobs"
              className="min-h-11 bg-background/60 pl-9"
              placeholder="Search hackers, models or files…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
        <Tabs
          onValueChange={(value) => navigate({ view: value as QueueView })}
          value={view}
        >
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <TabsList className="h-auto w-max">
              <TabsTrigger className="min-h-10 gap-2" value="active">
                Active
                <span className="font-mono text-muted-foreground">
                  {activeCount}
                </span>
              </TabsTrigger>
              {PRINTING.PRINT_JOB_STATUSES.map((value) => (
                <TabsTrigger
                  className="min-h-10 gap-2"
                  key={value}
                  value={value}
                >
                  {PRINTING.PRINT_JOB_STATUS_LABELS[value]}
                  <span className="font-mono text-muted-foreground">
                    {queue.counts[value]}
                  </span>
                </TabsTrigger>
              ))}
              <TabsTrigger className="min-h-10 gap-2" value="all">
                All
                <span className="font-mono text-muted-foreground">
                  {queue.total}
                </span>
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>

        {matchingJobs.length === 0 ? (
          <p className="rounded-md border border-dashed border-white/15 bg-background/60 px-4 py-10 text-center text-sm text-muted-foreground">
            {search.trim()
              ? "No jobs match your search in this view. Try another name, file or status."
              : view === "all"
                ? "No print jobs yet. They appear here as checked-in hackers submit them."
                : view === "active"
                  ? "Nothing waiting. New jobs appear here as checked-in hackers submit them."
                  : `No ${PRINTING.PRINT_JOB_STATUS_LABELS[view].toLowerCase()} jobs.`}
          </p>
        ) : (
          <ol
            aria-label="Queue results"
            tabIndex={0}
            className="grid max-h-[36rem] overflow-y-auto rounded-md border border-white/10 bg-background/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          >
            {matchingJobs.map((job) => (
              <PrintQueueRow
                key={job.id}
                job={job}
                timezone={selected.timezone}
                onOpen={() => setOpenJobId(job.id)}
              />
            ))}
          </ol>
        )}
        <p className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
          <span>
            {matchingJobs.length} {matchingJobs.length === 1 ? "job" : "jobs"}{" "}
            in this view · oldest first
          </span>
          <span>
            {configuration.channelId
              ? "New-job Discord channel connected"
              : "Connect a Discord channel in Printer settings"}
          </span>
        </p>
      </section>

      {openJob ? (
        <PrintJobDialog
          job={openJob}
          key={openJob.id}
          onOpenChange={(open) => {
            if (!open) setOpenJobId(null);
          }}
          timezone={selected.timezone}
        />
      ) : null}
    </main>
  );
}

function PrintQueueRow({
  job,
  timezone,
  onOpen,
}: {
  job: Queue["jobs"][number];
  timezone: string;
  onOpen: () => void;
}) {
  return (
    <li className="border-b border-white/10 last:border-b-0">
      <button
        className="flex w-full min-w-0 items-center gap-3 p-3 text-left transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:gap-4 sm:p-4"
        onClick={onOpen}
        type="button"
      >
        <span
          aria-label={
            job.estimate ? `Position ${job.estimate.position}` : undefined
          }
          className={cn(
            "w-8 shrink-0 text-center font-mono text-xl font-medium sm:w-10",
            job.status === "printing"
              ? "text-primary"
              : "text-muted-foreground",
          )}
        >
          {job.estimate ? job.estimate.position : "–"}
        </span>
        <span className="grid min-w-0 flex-1 gap-1">
          <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <span className="truncate font-medium">
              {job.submitter.name ?? "Unknown hacker"}
            </span>
            <PrintStatusPill status={job.status} />
            <span
              className="text-sm tabular-nums text-muted-foreground"
              title="Total requests by this person at this hackathon, including completed and cancelled jobs"
            >
              {job.requestCount} total{" "}
              {job.requestCount === 1 ? "request" : "requests"}
            </span>
          </span>
          <span className="line-clamp-2 break-words text-sm leading-6 text-muted-foreground">
            {job.description}
          </span>
          <span className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
            <span>
              Submitted {formatPrintDateTime(job.createdAt, timezone)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Paperclip aria-hidden="true" className="size-3.5" />
              {job.files.length} {job.files.length === 1 ? "file" : "files"}
            </span>
            {job.estimate ? (
              <span className="text-foreground">
                Ready ~
                {formatPrintTime(job.estimate.estimatedReadyAt, timezone)}
                {job.estimate.overridden ? " (set)" : ""}
              </span>
            ) : null}
          </span>
        </span>
        <ChevronRight
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
      </button>
    </li>
  );
}

function PrintingPartner() {
  return (
    <section
      aria-label="Printing sponsor"
      className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-center sm:gap-8"
    >
      <div className="grid shrink-0 gap-3">
        <p className="text-sm text-muted-foreground">Sponsor</p>
        <Image
          src="/sponsors/shinies.svg"
          alt="Shinies Props"
          width={512}
          height={130}
          className="h-auto w-44 brightness-0 dark:brightness-100"
        />
      </div>
      <div className="grid max-w-lg gap-1 sm:border-l sm:border-border sm:pl-8">
        <p className="font-medium">Bringing fiction to life.</p>
        <p className="text-sm leading-6 text-muted-foreground">
          Shinies creates precision 3D-printed props, helmets and custom builds.
          Manage their Knight Hacks IX print queue here.
        </p>
        <a
          href="https://www.shinies.co/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 w-fit items-center gap-1.5 text-sm underline underline-offset-4 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
        >
          Explore Shinies <ArrowUpRight aria-hidden="true" className="size-4" />
        </a>
      </div>
    </section>
  );
}
