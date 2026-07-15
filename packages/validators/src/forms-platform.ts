import { z } from "zod";

import { FORMS } from "@forge/consts";

export const FORM_UPLOAD_MAX_BYTES = 100 * 1024 * 1024;
export const FORM_LINEAR_SCALE_ENDPOINT_MIN = -1_000;
export const FORM_LINEAR_SCALE_ENDPOINT_MAX = 1_000;
export const FORM_LINEAR_SCALE_MAX_SPAN = 20;

export const formKindSchema = z.enum(["general", "event_feedback", "system"]);
export const formStateSchema = z.enum(["draft", "published", "archived"]);
export const formResponseModeSchema = z.enum([
  "single_locked",
  "single_editable",
  "multiple_locked",
]);

const questionBaseSchema = z.object({
  id: z.string().uuid(),
  prompt: z.string().trim().min(1).max(500),
  required: z.boolean(),
  retired: z.boolean(),
});

export const formOptionSchema = z.object({
  id: z.string().uuid(),
  label: z.string().trim().min(1).max(255),
  value: z.string().trim().min(1).max(255),
});

const choiceFields = {
  allowOther: z.boolean(),
  manualOptions: z.array(formOptionSchema).max(500),
  optionSource: z.enum(["manual", "preset"]),
  presetCatalogId: z.string().trim().min(1).max(100).nullable(),
};

export const formQuestionSchema = z.discriminatedUnion("type", [
  questionBaseSchema.extend({
    maxLength: z.number().int().positive().max(10_000),
    type: z.literal("short_text"),
  }),
  questionBaseSchema.extend({
    maxLength: z.number().int().positive().max(100_000),
    type: z.literal("paragraph"),
  }),
  questionBaseSchema.extend({
    ...choiceFields,
    type: z.literal("multiple_choice"),
  }),
  questionBaseSchema.extend({
    ...choiceFields,
    type: z.literal("checkboxes"),
  }),
  questionBaseSchema.extend({
    ...choiceFields,
    type: z.literal("dropdown"),
  }),
  questionBaseSchema.extend({
    allowedMimeTypes: z.array(z.string().trim().min(1)).min(1).max(100),
    maxBytes: z.number().int().positive().max(FORM_UPLOAD_MAX_BYTES),
    type: z.literal("file"),
  }),
  questionBaseSchema.extend({
    max: z
      .number()
      .int()
      .min(FORM_LINEAR_SCALE_ENDPOINT_MIN)
      .max(FORM_LINEAR_SCALE_ENDPOINT_MAX),
    min: z
      .number()
      .int()
      .min(FORM_LINEAR_SCALE_ENDPOINT_MIN)
      .max(FORM_LINEAR_SCALE_ENDPOINT_MAX),
    type: z.literal("linear_scale"),
  }),
  questionBaseSchema.extend({ type: z.literal("date") }),
  questionBaseSchema.extend({ type: z.literal("time") }),
  questionBaseSchema.extend({ type: z.literal("email") }),
  questionBaseSchema.extend({
    max: z.number().optional(),
    min: z.number().optional(),
    type: z.literal("number"),
  }),
  questionBaseSchema.extend({ type: z.literal("phone") }),
  questionBaseSchema.extend({ type: z.literal("boolean") }),
  questionBaseSchema.extend({ type: z.literal("link") }),
]);

const instructionSchema = z.discriminatedUnion("type", [
  z.object({
    body: z.string().max(20_000),
    id: z.string().uuid(),
    type: z.literal("text"),
  }),
  z.object({
    alt: z.string().trim().min(1).max(500),
    attachmentId: z.string().uuid(),
    id: z.string().uuid(),
    type: z.enum(["image", "video"]),
  }),
]);

