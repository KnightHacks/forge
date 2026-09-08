import { z } from "zod";

// Match PostgreSQL integer storage without arbitrary phase-length caps.
const storedMinutes = z.number().int().min(0).max(2_147_483_647);
// Bounds candidate enumeration while allowing longer windows with longer slots.
const MAX_GRID_SLOTS = 1440;

const wholeMinuteDate = z
  .date()
  .refine(
    (date) => date.getTime() % 60_000 === 0,
    "Use whole minutes for the judging window.",
  );

export const judgingScheduleTimingSchema = z
  .object({
    startsAt: wholeMinuteDate,
    endsAt: wholeMinuteDate,
    setupMinutes: storedMinutes.default(2),
    judgingMinutes: storedMinutes.min(1).default(6),
    teardownMinutes: storedMinutes.default(2),
    sameBuildingBreakMinutes: storedMinutes.min(1).default(10),
    differentBuildingBreakMinutes: storedMinutes.min(1).default(20),
  })
  .superRefine((timing, ctx) => {
    const duration =
      timing.setupMinutes + timing.judgingMinutes + timing.teardownMinutes;
    const windowMinutes =
      (timing.endsAt.getTime() - timing.startsAt.getTime()) / 60_000;
    if (windowMinutes < duration || !Number.isSafeInteger(duration)) {
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message:
          "The window must fit a full appointment with a safe whole-minute duration.",
      });
    }
    if (Math.floor(windowMinutes / duration) > MAX_GRID_SLOTS) {
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: `Use at most ${MAX_GRID_SLOTS} complete slots per room. Shorten the window or increase the appointment duration.`,
      });
    }
    if (
      timing.differentBuildingBreakMinutes < timing.sameBuildingBreakMinutes
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["differentBuildingBreakMinutes"],
        message:
          "The cross-building break cannot be shorter than the same-building break.",
      });
    }
  });

export const judgingScheduleGenerateSchema = z.object({
  hackathonId: z.string().uuid(),
  timing: judgingScheduleTimingSchema,
});

export const judgingScheduleJobSchema = z.object({
  hackathonId: z.string().uuid(),
  jobId: z.string().uuid(),
});

export const judgingScheduleSaveSchema = judgingScheduleJobSchema.extend({
  candidateKey: z.string().regex(/^[a-f0-9]{64}$/),
  acknowledgeReducedBreaks: z.boolean().default(false),
});

export const judgingAppointmentIdSchema = z.object({
  hackathonId: z.string().uuid(),
  appointmentId: z.string().uuid(),
});

export const judgingUnassignedPresentationSchema = z.object({
  hackathonId: z.string().uuid(),
  projectId: z.string().uuid(),
  challengeId: z.string().uuid(),
});

export const judgingAppointmentAssignSchema =
  judgingUnassignedPresentationSchema.extend({
    roomId: z.string().uuid(),
    startsAt: wholeMinuteDate,
    acknowledgeReducedBreaks: z.boolean().default(false),
  });

export const judgingAppointmentMoveSchema = judgingAppointmentIdSchema.extend({
  roomId: z.string().uuid(),
  startsAt: wholeMinuteDate,
  expectedRevision: z.number().int().min(1),
  acknowledgeReducedBreaks: z.boolean().default(false),
});

export const judgingBuildingCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .refine(
      (name) => !/\p{Cc}/u.test(name),
      "Building names cannot contain control characters.",
    ),
});

export const judgingScheduleReadSchema = z.object({
  hackathonId: z.string().uuid().optional(),
  challengeId: z.string().uuid().optional(),
  challengeIds: z.array(z.string().uuid()).max(100).default([]),
});
