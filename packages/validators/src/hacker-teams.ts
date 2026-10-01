import { z } from "zod";

const teamId = z.string().uuid();
const name = z.string().trim().min(1).max(64);
export const hackerTeamSearchSchema = z
  .object({
    query: z.string().trim().max(100).default(""),
    page: z.number().int().min(0).max(10000).default(0),
  })
  .strict();
export const hackerTeamActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), name }).strict(),
  z.object({ action: z.literal("request"), teamId }).strict(),
  z.object({ action: z.literal("cancel") }).strict(),
  z.object({ action: z.literal("leave") }).strict(),
  z
    .object({
      action: z.literal("update"),
      teamId,
      name,
      together: z.boolean().optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal("decide"),
      teamId,
      attendeeId: teamId,
      accept: z.boolean(),
    })
    .strict(),
  z
    .object({ action: z.literal("remove"), teamId, attendeeId: teamId })
    .strict(),
  z.object({ action: z.literal("delete"), teamId }).strict(),
]);
export type HackerTeamAction = z.infer<typeof hackerTeamActionSchema>;
export const hackerTeamScopeSchema = z.object({ hackathonId: teamId }).strict();
export const hackerTeamAdminSearchSchema = hackerTeamSearchSchema.extend({
  hackathonId: teamId,
});
export const hackerTeamAdminActionSchema = z
  .object({ hackathonId: teamId, change: hackerTeamActionSchema })
  .strict();
const member = z
  .object({
    attendeeId: teamId,
    name: z.string(),
    owner: z.boolean(),
    checkedIn: z.boolean(),
    className: z.string().nullable(),
  })
  .strict();
export const hackerTeamDtoSchema = z
  .object({
    id: teamId,
    name: z.string(),
    together: z.boolean(),
    frozen: z.boolean(),
    className: z.string().nullable(),
    members: z.array(member),
    requests: z.array(member),
  })
  .strict();
export const hackerTeamsDtoSchema = z
  .object({
    attendeeId: teamId,
    canJoin: z.boolean(),
    ownTeam: hackerTeamDtoSchema.nullable(),
    pendingTeam: z.object({ id: teamId, name: z.string() }).strict().nullable(),
    teams: z.array(hackerTeamDtoSchema),
    hasMore: z.boolean(),
  })
  .strict();
export const hackerTeamActionResultSchema = z
  .object({ ok: z.literal(true) })
  .strict();
