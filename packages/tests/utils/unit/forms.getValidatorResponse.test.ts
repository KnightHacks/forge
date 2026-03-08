import { describe, expect, it } from "vitest";

import type { FORMS } from "@forge/consts";
import { getValidatorResponse } from "@forge/utils/forms.client";

describe("getValidatorResponse", () => {
  const createForm = (
    questions: FORMS.QuestionValidatorType[],
  ): FORMS.FormType => ({
    name: "Test Form",
    description: "Test Description",
    questions,
  });

  it("should return success for valid SHORT_ANSWER", () => {
    const form = createForm([
      {
        question: "name",
        type: "SHORT_ANSWER",
      },
    ]);

    const zodValidator = "z.object({ name: z.string() })";
    const result = getValidatorResponse(zodValidator, { name: "John" }, form);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: "John" });
    }
  });

  it("should return error for invalid SHORT_ANSWER (missing required)", () => {
    const form = createForm([
      {
        question: "name",
        type: "SHORT_ANSWER",
        optional: false,
      },
    ]);

    const zodValidator = "z.object({ name: z.string() })";
    const result = getValidatorResponse(zodValidator, {}, form);

    expect(result.success).toBe(false);
  });

  it("should return success for valid EMAIL", () => {
    const form = createForm([
      {
        question: "email",
        type: "EMAIL",
      },
    ]);

    const zodValidator = "z.object({ email: z.string().email() })";
    const result = getValidatorResponse(
      zodValidator,
      { email: "test@example.com" },
      form,
    );

    expect(result.success).toBe(true);
  });

  it("should return error for invalid EMAIL", () => {
    const form = createForm([
      {
        question: "email",
        type: "EMAIL",
      },
    ]);

    const zodValidator = "z.object({ email: z.string().email() })";
    const result = getValidatorResponse(
      zodValidator,
      { email: "not-an-email" },
      form,
    );

    expect(result.success).toBe(false);
  });

  it("should return success for valid NUMBER", () => {
    const form = createForm([
      {
        question: "age",
        type: "NUMBER",
      },
    ]);

    const zodValidator = "z.object({ age: z.number() })";
    const result = getValidatorResponse(zodValidator, { age: 25 }, form);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ age: 25 });
    }
  });

  it("should return success for valid BOOLEAN", () => {
    const form = createForm([
      {
        question: "agree",
        type: "BOOLEAN",
      },
    ]);

    const zodValidator = "z.object({ agree: z.boolean() })";
    const result = getValidatorResponse(zodValidator, { agree: true }, form);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ agree: true });
    }
  });

  it("should normalize boolean string to boolean", () => {
    const form = createForm([
      {
        question: "agree",
        type: "BOOLEAN",
      },
    ]);

    const zodValidator = "z.object({ agree: z.boolean() })";
    const result = getValidatorResponse(zodValidator, { agree: "true" }, form);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ agree: true });
    }
  });

  it("should return success for valid DATE", () => {
    const form = createForm([
      {
        question: "birthday",
        type: "DATE",
      },
    ]);

    const zodValidator = "z.object({ birthday: z.string() })";
    const date = new Date("2024-01-15T10:30:00Z");
    const result = getValidatorResponse(zodValidator, { birthday: date }, form);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.birthday).toBe("2024-01-15");
    }
  });

  it("should return success for valid CHECKBOXES array", () => {
    const form = createForm([
      {
        question: "interests",
        type: "CHECKBOXES",
        options: ["coding", "design", "music"],
      },
    ]);

    const zodValidator = "z.object({ interests: z.array(z.string()) })";
    const result = getValidatorResponse(
      zodValidator,
      { interests: ["coding", "design"] },
      form,
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ interests: ["coding", "design"] });
    }
  });

  it("should handle optional fields", () => {
    const form = createForm([
      {
        question: "name",
        type: "SHORT_ANSWER",
        optional: true,
      },
    ]);

    const zodValidator = "z.object({ name: z.string().optional() })";
    const result = getValidatorResponse(zodValidator, {}, form);

    expect(result.success).toBe(true);
  });

  it("should handle multiple questions", () => {
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
    const result = getValidatorResponse(
      zodValidator,
      {
        name: "John",
        email: "john@example.com",
        age: 25,
      },
      form,
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        name: "John",
        email: "john@example.com",
        age: 25,
      });
    }
  });
});
