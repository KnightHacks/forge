/**
 * Every status a 3D print job can hold, in the order a job normally moves
 * through them. `picked_up` and `cancelled` are both terminal and kept apart on
 * purpose, so organizers can see a hacker who keeps cancelling.
 */
export const PRINT_JOB_STATUSES = [
  "received",
  "printing",
  "needs_clarification",
  "ready_for_pickup",
  "picked_up",
  "cancelled",
] as const;

export type PrintJobStatus = (typeof PRINT_JOB_STATUSES)[number];

export const PRINT_JOB_STATUS_LABELS = {
  received: "Received",
  printing: "Printing",
  needs_clarification: "Needs clarification",
  ready_for_pickup: "Ready for pickup",
  picked_up: "Picked up",
  cancelled: "Cancelled",
} as const satisfies Record<PrintJobStatus, string>;

/** A hacker may cancel only before printing starts or while an answer is owed. */
export const HACKER_CANCELLABLE_PRINT_JOB_STATUSES = [
  "received",
  "needs_clarification",
] as const satisfies readonly PrintJobStatus[];

/** Setting one of these tells the hacker to act, so the organizer must say why. */
export const NOTE_REQUIRED_PRINT_JOB_STATUSES = [
  "needs_clarification",
] as const satisfies readonly PrintJobStatus[];

export const MAX_PRINT_JOB_FILES = 5;
export const MAX_PRINT_JOB_DESCRIPTION_LENGTH = 2000;
export const MAX_PRINT_JOB_NOTE_LENGTH = 500;
