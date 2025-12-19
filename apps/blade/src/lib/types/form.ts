import { z } from "zod";

export const QuestionTypeEnum = z.enum([
  "short_answer",
  "paragraph",
  "multiple_choice",
  "checkboxes",
  "dropdown",
  "date",
  "time",
]);

export type QuestionType = z.infer<typeof QuestionTypeEnum>;

// Option Schema for Choice Questions
export const QuestionOptionSchema = z.object({
  id: z.string().uuid(),
  value: z.string(),
  isOther: z.boolean().default(false), // Logic for "Other" option
});

export const FormQuestionSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, "Question title is required"),
  description: z.string().optional(),
  type: QuestionTypeEnum,
  required: z.boolean().default(false),

  // Data specific to types
  options: z.array(QuestionOptionSchema).optional(),
  placeholder: z.string().optional(), // For text inputs

  // Validation constraints (optional for V1 but good to have)
  validation: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      regex: z.string().optional(),
    })
    .optional(),
});

export type FormQuestion = z.infer<typeof FormQuestionSchema>;
export type QuestionOption = z.infer<typeof QuestionOptionSchema>;
