import { describe, expect, it } from "vitest";

import type { FORMS } from "@forge/consts";
import { isFormValid } from "@forge/utils/forms.client";

describe("isFormValid", () => {
  const createForm = (
    questions: FORMS.QuestionValidatorType[],
  ): FORMS.FormType => ({
    name: "Test Form",
    description: "Test Description",
    questions,
  });

  it("should return true for valid form", () => {
    const form = createForm([
      {
        question: "name",
        type: "SHORT_ANSWER",
      },
    ]);

    const zodValidator = "z.object({ name: z.string() })";
    const result = isFormValid(zodValidator, { name: "John" }, form);

    expect(result).toBe(true);
  });

  it("should return false for invalid form", () => {
    const form = createForm([
      {
        question: "email",
        type: "EMAIL",
      },
    ]);

    const zodValidator = "z.object({ email: z.string().email() })";
    const result = isFormValid(zodValidator, { email: "not-an-email" }, form);

    expect(result).toBe(false);
  });

  it("should return false for missing required field", () => {
    const form = createForm([
      {
        question: "name",
        type: "SHORT_ANSWER",
        optional: false,
      },
    ]);

    const zodValidator = "z.object({ name: z.string() })";
    const result = isFormValid(zodValidator, {}, form);

    expect(result).toBe(false);
  });

  it("should return true for optional field that is missing", () => {
    const form = createForm([
      {
        question: "name",
        type: "SHORT_ANSWER",
        optional: true,
      },
    ]);

    const zodValidator = "z.object({ name: z.string().optional() })";
    const result = isFormValid(zodValidator, {}, form);

    expect(result).toBe(true);
  });

  it("should return true for multiple valid fields", () => {
    const form = createForm([
      {
        question: "name",
        type: "SHORT_ANSWER",
      },
      {
        question: "email",
        type: "EMAIL",
      },
      {
        question: "age",
        type: "NUMBER",
      },
    ]);

    const zodValidator =
      "z.object({ name: z.string(), email: z.string().email(), age: z.number() })";
    const result = isFormValid(
      zodValidator,
      {
        name: "John",
        email: "john@example.com",
        age: 25,
      },
      form,
    );

    expect(result).toBe(true);
  });

  it("should return false if any field is invalid", () => {
    const form = createForm([
      {
        question: "name",
        type: "SHORT_ANSWER",
      },
      {
        question: "email",
        type: "EMAIL",
      },
    ]);

    const zodValidator =
      "z.object({ name: z.string(), email: z.string().email() })";
    const result = isFormValid(
      zodValidator,
      {
        name: "John",
        email: "not-an-email",
      },
      form,
    );

    expect(result).toBe(false);
  });
});
