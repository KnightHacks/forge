import { z } from "zod";

const id = z.string().uuid();
export const projectClaimTokenSchema = z
  .object({ token: z.string().regex(/^[a-f0-9]{64}$/) })
  .strict();
export const projectClaimSelectSchema = projectClaimTokenSchema
  .extend({ memberId: id })
  .strict();
export const projectInviteSchema = z
  .object({ email: z.string().trim().email().max(320) })
  .strict();
export const projectClaimSearchSchema = z
  .object({ query: z.string().trim().max(100).default("") })
  .strict();
export const hackerJudgingReadSchema = z
  .object({ projectId: id.optional() })
  .strict();
export const projectClaimAdminReadSchema = projectClaimSearchSchema
  .extend({ hackathonId: id })
  .strict();
export const projectClaimAdminActionSchema = z
  .object({
    hackathonId: id,
    memberId: id.optional(),
    afterMemberId: id.optional(),
  })
  .strict();
export const projectClaimSettingsSchema = z
  .object({
    hackathonId: id,
    published: z.boolean(),
    emergency: z.boolean(),
    claimUrl: z.string().url().max(2000),
  })
  .strict()
  .refine(({ published, emergency }) => published || !emergency, {
    message: "Open the schedule before enabling emergency search.",
    path: ["emergency"],
  })
  .refine(
    ({ claimUrl }) => {
      if (!URL.canParse(claimUrl)) return false;
      const url = new URL(claimUrl);
      return (
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash &&
        (url.protocol === "https:" ||
          (url.protocol === "http:" &&
            ["localhost", "127.0.0.1"].includes(url.hostname)))
      );
    },
    {
      message:
        "Use an HTTPS claim-page URL without credentials, query, or fragment.",
      path: ["claimUrl"],
    },
  );

export const projectClaimMemberDtoSchema = z
  .object({
    id,
    name: z.string(),
    claimed: z.boolean(),
    available: z.boolean(),
  })
  .strict();
export const projectClaimPreviewDtoSchema = z
  .object({
    projectId: id,
    title: z.string(),
    members: z.array(projectClaimMemberDtoSchema).max(4),
  })
  .strict();
export const projectClaimResultDtoSchema = z.object({ projectId: id }).strict();
export const projectInviteResultDtoSchema = z
  .object({ sent: z.boolean(), message: z.string() })
  .strict();
export const projectClaimSearchDtoSchema = z
  .array(z.object({ id, title: z.string() }).strict())
  .max(25);
export const hackerJudgingDtoSchema = z
  .object({
    claimsOpen: z.boolean(),
    published: z.boolean(),
    emergency: z.boolean(),
    serverNow: z.string().datetime(),
    timezone: z.string(),
    project: z
      .object({
        id,
        title: z.string(),
        members: z.array(projectClaimMemberDtoSchema),
        canInvite: z.boolean(),
      })
      .strict()
      .nullable(),
    appointments: z.array(
      z
        .object({
          id,
          challengeId: id,
          challenge: z.string(),
          children: z.array(z.string()),
          room: z.string(),
          startsAt: z.string().datetime(),
          endsAt: z.string().datetime(),
          status: z.enum([
            "future",
            "pending",
            "missed",
            "incomplete",
            "complete",
          ]),
        })
        .strict(),
    ),
    unscheduled: z.array(
      z
        .object({
          challengeId: id,
          challenge: z.string(),
          children: z.array(z.string()),
          judged: z.boolean(),
          rooms: z.array(z.string()),
        })
        .strict(),
    ),
    feedback: z.array(
      z
        .object({
          challengeId: id,
          challenge: z.string(),
          ratings: z.array(
            z
              .object({
                label: z.string(),
                value: z.number().int().min(1).max(5),
              })
              .strict(),
          ),
          responses: z.array(
            z.object({ label: z.string(), value: z.string() }).strict(),
          ),
        })
        .strict(),
    ),
  })
  .strict();
