"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  FileUp,
  Loader2,
  Paperclip,
  Printer,
  X,
} from "lucide-react";

import type { HackerPrintJobDto } from "@forge/hacker-sdk";
import { PRINTING } from "@forge/consts";
import { PRINT_FILE_UPLOAD_POLICY, uploadAccept } from "@forge/hacker-sdk";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
import { Label } from "@forge/ui/label";
import { Textarea } from "@forge/ui/textarea";
import { toast } from "@forge/ui/toast";

import {
  useHackerDashboardFlow,
  useHackerPrintingFlow,
} from "~/lib/hacker-portal";
import {
  formatDuration,
  formatFileSize,
  formatPrintTime,
  formatReadyAt,
} from "~/lib/print-jobs";
import styles from "./hacker-printing.module.css";
import { KhixDashboardShell, StatusStage } from "./khix-dashboard";
import dashboardStyles from "./khix-dashboard.module.css";

interface PickedFile {
  error?: string;
  fileId?: string;
  key: string;
  name: string;
  size: number;
  state: "failed" | "uploaded" | "uploading";
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function HackerPrinting() {
  const { dashboard, dashboardQuery } = useHackerDashboardFlow();

  if (dashboardQuery.isPending) {
    return (
      <KhixDashboardShell activeItem="printing">
        <section className={styles.page} aria-busy="true">
          <div className={styles.skeleton} />
        </section>
      </KhixDashboardShell>
    );
  }

  if (dashboardQuery.isError || !dashboard) {
    return (
      <KhixDashboardShell activeItem="printing">
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
      </KhixDashboardShell>
    );
  }

  if (dashboard.participant?.status !== "checkedin") {
    return (
      <KhixDashboardShell activeItem="printing">
        <StatusStage
          action={
            <Button asChild className={dashboardStyles.primaryButton}>
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          }
          body="Send files to the on-site 3D printer once you arrive and check in."
          greeting="3D printing unlocks at check-in"
          headline="The workshop is still closed."
          statusClassName={dashboardStyles.statusPending}
          statusLabel="Locked"
        />
      </KhixDashboardShell>
    );
  }

  return (
    <KhixDashboardShell activeItem="printing">
      <PrintingWorkshop timeZone={dashboard.hackathon.timezone} />
    </KhixDashboardShell>
  );
}

function PrintingWorkshop({ timeZone }: { timeZone: string }) {
  const flow = useHackerPrintingFlow();
  const queue = flow.jobsQuery.data?.queue;

  return (
    <section aria-labelledby="khix-printing-title" className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Knight Hacks IX workshop</p>
        <h1 id="khix-printing-title">3D Printing</h1>
        <p>
          Send a model to the on-site printer and pick it up when it is ready.
        </p>
      </header>

      <aside aria-label="How printing works" className={styles.notice}>
        <Printer aria-hidden="true" className={styles.noticeIcon} />
        <div>
          <p>
            Each print takes{" "}
            <strong>{formatPrintTime(queue?.printMinutes ?? 60)}</strong>. Jobs
            are printed in the order they arrive, and ready times are estimates
            that move with the queue.
          </p>
          {queue ? (
            <p className={styles.noticeQueue}>
              <span>
                <strong>{queue.waitingCount}</strong>{" "}
                {queue.waitingCount === 1 ? "job" : "jobs"} waiting
              </span>
              <span>
                A job sent now:{" "}
                <strong>{formatDuration(queue.estimatedWaitMinutes)}</strong>
              </span>
            </p>
          ) : null}
        </div>
      </aside>

      <NewPrintJobForm flow={flow} />

      <section aria-labelledby="khix-printing-jobs" className={styles.jobs}>
        <h2 id="khix-printing-jobs">Your print jobs</h2>
        {flow.jobsQuery.isPending ? (
          <div className={styles.skeleton} aria-busy="true" />
        ) : flow.jobsQuery.isError ? (
          <div className={styles.panel} role="alert">
            <p>Your print jobs could not be loaded.</p>
            <Button
              className={dashboardStyles.primaryButton}
              disabled={flow.jobsQuery.isFetching}
              onClick={() => void flow.jobsQuery.refetch()}
              type="button"
            >
              Try again
            </Button>
          </div>
        ) : flow.jobsQuery.data.jobs.length === 0 ? (
          <p className={styles.empty}>
            No jobs yet. Your prints will show up here with their place in line.
          </p>
        ) : (
          <ol className={styles.jobList}>
            {flow.jobsQuery.data.jobs.map((job) => (
              <PrintJobCard
                flow={flow}
                job={job}
                key={job.id}
                timeZone={timeZone}
              />
            ))}
          </ol>
        )}
      </section>
    </section>
  );
}

function NewPrintJobForm({
  flow,
}: {
  flow: ReturnType<typeof useHackerPrintingFlow>;
}) {
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<PickedFile[]>([]);
  const uploading = files.some((file) => file.state === "uploading");
  const uploadedIds = files.flatMap((file) =>
    file.state === "uploaded" && file.fileId ? [file.fileId] : [],
  );
  const hasFailed = files.some((file) => file.state === "failed");
  // While a job is being sent the file list is frozen: adding or removing a
  // file then would race the submit that already holds the list.
  const submitting = flow.submitMutation.isPending;
  const canSubmit =
    description.trim() !== "" &&
    uploadedIds.length > 0 &&
    !uploading &&
    !hasFailed &&
    !submitting;

  function update(key: string, patch: Partial<PickedFile>) {
    setFiles((current) =>
      current.map((file) => (file.key === key ? { ...file, ...patch } : file)),
    );
  }

  function addFiles(list: FileList) {
    const room = PRINTING.MAX_PRINT_JOB_FILES - files.length;
    const picked = Array.from(list).slice(0, Math.max(room, 0));
    if (list.length > picked.length) {
      toast.error(
        `A job can have up to ${PRINTING.MAX_PRINT_JOB_FILES} files.`,
      );
    }
    for (const file of picked) {
      const key = crypto.randomUUID();
      setFiles((current) => [
        ...current,
        { key, name: file.name, size: file.size, state: "uploading" },
      ]);
      flow
        .uploadFile(file)
        .then((staged) =>
          update(key, { fileId: staged.fileId, state: "uploaded" }),
        )
        .catch((error: unknown) =>
          update(key, {
            error: errorMessage(error, "Upload failed. Try again."),
            state: "failed",
          }),
        );
    }
  }

  function removeFile(file: PickedFile) {
    setFiles((current) => current.filter((entry) => entry.key !== file.key));
    // Best effort: anything left behind is removed by the abandoned-file
    // cleanup.
    if (file.fileId) void flow.removeFile(file.fileId).catch(() => undefined);
  }

  async function submit() {
    try {
      const job = await flow.submit({
        description: description.trim(),
        fileIds: uploadedIds,
      });
      setDescription("");
      setFiles([]);
      toast.success(
        job.position
          ? `Print job sent. You are #${job.position} in line.`
          : "Print job sent.",
      );
    } catch (error) {
      toast.error(errorMessage(error, "Your print job was not sent."));
    }
  }

  return (
    <form
      aria-labelledby="khix-printing-new"
      className={styles.panel}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <h2 id="khix-printing-new">New print job</h2>
      <div className={styles.field}>
        <Label htmlFor="khix-print-description">What should we print?</Label>
        <Textarea
          className={styles.textarea}
          id="khix-print-description"
          maxLength={PRINTING.MAX_PRINT_JOB_DESCRIPTION_LENGTH}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Material, color, size, and anything the organizers should know."
          required
          rows={4}
          value={description}
        />
      </div>

      <div className={styles.field}>
        <span className={styles.fieldLabel}>Files</span>
        <p className={styles.hint}>
          STL, 3MF, OBJ, or STEP models and PNG or JPEG reference photos, up to{" "}
          {PRINTING.MAX_PRINT_JOB_FILES} files of{" "}
          {PRINT_FILE_UPLOAD_POLICY.sizeLabel} each.
        </p>
        {files.length > 0 ? (
          <ul aria-live="polite" className={styles.fileList}>
            {files.map((file) => (
              <li
                className={styles.file}
                data-state={file.state}
                key={file.key}
              >
                <span aria-hidden="true" className={styles.fileState}>
                  {file.state === "uploading" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : file.state === "uploaded" ? (
                    <Check className="size-4" />
                  ) : (
                    <AlertTriangle className="size-4" />
                  )}
                </span>
                <span className={styles.fileText}>
                  <span className={styles.fileName}>{file.name}</span>
                  <span className={styles.fileMeta}>
                    {file.state === "uploading"
                      ? "Uploading…"
                      : file.state === "uploaded"
                        ? `Uploaded · ${formatFileSize(file.size)}`
                        : file.error}
                  </span>
                </span>
                <button
                  aria-label={`Remove ${file.name}`}
                  className={styles.fileRemove}
                  disabled={file.state === "uploading" || submitting}
                  onClick={() => removeFile(file)}
                  type="button"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {hasFailed ? (
          <p className={styles.fileWarning} role="alert">
            Remove the files that failed before sending, or the job would go out
            without them.
          </p>
        ) : null}
        {files.length < PRINTING.MAX_PRINT_JOB_FILES ? (
          <label aria-disabled={submitting} className={styles.picker}>
            <FileUp aria-hidden="true" className="size-4" />
            Add files
            <input
              accept={uploadAccept(PRINT_FILE_UPLOAD_POLICY)}
              className="sr-only"
              disabled={submitting}
              multiple
              onChange={(event) => {
                if (event.target.files) addFiles(event.target.files);
                event.target.value = "";
              }}
              type="file"
            />
          </label>
        ) : null}
      </div>

      <Button
        className={dashboardStyles.primaryButton}
        disabled={!canSubmit}
        type="submit"
      >
        {flow.submitMutation.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : null}
        Send to the printer
      </Button>
    </form>
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
      toast.error(errorMessage(error, "The job was not cancelled."));
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
        <p className={styles.description}>{job.description}</p>

        {job.status === "needs_clarification" ? (
          <p className={styles.callout} role="note">
            <strong>Waiting on your reply.</strong> {job.statusNote}
          </p>
        ) : job.statusNote ? (
          <p className={styles.note}>
            <strong>From the organizers:</strong> {job.statusNote}
          </p>
        ) : null}

        {job.estimatedReadyAt ? (
          <p className={styles.estimate}>
            {job.status === "received" && job.position !== null ? (
              <span>
                {job.position - 1 === 0
                  ? "Next in line"
                  : `${job.position - 1} ${job.position - 1 === 1 ? "job" : "jobs"} ahead of yours`}
              </span>
            ) : null}
            <span>
              Ready{" "}
              {formatReadyAt(
                new Date(job.estimatedReadyAt),
                new Date(),
                timeZone,
              )}
            </span>
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
        <DialogContent className="max-h-[calc(100svh-1rem)] w-[calc(100svw-1rem)] max-w-md">
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
