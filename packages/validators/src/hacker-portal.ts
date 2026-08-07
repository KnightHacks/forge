import { z } from "zod";

import { FORMS } from "@forge/consts";

import { ianaTimeZoneSchema } from "./hackathons";

export const HACKER_WITHDRAWAL_ACKNOWLEDGEMENT =
  "I understand that withdrawing is irreversible" as const;

export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date.")
  .refine((value) => {
    const parts = value.split("-");
    if (parts.length !== 3) return false;
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, "Enter a real calendar date.");

export function calculateAgeOnDate(dob: string, onDate: string) {
  const birth = dateOnlySchema.parse(dob).split("-").map(Number);
  const current = dateOnlySchema.parse(onDate).split("-").map(Number);
  const [birthYear, birthMonth, birthDay] = birth as [number, number, number];
  const [year, month, day] = current as [number, number, number];
  let age = year - birthYear;
  if (month < birthMonth || (month === birthMonth && day < birthDay)) age -= 1;
  return age;
}

const nullableUrlSchema = z.string().trim().url().max(255).nullable();

/** Catalog schools remain the primary UI path, but portals may submit a school
 * that is not yet present in the shared list. */
export const hackerSchoolSchema = z
  .string()
  .trim()
  .min(1, "Enter your school.")
  .max(255, "School must be 255 characters or fewer.");

export const hackerProfileFieldsSchema = z
  .object({
    country: z.enum(FORMS.COUNTRIES),
    discordUser: z.string().trim().min(1).max(255),
    dob: dateOnlySchema,
    email: z.string().trim().email().max(255),
    firstName: z.string().trim().min(1).max(255),
    foodAllergies: z.string().trim().max(500).nullable(),
    gender: z.enum(FORMS.GENDERS),
    githubProfileUrl: nullableUrlSchema,
    gradDate: dateOnlySchema,
    lastName: z.string().trim().min(1).max(255),
    levelOfStudy: z.enum(FORMS.LEVELS_OF_STUDY),
    linkedinProfileUrl: nullableUrlSchema,
    major: z.enum(FORMS.MAJORS),
    phoneNumber: z.string().trim().min(1).max(255),
    raceOrEthnicity: z.enum(FORMS.RACES_OR_ETHNICITIES),
    school: hackerSchoolSchema,
    shirtSize: z.enum(FORMS.SHIRT_SIZES),
    websiteUrl: nullableUrlSchema,
  })
  .strict();

/** Identity is owned by Blade auth, never trusted from a yearly portal. */
export const hackerProfileInputFieldsSchema = hackerProfileFieldsSchema
  .omit({ discordUser: true })
  .strict();

export const hackerAgreementAcceptanceInputSchema = z
  .object({
    accepted: z.boolean(),
    definitionId: z.string().uuid(),
  })
  .strict();

export const participantIdempotencyKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(128);

export const hackerApplicationSubmitSchema = z
  .object({
    agreements: z.array(hackerAgreementAcceptanceInputSchema).max(32),
    firstTime: z.boolean(),
    idempotencyKey: participantIdempotencyKeySchema,
    profile: hackerProfileInputFieldsSchema,
    survey1: z.string().trim().min(1).max(5_000),
    survey2: z.string().trim().min(1).max(5_000),
  })
  .strict();

export const hackerProfileUpdateSchema = z
  .object({
    expectedRevision: z.number().int().min(1),
    idempotencyKey: participantIdempotencyKeySchema,
    profile: hackerProfileInputFieldsSchema.partial().strict(),
  })
  .strict()
  .refine((input) => Object.keys(input.profile).length > 0, {
    message: "Provide at least one profile field.",
    path: ["profile"],
  });

export const hackerApplicationUpdateSchema = z
  .object({
    agreements: z
      .array(hackerAgreementAcceptanceInputSchema)
      .max(32)
      .optional(),
    firstTime: z.boolean().optional(),
    idempotencyKey: participantIdempotencyKeySchema,
    survey1: z.string().trim().min(1).max(5_000).optional(),
    survey2: z.string().trim().min(1).max(5_000).optional(),
  })
  .strict()
  .refine(
    (input) =>
      input.firstTime !== undefined ||
      input.survey1 !== undefined ||
      input.survey2 !== undefined ||
      input.agreements !== undefined,
    "Provide at least one application field.",
  );

/**
 * Atomic participant edit used by yearly portals whose profile form also owns
 * hackathon-scoped answers and agreement acceptances.
 */
export const hackerParticipantUpdateSchema = z
  .object({
    agreements: z
      .array(hackerAgreementAcceptanceInputSchema)
      .max(32)
      .optional(),
    expectedRevision: z.number().int().min(1),
    firstTime: z.boolean().optional(),
    idempotencyKey: participantIdempotencyKeySchema,
    profile: hackerProfileInputFieldsSchema.partial().strict(),
    survey1: z.string().trim().min(1).max(5_000).optional(),
    survey2: z.string().trim().min(1).max(5_000).optional(),
  })
  .strict()
  .refine(
    (input) =>
      Object.keys(input.profile).length > 0 ||
      input.firstTime !== undefined ||
      input.survey1 !== undefined ||
      input.survey2 !== undefined ||
      input.agreements !== undefined,
    "Provide at least one participant field.",
  );

export const hackerConfirmAttendanceSchema = z
  .object({
    agreements: z.array(hackerAgreementAcceptanceInputSchema).max(32),
    idempotencyKey: participantIdempotencyKeySchema,
  })
  .strict();

export const hackerWithdrawApplicationSchema = z
  .object({
    acknowledgement: z.literal(HACKER_WITHDRAWAL_ACKNOWLEDGEMENT),
    idempotencyKey: participantIdempotencyKeySchema,
  })
  .strict();

export const hackerRemoveResumeSchema = z
  .object({ idempotencyKey: participantIdempotencyKeySchema })
  .strict();

export const hackerIssueCheckInPassSchema = z
  .object({ idempotencyKey: participantIdempotencyKeySchema })
  .strict();

export const resumeUploadMetadataSchema = z
  .object({
    contentType: z.literal("application/pdf"),
    fileName: z.string().trim().min(1).max(255),
    size: z.number().int().min(1).max(5_000_000),
  })
  .strict();

export const portalAuthorizationRequestSchema = z
  .object({
    clientId: z.string().trim().min(1).max(128),
    codeChallenge: z.string().min(43).max(128),
    codeChallengeMethod: z.literal("S256"),
    redirectUri: z.string().url().max(2_048),
    state: z.string().min(32).max(512),
  })
  .strict();

export const portalAuthorizationExchangeSchema = z
  .object({
    clientId: z.string().trim().min(1).max(128),
    code: z.string().min(32).max(512),
    codeVerifier: z.string().min(43).max(128),
    redirectUri: z.string().url().max(2_048),
  })
  .strict();

export const portalRefreshSchema = z
  .object({
    clientId: z.string().trim().min(1).max(128),
    refreshToken: z.string().min(32).max(512),
  })
  .strict();

export const portalRevokeSchema = z
  .object({
    clientId: z.string().trim().min(1).max(128),
    refreshToken: z.string().min(32).max(512).optional(),
  })
  .strict();

export const portalLogoutRequestSchema = z
  .object({
    clientId: z.string().trim().min(1).max(128),
    returnTo: z.string().url().max(2_048),
  })
  .strict();

const isoDateTimeSchema = z.string().datetime({ offset: true });
const nullableIsoDateTimeSchema = isoDateTimeSchema.nullable();

export const hackerApplicationStatusSchema = z.enum(
  FORMS.HACKATHON_APPLICATION_STATES,
);

export const hackerAgreementDefinitionDtoSchema = z
  .object({
    content: z.string().nullable(),
    contentUrl: z.string().url().nullable(),
    id: z.string().uuid(),
    key: z.string(),
    required: z.boolean(),
    stage: z.enum(["application", "confirmation"]),
    title: z.string(),
    version: z.string(),
  })
  .strict()
  .refine(
    (definition) =>
      definition.content !== null || definition.contentUrl !== null,
    "Agreement content or content URL is required.",
  );

export const hackerAgreementAcceptanceDtoSchema = z
  .object({
    accepted: z.boolean(),
    acceptedAt: nullableIsoDateTimeSchema,
    definitionId: z.string().uuid(),
  })
  .strict();

export const publicHackathonDtoSchema = z
  .object({
    agreements: z.array(hackerAgreementDefinitionDtoSchema),
    applicationDeadline: isoDateTimeSchema,
    applicationOpen: isoDateTimeSchema,
    applicationUrl: z.string().url().nullable(),
    confirmationCapacity: z.number().int().min(0).nullable(),
    confirmationDeadline: isoDateTimeSchema,
    displayName: z.string(),
    endDate: isoDateTimeSchema,
    id: z.string().uuid(),
    name: z.string(),
    startDate: isoDateTimeSchema,
    theme: z.string(),
    timezone: ianaTimeZoneSchema,
  })
  .strict();

export const portalSessionDtoSchema = z
  .object({
    authenticated: z.boolean(),
    displayName: z.string().nullable(),
    expiresAt: nullableIsoDateTimeSchema,
  })
  .strict();

export const hackerProfileDtoSchema = hackerProfileFieldsSchema
  .extend({ revision: z.number().int().min(1) })
  .strict();

export const hackerApplicationDtoSchema = z
  .object({
    checkedInAt: nullableIsoDateTimeSchema,
    classId: z.string().uuid().nullable(),
    className: z.string().nullable(),
    confirmedAt: nullableIsoDateTimeSchema,
    firstTime: z.boolean().nullable(),
    isVip: z.boolean(),
    profileRevision: z.number().int().min(1),
    status: hackerApplicationStatusSchema,
    submittedAt: isoDateTimeSchema,
    survey1: z.string().nullable(),
    survey2: z.string().nullable(),
  })
  .strict();

export const resumeDtoSchema = z
  .object({
    fileName: z.string(),
    size: z.number().int().min(1).max(5_000_000).nullable(),
    updatedAt: isoDateTimeSchema,
  })
  .strict();

export const applicationContextDtoSchema = z
  .object({
    agreementAcceptances: z.array(hackerAgreementAcceptanceDtoSchema),
    application: hackerApplicationDtoSchema.nullable(),
    agreements: z.array(hackerAgreementDefinitionDtoSchema),
    editable: z.boolean(),
    profile: hackerProfileDtoSchema.nullable(),
    resume: resumeDtoSchema.nullable(),
  })
  .strict();

export const participantActionSchema = z
  .object({
    allowed: z.boolean(),
    action: z.enum([
      "apply",
      "confirm",
      "edit_application",
      "edit_profile",
      "get_check_in_pass",
      "view_leaderboard",
      "view_schedule",
      "withdraw",
    ]),
    reason: z.string().nullable(),
  })
  .strict();

export const dashboardDtoSchema = z
  .object({
    allowedActions: z.array(participantActionSchema),
    application: hackerApplicationDtoSchema.nullable(),
    isMinorAtHackStart: z.boolean().nullable(),
    profile: hackerProfileDtoSchema.nullable(),
    resume: resumeDtoSchema.nullable(),
  })
  .strict();

export const participantMutationResultDtoSchema = z
  .object({
    application: hackerApplicationDtoSchema.nullable(),
    profile: hackerProfileDtoSchema.nullable(),
    requestId: z.string(),
  })
  .strict();

export const checkInPassDtoSchema = z
  .object({
    expiresAt: nullableIsoDateTimeSchema,
    payload: z.string().min(32).max(1_024),
    version: z.number().int().min(1),
  })
  .strict();

export const scheduleEventDtoSchema = z
  .object({
    description: z.string(),
    endAt: isoDateTimeSchema,
    id: z.string().uuid(),
    location: z.string(),
    name: z.string(),
    points: z.number().int().min(0),
    purpose: z.enum(["event", "primary_check_in"]),
    startAt: isoDateTimeSchema,
    tag: z.string(),
  })
  .strict();

export const scheduleDtoSchema = z
  .object({ events: z.array(scheduleEventDtoSchema) })
  .strict();

export const attendanceOccurrenceDtoSchema = z
  .object({
    checkedInAt: isoDateTimeSchema,
    eventId: z.string().uuid(),
    eventName: z.string(),
    isInitialAttendance: z.boolean(),
    pointsAwarded: z.number().int().min(0),
  })
  .strict();

export const attendanceDtoSchema = z
  .object({ occurrences: z.array(attendanceOccurrenceDtoSchema) })
  .strict();

export const pointEntryDtoSchema = z
  .object({
    awardedAt: isoDateTimeSchema,
    eventId: z.string().uuid(),
    eventName: z.string(),
    points: z.number().int().min(0),
  })
  .strict();

export const pointsDtoSchema = z
  .object({
    entries: z.array(pointEntryDtoSchema),
    total: z.number().int().min(0),
  })
  .strict();

export const hackerLeaderboardInputSchema = z
  .object({
    classId: z.string().uuid().optional(),
    scope: z.enum(["overall", "class"]).default("overall"),
  })
  .strict()
  .refine((input) => input.scope !== "class" || input.classId !== undefined, {
    message: "Choose a class for a class leaderboard.",
    path: ["classId"],
  });

export const leaderboardDtoSchema = z
  .object({
    rows: z.array(
      z
        .object({
          classId: z.string().uuid().nullable(),
          displayName: z.string(),
          isCurrentUser: z.boolean(),
          points: z.number().int().min(0),
          rank: z.number().int().min(1),
        })
        .strict(),
    ),
    viewerRank: z.number().int().min(1).nullable(),
  })
  .strict();

export const participantFieldIssueSchema = z
  .object({
    message: z.string(),
    path: z.array(z.union([z.string(), z.number()])),
  })
  .strict();

export const participantDomainErrorSchema = z
  .object({
    code: z.enum([
      "APPLICATION_CLOSED",
      "APPLICATION_LOCKED",
      "CAPACITY_REACHED",
      "CONFIRMATION_CLOSED",
      "CONFLICT",
      "DUPLICATE_APPLICATION",
      "FORBIDDEN",
      "FORBIDDEN_STATUS",
      "INVALID_AGREEMENT",
      "INVALID_RESUME",
      "SESSION_EXPIRED",
      "STALE_PROFILE_REVISION",
      "UNAUTHENTICATED",
      "VALIDATION_ERROR",
    ]),
    fieldIssues: z.array(participantFieldIssueSchema).optional(),
    requestId: z.string(),
    retryable: z.boolean(),
  })
  .strict();

const noInputSchema = z.undefined();

export const hackerPortalV1InputSchemas = {
  confirmAttendance: hackerConfirmAttendanceSchema,
  getApplicationContext: noInputSchema,
  getCheckInPass: hackerIssueCheckInPassSchema,
  getDashboard: noInputSchema,
  getLeaderboard: hackerLeaderboardInputSchema,
  getMyAttendance: noInputSchema,
  getMyPoints: noInputSchema,
  getPublicHackathon: noInputSchema,
  getResume: noInputSchema,
  getSchedule: noInputSchema,
  getSession: noInputSchema,
  removeResume: hackerRemoveResumeSchema,
  submitApplication: hackerApplicationSubmitSchema,
  updateApplication: hackerApplicationUpdateSchema,
  updateParticipant: hackerParticipantUpdateSchema,
  updateProfile: hackerProfileUpdateSchema,
  withdrawApplication: hackerWithdrawApplicationSchema,
} as const;

export interface HackerPortalV1OutputSchemaMap {
  confirmAttendance: typeof participantMutationResultDtoSchema;
  getApplicationContext: typeof applicationContextDtoSchema;
  getCheckInPass: typeof checkInPassDtoSchema;
  getDashboard: typeof dashboardDtoSchema;
  getLeaderboard: typeof leaderboardDtoSchema;
  getMyAttendance: typeof attendanceDtoSchema;
  getMyPoints: typeof pointsDtoSchema;
  getPublicHackathon: typeof publicHackathonDtoSchema;
  getResume: z.ZodNullable<typeof resumeDtoSchema>;
  getSchedule: typeof scheduleDtoSchema;
  getSession: typeof portalSessionDtoSchema;
  removeResume: typeof participantMutationResultDtoSchema;
  submitApplication: typeof participantMutationResultDtoSchema;
  updateApplication: typeof participantMutationResultDtoSchema;
  updateParticipant: typeof participantMutationResultDtoSchema;
  updateProfile: typeof participantMutationResultDtoSchema;
  withdrawApplication: typeof participantMutationResultDtoSchema;
}

export const hackerPortalV1OutputSchemas: HackerPortalV1OutputSchemaMap = {
  confirmAttendance: participantMutationResultDtoSchema,
  getApplicationContext: applicationContextDtoSchema,
  getCheckInPass: checkInPassDtoSchema,
  getDashboard: dashboardDtoSchema,
  getLeaderboard: leaderboardDtoSchema,
  getMyAttendance: attendanceDtoSchema,
  getMyPoints: pointsDtoSchema,
  getPublicHackathon: publicHackathonDtoSchema,
  getResume: resumeDtoSchema.nullable(),
  getSchedule: scheduleDtoSchema,
  getSession: portalSessionDtoSchema,
  removeResume: participantMutationResultDtoSchema,
  submitApplication: participantMutationResultDtoSchema,
  updateApplication: participantMutationResultDtoSchema,
  updateParticipant: participantMutationResultDtoSchema,
  updateProfile: participantMutationResultDtoSchema,
  withdrawApplication: participantMutationResultDtoSchema,
};

export const hackathonEventPublicationProviderSchema = z.enum([
  "discord",
  "google",
]);

export const hackathonEventPublicationHealthInputSchema = z
  .object({ hackathonId: z.string().uuid() })
  .strict();

export const hackathonEventPublicationSetDesiredStateSchema = z
  .object({
    desiredEnabled: z.boolean(),
    expectedRemoteCount: z.number().int().min(0).optional(),
    expectedRevision: z.number().int().min(1),
    hackathonId: z.string().uuid(),
    provider: hackathonEventPublicationProviderSchema,
  })
  .strict()
  .refine(
    (input) => input.desiredEnabled || input.expectedRemoteCount !== undefined,
    {
      message: "Confirm the current external event count before disabling.",
      path: ["expectedRemoteCount"],
    },
  );

export const hackathonEventPublicationRetrySchema = z
  .object({
    eventIds: z.array(z.string().uuid()).min(1).max(500).optional(),
    hackathonId: z.string().uuid(),
    provider: hackathonEventPublicationProviderSchema,
  })
  .strict();

export const hackathonEventPublicationStatusSchema = z.enum([
  "off",
  "removing",
  "on",
  "publishing",
  "degraded",
  "blocked",
]);

export const hackathonEventPublicationIssueDtoSchema = z
  .object({
    attemptCount: z.number().int().min(0),
    eventId: z.string().uuid(),
    eventName: z.string(),
    lastError: z.string().nullable(),
    nextAttemptAt: nullableIsoDateTimeSchema,
    state: z.enum(["failed", "blocked"]),
  })
  .strict();

export const hackathonEventPublicationProviderHealthDtoSchema = z
  .object({
    counts: z
      .object({
        blocked: z.number().int().min(0),
        converged: z.number().int().min(0),
        error: z.number().int().min(0),
        pending: z.number().int().min(0),
        remote: z.number().int().min(0),
        total: z.number().int().min(0),
      })
      .strict(),
    desiredEnabled: z.boolean(),
    issues: z.array(hackathonEventPublicationIssueDtoSchema),
    provider: hackathonEventPublicationProviderSchema,
    requestedAt: isoDateTimeSchema,
    revision: z.number().int().min(1),
    status: hackathonEventPublicationStatusSchema,
  })
  .strict();

export const hackathonEventPublicationHealthDtoSchema = z
  .object({
    hackathonId: z.string().uuid(),
    providers: z.array(hackathonEventPublicationProviderHealthDtoSchema),
  })
  .strict();

export type HackerPortalV1InputSchemas = typeof hackerPortalV1InputSchemas;
export type HackerPortalV1OutputSchemas = typeof hackerPortalV1OutputSchemas;
