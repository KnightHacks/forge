import { z } from "zod";

const roomNameSchema = z.string().trim().min(1).max(120);

export const judgingHackathonIdSchema = z.object({
  hackathonId: z.string().uuid(),
});

export const judgingRoomIdSchema = z.object({
  roomId: z.string().uuid(),
});

export const judgingRoomCreateSchema = judgingHackathonIdSchema.extend({
  challengeId: z.string().uuid(),
  name: roomNameSchema,
});

export const judgingRoomUpdateSchema = judgingRoomIdSchema.extend({
  challengeId: z.string().uuid(),
  confirmation: z.string().trim().max(120).optional(),
  name: roomNameSchema,
});

export const judgingRoomMoveSchema = judgingRoomIdSchema.extend({
  direction: z.enum(["up", "down"]),
});

export const guestJudgeNameSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .refine((value) => !/\p{Cc}/u.test(value), {
      message: "Name cannot contain control characters.",
    }),
});

export const judgingGuestSessionIdSchema = z.object({
  guestSessionId: z.string().uuid(),
});

export const judgingJudgeIdSchema = z.object({
  judgeId: z.string().uuid(),
});

export const judgingPresenceHeartbeatSchema = z.object({
  roomId: z.string().uuid(),
});

export type JudgingRoomCreateInput = z.infer<typeof judgingRoomCreateSchema>;
export type JudgingRoomUpdateInput = z.infer<typeof judgingRoomUpdateSchema>;
