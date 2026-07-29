"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { toast } from "@forge/ui/toast";

import {
  clearResumeDownloadSignal,
  readResumeDownloadSignal,
} from "./resume-bundle-download-signal";

const POLL_INTERVAL_MS = 250;
const PREPARATION_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Drives the resume bundle ZIP download. The route handler streams the archive
 * and reports completion through a cookie rather than a mutation result, so
 * this owns the poll, the give-up timer, and the toast for each outcome.
 *
 * The per-click token is what makes the poll safe: a stale cookie from an
 * earlier attempt does not match, so it is ignored rather than ending the
 * current preparation early.
 */
export function useResumeBundleDownload() {
  const [isPreparing, setIsPreparing] = useState(false);
  const pollTimerRef = useRef<number | null>(null);
  const timeoutTimerRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (timeoutTimerRef.current !== null) {
      window.clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const startDownload = useCallback(() => {
    if (isPreparing) return;

    clearTimers();
    clearResumeDownloadSignal();
    setIsPreparing(true);

    const token = window.crypto.randomUUID().replaceAll("-", "");
    const readySignal = `${token}.ready`;
    const errorSignal = `${token}.error`;

    pollTimerRef.current = window.setInterval(() => {
      const signal = readResumeDownloadSignal();
      if (signal !== readySignal && signal !== errorSignal) return;

      clearTimers();
      clearResumeDownloadSignal();
      setIsPreparing(false);

      if (signal === readySignal) {
        toast.success("Resume bundle download started.");
      } else {
        toast.error(
          "The resume bundle could not be prepared. Please try again.",
        );
      }
    }, POLL_INTERVAL_MS);

    timeoutTimerRef.current = window.setTimeout(() => {
      clearTimers();
      clearResumeDownloadSignal();
      setIsPreparing(false);
      toast.error(
        "Resume preparation is taking longer than expected. Please try again.",
      );
    }, PREPARATION_TIMEOUT_MS);

    const downloadLink = document.createElement("a");
    downloadLink.href = `/api/admin/resume-bundle?downloadToken=${encodeURIComponent(token)}`;
    downloadLink.download = "";
    downloadLink.hidden = true;
    document.body.append(downloadLink);
    downloadLink.click();
    downloadLink.remove();
  }, [clearTimers, isPreparing]);

  return { isPreparing, startDownload };
}
