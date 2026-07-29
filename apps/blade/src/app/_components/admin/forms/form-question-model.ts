import type { FormQuestion } from "@forge/validators";

import { toSlug } from "./form-builder-formatting";

/**
 * Constructors for the records the form builder edits. Every one of them mints
 * an id up front: answers are stored against a question id, so an id has to
 * exist before the question is saved and must never change afterwards.
 */

/** A new question of `type`, with the defaults that type needs to validate. */
export function newQuestion(type: FormQuestion["type"]): FormQuestion {
  const base = {
    id: crypto.randomUUID(),
    prompt: "Untitled question",
    required: false,
    retired: false,
  };
  if (type === "short_text") return { ...base, maxLength: 500, type };
  if (type === "paragraph") return { ...base, maxLength: 5_000, type };
  if (type === "file") {
    return {
      ...base,
      allowedMimeTypes: ["application/pdf", "image/png", "image/jpeg"],
      maxBytes: 100 * 1024 * 1024,
      type,
    };
  }
  if (type === "linear_scale") return { ...base, max: 5, min: 1, type };
  if (type === "number") return { ...base, type };
  if (
    type === "multiple_choice" ||
    type === "checkboxes" ||
    type === "dropdown"
  ) {
    return {
      ...base,
      allowOther: false,
      manualOptions: [
        { id: crypto.randomUUID(), label: "Option 1", value: "option-1" },
      ],
      optionSource: "manual",
      presetCatalogId: null,
      type,
    };
  }
  return { ...base, type } as FormQuestion;
}

/**
 * Retypes a question in place. The type-specific fields are replaced with the
 * new type's defaults, but the id survives so answers already collected stay
 * attached, and the prompt survives so retyping is not a retyping plus a
 * rewrite.
 */
export function changeQuestionType(
  question: FormQuestion,
  type: FormQuestion["type"],
): FormQuestion {
  const replacement = newQuestion(type);
  return {
    ...replacement,
    id: question.id,
    prompt: question.prompt,
    required: question.required,
    retired: question.retired,
  };
}

/**
 * A manual choice option. The stored `value` is derived from the label, with a
 * fallback for labels that slugify to nothing — emoji, punctuation, a
 * non-Latin script — because the value is what an answer records.
 */
export function newManualOption(label: string) {
  const id = crypto.randomUUID();
  return {
    id,
    label,
    value: toSlug(label) || `option-${id.slice(0, 8)}`,
  };
}
