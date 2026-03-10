import z from "zod";

import type { FORMS } from "@forge/consts";

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

  return zodSchema.safeParse(payload);
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

// Transform raw Zod error messages into user-friendly messages
const getUserFriendlyError = (
  question: FORMS.QuestionValidatorType,
  rawMessage: string,
  issue: z.ZodIssue,
): string | null => {
  const isRequired = !question.optional;

  // Check if field is missing/undefined (required field error)
  const isMissingField =
    issue.code === "invalid_type" && rawMessage.includes("received undefined");

  // Check for enum/option validation errors (invalid option selected)
  const isInvalidOption =
    rawMessage.includes("Invalid option") ||
    rawMessage.includes("expected one of") ||
    rawMessage.includes("Invalid enum value");

  // Format-specific question types
  const isFormatSpecific =
    question.type === "EMAIL" ||
    question.type === "PHONE" ||
    question.type === "DATE" ||
    question.type === "TIME" ||
    question.type === "LINK";

  // Handle missing required fields
  if (isMissingField && isRequired) {
    // For format-specific fields, show format error if there's a value, otherwise "Answer required"
    if (isFormatSpecific && !rawMessage.includes("received undefined")) {
      // There's a value but wrong format
      if (question.type === "EMAIL") {
        return "Please type a valid email";
      }
      if (question.type === "PHONE") {
        return "Please type a valid phone number";
      }
      if (question.type === "DATE") {
        return "Please type a valid date";
      }
      if (question.type === "TIME") {
        return "Please type a valid time";
      }
      if (question.type === "LINK") {
        return "Please type a valid URL";
      }
    }
    // All required fields show "Answer required" when empty
    return "Answer required";
  }

  // Handle invalid option selection (for MC/Dropdown/Checkbox)
  if (isInvalidOption && isRequired) {
    return "Answer required";
  }

  // Handle format validation errors
  if (issue.code === "invalid_format" && isFormatSpecific) {
    if (question.type === "EMAIL") {
      return "Please type a valid email";
    }
    if (question.type === "PHONE") {
      return "Please type a valid phone number";
    }
    if (question.type === "DATE") {
      return "Please type a valid date";
    }
    if (question.type === "TIME") {
      return "Please type a valid time";
    }
    if (question.type === "LINK") {
      return "Please type a valid URL";
    }
  }

  // Handle type errors for format-specific fields
  if (issue.code === "invalid_type" && isFormatSpecific && !isMissingField) {
    if (question.type === "EMAIL" && rawMessage.includes("email")) {
      return "Please type a valid email";
    }
    if (question.type === "PHONE" && rawMessage.includes("phone")) {
      return "Please type a valid phone number";
    }
    if (question.type === "DATE" && rawMessage.includes("date")) {
      return "Please type a valid date";
    }
    if (question.type === "TIME" && rawMessage.includes("time")) {
      return "Please type a valid time";
    }
    if (question.type === "LINK" && rawMessage.includes("url")) {
      return "Please type a valid URL";
    }
    if (question.type === "NUMBER" && rawMessage.includes("number")) {
      return "Please type a valid number";
    }
  }

  // Handle other required field errors
  if (isRequired && rawMessage.includes("required")) {
    return "Answer required";
  }

  // Return null for optional fields with no value (don't show error)
  if (!isRequired && isMissingField) {
    return null;
  }

  // For other cases, return the original message
  return rawMessage;
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

  const rawMessage = issue.message;
  return getUserFriendlyError(question, rawMessage, issue);
};

export const isFormValid = (
  zodValidator: string,
  responses: FormResponseUI,
  form: FORMS.FormType,
) => getValidatorResponse(zodValidator, responses, form).success;
