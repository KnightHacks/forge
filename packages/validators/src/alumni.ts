import { z } from "zod";

import { GRAD_TERMS, graduationDateFromTerm } from "./member";

export const ALUMNI_BULLETIN_STATES = [
  "draft",
  "published",
  "archived",
] as const;

function emptyStringToNull(value: string | null | undefined) {
  if (value === null || value === undefined || value.length === 0) return null;
  return value;
}

const nullableText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .nullable()
    .optional()
    .transform(emptyStringToNull);

const nullableUuid = z
  .string()
  .trim()
  .uuid()
  .nullable()
  .optional()
  .transform(emptyStringToNull);

const nullableDate = z.coerce.date().nullable().optional();

const externalHttpsUrl = z
  .string()
  .trim()
  .url("Enter a valid HTTPS URL.")
  .refine((value) => new URL(value).protocol === "https:", {
    message: "External bulletin links must use HTTPS.",
  })
  .nullable()
  .optional()
  .transform(emptyStringToNull);

export const alumniGraduationResolutionSchema = z
  .discriminatedUnion("resolution", [
    z.object({
      resolution: z.literal("graduated"),
    }),
    z.object({
      gradTerm: z.enum(GRAD_TERMS),
      gradYear: z.number().int().min(1900).max(2100),
      resolution: z.literal("extended"),
    }),
  ])
  .transform((input, context) => {
    if (input.resolution === "graduated") return input;

    const gradDate = graduationDateFromTerm(input.gradTerm, input.gradYear);
    const today = new Date().toISOString().slice(0, 10);
    if (gradDate <= today) {
      context.addIssue({
        code: "custom",
        message: "Choose a graduation term in the future.",
        path: ["gradYear"],
      });
      return z.NEVER;
    }

    return { ...input, gradDate };
  });

export const alumniBulletinPostSchema = z
  .object({
    body: nullableText(5_000),
    ctaLabel: nullableText(80),
    displayOrder: z.number().int().nonnegative().optional(),
    expiresAt: nullableDate,
    externalUrl: externalHttpsUrl,
    formId: nullableUuid,
    imageAlt: nullableText(240),
    imageObjectName: nullableText(255),
    publishAt: nullableDate,
    state: z.enum(ALUMNI_BULLETIN_STATES).default("draft"),
    title: z.string().trim().min(1, "Title is required.").max(120),
  })
  .superRefine((input, context) => {
    const hasImage = Boolean(input.imageObjectName);
    const hasImageAlt = Boolean(input.imageAlt);
    if (hasImage !== hasImageAlt) {
      context.addIssue({
        code: "custom",
        message: "An image and its description must be provided together.",
        path: hasImage ? ["imageAlt"] : ["imageObjectName"],
      });
    }

    const hasExternalAction = Boolean(input.externalUrl);
    const hasFormAction = Boolean(input.formId);
    const hasAction = hasExternalAction || hasFormAction;
    if (hasExternalAction && hasFormAction) {
      context.addIssue({
        code: "custom",
        message: "Choose either an external link or a Blade form.",
        path: ["externalUrl"],
      });
    }
    if (hasAction !== Boolean(input.ctaLabel)) {
      context.addIssue({
        code: "custom",
        message: "An action and its label must be provided together.",
        path: ["ctaLabel"],
      });
    }

    if (
      input.publishAt &&
      input.expiresAt &&
      input.expiresAt <= input.publishAt
    ) {
      context.addIssue({
        code: "custom",
        message: "Expiration must be after publication.",
        path: ["expiresAt"],
      });
    }
  });

export const alumniBulletinIdSchema = z.object({
  postId: z.string().uuid(),
});

export const alumniBulletinUpdateSchema = alumniBulletinPostSchema.and(
  alumniBulletinIdSchema,
);

export const alumniReorderBulletinPostsSchema = z
  .object({
    postIds: z.array(z.string().uuid()).max(500),
  })
  .superRefine((input, context) => {
    if (new Set(input.postIds).size !== input.postIds.length) {
      context.addIssue({
        code: "custom",
        message: "Bulletin order cannot contain duplicate posts.",
        path: ["postIds"],
      });
    }
  });

export const alumniBulletinImageUploadSchema = z.object({
  fileContent: z.string().min(1),
});

export const alumniBulletinImageRemoveSchema = z.object({
  objectName: z.string().trim().min(1).max(255),
});

export type AlumniBulletinPostInput = z.output<typeof alumniBulletinPostSchema>;
export type AlumniGraduationResolutionInput = z.output<
  typeof alumniGraduationResolutionSchema
>;
