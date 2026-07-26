import { z } from "zod";

import { FORMS } from "@forge/consts";

export const EMAIL_TEST_RECIPIENT = "directors@knighthacks.org";
export const EMAIL_PREVIEW_TTL_MINUTES = 15;
export const EMAIL_RECIPIENT_RETENTION_DAYS = 90;

const uuidSchema = z.string().uuid();
const boundedTextSchema = z.string().trim().min(1).max(200_000);
const isoInstantSchema = z.iso.datetime({ offset: true });

export const emailTemplateKindSchema = z.enum(["code", "visual"]);
export const emailTemplateNameSchema = z
  .string()
  .trim()
  .min(1, "Template name is required.")
  .max(120, "Template name must be 120 characters or fewer.");

export const emailHackerStatusSchema = z.enum(
  FORMS.HACKATHON_APPLICATION_STATES,
);

export const emailAudienceDefinitionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("current_members") }).strict(),
  z.object({ kind: z.literal("alumni") }).strict(),
  z.object({ kind: z.literal("team_members") }).strict(),
  z
    .object({
      kind: z.literal("role"),
      roleId: uuidSchema,
    })
    .strict(),
  z
    .object({
      hackathonId: uuidSchema,
      kind: z.literal("hackathon"),
      statuses: z
        .array(emailHackerStatusSchema)
        .min(1)
        .max(FORMS.HACKATHON_APPLICATION_STATES.length)
        .optional(),
    })
    .strict(),
]);

export const emailAudienceDefinitionsSchema = z
  .array(emailAudienceDefinitionSchema)
  .min(1, "Choose at least one audience.")
  .max(200)
  .superRefine((definitions, ctx) => {
    const identities = definitions.map((definition) =>
      JSON.stringify(definition),
    );
    if (new Set(identities).size !== identities.length) {
      ctx.addIssue({
        code: "custom",
        message: "Audience choices must not contain duplicates.",
      });
    }
  });

export const emailResolveAudienceSchema = z
  .object({
    audiences: emailAudienceDefinitionsSchema,
  })
  .strict();

export const emailExcludedRecipientsSchema = z
  .array(z.string().trim().toLowerCase().pipe(z.email()))
  .max(50_000)
  .superRefine((emails, ctx) => {
    if (new Set(emails).size !== emails.length) {
      ctx.addIssue({
        code: "custom",
        message: "Excluded recipient emails must not contain duplicates.",
      });
    }
  })
  .default([]);

const emailPlainTextContentSchema = z
  .object({
    mode: z.literal("plainText"),
    plainText: boundedTextSchema,
    subject: z.string().trim().min(1).max(200),
  })
  .strict();

const emailTemplateContentSchema = z
  .object({
    fallbackData: z.record(z.string(), z.unknown()).default({}),
    mode: z.literal("template"),
    subject: z.string().trim().min(1).max(200),
    templateRevisionId: uuidSchema,
  })
  .strict();

export const emailSendContentSchema = z.discriminatedUnion("mode", [
  emailPlainTextContentSchema,
  emailTemplateContentSchema,
]);

export const emailPreviewSendSchema = z
  .object({
    audiences: emailAudienceDefinitionsSchema,
    content: emailSendContentSchema,
    excludedRecipients: emailExcludedRecipientsSchema,
    scheduledFor: isoInstantSchema.nullable(),
    sendId: uuidSchema.optional(),
  })
  .strict();

export const emailConfirmSendSchema = z
  .object({
    expectedRecipientCount: z.number().int().nonnegative().max(1_000_000),
    previewVersion: z.string().trim().min(8).max(200),
    sendId: uuidSchema,
  })
  .strict();

export const emailSendTestSchema = z
  .object({
    content: emailSendContentSchema,
    sample: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();

const emailCodeTemplateDraftSchema = z
  .object({
    id: uuidSchema.optional(),
    kind: z.literal("code"),
    name: emailTemplateNameSchema,
    source: boundedTextSchema,
  })
  .strict();

const emailVisualTemplateDraftSchema = z
  .object({
    id: uuidSchema.optional(),
    kind: z.literal("visual"),
    name: emailTemplateNameSchema,
    visualDocument: z.record(z.string(), z.unknown()),
  })
  .strict();

export const emailSaveTemplateSchema = z.discriminatedUnion("kind", [
  emailCodeTemplateDraftSchema,
  emailVisualTemplateDraftSchema,
]);

export const emailTemplateIdSchema = z
  .object({ templateId: uuidSchema })
  .strict();

export const emailTemplatePreviewSchema = z
  .object({
    sample: z.record(z.string(), z.unknown()).default({}),
    templateId: uuidSchema,
  })
  .strict();

export const emailSendIdSchema = z.object({ sendId: uuidSchema }).strict();

export const emailRoleAudienceSchema = z
  .object({
    emailAudienceEnabled: z.boolean(),
    roleId: uuidSchema,
  })
  .strict();

export const emailTemplateListSchema = z
  .object({
    includeArchived: z.boolean().default(false),
    limit: z.number().int().min(1).max(100).default(50),
  })
  .strict()
  .default({ includeArchived: false, limit: 50 });

export const emailSendListSchema = z
  .object({
    limit: z.number().int().min(1).max(100).default(50),
  })
  .strict()
  .default({ limit: 50 });

export type EmailAudienceDefinition = z.infer<
  typeof emailAudienceDefinitionSchema
>;
export type EmailSendContent = z.infer<typeof emailSendContentSchema>;
export type EmailSaveTemplateInput = z.infer<typeof emailSaveTemplateSchema>;
