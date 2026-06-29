import { z } from "zod";

import { EVENTS } from "@forge/consts";

export const EVENT_DISCORD_NO_PROJECTION_CONFIRMATION =
  "I understand an unlinked Discord event may remain";

export const eventAdminPageSizes = [25, 50, 100, 250, 500] as const;
export const eventAdminViews = [
  "list",
  "calendar",
  "check-in",
  "tags",
] as const;
export const eventAudienceTypes = ["public", "dues", "roles"] as const;
export const eventAdminSortFields = [
  "start",
  "name",
  "tag",
  "attendance",
] as const;
export const eventIntegrationStates = [
  "healthy",
  "needs-attention",
  "pending",
  "synced",
  "error",
  "unknown",
] as const;

const POSTGRES_INTEGER_MAX = 2_147_483_647;
const EVENT_CALENDAR_MAX_WINDOW_MS = 120 * 24 * 60 * 60 * 1_000;

const uuidSchema = z.string().uuid();
const uniqueUuidArraySchema = z
  .array(uuidSchema)
  .max(100)
  .superRefine((values, ctx) => {
    if (new Set(values).size !== values.length) {
      ctx.addIssue({
        code: "custom",
        message: "IDs must not contain duplicates.",
      });
    }
  });

const uniqueStringArraySchema = z
  .array(z.string().trim().min(1).max(100))
  .max(100)
  .superRefine((values, ctx) => {
    if (new Set(values).size !== values.length) {
      ctx.addIssue({
        code: "custom",
        message: "Values must not contain duplicates.",
      });
    }
  });

const explicitOffsetInstantPattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?([+-]\d{2}:\d{2})$/;

const newYorkFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  month: "2-digit",
  second: "2-digit",
  timeZone: EVENTS.CALENDAR_TIME_ZONE,
  year: "numeric",
});

function hasValidNewYorkOffset(value: string): boolean {
  const match = explicitOffsetInstantPattern.exec(value);
  if (!match) return false;

  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) return false;

  const parts = Object.fromEntries(
    newYorkFormatter
      .formatToParts(instant)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const [, year, month, day, hour, minute, second = "00"] = match;

  return (
    parts.year === year &&
    parts.month === month &&
    parts.day === day &&
    parts.hour === hour &&
    parts.minute === minute &&
    parts.second === second
  );
}

export const eventExplicitOffsetInstantSchema = z
  .string()
  .refine(
    hasValidNewYorkOffset,
    `Use a valid ${EVENTS.CALENDAR_TIME_ZONE} date and explicit UTC offset.`,
  );

const eventCalendarInstantSchema = z.iso.datetime({ offset: true });

const eventDateFilterSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (value) => {
      const date = new Date(`${value}T00:00:00Z`);
      return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
      );
    },
    { message: "Use a valid calendar date." },
  );

export const eventScheduleSchema = z
  .object({
    end: eventExplicitOffsetInstantSchema,
    start: eventExplicitOffsetInstantSchema,
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

export const eventIdSchema = z.object({ eventId: uuidSchema }).strict();
export const eventTagIdSchema = z.object({ tagId: uuidSchema }).strict();

export const eventAudienceSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("public") }).strict(),
  z.object({ type: z.literal("dues") }).strict(),
  z
    .object({
      roleIds: uniqueUuidArraySchema.min(1),
      type: z.literal("roles"),
    })
    .strict(),
]);

export const eventInternalTargetSchema = z.discriminatedUnion("internal", [
  z.object({ internal: z.literal(false) }).strict(),
  z
    .object({
      channelId: z
        .string()
        .trim()
        .regex(/^\d{17,20}$/, "Enter a valid Discord channel ID."),
      channelType: z.enum(["voice", "stage"]),
      internal: z.literal(true),
    })
    .strict(),
]);

