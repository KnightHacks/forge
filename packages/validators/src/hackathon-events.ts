import { z } from "zod";

import { discordSnowflakeSchema } from "./discord-archive";
import {
  EVENT_DISCORD_NO_PROJECTION_CONFIRMATION,
  eventExplicitOffsetInstantSchema,
  eventTagAnnouncementFields,
} from "./event-management";

const uuidSchema = z.string().uuid();
const POSTGRES_INTEGER_MAX = 2_147_483_647;

export const hackathonEventPurposeSchema = z.enum([
  "event",
  "primary_check_in",
]);

const hackathonEventEditableFieldsSchema = z
  .object({
    description: z.string().trim().min(1).max(1_000),
    end: eventExplicitOffsetInstantSchema,
    hackathonId: uuidSchema,
    internalTarget: z.object({ internal: z.literal(false) }).strict(),
    location: z.string().trim().min(1).max(100),
    name: z.string().trim().min(1).max(100),
    pointsOverride: z
      .number()
      .int()
      .nonnegative()
      .max(POSTGRES_INTEGER_MAX)
      .optional(),
    purpose: hackathonEventPurposeSchema,
    start: eventExplicitOffsetInstantSchema,
    tagId: uuidSchema,
  })
  .strict()
  .superRefine((input, ctx) => {
    if (Date.parse(input.end) <= Date.parse(input.start)) {
      ctx.addIssue({
        code: "custom",
        message: "End time must be after start time.",
        path: ["end"],
      });
    }
  });

export const hackathonEventCreateSchema =
  hackathonEventEditableFieldsSchema.safeExtend({ creationKey: uuidSchema });

export const hackathonEventUpdateSchema =
  hackathonEventEditableFieldsSchema.safeExtend({
    eventId: uuidSchema,
    expectedRevision: z.number().int().nonnegative(),
  });

export const hackathonEventScopeSchema = z
  .object({ hackathonId: uuidSchema })
  .strict();

export const hackathonEventIdSchema = hackathonEventScopeSchema
  .extend({ eventId: uuidSchema })
  .strict();

export const hackathonEventDiscordResolutionSchema = z.discriminatedUnion(
  "mode",
  [
    z
      .object({
        candidateId: discordSnowflakeSchema,
        eventId: uuidSchema,
        hackathonId: uuidSchema,
        mode: z.literal("link-existing"),
      })
      .strict(),
    z
      .object({
        eventId: uuidSchema,
        hackathonId: uuidSchema,
        mode: z.literal("confirm-create-new"),
      })
      .strict(),
    z
      .object({
        candidateSnapshotToken: z.string().trim().min(1).max(512),
        confirmation: z.literal(EVENT_DISCORD_NO_PROJECTION_CONFIRMATION),
        eventId: uuidSchema,
        hackathonId: uuidSchema,
        mode: z.literal("confirm-no-projection"),
      })
      .strict(),
  ],
);

export const hackathonEventAdminQuerySchema = hackathonEventScopeSchema
  .extend({
    calendarEnd: eventExplicitOffsetInstantSchema.optional(),
    calendarStart: eventExplicitOffsetInstantSchema.optional(),
    integrationState: z
      .enum(["healthy", "needs_attention", "pending", "error", "unknown"])
      .optional(),
    page: z.number().int().positive().max(10_000).default(1),
    pageSize: z
      .union([z.literal(25), z.literal(50), z.literal(100), z.literal(250)])
      .default(25),
    purpose: hackathonEventPurposeSchema.optional(),
    search: z.string().trim().max(100).default(""),
    sortDirection: z.enum(["asc", "desc"]).default("asc"),
    sortField: z.enum(["start", "name", "tag", "attendance"]).default("start"),
    tags: z.array(z.string().trim().min(1).max(64)).max(50).default([]),
    timing: z.enum(["upcoming", "past", "all"]).default("upcoming"),
    view: z.enum(["list", "calendar"]).default("list"),
  })
  .strict()
  .superRefine((input, ctx) => {
    if (
      (input.calendarStart === undefined) !==
      (input.calendarEnd === undefined)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Calendar start and end must be provided together.",
        path: ["calendarStart"],
      });
    }
    if (
      input.calendarStart &&
      input.calendarEnd &&
      Date.parse(input.calendarEnd) <= Date.parse(input.calendarStart)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Calendar end must be after calendar start.",
        path: ["calendarEnd"],
      });
    }
  });

