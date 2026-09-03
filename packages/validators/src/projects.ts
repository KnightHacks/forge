import { z } from "zod";

const httpUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => ["http:", "https:"].includes(new URL(value).protocol), {
    message: "Use an HTTP(S) URL.",
  })
  .transform((value) => new URL(value).toString());

export const projectIdSchema = z.object({
  projectId: z.string().uuid(),
});

export const projectHackathonIdSchema = z.object({
  hackathonId: z.string().uuid(),
});

export const projectDropAllInputSchema = projectHackathonIdSchema.extend({
  confirmation: z.string().min(1).max(255),
});

const projectListFields = z.object({
  challengeIds: z.array(z.string().uuid()).max(25).default([]),
  deleted: z.enum(["active", "deleted", "all"]).default("active"),
  direction: z.enum(["asc", "desc"]).default("asc"),
  hackathonId: z.string().uuid(),
  maxParticipants: z.coerce.number().int().positive().max(100).optional(),
  minParticipants: z.coerce.number().int().positive().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(25),
  query: z.string().trim().max(120).default(""),
  sort: z.enum(["title", "submittedAt", "participantCount"]).default("title"),
});

const participantRangeRefinement = {
  message: "Minimum participants cannot exceed the maximum.",
  path: ["maxParticipants"],
};

function hasValidParticipantRange(input: {
  maxParticipants?: number;
  minParticipants?: number;
}) {
  return (
    input.maxParticipants === undefined ||
    input.minParticipants === undefined ||
    input.minParticipants <= input.maxParticipants
  );
}

export const projectListInputSchema = projectListFields.refine(
  hasValidParticipantRange,
  participantRangeRefinement,
);

export const judgeProjectListInputSchema = projectListFields
  .omit({ deleted: true, hackathonId: true })
  .extend({
    hackathonId: z.string().uuid().optional(),
  })
  .refine(hasValidParticipantRange, participantRangeRefinement);

export const projectMemberInputSchema = z.object({
  email: z.string().trim().email().max(320),
  name: z.string().trim().min(1).max(255),
});

export const projectUpdateInputSchema = z.object({
  challengeIds: z.array(z.string().uuid()).min(1).max(50),
  demoLinks: z.array(httpUrlSchema).max(20),
  description: z.string().trim().max(50_000),
  members: z.array(projectMemberInputSchema).min(1).max(100),
  participantCount: z.number().int().min(1).max(100),
  projectId: z.string().uuid(),
  submissionUrl: httpUrlSchema,
  technologies: z.array(z.string().trim().min(1).max(255)).max(100),
  title: z.string().trim().min(1).max(255),
  universities: z.array(z.string().trim().min(1).max(255)).max(100),
  videoUrl: httpUrlSchema.nullable(),
});

export type ProjectListInput = z.infer<typeof projectListInputSchema>;
export type JudgeProjectListInput = z.infer<typeof judgeProjectListInputSchema>;
export type ProjectDropAllInput = z.infer<typeof projectDropAllInputSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateInputSchema>;