const eventEditableFieldsSchema = z
  .object({
    audience: eventAudienceSchema,
    description: z.string().trim().min(1).max(1000),
    end: eventExplicitOffsetInstantSchema,
    internalTarget: eventInternalTargetSchema,
    location: z.string().trim().min(1).max(100),
    name: z.string().trim().min(1).max(100),
    pointsOverride: z
      .number()
      .int()
      .nonnegative()
      .max(POSTGRES_INTEGER_MAX)
      .optional(),
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

export const eventCreateSchema = eventEditableFieldsSchema
  .safeExtend({ creationKey: uuidSchema })
  .superRefine((input, ctx) => {
    if (Date.parse(input.start) <= Date.now()) {
      ctx.addIssue({
        code: "custom",
        message: "Start time must be in the future.",
        path: ["start"],
      });
    }
  });

export const eventUpdateSchema = eventEditableFieldsSchema.safeExtend({
  eventId: uuidSchema,
});

const tagNameSchema = z.string().trim().min(1).max(64);
const tagColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Enter a six-digit hex color.");

export const eventTagCreateSchema = z
  .object({
    color: tagColorSchema,
    defaultPoints: z.number().int().nonnegative().max(POSTGRES_INTEGER_MAX),
    name: tagNameSchema,
  })
  .strict();

export const eventTagUpdateSchema = z
  .object({
    color: tagColorSchema.optional(),
    defaultPoints: z
      .number()
      .int()
      .nonnegative()
      .max(POSTGRES_INTEGER_MAX)
      .optional(),
    name: tagNameSchema.optional(),
    tagId: uuidSchema,
  })
  .strict()
  .superRefine((input, ctx) => {
    if (
      input.color === undefined &&
      input.defaultPoints === undefined &&
      input.name === undefined
    ) {
      ctx.addIssue({ code: "custom", message: "Choose at least one change." });
    }
  });

export const eventTagArchiveSchema = eventTagIdSchema;

const eventAdminQueryBaseSchema = z
  .object({
    audiences: z
      .array(z.enum(eventAudienceTypes))
      .max(eventAudienceTypes.length)
      .superRefine((values, ctx) => {
        if (new Set(values).size !== values.length) {
          ctx.addIssue({
            code: "custom",
            message: "Audiences must not contain duplicates.",
          });
        }
      })
      .default([]),
    calendarEnd: eventCalendarInstantSchema.optional(),
    calendarStart: eventCalendarInstantSchema.optional(),
    endDate: eventDateFilterSchema.optional(),
    event: uuidSchema.optional(),
    integrationStates: z
      .array(z.enum(eventIntegrationStates))
      .max(eventIntegrationStates.length)
      .superRefine((values, ctx) => {
        if (new Set(values).size !== values.length) {
          ctx.addIssue({
            code: "custom",
            message: "Integration states must not contain duplicates.",
          });
        }
      })
      .default([]),
    internal: z
      .array(z.boolean())
      .max(2)
      .superRefine((values, ctx) => {
        if (new Set(values).size !== values.length) {
          ctx.addIssue({
            code: "custom",
            message: "Internal filters must not contain duplicates.",
          });
        }
      })
      .default([]),
    page: z.number().int().positive().default(1),
    pageSize: z
      .union([
        z.literal(25),
        z.literal(50),
        z.literal(100),
        z.literal(250),
        z.literal(500),
      ])
      .default(25),
    roleIds: uniqueUuidArraySchema.default([]),
    search: z.string().trim().max(100).default(""),
    sortDirection: z.enum(["asc", "desc"]).optional(),
    sortField: z.enum(eventAdminSortFields).default("start"),
    startDate: eventDateFilterSchema.optional(),
    tags: uniqueStringArraySchema.default([]),
    timing: z.enum(["upcoming", "past", "all"]).default("upcoming"),
    view: z.enum(eventAdminViews).default("list"),
  })
  .strict()
  .superRefine((input, ctx) => {
    const hasCalendarStart = input.calendarStart !== undefined;
    const hasCalendarEnd = input.calendarEnd !== undefined;
    if (input.view === "calendar" && (!hasCalendarStart || !hasCalendarEnd)) {
      ctx.addIssue({
        code: "custom",
        message: "Calendar views require a bounded start and end.",
        path: !hasCalendarStart ? ["calendarStart"] : ["calendarEnd"],
      });
    } else if (hasCalendarStart !== hasCalendarEnd) {
      ctx.addIssue({
        code: "custom",
        message: "Calendar start and end are required together.",
        path: hasCalendarStart ? ["calendarEnd"] : ["calendarStart"],
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
    if (
      input.calendarStart &&
      input.calendarEnd &&
      Date.parse(input.calendarEnd) - Date.parse(input.calendarStart) >
        EVENT_CALENDAR_MAX_WINDOW_MS
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Calendar windows may span at most 120 days.",
        path: ["calendarEnd"],
      });
    }
    if (input.startDate && input.endDate && input.endDate < input.startDate) {
      ctx.addIssue({
        code: "custom",
        message: "End date must not be before start date.",
        path: ["endDate"],
      });
    }
  });

export const eventAdminQuerySchema = eventAdminQueryBaseSchema.transform(
  (input) => ({
    ...input,
    sortDirection:
      input.sortDirection ?? (input.timing === "past" ? "desc" : "asc"),
  }),
);

export const eventQrPayloadSchema = z.string().transform((payload, ctx) => {
  const candidate = payload.startsWith("user:") ? payload.slice(5) : payload;
  const result = uuidSchema.safeParse(candidate);
  if (!result.success) {
    ctx.addIssue({ code: "custom", message: "Scan a valid member QR code." });
    return z.NEVER;
  }
  return { userId: result.data };
});

export const eventCheckInSearchSchema = z
  .object({
    limit: z.number().int().min(1).max(50).default(20),
    query: z.string().trim().min(2).max(100),
  })
  .strict();

export const eventCheckInMemberSchema = z
  .object({ eventId: uuidSchema, memberId: uuidSchema })
  .strict();

export const eventAttendanceRemovalSchema = z
  .object({
    acknowledgeEstimated: z.boolean().default(false),
    attendanceId: uuidSchema,
  })
  .strict();

export const eventDiscordResolutionSchema = z.discriminatedUnion("mode", [
  z
    .object({
      candidateId: z.string().regex(/^\d{17,20}$/),
      eventId: uuidSchema,
      mode: z.literal("link-existing"),
    })
    .strict(),
  z
    .object({
      eventId: uuidSchema,
      mode: z.literal("confirm-create-new"),
    })
    .strict(),
  z
    .object({
      candidateSnapshotToken: z.string().trim().min(1).max(512),
      confirmation: z.literal(EVENT_DISCORD_NO_PROJECTION_CONFIRMATION),
      eventId: uuidSchema,
      mode: z.literal("confirm-no-projection"),
    })
    .strict(),
]);

export type EventAdminQueryInput = z.input<typeof eventAdminQuerySchema>;
export type EventAdminQuery = z.output<typeof eventAdminQuerySchema>;
export type EventAudience = z.infer<typeof eventAudienceSchema>;
export type EventCreateInput = z.infer<typeof eventCreateSchema>;
export type EventDiscordResolutionInput = z.infer<
  typeof eventDiscordResolutionSchema
>;
export type EventInternalTarget = z.infer<typeof eventInternalTargetSchema>;
export type EventUpdateInput = z.infer<typeof eventUpdateSchema>;
