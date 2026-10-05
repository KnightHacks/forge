"use client";

import { useRef, useState } from "react";
import { AlertTriangle, Check, FileUp, Loader2, Plus, X } from "lucide-react";

import { PRINTING } from "@forge/consts";
import { PRINT_FILE_UPLOAD_POLICY, uploadAccept } from "@forge/hacker-sdk";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";
import { Label } from "@forge/ui/label";
import { Textarea } from "@forge/ui/textarea";
import { toast } from "@forge/ui/toast";

import type { useHackerPrintingFlow } from "~/lib/hacker-portal";
import { formatFileSize } from "~/lib/print-jobs";
import styles from "./hacker-printing.module.css";
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

export function NewPrintJobForm({
  flow,
  onSubmitted,
}: {
  flow: ReturnType<typeof useHackerPrintingFlow>;
  onSubmitted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<PickedFile[]>([]);
  const uploadQueue = useRef<Promise<void>>(Promise.resolve());
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
      // Send selected files sequentially to respect the attendee upload lock.
      uploadQueue.current = uploadQueue.current
        .then(() => flow.uploadFile(file))
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
      setOpen(false);
      onSubmitted();
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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!submitting) setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button className={styles.primaryButton}>
          <Plus aria-hidden="true" size={18} />
          New print
        </Button>
      </DialogTrigger>
      <DialogContent
        className={`${dashboardStyles.theme} ${styles.workshopDialog}`}
      >
        <DialogHeader>
          <p className={styles.eyebrow}>Shinies × Knight Hacks IX</p>
          <DialogTitle>Request a 3D print</DialogTitle>
          <DialogDescription>
            Add your print details and files. You’ll get a place in the queue
            after sending.
          </DialogDescription>
        </DialogHeader>
        <form
          aria-label="New print job"
          className={styles.panel}
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <p className={styles.formStep}>
            01 <span>Tell us about your print</span>
          </p>
          <div className={styles.field}>
            <Label htmlFor="khix-print-description">
              What should we print?
            </Label>
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
            <p className={styles.formStep}>
              02 <span>Add your files</span>
            </p>
            <p className={styles.hint}>
              STL models and PNG or JPEG reference photos, up to{" "}
              {PRINTING.MAX_PRINT_JOB_FILES} files of{" "}
              {PRINT_FILE_UPLOAD_POLICY.sizeLabel} each.
            </p>
            <PickedFiles
              files={files}
              submitting={submitting}
              onRemove={removeFile}
            />
            {hasFailed ? (
              <p className={styles.fileWarning} role="alert">
                Remove the files that failed before sending, or the job would go
                out without them.
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
            className={styles.primaryButton}
            disabled={!canSubmit}
            type="submit"
          >
            {flow.submitMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            Send to the printer
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PickedFiles({
  files,
  submitting,
  onRemove,
}: {
  files: PickedFile[];
  submitting: boolean;
  onRemove: (file: PickedFile) => void;
}) {
  return files.length > 0 ? (
    <ul aria-live="polite" className={styles.fileList}>
      {files.map((file) => (
        <li className={styles.file} data-state={file.state} key={file.key}>
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
            onClick={() => onRemove(file)}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </li>
      ))}
    </ul>
  ) : null;
}
