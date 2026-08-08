import { z } from "zod";

import { FORMS } from "@forge/consts";

import { hackathonSendingStatusSchema } from "./hackathons";
import { nullableSocialProfileUrl } from "./social-profile";

/**
 * The statuses an officer can move an applicant to.
 *
 * Reused rather than re-derived, and that reuse is the point:
 * `HACKATHON_SENDING_STATUSES` is `HACKATHON_APPLICATION_STATES` minus
 * `checkedin`, so "checked-in is unreachable from the roster" is enforced by
 * construction instead of by a second list someone has to remember to keep in
 * step. Check-in belongs to the event slice and reaches the column another way.
 */
export const hackerTransitionStatusSchema = hackathonSendingStatusSchema;

/**
 * Officers see "capacity"; the stored value is `denied` and the applicant
 * receives the capacity template. Kept here so both the router and the screen
 * agree on the mapping rather than each spelling it out.
 */
export const HACKER_STATUS_LABELS: Record<
  z.infer<typeof hackathonSendingStatusSchema>,
  string
> = {
  accepted: "Accepted",
  confirmed: "Confirmed",
  denied: "Capacity",
  pending: "Applied",
  waitlisted: "Waitlisted",
  withdrawn: "Withdrawn",
};

/**
 * Every field the roster can filter on, and nothing that is not stored.
 *
 * `levelOfStudy` is degree type — "Undergraduate University (3+ year)" and so
 * on — not academic year. Nothing records that someone is a freshman, and
 * inferring it from `gradDate` is wrong for transfers, part-time and
 * accelerated students, which at bulk scale means accepting a cohort nobody
 * meant to. So the year filter is the **graduation** year, named for what it
 * is.
 */
export const GRADUATION_TERMS = ["Spring", "Summer", "Fall"] as const;
export const FIRST_TIME_HACKER_STATUSES = [
  "first",
  "returning",
  "unknown",
] as const;
export type GraduationTerm = (typeof GRADUATION_TERMS)[number];

/**
 * Term is derived from the graduation month, not stored.
 *
 * Applicants give a date. Officers think in terms — "the Spring 2027 cohort" —
 * so the filter offers that vocabulary and the query does the arithmetic.
 * Boundaries follow the usual academic calendar: Jan–May Spring, Jun–Jul
 * Summer, Aug–Dec Fall.
 */
export const hackerRosterFilterSchema = z.object({
  /** Free text over name and email. */
  search: z.string().trim().max(200).optional(),
  status: hackathonSendingStatusSchema.or(z.literal("checkedin")).optional(),
  // Arrays, because "UCF or Valencia" is one cohort to an officer and two
  // filters to a single-value field.
  schools: z.array(z.string().trim().max(255)).max(50).optional(),
  levelsOfStudy: z.array(z.string().trim().max(255)).max(50).optional(),
  majors: z.array(z.string().trim().max(255)).max(100).optional(),
  racesOrEthnicities: z.array(z.string().trim().max(255)).max(50).optional(),
  genders: z.array(z.string().trim().max(255)).max(20).optional(),
  shirtSizes: z.array(z.string().trim().max(16)).max(20).optional(),
  /** Inclusive age range. Either end may stand alone. */
  ageMin: z.number().int().min(0).max(120).optional(),
  ageMax: z.number().int().min(0).max(120).optional(),
  /** Applicants who wrote something in the dietary field. */
  hasDietaryNeeds: z.boolean().optional(),
  /** @deprecated Transitional boolean filter. Prefer `firstTimeStatus`. */
  isFirstTime: z.boolean().optional(),
  /** Stable per-hackathon answer; unknown is not folded into returning. */
  firstTimeStatus: z.enum(FIRST_TIME_HACKER_STATUSES).optional(),
  graduationTerms: z.array(z.enum(GRADUATION_TERMS)).max(3).optional(),
  graduationYears: z
    .array(z.number().int().min(1900).max(2200))
    .max(30)
    .optional(),
  /** Applicants whose most recent status mail failed permanently. */
  deliveryFailed: z.boolean().optional(),
  blacklisted: z.boolean().optional(),
});

export type HackerRosterFilter = z.infer<typeof hackerRosterFilterSchema>;

export const hackerRosterListSchema = z.object({
  cursor: z.string().uuid().optional(),
  filter: hackerRosterFilterSchema.default({}),
  hackathonId: z.string().uuid(),
  /**
   * The upper bound is the "show all" mode, not a separate procedure — bulk is
   * the primary flow and a filtered group has to be selectable in one sweep
   * rather than page by page. 2537 attendees exist today; the ceiling is set
   * above that so a real hackathon fits in one read, and the officer chooses
   * when to pay for it.
   */
  limit: z.number().int().min(1).max(5000).default(50),
});

export const hackerRosterCountsSchema = z.object({
  filter: hackerRosterFilterSchema.default({}),
  hackathonId: z.string().uuid(),
});

export const hackerSetStatusSchema = z.object({
  attendeeId: z.string().uuid(),
  status: hackerTransitionStatusSchema,
});

/** Destructive reset that lets a participant submit to this hackathon again. */
export const hackerDeleteApplicationSchema = z.object({
  attendeeId: z.string().uuid(),
  confirmed: z.literal(true),
});

