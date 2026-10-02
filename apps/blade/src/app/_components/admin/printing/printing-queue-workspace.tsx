"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { ChevronRight, Paperclip, Printer } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { PRINTING } from "@forge/consts";
import { cn } from "@forge/ui";
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
        description="Hackers' 3D print jobs in the order they were submitted. Open a job to see its files and contact details and to update its status."
        eyebrow="Hackathon"
        icon={Printer}
        title="Printing Queue"
      />

      <section
        aria-busy={isNavigating}
        aria-label="Print jobs"
        className={cn(panelClassName, "min-w-0 space-y-4 p-3 sm:p-5")}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>
            <span className="font-mono text-foreground">{waiting}</span> in the
            queue
          </span>
          <span>
            About {queue.settings.printMinutes} min per print,{" "}
            {queue.settings.printerCount}{" "}
            {queue.settings.printerCount === 1 ? "printer" : "printers"}
          </span>
          <span>
            {configuration.channelId
              ? "New jobs post in Discord"
              : "No Discord channel set"}
          </span>
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

        {queue.jobs.length === 0 ? (
          <p className="rounded-md border border-dashed border-white/15 bg-background/60 px-4 py-10 text-center text-sm text-muted-foreground">
            {view === "all"
              ? "No print jobs yet. They appear here as checked-in hackers submit them."
              : view === "active"
                ? "Nothing waiting. New jobs appear here as checked-in hackers submit them."
                : `No ${PRINTING.PRINT_JOB_STATUS_LABELS[view].toLowerCase()} jobs.`}
          </p>
        ) : (
          <ol className="grid gap-2">
            {queue.jobs.map((job) => (
              <li key={job.id}>
                <button
                  className="flex w-full min-w-0 items-center gap-3 rounded-md border border-white/10 bg-background/60 p-3 text-left transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:gap-4 sm:p-4"
                  onClick={() => setOpenJobId(job.id)}
                  type="button"
                >
                  <span
                    aria-label={
                      job.estimate
                        ? `Position ${job.estimate.position}`
                        : undefined
                    }
                    className={cn(
                      "w-8 shrink-0 text-center font-mono text-2xl font-semibold sm:w-10",
                      job.status === "printing"
                        ? "text-[#DBC049]"
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
                    </span>
                    <span className="line-clamp-1 text-sm text-muted-foreground">
                      {job.description}
                    </span>
                    <span className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
                      <span>
                        Submitted{" "}
                        {formatPrintDateTime(job.createdAt, selected.timezone)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Paperclip aria-hidden="true" className="size-3.5" />
                        {job.files.length}{" "}
                        {job.files.length === 1 ? "file" : "files"}
                      </span>
                      {job.estimate ? (
                        <span className="text-foreground">
                          Ready ~
                          {formatPrintTime(
                            job.estimate.estimatedReadyAt,
                            selected.timezone,
                          )}
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
            ))}
          </ol>
        )}
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
