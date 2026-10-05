"use client";

import { useRef, useState } from "react";
import {
  ArrowUpRight,
  Download,
  FileText,
  Loader2,
  Upload,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";
import { toast } from "@forge/ui/toast";

import { useHackerResumeFlow } from "~/lib/hacker-portal";
import styles from "./hacker-resume-controls.module.css";
import dashboardStyles from "./khix-dashboard.module.css";

export function HackerResumeControls() {
  const {
    downloadUrl,
    editable,
    eligibilityLoading,
    eligibilityError,
    retryEligibility,
    resumeQuery,
    uploading,
    uploadResume,
  } = useHackerResumeFlow();
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resume = resumeQuery.data;
  const hint = eligibilityError
    ? "Couldn’t check upload availability. Try again."
    : eligibilityLoading
      ? "Checking upload availability…"
      : editable
        ? "PDF · up to 5 MB · replace until the event ends"
        : "Résumé changes are closed for this event.";

  async function upload(file: File) {
    try {
      await uploadResume(file);
      setOpen(false);
      toast.success("Résumé saved.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save your résumé.",
      );
    }
  }

  const actions = (
    <div className={styles.actions}>
      {(resumeQuery.isError || eligibilityError) && (
        <button
          type="button"
          onClick={() => {
            void resumeQuery.refetch();
            void retryEligibility();
          }}
        >
          Try again
        </button>
      )}
      {resume && (
        <>
          <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
            <ArrowUpRight size={15} aria-hidden="true" /> View
          </a>
          <a href={downloadUrl} download={resume.fileName}>
            <Download size={15} aria-hidden="true" /> Download
          </a>
        </>
      )}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={
          !editable ||
          eligibilityLoading ||
          eligibilityError ||
          uploading ||
          resumeQuery.isPending ||
          resumeQuery.isError
        }
        title={hint}
      >
        {uploading ? (
          <Loader2 size={15} className={styles.spinner} aria-hidden="true" />
        ) : (
          <Upload size={15} aria-hidden="true" />
        )}
        {uploading ? "Uploading…" : resume ? "Replace" : "Upload"}
      </button>
    </div>
  );

  const fileName = resumeQuery.isPending
    ? "Loading…"
    : resumeQuery.isError
      ? "Could not load résumé"
      : (resume?.fileName ?? "No résumé yet");

  return (
    <div className={styles.resume}>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        aria-label="Upload résumé PDF"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void upload(file);
        }}
      />
      <div className={styles.desktop}>
        <div className={styles.file}>
          <FileText size={19} aria-hidden="true" />
          <div>
            <h2>Résumé</h2>
            <p>{fileName}</p>
          </div>
        </div>
        {actions}
        <p className={styles.hint}>{hint}</p>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button type="button" className={styles.mobile}>
            <FileText size={16} aria-hidden="true" /> Résumé
            <ArrowUpRight size={15} aria-hidden="true" />
          </button>
        </DialogTrigger>
        <DialogContent className={`${dashboardStyles.theme} ${styles.dialog}`}>
          <DialogHeader>
            <DialogTitle>Résumé</DialogTitle>
            <DialogDescription>{fileName}</DialogDescription>
          </DialogHeader>
          {actions}
          <p className={styles.hint}>{hint}</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
