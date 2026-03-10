import z from "zod";

import { FORMS } from "@forge/consts";

/** UI state in the client */
export type FormResponseUI = Partial<
  Record<string, string | string[] | number | Date | boolean | null>
>;

/** JSON-safe payload what zodValidator will validate */
export type FormResponsePayload = Partial<
  Record<string, string | string[] | number | boolean | null>
>;

export const getValidatorResponse = (
  zodValidator: string,
  responses: FormResponseUI,
  form: FORMS.FormType,
) => {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call
  const zodSchema = new Function("z", `return ${zodValidator}`)(
    z,
  ) as z.ZodSchema;

  const payload = normalizeResponses(responses, form);
  const questionLookup = new Map(
    form.questions.map((question) => [question.question, question]),
  );

  return zodSchema.safeParse(payload, {
    error: (issue) => {
      const pathKey = issue.path?.[0];
      if (typeof pathKey !== "string") return undefined;

      const question = questionLookup.get(pathKey);
      if (!question) return undefined;

      const questionTypeMeta = FORMS.FORM_QUESTION_TYPE_BY_VALUE[question.type];
      const validationErrors = questionTypeMeta.validationErrors;
      const isMissingRequiredField =
        issue.code === "invalid_type" && issue.input === undefined;
      const requiredError = validationErrors.required;

      if (isMissingRequiredField && !question.optional) {
        return requiredError;
      }

      if (!question.optional && issue.code === "invalid_value") {
        const invalidError = validationErrors.invalid;
        return typeof invalidError === "string" ? invalidError : requiredError;
      }

      if (issue.code === "invalid_format" || issue.code === "invalid_type") {
        const formatError = validationErrors.format;
        return typeof formatError === "string" ? formatError : undefined;
      }

      return undefined;
    },
  });
};

// normalized responses needed for zod validation and therefore proc responseData
export const normalizeResponses = (
  responses: FormResponseUI,
  form: FORMS.FormType,
): FormResponsePayload => {
  const out: FormResponsePayload = {};

  for (const q of form.questions) {
    const key = q.question;
    const v = responses[key];

    // drop missing/empty values
    if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) continue;

    // dates -> strings based on question type
    if (v instanceof Date) {
      if (q.type === "DATE") out[key] = v.toISOString().slice(0, 10);
      else if (q.type === "TIME") out[key] = v.toTimeString().slice(0, 5);
      else continue; // unexpected Date for non-date/time question
      continue;
    }

    // if your UI sometimes passes "true"/"false" strings, normalize them here
    if (q.type === "BOOLEAN" && typeof v === "string") {
      if (v === "true") out[key] = true;
      else if (v === "false") out[key] = false;
      else continue;
      continue;
    }

    out[key] = v;
  }

  return out;
};

// get specific validator error for question
export const getValidationError = (
  question: FORMS.QuestionValidatorType,
  zodValidator: string,
  responses: FormResponseUI,
  form: FORMS.FormType,
  showErrors = false,
) => {
  // Don't show errors until form has been submitted/attempted
  if (!showErrors) return null;

  const validatorResponse = getValidatorResponse(zodValidator, responses, form);
  if (validatorResponse.success) return null;

  const issue = validatorResponse.error.issues.find((i) => {
    const k = i.path[0];
    return typeof k === "string" && k === question.question;
  });

  if (!issue) return null;
  return issue.message;
};

export const isFormValid = (
  zodValidator: string,
  responses: FormResponseUI,
  form: FORMS.FormType,
) => getValidatorResponse(zodValidator, responses, form).success;
