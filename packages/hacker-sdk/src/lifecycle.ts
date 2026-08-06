export { HACKER_WITHDRAWAL_ACKNOWLEDGEMENT as WITHDRAWAL_ACKNOWLEDGEMENT } from "@forge/validators";

export type HackerApplicationStatus =
  | "accepted"
  | "checkedin"
  | "confirmed"
  | "denied"
  | "pending"
  | "waitlisted"
  | "withdrawn";

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

export interface HackerLifecycleInput {
  applicationClosesAt: Date | string;
  applicationOpensAt: Date | string;
  confirmationCapacity?: number | null;
  confirmationClosesAt: Date | string;
  confirmedCount?: number;
  now?: Date;
  startsAt: Date | string;
  status: HackerApplicationStatus | null;
}

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

export function getHackerLifecycleState(
  input: HackerLifecycleInput,
): HackerLifecycleState {
  const now = input.now ?? new Date();
  const applicationOpensAt = toDate(input.applicationOpensAt);
  const applicationClosesAt = toDate(input.applicationClosesAt);
  const startsAt = toDate(input.startsAt);

  if (input.status === null) {
    if (now < applicationOpensAt) return "application-before-open";
    if (now > applicationClosesAt || now >= startsAt) {
      return "application-closed";
    }
    return "application-open";
  }

  if (input.status === "accepted") {
    if (now > toDate(input.confirmationClosesAt) || now >= startsAt) {
      return "accepted-confirmation-closed";
    }
    if (
      input.confirmationCapacity != null &&
      (input.confirmedCount ?? 0) >= input.confirmationCapacity
    ) {
      return "accepted-at-capacity";
    }
  }

  const states: Record<HackerApplicationStatus, HackerLifecycleState> = {
    accepted: "accepted",
    checkedin: "checked-in",
    confirmed: "confirmed",
    denied: "denied",
    pending: "pending",
    waitlisted: "waitlisted",
    withdrawn: "withdrawn",
  };
  return states[input.status];
}

export interface HackerCapabilityHints {
  canConfirm: boolean;
  canEditApplication: boolean;
  canEditProfile: boolean;
  canGetCheckInPass: boolean;
  canViewLeaderboard: boolean;
  canViewSchedule: boolean;
  canWithdraw: boolean;
}

const EDITABLE_STATUSES = new Set<HackerApplicationStatus>([
  "pending",
  "waitlisted",
  "accepted",
  "confirmed",
  "checkedin",
]);
const WITHDRAWABLE_STATUSES = new Set<HackerApplicationStatus>([
  "pending",
  "waitlisted",
  "accepted",
  "confirmed",
]);

/**
 * Presentation-only hints for a themed portal. The participant API remains the
 * authorization boundary and rechecks every action against database time.
 */
export function getHackerCapabilityHints({
  confirmationClosesAt,
  now = new Date(),
  startsAt,
  status,
}: {
  confirmationClosesAt: Date | string;
  now?: Date;
  startsAt: Date | string;
  status: HackerApplicationStatus | null;
}): HackerCapabilityHints {
  const beforeStart = now < toDate(startsAt);
  const editable =
    status !== null && beforeStart && EDITABLE_STATUSES.has(status);

  return {
    canConfirm:
      status === "accepted" &&
      beforeStart &&
      now <= toDate(confirmationClosesAt),
    canEditApplication: editable,
    canEditProfile: editable,
    canGetCheckInPass: status === "confirmed" || status === "checkedin",
    canViewLeaderboard: status === "confirmed" || status === "checkedin",
    canViewSchedule: status === "checkedin",
    canWithdraw:
      status !== null && beforeStart && WITHDRAWABLE_STATUSES.has(status),
  };
}

export function isWithdrawalAcknowledged(
  value: unknown,
): value is "I understand that withdrawing is irreversible" {
  return value === "I understand that withdrawing is irreversible";
}
