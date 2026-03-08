import { describe, expect, it } from "vitest";

import type { FORMS } from "@forge/consts";
import { getValidationError } from "@forge/utils/forms.client";

describe("getValidationError", () => {
  const createForm = (
    questions: FORMS.QuestionValidatorType[],
  ): FORMS.FormType => ({
    name: "Test Form",
    description: "Test Description",
    questions,
  });

  it("should return null when validation succeeds", () => {
    const form = createForm([
      {
        question: "name",
        type: "SHORT_ANSWER",
      },
    ]);

    const zodValidator = "z.object({ name: z.string() })";
    const result = getValidationError(
      { question: "name", type: "SHORT_ANSWER" },
      zodValidator,
      { name: "John" },
      form,
    );

    expect(result).toBeNull();
  });

  it("should return error message for invalid field", () => {
    const form = createForm([
      {
        question: "email",
        type: "EMAIL",
      },
    ]);

    const zodValidator = "z.object({ email: z.string().email() })";
    const result = getValidationError(
      { question: "email", type: "EMAIL" },
      zodValidator,
      { email: "not-an-email" },
      form,
    );

    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });

  it("should return null for field not in error", () => {
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
    const result = getValidationError(
      { question: "name", type: "SHORT_ANSWER" },
      zodValidator,
      { name: "John", email: "not-an-email" },
      form,
    );

    // name is valid, so no error
    expect(result).toBeNull();
  });

  it("should return error message for missing required field", () => {
    const form = createForm([
      {
        question: "name",
        type: "SHORT_ANSWER",
        optional: false,
      },
    ]);

    const zodValidator = "z.object({ name: z.string() })";
    const result = getValidationError(
      { question: "name", type: "SHORT_ANSWER" },
      zodValidator,
      {},
      form,
    );

    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });

  it("should return error message for invalid number", () => {
    const form = createForm([
      {
        question: "age",
        type: "NUMBER",
      },
    ]);

    const zodValidator = "z.object({ age: z.number().min(18) })";
    const result = getValidationError(
      { question: "age", type: "NUMBER" },
      zodValidator,
      { age: 15 },
      form,
    );

    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });

  it("should return error message for invalid array", () => {
    const form = createForm([
      {
        question: "interests",
        type: "CHECKBOXES",
        options: ["coding", "design"],
        min: 1,
      },
    ]);

    const zodValidator = "z.object({ interests: z.array(z.string()).min(1) })";
    const result = getValidationError(
      { question: "interests", type: "CHECKBOXES" },
      zodValidator,
      { interests: [] },
      form,
    );

    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });
});
