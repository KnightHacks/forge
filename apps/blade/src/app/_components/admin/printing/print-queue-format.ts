import type { PRINTING } from "@forge/consts";

type PrintJobStatus = PRINTING.PrintJobStatus;
type DeliveryStatus = "delivered" | "failed" | "not_configured" | "skipped";

/** Pill colors. Printing is the live state, so it alone carries the gold. */
export const PRINT_STATUS_PILL_CLASS: Record<PrintJobStatus, string> = {
  cancelled: "border-white/10 bg-secondary/60 text-muted-foreground",
  needs_clarification:
    "border-destructive/50 bg-destructive/15 text-destructive dark:text-red-300",
  picked_up: "border-white/10 bg-secondary/60 text-muted-foreground",
  printing: "border-[#DBC049]/35 bg-[#DBC049]/10 text-[#DBC049]",
  ready_for_pickup:
    "border-[hsl(var(--chart-2)/0.35)] bg-[hsl(var(--chart-2)/0.08)] text-[hsl(var(--chart-2))]",
  received: "border-primary/40 bg-primary/15 text-foreground",
};

export function formatPrintTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(date);
}

export function formatPrintDateTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone,
  }).format(date);
}

/** "in about 2 hr", "in about 25 min", or "any minute now" once it has passed. */
export function formatReadyIn(readyAt: Date, now: Date) {
  const minutes = Math.round((readyAt.getTime() - now.getTime()) / 60_000);
  if (minutes <= 0) return "any minute now";
  if (minutes < 60) return `in about ${minutes} min`;
  const hours = Math.round(minutes / 30) / 2;
  return `in about ${hours} hr`;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** `<input type="datetime-local">` value in the browser's own time zone. */
export function toDateTimeLocalValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

/** Toast copy for a status change, naming any notice that did not go out. */
export function deliverySummary(delivery: {
  discord: DeliveryStatus;
  email: DeliveryStatus;
}) {
  const failed = [
    delivery.discord === "failed" ? "Discord DM" : null,
    delivery.email === "failed" ? "email" : null,
  ].filter((channel) => channel !== null);
  if (failed.length > 0) {
    return {
      description: `The ${failed.join(" and ")} could not be sent. Reach the hacker directly if it matters.`,
      ok: false,
    };
  }
  const sent = [
    delivery.discord === "delivered" ? "a Discord DM" : null,
    delivery.email === "delivered" ? "an email" : null,
  ].filter((channel) => channel !== null);
  return {
    description:
      sent.length > 0
        ? `The hacker was sent ${sent.join(" and ")}.`
        : "No notice was sent.",
    ok: true,
  };
}
