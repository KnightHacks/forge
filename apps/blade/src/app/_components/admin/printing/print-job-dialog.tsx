"use client";

import { useState, useTransition } from "react";
import { Download, Mail, MessageCircle, Phone } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { PRINTING } from "@forge/consts";
import { Button } from "@forge/ui/button";
import { Countdown } from "@forge/ui/countdown";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
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
import { PrintCategoryForm } from "./print-category-form";
import { PrintDurationFields } from "./print-duration-fields";
import {
  deliverySummary,
  formatFileSize,
  formatPrintDateTime,
  formatPrintTime,
} from "./print-queue-format";
import { PrintStatusPill } from "./print-status-pill";

type PrintJob = RouterOutputs["printing"]["list"]["jobs"][number];
type PrintJobStatus = PRINTING.PrintJobStatus;

const insetClassName = "rounded-md border border-white/10 bg-background/60 p-3";

export function PrintJobDialog({
  job,
  onOpenChange,
  timezone,
  sessionLimitMinutes,
}: {
  sessionLimitMinutes?: number;
  job: PrintJob;
  onOpenChange: (open: boolean) => void;
  timezone: string;
}) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const [status, setStatus] = useState<PrintJobStatus>(job.status);
  const [note, setNote] = useState(job.statusNote ?? "");
  const savedDuration =
    job.status === "printing" && job.estimate?.overridden
      ? Math.round(
          (job.estimate.estimatedReadyAt.getTime() -
            job.statusChangedAt.getTime()) /
            60_000,
        )
      : 0;
  const [hours, setHours] = useState(
    savedDuration > 0 ? String(Math.floor(savedDuration / 60)) : "",
  );
  const [minutes, setMinutes] = useState(
    savedDuration > 0 ? String(savedDuration % 60) : "",
  );
  const durationMinutes = Number(hours) * 60 + Number(minutes);
  const durationValid =
    Number.isInteger(Number(hours)) &&
    Number(hours) >= 0 &&
    Number.isInteger(Number(minutes)) &&
    Number(minutes) >= 0 &&
    Number(minutes) < 60 &&
    durationMinutes >= 1 &&
    durationMinutes <= PRINTING.MAX_PRINT_MINUTES;
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(
    null,
  );

  const noteRequired = (
    PRINTING.NOTE_REQUIRED_PRINT_JOB_STATUSES as readonly string[]
  ).includes(status);

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
      <DialogContent className="max-h-[calc(100svh-2rem)] w-[calc(100svw-2rem)] max-w-2xl grid-cols-[minmax(0,1fr)] overflow-y-auto border-white/10 bg-card p-4 sm:p-6 [&>button]:size-11">
        <DialogHeader>
          <div className="flex min-w-0 flex-wrap items-center gap-3 pr-8">
            <DialogTitle className="min-w-0 break-words">
              {job.submitter.name ?? "Unknown hacker"}
            </DialogTitle>
            <PrintStatusPill status={job.status} />
          </div>
          <DialogDescription>
            Submitted {formatPrintDateTime(job.createdAt, timezone)}
            {job.estimate ? ` · Overall queue #${job.estimate.position}` : ""}
          </DialogDescription>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium tabular-nums text-foreground">
              {job.requestCount} total print{" "}
              {job.requestCount === 1 ? "request" : "requests"}
            </span>{" "}
            by this person at this hackathon, including completed and cancelled
            jobs.
          </p>
        </DialogHeader>

        <div className="grid min-w-0 gap-4">
          <section aria-label="Description" className={insetClassName}>
            <p
              tabIndex={job.description.length > 180 ? 0 : undefined}
              className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-6"
            >
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
                  <span
                    title={file.fileName}
                    className="min-w-0 flex-1 truncate font-mono text-[13px]"
                  >
                    {file.fileName}
                  </span>
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {formatFileSize(file.size)}
                  </span>
                  <Button
                    aria-label={`Download ${file.fileName}`}
                    className="min-h-11 shrink-0 gap-2 px-3"
                    disabled={downloadingFileId !== null}
                    onClick={() => {
                      setDownloadingFileId(file.id);
                      download.mutate({ fileId: file.id });
                    }}
                    type="button"
                    variant="outline"
                  >
                    <Download aria-hidden="true" className="size-4" />
                    <span className="hidden sm:inline">Download</span>
                  </Button>
                </li>
              ))}
            </ul>
          </section>

          <ContactSection job={job} />
          <PrintCategoryForm job={job} onDone={finish} />

          {job.status === "printing" && job.estimate?.overridden ? (
            <section
              aria-label="Print timer"
              className={`${insetClassName} grid gap-1`}
            >
              <Countdown
                endsAt={job.estimate.estimatedReadyAt}
                expiredText="Estimated time elapsed — check the printer."
                className="font-mono text-lg tabular-nums"
              />
              <p className="text-sm text-muted-foreground">
                Estimated finish{" "}
                {formatPrintTime(job.estimate.estimatedReadyAt, timezone)}. Mark
                ready only when the print is finished.
              </p>
            </section>
          ) : null}

          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              updateStatus.mutate({
                jobId: job.id,
                note,
                status,
                ...(status === "printing" ? { durationMinutes } : {}),
              });
            }}
          >
            <h3 className="text-base font-semibold">Update progress</h3>
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
            {status === "printing" ? (
              <PrintDurationFields
                hours={hours}
                minutes={minutes}
                onHoursChange={setHours}
                onMinutesChange={setMinutes}
                disabled={busy}
                sessionLimitMinutes={sessionLimitMinutes}
                alreadyPrinting={job.status === "printing"}
              />
            ) : null}
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
              disabled={
                busy ||
                (noteRequired && note.trim() === "") ||
                (status === "printing" && !durationValid)
              }
              type="submit"
            >
              {updateStatus.isPending
                ? "Saving..."
                : status === "printing" && job.status !== "printing"
                  ? "Start printing and notify"
                  : "Save and notify hacker"}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
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