export const formDefinitionSchema = z
  .object({
    description: z.string().max(5_000),
    instructions: z.array(instructionSchema).max(100),
    questions: z.array(formQuestionSchema).max(500),
    title: z.string().trim().min(1).max(255),
  })
  .superRefine((definition, ctx) => {
    const ids = new Set<string>();
    for (const [index, question] of definition.questions.entries()) {
      if (ids.has(question.id)) {
        ctx.addIssue({
          code: "custom",
          message: "Question IDs must be unique.",
          path: ["questions", index, "id"],
        });
      }
      ids.add(question.id);

      if (
        "optionSource" in question &&
        question.optionSource === "preset" &&
        !question.presetCatalogId
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Preset questions require a catalog.",
          path: ["questions", index, "presetCatalogId"],
        });
      }
      if (
        "optionSource" in question &&
        question.optionSource === "manual" &&
        question.manualOptions.length === 0
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Manual choice questions require an option.",
          path: ["questions", index, "manualOptions"],
        });
      }
      if (question.type === "linear_scale" && question.max <= question.min) {
        ctx.addIssue({
          code: "custom",
          message: "Scale maximum must be greater than its minimum.",
          path: ["questions", index, "max"],
        });
      }
      if (
        question.type === "linear_scale" &&
        question.max - question.min > FORM_LINEAR_SCALE_MAX_SPAN
      ) {
        ctx.addIssue({
          code: "custom",
          message: `Linear scales may span at most ${FORM_LINEAR_SCALE_MAX_SPAN} points.`,
          path: ["questions", index, "max"],
        });
      }
    }
  });

export type FormDefinition = z.infer<typeof formDefinitionSchema>;
export type FormQuestion = FormDefinition["questions"][number];

const formAnswerInputSchema = z.object({
  questionId: z.string().uuid(),
  value: z.unknown(),
});

export const formResponseInputSchema = z
  .object({
    answers: z.array(formAnswerInputSchema).max(500),
    formId: z.string().uuid(),
  })
  .superRefine((input, ctx) => {
    const questionIds = new Set<string>();
    for (const [index, answer] of input.answers.entries()) {
      if (questionIds.has(answer.questionId)) {
        ctx.addIssue({
          code: "custom",
          message: "Each question may be answered only once.",
          path: ["answers", index, "questionId"],
        });
      }
      questionIds.add(answer.questionId);
    }
  });

const selectedOptionSchema = z.object({
  kind: z.literal("option"),
  value: z.string().trim().min(1).max(255),
});
const otherOptionSchema = z.object({
  kind: z.literal("other"),
  text: z
    .string()
    .max(500)
    .refine((text) => text.trim().length > 0, "Other text is required."),
});
const selectedValueSchema = z.discriminatedUnion("kind", [
  selectedOptionSchema,
  otherOptionSchema,
]);

function preservedValueMatches(current: unknown, preserved: unknown): boolean {
  if (
    typeof current === "object" &&
    current !== null &&
    "kind" in current &&
    current.kind === "option" &&
    "value" in current &&
    typeof preserved === "object" &&
    preserved !== null &&
    "kind" in preserved &&
    preserved.kind === "option" &&
    "value" in preserved
  ) {
    return current.value === preserved.value;
  }
  return JSON.stringify(current) === JSON.stringify(preserved);
}