export const hackathonEventCheckInSearchSchema = hackathonEventScopeSchema
  .extend({
    limit: z.number().int().min(1).max(20).default(10),
    query: z
      .string()
      .trim()
      .min(2)
      .max(100)
      .refine(
        (value) => value.replace(/[^\p{L}\p{N}]/gu, "").length >= 2,
        "Enter at least 2 letters or numbers.",
      ),
  })
  .strict();

export const hackathonEventQrPayloadSchema = z.string().trim().max(256);

/** Parsing belongs in the workflow so malformed scans can be retained safely. */
export function parseHackathonQrPayload(payload: string) {
  const candidate = payload.startsWith("user:") ? payload.slice(5) : payload;
  const parsed = uuidSchema.safeParse(candidate);
  return parsed.success ? { userId: parsed.data } : null;
}

const stationFields = {
  calledClassId: uuidSchema.nullable().default(null),
  eventId: uuidSchema,
  hackathonId: uuidSchema,
} as const;

export const hackathonEventCheckInSchema = z.discriminatedUnion("source", [
  z
    .object({
      ...stationFields,
      attendeeId: uuidSchema,
      source: z.literal("manual"),
    })
    .strict(),
  z
    .object({
      ...stationFields,
      allowRepeat: z.boolean().default(false),
      qrPayload: hackathonEventQrPayloadSchema,
      source: z.literal("scanner"),
    })
    .strict(),
]);

export const hackathonCheckInHistorySchema = hackathonEventScopeSchema
  .extend({
    cursor: uuidSchema.optional(),
    direction: z.literal("forward").optional(),
    eventId: uuidSchema.optional(),
    limit: z.number().int().min(1).max(100).default(50),
  })
  .strict();

export const hackathonCheckInAttemptSchema = hackathonEventScopeSchema
  .extend({ attemptId: uuidSchema })
  .strict();

export const hackathonRoleRepairSchema = hackathonCheckInAttemptSchema;

export const hackathonAttendanceCorrectionSchema = hackathonEventScopeSchema
  .extend({
    attendanceId: uuidSchema,
    reason: z.string().trim().min(1).max(300),
  })
  .strict();

const tagFields = {
  emoji: eventTagAnnouncementFields.emoji,
  announcementChannelId: eventTagAnnouncementFields.announcementChannelId,
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Enter a six-digit hex color."),
  defaultPoints: z.number().int().nonnegative().max(POSTGRES_INTEGER_MAX),
  name: z.string().trim().min(1).max(64),
} as const;

export const hackathonEventTagCreateSchema = hackathonEventScopeSchema
  .extend(tagFields)
  .strict();

export const hackathonEventTagUpdateSchema = hackathonEventScopeSchema
  .extend({
    emoji: tagFields.emoji,
    announcementChannelId: tagFields.announcementChannelId,
    color: tagFields.color.optional(),
    defaultPoints: tagFields.defaultPoints.optional(),
    name: tagFields.name.optional(),
    tagId: uuidSchema,
  })
  .strict()
  .superRefine((input, ctx) => {
    if (
      input.color === undefined &&
      input.defaultPoints === undefined &&
      input.name === undefined &&
      input.emoji === undefined &&
      input.announcementChannelId === undefined
    ) {
      ctx.addIssue({ code: "custom", message: "Choose at least one change." });
    }
  });

export const hackathonEventTagArchiveSchema = hackathonEventScopeSchema
  .extend({ tagId: uuidSchema })
  .strict();

export const hackathonEventTagImportSchema = hackathonEventScopeSchema;

const optionalSnowflakeSchema = z
  .string()
  .trim()
  .nullable()
  .transform((value) => (value === "" ? null : value))
  .pipe(discordSnowflakeSchema.nullable());

export const hackathonEventDiscordConfigSchema = hackathonEventScopeSchema
  .extend({
    eventAnnouncementChannelId: optionalSnowflakeSchema,
    generalHackerDiscordRoleId: optionalSnowflakeSchema,
  })
  .strict();

export const hackathonReminderWindowSchema = z.literal("fifteen_minutes");

export type HackathonEventCheckInInput = z.infer<
  typeof hackathonEventCheckInSchema
>;
export type HackathonEventCreateInput = z.infer<
  typeof hackathonEventCreateSchema
>;
export type HackathonEventPurpose = z.infer<typeof hackathonEventPurposeSchema>;
export type HackathonEventUpdateInput = z.infer<
  typeof hackathonEventUpdateSchema
>;
