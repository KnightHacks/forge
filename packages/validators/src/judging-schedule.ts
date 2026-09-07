import { z } from "zod";

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
    setupMinutes: z.number().int().min(0).max(60).default(2),
    judgingMinutes: z.number().int().min(1).max(120).default(6),
    teardownMinutes: z.number().int().min(0).max(60).default(2),
    sameBuildingBreakMinutes: z.number().int().min(1).max(240).default(10),
    differentBuildingBreakMinutes: z.number().int().min(1).max(240).default(20),
  })
  .superRefine((timing, ctx) => {
    const duration =
      timing.setupMinutes + timing.judgingMinutes + timing.teardownMinutes;
    const windowMinutes =
      (timing.endsAt.getTime() - timing.startsAt.getTime()) / 60_000;
    if (windowMinutes < duration || windowMinutes > 24 * 60) {
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message:
          "The window must fit a full appointment and be at most 24 hours.",
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