function catalogValue(label: string) {
  return label
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseChoiceValue(
  question: Extract<
    z.infer<typeof formQuestionSchema>,
    { optionSource: string }
  >,
  value: unknown,
  preserved: unknown,
) {
  const selected = selectedValueSchema.parse(value);
  if (selected.kind === "other") {
    if (!question.allowOther) throw new Error("Other is not allowed.");
    return selected;
  }
  const activeOptions =
    question.optionSource === "manual"
      ? question.manualOptions.map((option) => ({
          label: option.label,
          value: option.value,
        }))
      : FORMS.getDropdownOptionsFromConst(
          question.presetCatalogId as FORMS.DropdownConstantKey,
        ).map((label) => ({ label, value: catalogValue(label) }));
  const active = activeOptions.find(
    (option) => option.value === selected.value,
  );
  if (!active && !preservedValueMatches(selected, preserved)) {
    throw new Error("Choose an active option.");
  }
  return active
    ? { ...selected, label: active.label }
    : (preserved ?? selected);
}

function parseQuestionValue(
  question: z.infer<typeof formQuestionSchema>,
  value: unknown,
  preserved: unknown,
): unknown {
  switch (question.type) {
    case "short_text":
    case "paragraph":
      return z.string().max(question.maxLength).parse(value);
    case "multiple_choice":
    case "dropdown":
      return parseChoiceValue(question, value, preserved);
    case "checkboxes": {
      const values = z.array(z.unknown()).parse(value);
      if (question.required && values.length === 0) {
        throw new Error("Choose at least one option.");
      }
      return values.map((item) => parseChoiceValue(question, item, undefined));
    }
    case "file":
      return z
        .object({
          attachmentId: z.string().uuid(),
          fileName: z.string().trim().min(1).max(255).optional(),
        })
        .parse(value);
    case "linear_scale":
      return z.number().int().min(question.min).max(question.max).parse(value);
    case "date":
      return z.iso.date().parse(value);
    case "time":
      return z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
        .parse(value);
    case "email":
      return z.email().parse(value);
    case "number":
      return z
        .number()
        .min(question.min ?? -Number.MAX_VALUE)
        .max(question.max ?? Number.MAX_VALUE)
        .parse(value);
    case "phone":
      return z
        .string()
        .trim()
        .min(7)
        .max(40)
        .regex(/^[+\d][\d\s().-]+$/)
        .parse(value);
    case "boolean":
      return z.boolean().parse(value);
    case "link":
      return z.url().parse(value);
  }
}

export function validateFormAnswers(
  rawDefinition: unknown,
  rawAnswers: readonly { questionId: string; value: unknown }[],
  options: { preservedAnswers?: Record<string, unknown> } = {},
): Record<string, unknown> {
  const definition = formDefinitionSchema.parse(rawDefinition);
  const parsedInput = formResponseInputSchema.parse({
    answers: rawAnswers,
    formId: "00000000-0000-4000-8000-000000000000",
  });
  const questions = new Map(
    definition.questions.map((question) => [question.id, question]),
  );
  const answers: Record<string, unknown> = {};

  for (const answer of parsedInput.answers) {
    const question = questions.get(answer.questionId);
    if (!question || question.retired) throw new Error("Unknown question ID.");
    answers[question.id] = parseQuestionValue(
      question,
      answer.value,
      options.preservedAnswers?.[question.id],
    );
  }

  for (const question of definition.questions) {
    if (question.required && !question.retired && !(question.id in answers)) {
      throw new Error(`${question.prompt} is required.`);
    }
  }

  return answers;
}

export function isFormStateTransitionAllowed(
  current: z.infer<typeof formStateSchema>,
  next: z.infer<typeof formStateSchema>,
): boolean {
  return (
    (current === "draft" && next === "published") ||
    (current === "published" && next === "archived") ||
    (current === "archived" && next === "published")
  );
}

export function getFormAvailability(
  form: {
    closesAt: Date | null;
    manuallyClosed: boolean;
    opensAt: Date | null;
    state: z.infer<typeof formStateSchema>;
  },
  now = new Date(),
) {
  if (form.state === "draft") return "draft" as const;
  if (form.state === "archived") return "archived" as const;
  if (form.manuallyClosed) return "manually_closed" as const;
  if (form.opensAt && now < form.opensAt) return "scheduled" as const;
  if (form.closesAt && now >= form.closesAt) return "closed" as const;
  return "open" as const;
}

const callbackSourceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("fixed"), value: z.unknown() }),
  z.object({ kind: z.literal("question"), questionId: z.string().uuid() }),
  z.object({
    kind: z.literal("system"),
    value: z.enum([
      "user_id",
      "member_id",
      "response_id",
      "submitted_at",
      "event_id",
    ]),
  }),
]);

export const callbackConfigurationSchema = z.object({
  callbackSlug: z.string().trim().min(1).max(255),
  mappings: z
    .array(
      z.object({
        inputKey: z.string().trim().min(1).max(255),
        source: callbackSourceSchema,
      }),
    )
    .min(1)
    .max(100),
  responseMode: z.enum(["single_locked", "multiple_locked"]),
});

const blockedExtensions = new Set([
  "bat",
  "cmd",
  "com",
  "exe",
  "js",
  "mjs",
  "ps1",
  "sh",
  "vbs",
]);
const safeContentTypes = [
  /^application\/(json|msword|pdf|rtf|vnd\.|x-7z-compressed|zip$)/,
  /^image\//,
  /^text\/(csv|plain|rtf)/,
  /^video\//,
] as const;

export function validateFormUpload(input: {
  contentType: string;
  fileName: string;
  size: number;
}):
  | { allowed: true }
  | { allowed: false; reason: "too_large" | "unsafe_type" } {
  if (input.size > FORM_UPLOAD_MAX_BYTES) {
    return { allowed: false, reason: "too_large" };
  }
  const extension = input.fileName.toLowerCase().split(".").pop() ?? "";
  if (
    blockedExtensions.has(extension) ||
    !safeContentTypes.some((pattern) => pattern.test(input.contentType))
  ) {
    return { allowed: false, reason: "unsafe_type" };
  }
  return { allowed: true };
}
