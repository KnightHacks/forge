"use client";

import { useEffect, useState } from "react";

/** Advance from server time so an inaccurate laptop clock cannot extend a slot. */
export function useJudgingClock(serverNow: Date) {
  const timestamp = serverNow.getTime();
  const [now, setNow] = useState(timestamp);
  useEffect(() => {
    const receivedAt = Date.now();
    const interval = window.setInterval(
      () => setNow(timestamp + Date.now() - receivedAt),
      1000,
    );
    return () => window.clearInterval(interval);
  }, [timestamp]);
  return new Date(Math.max(now, timestamp));
}
