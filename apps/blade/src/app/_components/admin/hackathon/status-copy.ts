import type { HackathonSendingStatus } from "@forge/validators";

/**
 * Per-status guidance for the config screen.
 *
 * Deliberately verbose. An officer opens this page roughly once a year, so the
 * screen has to re-teach the model rather than assume it was remembered — what
 * fires the mail, what the subject can interpolate, and what a good one looks
 * like.
 */
export interface StatusCopy {
  /** What causes this mail to send. */
  blurb: string;
  /** A realistic subject showing the placeholder syntax in context. */
  example: string;
  label: string;
  /** Why this particular subject is shaped the way it is. */
  rationale: string;
}

/**
 * Keyed by the sending-status union, not by `string`.
 *
 * `HACKATHON_SENDING_STATUSES` is derived from `FORMS.HACKATHON_APPLICATION_STATES`,
 * so adding an application state silently adds a seventh row to this screen and
 * flips every existing hackathon to "not configured". With `Record<string, …>`
 * that compiles, and the new row renders with a raw slug for a label, "Sends
 * when:" followed by nothing, and no example — an officer with no on-screen
 * explanation of a status the screen now demands. Typing it to the union makes that a
 * build error at the point the state is added.
 */
export const STATUS_COPY: Record<HackathonSendingStatus, StatusCopy> = {
  accepted: {
    blurb: "An officer accepts their application.",
    example:
      "[DUE {{hackathon.confirmationDeadline}}] Confirm your spot at {{hackathon.displayName}}",
    label: "Accepted",
    rationale:
      "The deadline belongs in the subject, not just the body — this is the one mail a hacker has to act on, and inbox previews cut off long before a body deadline is visible.",
  },
  confirmed: {
    blurb: "An accepted hacker confirms their spot.",
    example: "You're confirmed for {{hackathon.displayName}} 🎉",
    label: "Confirmed",
    rationale:
      "Nothing is required of them, so the subject is a receipt rather than an instruction.",
  },
  denied: {
    blurb: "An officer rejects their application.",
    example: "An update on your {{hackathon.displayName}} application",
    label: "Denied",
    rationale:
      "The only rejection there is. The copy is where you explain that the hackathon filled up — the status itself is just called denied.",
  },
  pending: {
    blurb: "They submit an application.",
    example: "We received your {{hackathon.displayName}} application",
    label: "Applied",
    rationale:
      "A receipt. Avoid anything that reads like a decision has been made.",
  },
  waitlisted: {
    blurb: "An officer waitlists their application.",
    example: "You're on the {{hackathon.displayName}} waitlist",
    label: "Waitlisted",
    rationale:
      "No deadline yet, so no date in the subject. They may still be accepted later, which sends the accepted mail.",
  },
  withdrawn: {
    blurb: "The hacker withdraws their own application.",
    example: "Your {{hackathon.displayName}} application was withdrawn",
    label: "Withdrawn",
    rationale:
      "Confirms an action they took themselves, and gives them a way to notice if they did not.",
  },
};

/**
 * Placeholders an officer can use in a subject line, with what each renders to.
 *
 * Hackathon templates deliberately cannot reach `member.*` or `team.*`: a
 * hacker need not be a club member, so those would render blank for exactly the
 * people this mail is addressed to.
 */
export const SUBJECT_FIELDS = [
  {
    example: "Knight Hacks IX",
    field: "hackathon.displayName",
    note: "The human name.",
  },
  {
    example: "Oct 3, 2026",
    field: "hackathon.confirmationDeadline",
    note: "Pre-formatted. The date acceptances must be confirmed by.",
  },
  {
    example: "Oct 9, 2026",
    field: "hackathon.startDate",
    note: "Pre-formatted.",
  },
  {
    example: "Oct 11, 2026",
    field: "hackathon.endDate",
    note: "Pre-formatted.",
  },
  {
    example: "https://…/apply",
    field: "hackathon.applicationUrl",
    note: "Empty when no link is set.",
  },
  { example: "Dylan", field: "recipient.firstName", note: "The hacker." },
  { example: "Dylan Vidal", field: "recipient.name", note: "The hacker." },
  {
    example: "dylan@knighthacks.org",
    field: "recipient.email",
    note: "The address the mail is going to.",
  },
  {
    example: "accepted",
    field: "hacker.status",
    note: "The status that triggered the mail.",
  },
] as const;

/**
 * The one catalog field deliberately withheld from this list.
 *
 * `hackathon.name` is the route slug (`knight-hacks-ix`). It stays in the
 * catalog because the send path may still need to resolve it for an already
 * published template, but it is a retired concept that goes away at cutover and
 * no officer should be putting it in a subject line an applicant reads.
 *
 * Named here rather than simply omitted so the drift test can tell "withheld on
 * purpose" from "forgotten", which is how `recipient.email` went missing.
 */
export const SUBJECT_FIELDS_WITHHELD = ["hackathon.name"] as const;