/**
 * A bulk action carries the ids the officer actually selected.
 *
 * Preview and confirm take the same shape on purpose. There is no stored
 * preview handle: the ids are the selection, so a persisted snapshot would add
 * a lifecycle to manage and would act on eligibility frozen at preview time.
 * Re-resolving at confirm catches anyone blacklisted in between and names them.
 *
 * Not a filter: filtering the table and selecting across it already *is*
 * selecting by filter, and resolving a filter server-side at confirm time
 * loses the property that matters most on a destructive action — that the
 * officer acts on exactly what they could see.
 *
 * The cap is a real hackathon plus room, and exists so a malformed client
 * cannot ask the server to mail an unbounded set.
 */
export const hackerBulkPreviewSchema = z.object({
  attendeeIds: z.array(z.string().uuid()).min(1).max(5000),
  hackathonId: z.string().uuid(),
  status: hackerTransitionStatusSchema,
});

/**
 * Setting the flag requires a reason; clearing it does not.
 *
 * Mirrors the CHECK constraint on the table, which is the real guarantee. This
 * exists so an officer gets "Say why this applicant is blacklisted" rather than
 * a Postgres constraint name.
 */
export const hackerSetBlacklistSchema = z.discriminatedUnion("blacklisted", [
  z.object({
    attendeeId: z.string().uuid(),
    blacklisted: z.literal(true),
    reason: z
      .string()
      .trim()
      .min(1, "Say why this applicant is blacklisted.")
      .max(500, "Reason must be 500 characters or fewer."),
  }),
  z.object({
    attendeeId: z.string().uuid(),
    blacklisted: z.literal(false),
  }),
]);

/** The distinct values the roster's filters offer, for one hackathon. */
export const hackerFilterOptionsSchema = z.object({
  hackathonId: z.string().uuid(),
});

/**
 * Which of a set of selected applicants would survive a prospective filter.
 *
 * Answered server-side because the client only knows about rows it has loaded,
 * and the interesting case is precisely the one where a selected row is on a
 * page nobody is looking at.
 */
export const hackerSelectionSurvivalSchema = z.object({
  attendeeIds: z.array(z.string().uuid()).min(1).max(5000),
  filter: hackerRosterFilterSchema.default({}),
  hackathonId: z.string().uuid(),
});

/**
 * Why a selected applicant was left out of a bulk status change.
 *
 * Lives here rather than on `@forge/api`'s barrel so Blade can label these
 * without importing from a module that value-exports `appRouter`. One missing
 * `import type` in a `"use client"` file would otherwise pull the router — and
 * through it the database client — toward a browser bundle, and
 * `consistent-type-imports` is only a warning.
 */
export type SkipReason =
  | "already"
  | "blacklisted"
  | "checked_in"
  | "duplicate_email"
  | "missing"
  | "no_email";

/**
 * A manual point adjustment made by an officer.
 *
 * Deliberately a delta rather than a new total: two officers awarding at once
 * would otherwise overwrite each other, and "set to 40" loses the fact that it
 * was 30 and someone added 10. The reason is required because a bare number in
 * a ledger a year later explains nothing.
 */
export const hackerAwardPointsSchema = z.object({
  attendeeId: z.string().uuid(),
  delta: z
    .number()
    .int()
    .min(-1000)
    .max(1000)
    .refine((value) => value !== 0, {
      message: "Award or deduct at least one point.",
    }),
  reason: z.string().trim().min(1).max(300),
});

/**
 * Fields an officer may correct on an application.
 *
 * Everything the roster shows, so a correction never has to become "ask them to
 * reapply". The MLH consent answers are the one deliberate omission: those are
 * attestations the applicant made, not data an officer can restate for them.
 *
 * The enum-typed columns take their enums rather than free strings — `gender`,
 * `raceOrEthnicity` and `shirtSize` are Postgres enums, where an unknown value
 * is a write error rather than a validation failure.
 */
export const hackerUpdateProfileSchema = z.object({
  attendeeId: z.string().uuid(),
  country: z.enum(FORMS.COUNTRIES).optional(),
  discordUser: z.string().trim().min(1).max(255).optional(),
  /**
   * The source of truth for age.
   *
   * Age is derived from this now, so correcting it is what actually fixes a
   * wrong age — typing an age directly would be overwritten by the next read.
   */
  dob: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  email: z.string().trim().email().max(255).optional(),
  firstName: z.string().trim().min(1).max(255).optional(),
  foodAllergies: z.string().trim().max(500).nullish(),
  gender: z.enum(FORMS.GENDERS).optional(),
  githubProfileUrl: nullableSocialProfileUrl(
    "GitHub profile",
    "github",
  ).optional(),
  gradDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  lastName: z.string().trim().min(1).max(255).optional(),
  levelOfStudy: z.enum(FORMS.LEVELS_OF_STUDY).optional(),
  linkedinProfileUrl: nullableSocialProfileUrl(
    "LinkedIn profile",
    "linkedin",
  ).optional(),
  major: z.enum(FORMS.MAJORS).optional(),
  phoneNumber: z.string().trim().min(1).max(255).optional(),
  raceOrEthnicity: z.enum(FORMS.RACES_OR_ETHNICITIES).optional(),
  school: z.enum(FORMS.SCHOOLS).optional(),
  shirtSize: z.enum(FORMS.SHIRT_SIZES).optional(),
  websiteUrl: z.string().trim().url().max(255).nullish(),
});
