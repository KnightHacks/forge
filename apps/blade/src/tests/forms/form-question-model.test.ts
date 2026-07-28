import { describe, expect, it } from "vitest";

import type { FormQuestion } from "@forge/validators";
import { formQuestionSchema } from "@forge/validators";

import {
  changeQuestionType,
  newManualOption,
  newQuestion,
} from "~/app/_components/admin/forms/form-question-model";

const types: FormQuestion["type"][] = [
  "short_text",
  "paragraph",
  "multiple_choice",
  "checkboxes",
  "dropdown",
  "file",
  "linear_scale",
  "date",
  "time",
  "email",
  "number",
  "phone",
  "boolean",
  "link",
];

describe("newQuestion", () => {
  it("produces a question the save schema accepts for every type", () => {
    for (const type of types) {
      const parsed = formQuestionSchema.safeParse(newQuestion(type));

      expect(parsed.success, `${type} failed validation`).toBe(true);
    }
  });

  it("mints a distinct id per question so answers stay attached", () => {
    const ids = new Set(types.map((type) => newQuestion(type).id));

    expect(ids.size).toBe(types.length);
  });

  it("gives text questions the character limits their inputs enforce", () => {
    expect(newQuestion("short_text")).toMatchObject({ maxLength: 500 });
    expect(newQuestion("paragraph")).toMatchObject({ maxLength: 5_000 });
  });

  it("gives file uploads the default MIME allowlist and 100 MB cap", () => {
    expect(newQuestion("file")).toMatchObject({
      allowedMimeTypes: ["application/pdf", "image/png", "image/jpeg"],
      maxBytes: 100 * 1024 * 1024,
    });
  });

  it("starts a linear scale at 1 through 5", () => {
    expect(newQuestion("linear_scale")).toMatchObject({ max: 5, min: 1 });
  });

  it("leaves a number question unbounded until bounds are typed", () => {
    const question = newQuestion("number");

    expect(question).not.toHaveProperty("min");
    expect(question).not.toHaveProperty("max");
  });

  it("starts every choice type with one manual option", () => {
    for (const type of ["multiple_choice", "checkboxes", "dropdown"] as const) {
      expect(newQuestion(type)).toMatchObject({
        allowOther: false,
        optionSource: "manual",
        presetCatalogId: null,
      });
      expect(newQuestion(type)).toMatchObject({
        manualOptions: [{ label: "Option 1", value: "option-1" }],
      });
    }
  });

  it("leaves the simple types with nothing but the base fields", () => {
    expect(newQuestion("date")).toMatchObject({
      prompt: "Untitled question",
      required: false,
      retired: false,
      type: "date",
    });
    expect(Object.keys(newQuestion("date")).sort()).toEqual([
      "id",
      "prompt",
      "required",
      "retired",
      "type",
    ]);
  });
});

describe("changeQuestionType", () => {
  const original: FormQuestion = {
    id: "00000000-0000-4000-8000-000000001001",
    maxLength: 120,
    prompt: "Which workshops interest you?",
    required: true,
    retired: true,
    type: "short_text",
  };

  it("keeps the id, prompt, and flags so the edit is not a rewrite", () => {
    expect(changeQuestionType(original, "linear_scale")).toMatchObject({
      id: original.id,
      prompt: original.prompt,
      required: true,
      retired: true,
      type: "linear_scale",
    });
  });

  it("replaces the previous type's fields with the new type's defaults", () => {
    const scale = changeQuestionType(original, "linear_scale");

    expect(scale).not.toHaveProperty("maxLength");
    expect(scale).toMatchObject({ max: 5, min: 1 });
  });

  it("drops choice options when a choice question becomes plain text", () => {
    const choice = changeQuestionType(original, "dropdown");

    const text = changeQuestionType(choice, "short_text");

    expect(text).not.toHaveProperty("manualOptions");
    expect(text).not.toHaveProperty("optionSource");
    expect(text).toMatchObject({ id: original.id, maxLength: 500 });
  });

  it("still validates after the swap", () => {
    for (const type of types) {
      const parsed = formQuestionSchema.safeParse(
        changeQuestionType(original, type),
      );

      expect(parsed.success, `${type} failed validation`).toBe(true);
    }
  });
});

describe("newManualOption", () => {
  it("stores a slug of the label as the recorded answer value", () => {
    expect(newManualOption("Cyber Security")).toMatchObject({
      label: "Cyber Security",
      value: "cyber-security",
    });
  });

  it("keeps the label exactly as typed, including case and spacing", () => {
    expect(newManualOption("  Mixed CASE  ").label).toBe("  Mixed CASE  ");
  });

  it("falls back to an id-derived value when the label has no slug", () => {
    const option = newManualOption("🙂");

    expect(option.value).toBe(`option-${option.id.slice(0, 8)}`);
    expect(option.value).toMatch(/^option-[0-9a-f]{8}$/);
  });

  it("mints a distinct id per option", () => {
    expect(newManualOption("Option 1").id).not.toBe(
      newManualOption("Option 1").id,
    );
  });
});
