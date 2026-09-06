import { z } from "zod";

const roomNameSchema = z.string().trim().min(1).max(120);
const uuidSchema = z.string().uuid();

export const judgingHackathonIdSchema = z.object({
  hackathonId: uuidSchema,
});

export const judgingStateSchema = z.enum(["draft", "open", "closed"]);
export const judgingRubricItemKindSchema = z.enum(["rating", "short_response"]);
export const judgingResponseVisibilitySchema = z.enum([
  "public",
  "public_optional",
  "private",
]);

export const judgingRubricItemSchema = z
  .object({
    description: z.string().trim().max(500).optional().default(""),
    guestVisibilityPolicy: judgingResponseVisibilitySchema.nullable(),
    id: uuidSchema.optional(),
    kind: judgingRubricItemKindSchema,
    label: z.string().trim().min(1).max(120),
    memberVisibilityPolicy: judgingResponseVisibilitySchema.nullable(),
    required: z.boolean().default(true),
  })
  .superRefine((item, ctx) => {
    const policies = [item.guestVisibilityPolicy, item.memberVisibilityPolicy];
    if (item.kind === "rating" && !item.required) {
      ctx.addIssue({
        code: "custom",
        message: "Rating items are always required.",
      });
    }
    if (item.kind === "rating" && policies.some((policy) => policy !== null)) {
      ctx.addIssue({
        code: "custom",
        message: "Rating items cannot have response visibility policies.",
      });
    }
    if (
      item.kind === "short_response" &&
      policies.some((policy) => policy === null)
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "Short responses require member and guest visibility policies.",
      });
    }
  });

export const judgingRubricSaveSchema = judgingHackathonIdSchema.extend({
  items: z.array(judgingRubricItemSchema).superRefine((items, ctx) => {
    const ids = items.flatMap((item) => (item.id ? [item.id] : []));
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: "custom",
        message: "Rubric item IDs must be unique.",
      });
    }
  }),
});

export const judgingStateUpdateSchema = judgingHackathonIdSchema.extend({
  state: judgingStateSchema,
});

export const judgingResultsVisibilitySchema = judgingHackathonIdSchema.extend({
  displayAllResults: z.boolean(),
});

export const judgingRatingAnswerSchema = z.object({
  itemId: uuidSchema,
  value: z.number().int().min(1).max(5),
});

export const judgingResponseAnswerSchema = z.object({
  isPublic: z.boolean().optional(),
  itemId: uuidSchema,
  value: z.string().trim().max(2000),
});

function requireUniqueItemIds(
  answers: { itemId: string }[],
  ctx: z.RefinementCtx,
) {
  const itemIds = answers.map((answer) => answer.itemId);
  if (new Set(itemIds).size !== itemIds.length) {
    ctx.addIssue({
      code: "custom",
      message: "Answer item IDs must be unique.",
    });
  }
}

export const judgingEvaluationSaveSchema = z.object({
  challengeId: uuidSchema.optional(),
  hackathonId: uuidSchema.optional(),
  projectId: uuidSchema,
  ratings: z.array(judgingRatingAnswerSchema).superRefine(requireUniqueItemIds),
  responses: z
    .array(judgingResponseAnswerSchema)
    .superRefine(requireUniqueItemIds),
});

export const judgingProjectDetailsSchema = judgingEvaluationSaveSchema
  .pick({
    challengeId: true,
    hackathonId: true,
    projectId: true,
  })
  .extend({ feedbackPage: z.number().int().min(1).max(10_000).default(1) });

export const judgingEvaluationIdSchema = z.object({
  evaluationId: uuidSchema,
});

export const judgingDeliberationSectionCreateSchema = z.object({
  hackathonId: uuidSchema.optional(),
  name: z.string().trim().min(1).max(80),
});

export const judgingDeliberationSectionUpdateSchema = z.object({
  hackathonId: uuidSchema.optional(),
  name: z.string().trim().min(1).max(80),
  sectionId: uuidSchema,
});

export const judgingDeliberationSectionIdSchema = z.object({
  hackathonId: uuidSchema.optional(),
  sectionId: uuidSchema,
});

export const judgingDeliberationEntrySchema =
  judgingDeliberationSectionIdSchema.extend({
    projectId: uuidSchema,
  });

export const judgingReorderSchema = z
  .object({ ids: z.array(uuidSchema).min(1) })
  .superRefine(({ ids }, ctx) => {
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: "custom", message: "Order IDs must be unique." });
    }
  });

export const judgingSectionReorderSchema = judgingReorderSchema.extend({
  hackathonId: uuidSchema.optional(),
});

export const judgingEntryReorderSchema = judgingReorderSchema.extend({
  hackathonId: uuidSchema.optional(),
  sectionId: uuidSchema,
});

export const judgingRoomIdSchema = z.object({
  roomId: z.string().uuid(),
});

const discordSnowflakeSchema = z.string().regex(/^\d{17,20}$/);

export const judgingCommsChannelSchema = judgingHackathonIdSchema.extend({
  channelId: discordSnowflakeSchema.nullable(),
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
