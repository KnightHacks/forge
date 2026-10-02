/** "about 45 min", "about 1 hr", "about 2.5 hr". */
export function formatDuration(minutes: number) {
  if (minutes < 60) return `about ${Math.max(1, Math.round(minutes))} min`;
  const hours = Math.round(minutes / 30) / 2;
  return `about ${hours} hr`;
}

/** The disclaimer's print time: "about 1 hour", "about 45 minutes". */
export function formatPrintTime(minutes: number) {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `about ${hours} ${hours === 1 ? "hour" : "hours"}`;
  }
  return `about ${minutes} minutes`;
}

/**
 * "around 3:40 PM, about 2 hr", or "any minute now" once the estimate has
 * passed. Times are shown in the hackathon's time zone.
 */
export function formatReadyAt(readyAt: Date, now: Date, timeZone: string) {
  const minutes = (readyAt.getTime() - now.getTime()) / 60_000;
  if (minutes <= 0) return "any minute now";
  const clock = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(readyAt);
  return `around ${clock}, ${formatDuration(minutes)}`;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
