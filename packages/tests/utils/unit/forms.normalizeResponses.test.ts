import { beforeAll, describe, expect, it } from "vitest";

import type { FORMS } from "@forge/consts";
import type { normalizeResponses as normalizeResponsesFn } from "@forge/utils/forms.client";

describe("normalizeResponses", () => {
  let normalizeResponses: typeof normalizeResponsesFn;

  beforeAll(async () => {
    const module = await import("@forge/utils/forms.client");
    normalizeResponses = module.normalizeResponses;
  });

  const createForm = (
    questions: FORMS.QuestionValidatorType[],
  ): FORMS.FormType => ({
    name: "Test Form",
    description: "Test Description",
    questions,
  });

  it("should drop null values", () => {
    const form = createForm([
      {
        question: "test",
        type: "SHORT_ANSWER",
      },
    ]);

    const result = normalizeResponses({ test: null }, form);
    expect(result).toEqual({});
  });

  it("should drop empty string values", () => {
    const form = createForm([
      {
        question: "test",
        type: "SHORT_ANSWER",
      },
    ]);

    const result = normalizeResponses({ test: "" }, form);
    expect(result).toEqual({});
  });

  it("should drop empty arrays", () => {
    const form = createForm([
      {
        question: "test",
        type: "CHECKBOXES",
        options: ["option1", "option2"],
      },
    ]);

    const result = normalizeResponses({ test: [] }, form);
    expect(result).toEqual({});
  });

  it("should keep non-empty string values", () => {
    const form = createForm([
      {
        question: "test",
        type: "SHORT_ANSWER",
      },
    ]);

    const result = normalizeResponses({ test: "hello" }, form);
    expect(result).toEqual({ test: "hello" });
  });

  it("should convert DATE type Date to ISO string (YYYY-MM-DD)", () => {
    const form = createForm([
      {
        question: "test",
        type: "DATE",
      },
    ]);

    const date = new Date("2024-01-15T10:30:00Z");
    const result = normalizeResponses({ test: date }, form);
    expect(result).toEqual({ test: "2024-01-15" });
  });

  it("should convert TIME type Date to time string (HH:MM)", () => {
    const form = createForm([
      {
        question: "test",
        type: "TIME",
      },
    ]);

    const date = new Date("2024-01-15T14:30:00Z");
    const result = normalizeResponses({ test: date }, form);
    // Time string format is HH:MM
    expect(result.test).toMatch(/^\d{2}:\d{2}$/);
  });

  it("should drop Date for non-date/time question types", () => {
    const form = createForm([
      {
        question: "test",
        type: "SHORT_ANSWER",
      },
    ]);

    const date = new Date("2024-01-15T10:30:00Z");
    const result = normalizeResponses({ test: date }, form);
    expect(result).toEqual({});
  });

  it("should normalize boolean string 'true' to boolean true", () => {
    const form = createForm([
      {
        question: "test",
        type: "BOOLEAN",
      },
    ]);

    const result = normalizeResponses({ test: "true" }, form);
    expect(result).toEqual({ test: true });
  });

  it("should normalize boolean string 'false' to boolean false", () => {
    const form = createForm([
      {
        question: "test",
        type: "BOOLEAN",
      },
    ]);

    const result = normalizeResponses({ test: "false" }, form);
    expect(result).toEqual({ test: false });
  });

  it("should drop invalid boolean string values", () => {
    const form = createForm([
      {
        question: "test",
        type: "BOOLEAN",
      },
    ]);

    const result = normalizeResponses({ test: "maybe" }, form);
    expect(result).toEqual({});
  });

  it("should keep boolean values as-is", () => {
    const form = createForm([
      {
        question: "test",
        type: "BOOLEAN",
      },
    ]);

    const result = normalizeResponses({ test: true }, form);
    expect(result).toEqual({ test: true });
  });

  it("should keep number values", () => {
    const form = createForm([
      {
        question: "test",
        type: "NUMBER",
      },
    ]);

    const result = normalizeResponses({ test: 42 }, form);
    expect(result).toEqual({ test: 42 });
  });

  it("should keep array values", () => {
    const form = createForm([
      {
        question: "test",
        type: "CHECKBOXES",
        options: ["option1", "option2"],
      },
    ]);

    const result = normalizeResponses({ test: ["option1", "option2"] }, form);
    expect(result).toEqual({ test: ["option1", "option2"] });
  });

  it("should handle multiple questions", () => {
    const form = createForm([
      {
        question: "q1",
        type: "SHORT_ANSWER",
      },
      {
        question: "q2",
        type: "NUMBER",
      },
      {
        question: "q3",
        type: "BOOLEAN",
      },
    ]);

    const result = normalizeResponses(
      {
        q1: "answer",
        q2: 42,
        q3: true,
        q4: "should be dropped", // not in form
      },
      form,
    );

    expect(result).toEqual({
      q1: "answer",
      q2: 42,
      q3: true,
    });
  });
});
