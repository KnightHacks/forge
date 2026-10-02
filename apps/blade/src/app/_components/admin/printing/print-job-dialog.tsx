"use client";

import { useState, useTransition } from "react";
import { Download, Mail, MessageCircle, Phone } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { PRINTING } from "@forge/consts";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";
import { Textarea } from "@forge/ui/textarea";
import { toast } from "@forge/ui/toast";

import { useNavigationRouter as useRouter } from "~/app/_components/shared/route-transition-link";
import { api } from "~/trpc/react";
import {
  deliverySummary,
  formatFileSize,
  formatPrintDateTime,
  formatPrintTime,
  formatReadyIn,
  toDateTimeLocalValue,
} from "./print-queue-format";
import { PrintStatusPill } from "./print-status-pill";

type PrintJob = RouterOutputs["printing"]["list"]["jobs"][number];
type PrintJobStatus = PRINTING.PrintJobStatus;

const insetClassName = "rounded-md border border-white/10 bg-background/60 p-3";

export function PrintJobDialog({
  job,
  onOpenChange,
  timezone,
}: {
  job: PrintJob;
  onOpenChange: (open: boolean) => void;
  timezone: string;
}) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const [status, setStatus] = useState<PrintJobStatus>(job.status);
  const [note, setNote] = useState(job.statusNote ?? "");
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(
    null,
  );

  const noteRequired = (
    PRINTING.NOTE_REQUIRED_PRINT_JOB_STATUSES as readonly string[]
  ).includes(status);
  const isActive = (
    PRINTING.PRINT_JOB_ACTIVE_STATUSES as readonly string[]
  ).includes(job.status);

  function finish() {
    onOpenChange(false);
    startTransition(() => router.refresh());
  }

  const updateStatus = api.printing.updateStatus.useMutation({
    onError: (error) => toast.error(error.message),
    onSuccess: (result) => {
      if (!result.changed) {
        toast.success("Nothing changed.");
      } else {
        const summary = deliverySummary(result.delivery);
        const title = `Marked ${PRINTING.PRINT_JOB_STATUS_LABELS[result.job.status].toLowerCase()}.`;
        if (summary.ok)
          toast.success(title, { description: summary.description });
        else toast.error(title, { description: summary.description });
      }
      finish();
    },
  });

  const download = api.printing.getFileDownloadUrl.useMutation({
    onError: (error) => toast.error(error.message),
    onSettled: () => setDownloadingFileId(null),
    onSuccess: ({ url }) => window.location.assign(url),
  });

  const busy = updateStatus.isPending || isRefreshing;

  return (
    <Dialog onOpenChange={onOpenChange} open>
      <DialogContent className="max-h-[calc(100svh-1rem)] w-[calc(100svw-1rem)] max-w-2xl grid-cols-[minmax(0,1fr)] overflow-y-auto border-white/10 p-4 sm:p-6 [&>button]:size-11">
        <DialogHeader>
          <div className="flex min-w-0 flex-wrap items-center gap-3 pr-8">
            <DialogTitle className="truncate">
              {job.submitter.name ?? "Unknown hacker"}
            </DialogTitle>
            <PrintStatusPill status={job.status} />
          </div>
          <DialogDescription>
            Submitted {formatPrintDateTime(job.createdAt, timezone)}
            {job.estimate
              ? ` · #${job.estimate.position} in the queue · ready ~${formatPrintTime(job.estimate.estimatedReadyAt, timezone)} (${formatReadyIn(job.estimate.estimatedReadyAt, new Date())})`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-w-0 gap-4">
          <section aria-label="Description" className={insetClassName}>
            <p className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-6">
              {job.description}
            </p>
          </section>

          <section className="grid gap-2">
            <h3 className="text-sm font-medium">Files</h3>
            <ul className="grid gap-2">
              {job.files.map((file) => (
                <li
                  className={`${insetClassName} flex min-w-0 items-center gap-3`}
                  key={file.id}
                >
                  <span className="min-w-0 flex-1 truncate font-mono text-[13px]">
                    {file.fileName}
                  </span>
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {formatFileSize(file.size)}
                  </span>
                  <Button
                    aria-label={`Download ${file.fileName}`}
                    className="size-11 shrink-0"
                    disabled={downloadingFileId !== null}
                    onClick={() => {
                      setDownloadingFileId(file.id);
                      download.mutate({ fileId: file.id });
                    }}
                    size="icon"
                    type="button"
                    variant="outline"
                  >
                    <Download aria-hidden="true" className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </section>

          <ContactSection job={job} />

          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              updateStatus.mutate({ jobId: job.id, note, status });
            }}
          >
            <h3 className="text-sm font-medium">Status</h3>
            <Select
              onValueChange={(value) => {
                const next = value as PrintJobStatus;
                setStatus(next);
                // A note belongs to one status. Carrying "Which color?" into a
                // Printing notice would confuse the hacker, so start fresh.
                setNote(next === job.status ? (job.statusNote ?? "") : "");
              }}
              value={status}
            >
              <SelectTrigger aria-label="New status" className="min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRINTING.PRINT_JOB_STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {PRINTING.PRINT_JOB_STATUS_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid gap-2">
              <Label htmlFor="print-job-note">
                Note for the hacker
                {noteRequired ? " (required)" : " (optional)"}
              </Label>
              <Textarea
                id="print-job-note"
                maxLength={PRINTING.MAX_PRINT_JOB_NOTE_LENGTH}
                onChange={(event) => setNote(event.target.value)}
                placeholder={
                  noteRequired
                    ? "What do you need from them?"
                    : "Pickup spot, color swap, anything they should know"
                }
                required={noteRequired}
                rows={3}
                value={note}
              />
            </div>
            <Button
              className="min-h-11 justify-self-start"
              disabled={busy || (noteRequired && note.trim() === "")}
              type="submit"
            >
              {updateStatus.isPending ? "Saving..." : "Save and notify hacker"}
            </Button>
          </form>

          {isActive ? (
            <ReadyTimeForm
              disabled={busy}
              job={job}
              onDone={finish}
              timezone={timezone}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Organizer-set ready time. Sends no notification, so it is its own form. */
function ReadyTimeForm({
  disabled,
  job,
  onDone,
  timezone,
}: {
  disabled: boolean;
  job: PrintJob;
  onDone: () => void;
  timezone: string;
}) {
  const [readyAt, setReadyAt] = useState(
    job.estimate?.overridden
      ? toDateTimeLocalValue(job.estimate.estimatedReadyAt)
      : "",
  );
  const setEstimatedReadyAt = api.printing.setEstimatedReadyAt.useMutation({
    onError: (error) => toast.error(error.message),
    onSuccess: (result) => {
      toast.success(
        result.estimatedReadyAt
          ? `Ready time set to ${formatPrintTime(result.estimatedReadyAt, timezone)}.`
          : "Ready time cleared. The queue estimate is back.",
      );
      onDone();
    },
  });
  const busy = disabled || setEstimatedReadyAt.isPending;

  return (
    <form
      className="grid gap-3 border-t border-white/10 pt-4"
      onSubmit={(event) => {
        event.preventDefault();
        setEstimatedReadyAt.mutate({
          estimatedReadyAt: new Date(readyAt),
          jobId: job.id,
        });
      }}
    >
      <div className="grid gap-1">
        <Label htmlFor="print-job-ready-at">Exact ready time</Label>
        <p className="text-sm text-muted-foreground">
          Replaces the queue estimate for this job only. The hacker sees it on
          their page; no message is sent.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Input
          className="min-h-11 w-full sm:w-64"
          id="print-job-ready-at"
          onChange={(event) => setReadyAt(event.target.value)}
          required
          type="datetime-local"
          value={readyAt}
        />
        <Button
          className="min-h-11"
          disabled={busy || readyAt === ""}
          type="submit"
          variant="outline"
        >
          Set time
        </Button>
        {job.estimate?.overridden ? (
          <Button
            className="min-h-11"
            disabled={busy}
            onClick={() =>
              setEstimatedReadyAt.mutate({
                estimatedReadyAt: null,
                jobId: job.id,
              })
            }
            type="button"
            variant="ghost"
          >
            Use queue estimate
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function ContactSection({ job }: { job: PrintJob }) {
  return (
    <section className="grid gap-2">
      <h3 className="text-sm font-medium">Contact</h3>
      <div className={`${insetClassName} grid gap-2 text-sm`}>
        {job.submitter.email ? (
          <a
            className="inline-flex min-w-0 items-center gap-2 break-all underline-offset-4 hover:underline"
            href={`mailto:${job.submitter.email}`}
          >
            <Mail aria-hidden="true" className="size-4 shrink-0" />
            {job.submitter.email}
          </a>
        ) : null}
        {job.submitter.phoneNumber ? (
          <a
            className="inline-flex items-center gap-2 underline-offset-4 hover:underline"
            href={`tel:${job.submitter.phoneNumber}`}
          >
            <Phone aria-hidden="true" className="size-4 shrink-0" />
            {job.submitter.phoneNumber}
          </a>
        ) : null}
        {job.submitter.discordUser ? (
          <span className="inline-flex min-w-0 items-center gap-2 break-all">
            <MessageCircle aria-hidden="true" className="size-4 shrink-0" />
            {job.submitter.discordUser}
          </span>
        ) : null}
        <span
          className={
            job.cancelCount > 0
              ? "text-destructive dark:text-red-300"
              : "text-muted-foreground"
          }
        >
          {job.cancelCount === 0
            ? "No cancelled jobs at this hackathon"
            : `${job.cancelCount} cancelled ${job.cancelCount === 1 ? "job" : "jobs"} at this hackathon`}
        </span>
      </div>
    </section>
  );
}
