import type { HackerStatus } from "./types";

export type HackerLifecycleState =
  | "application-before-open"
  | "application-open"
  | "application-closed"
  | "pending"
  | "accepted"
  | "accepted-confirmation-closed"
  | "accepted-at-capacity"
  | "confirmed"
  | "checked-in"
  | "denied"
  | "waitlisted"
  | "withdrawn";

export function getHackerLifecycleState({
  applicationDeadline,
  applicationOpen,
  confirmationCapacity,
  confirmationDeadline,
  confirmedCount,
  now = new Date(),
  status,
}: {
  applicationDeadline: Date;
  applicationOpen: Date;
  confirmationCapacity: number | null;
  confirmationDeadline: Date;
  confirmedCount: number;
  now?: Date;
  status: HackerStatus | null;
}): HackerLifecycleState {
  if (!status) {
    if (now < applicationOpen) return "application-before-open";
    if (now > applicationDeadline) return "application-closed";
    return "application-open";
  }

  if (status === "accepted") {
    if (now > confirmationDeadline) return "accepted-confirmation-closed";
    if (
      confirmationCapacity != null &&
      confirmedCount >= confirmationCapacity
    ) {
      return "accepted-at-capacity";
    }
  }

  const states: Record<HackerStatus, HackerLifecycleState> = {
    accepted: "accepted",
    checkedin: "checked-in",
    confirmed: "confirmed",
    denied: "denied",
    pending: "pending",
    waitlisted: "waitlisted",
    withdrawn: "withdrawn",
  };
  return states[status];
}
