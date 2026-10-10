"use client";

import { useEffect, useState } from "react";

/** A display-only clock: reaching zero never changes the underlying workflow. */
export function Countdown({
  endsAt,
  expiredText,
  className,
}: {
  endsAt: Date | string;
  expiredText: string;
  className?: string;
}) {
  const deadline =
    typeof endsAt === "string" ? Date.parse(endsAt) : endsAt.getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const interval = window.setInterval(tick, 1_000);
    return () => window.clearInterval(interval);
  }, [deadline]);
  const seconds =
    now === null ? null : Math.max(0, Math.ceil((deadline - now) / 1_000));
  const hours = seconds === null ? 0 : Math.floor(seconds / 3600);
  const minutes = seconds === null ? 0 : Math.floor((seconds % 3600) / 60);
  return (
    <span role="timer" aria-live="off" className={className}>
      {seconds === null
        ? "Calculating time remaining…"
        : seconds === 0
          ? expiredText
          : `${hours > 0 ? `${hours}h ` : ""}${minutes}m ${seconds % 60}s remaining`}
    </span>
  );
}
