import { z } from "zod";

const plainText = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((value) => !/<\/?[a-z][^>]*>/i.test(value), "HTML is not allowed");

export const caseStudySlugSchema = z
  .string()
  .min(3)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const caseStudyHttpsUrlSchema = z
  .url()
  .max(2048)
  .refine((value) => {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return false;
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    if (host.startsWith("[") || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return false;
    if (
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host.endsWith(".local") ||
      host === "[::1]" ||
      host === "::1"
    )
      return false;
    return true;
  }, "Use a public HTTPS URL without credentials");

const claimSchema = z
  .object({
    kind: z.enum(["award", "affiliation"]),
    text: plainText(200),
  })
  .strict();

export const caseStudyAttributionSchema = z
  .object({
    displayName: plainText(120),
    contribution: plainText(240),
    links: z.array(caseStudyHttpsUrlSchema).max(3).default([]),
    displayScope: z.enum(["byline", "credits"]),
  })
  .strict();

export const caseStudyAttributionSnapshotSchema = z
  .object({
    subjectUserId: z.uuid(),
    attributionHash: z.string().regex(/^[0-9a-f]{64}$/),
  })
  .strict();

export const caseStudyContentSchema = z
  .object({
    title: plainText(160),
    summary: plainText(500),
    problem: plainText(8000),
    approach: plainText(16000),
    implementation: plainText(24000),
    outcomes: plainText(8000),
    technologies: z.array(plainText(60)).max(20),
    event: z
      .object({
        name: plainText(160),
        year: z.number().int().min(2000).max(2100),
        sourceUrl: caseStudyHttpsUrlSchema.optional(),
      })
      .strict()
      .optional(),
    claims: z.array(claimSchema).max(12).default([]),
    links: z
      .object({
        repository: caseStudyHttpsUrlSchema.optional(),
        demo: caseStudyHttpsUrlSchema.optional(),
        video: caseStudyHttpsUrlSchema.optional(),
      })
      .strict(),
    images: z
      .array(
        z
          .object({
            url: caseStudyHttpsUrlSchema,
            alt: plainText(300),
            width: z.number().int().positive().max(10000),
            height: z.number().int().positive().max(10000),
          })
          .strict(),
      )
      .max(12),
  })
  .strict();

export const caseStudyDraftInputSchema = z
  .object({
    caseStudyId: z.uuid(),
    expectedVersion: z.number().int().nonnegative(),
    content: caseStudyContentSchema,
  })
  .strict();

export const caseStudySubmissionSchema = z
  .object({
    caseStudyId: z.uuid(),
    expectedVersion: z.number().int().nonnegative(),
    authorConnection: z.enum(["member", "alumni", "community", "other"]),
    privateEvidenceUrls: z.array(caseStudyHttpsUrlSchema).max(5).default([]),
  })
  .strict();

export const caseStudyInvitationSchema = z
  .object({
    caseStudyId: z.uuid(),
    attribution: caseStudyAttributionSchema,
    targetUserId: z.uuid().optional(),
  })
  .strict();

export const caseStudyConsentInputSchema = z
  .object({
    caseStudyId: z.uuid(),
    attributionHash: z.string().regex(/^[0-9a-f]{64}$/),
    policyVersion: z.number().int().positive(),
    action: z.enum(["accept", "decline", "revoke"]),
  })
  .strict();

export const caseStudyReviewInputSchema = z
  .object({
    revisionId: z.uuid(),
    stage: z.enum(["technical", "editorial"]),
    outcome: z.enum(["approve", "changes_requested", "reject"]),
    feedback: plainText(4000).optional(),
    eligibility: z.enum(["verified", "unable_to_verify"]).optional(),
    evidenceBasis: z
      .enum([
        "member_record",
        "role_record",
        "event_record",
        "supporting_evidence",
        "community_attestation",
        "insufficient",
      ])
      .optional(),
    claimsVerified: z.boolean().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.stage === "technical") {
      if (
        value.eligibility !== undefined ||
        value.evidenceBasis !== undefined ||
        value.claimsVerified !== undefined
      )
        context.addIssue({
          code: "custom",
          message: "Eligibility evidence belongs to editorial review",
        });
    } else if (
      value.eligibility === undefined ||
      value.evidenceBasis === undefined ||
      value.claimsVerified === undefined ||
      (value.outcome === "approve" &&
        (value.eligibility !== "verified" || !value.claimsVerified))
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Editorial review requires eligibility and verified claims before approval",
      });
    }
  });

export const caseStudyPublicListSchema = z
  .object({
    limit: z.number().int().min(1).max(24).default(12),
    cursor: z.uuid().optional(),
    technology: plainText(60).optional(),
  })
  .strict();

export type CaseStudyContent = z.infer<typeof caseStudyContentSchema>;
export type CaseStudyAttribution = z.infer<typeof caseStudyAttributionSchema>;
