"use client";

import { useEffect, useState } from "react";

export function useDebugLatency(delayMs = 0) {
  const [completedDelayMs, setCompletedDelayMs] = useState<number | null>(
    delayMs > 0 ? null : delayMs,
  );

  useEffect(() => {
    if (delayMs <= 0) return;

    const timeout = window.setTimeout(
      () => setCompletedDelayMs(delayMs),
      delayMs,
    );

    return () => window.clearTimeout(timeout);
  }, [delayMs]);

  return delayMs > 0 && completedDelayMs !== delayMs;
}
