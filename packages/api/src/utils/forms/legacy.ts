import { createHash } from "node:crypto";

import type { FormDefinition, FormQuestion } from "@forge/validators";
import { FORMS } from "@forge/consts";
import { FORM_UPLOAD_MAX_BYTES, formDefinitionSchema } from "@forge/validators";

const PRESET_CATALOG_IDS = [
  "LEVELS_OF_STUDY",
  "ALLERGIES",
  "MAJORS",
  "GENDERS",
  "RACES_OR_ETHNICITIES",
  "COUNTRIES",
  "SCHOOLS",
  "COMPANIES",
  "SHIRT_SIZES",
  "EVENT_FEEDBACK_HEARD",
  "SHORT_LEVELS_OF_STUDY",
  "SHORT_RACES_AND_ETHNICITIES",
] as const satisfies readonly FORMS.DropdownConstantKey[];

const PRESET_CATALOG_ID_SET = new Set<string>(PRESET_CATALOG_IDS);

interface LegacyQuestion {
  allowOther?: boolean;
  max?: number;
  min?: number;
  optional?: boolean;
  options?: string[];
  optionsConst?: string;
  question: string;
  type: string;
}

interface LegacyDefinition {
  description?: string;
  instructions?: unknown[];
  name: string;
  questions: LegacyQuestion[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function deterministicUuid(seed: string) {
  const hex = createHash("sha256").update(seed).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function machineValue(label: string) {
  return (
    label
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "legacy-option"
  );
}

function isPresetCatalogId(value: unknown): value is FORMS.DropdownConstantKey {
  return typeof value === "string" && PRESET_CATALOG_ID_SET.has(value);
}

function legacyDefinition(value: unknown): LegacyDefinition | null {
  if (!isRecord(value) || typeof value.name !== "string") return null;
  if (!Array.isArray(value.questions)) return null;
  const questions = value.questions.flatMap((question) => {
    if (
      !isRecord(question) ||
      typeof question.question !== "string" ||
      typeof question.type !== "string"
    ) {
      return [];
    }
    return [
      {
        allowOther:
          typeof question.allowOther === "boolean"
            ? question.allowOther
            : undefined,
        max: typeof question.max === "number" ? question.max : undefined,
        min: typeof question.min === "number" ? question.min : undefined,
        optional:
          typeof question.optional === "boolean"
            ? question.optional
            : undefined,
        options: Array.isArray(question.options)
          ? question.options.filter(
              (option): option is string => typeof option === "string",
            )
          : undefined,
        optionsConst:
          typeof question.optionsConst === "string"
            ? question.optionsConst
            : undefined,
        question: question.question,
        type: question.type,
      },
    ];
  });
  return {
    description:
      typeof value.description === "string" ? value.description : undefined,
    instructions: Array.isArray(value.instructions)
      ? value.instructions
      : undefined,
    name: value.name,
    questions,
  };
}

function baseQuestion(formId: string, question: LegacyQuestion, index: number) {
  return {
    id: deterministicUuid(`legacy-form:${formId}:question:${index}`),
    prompt: question.question.trim() || `Legacy question ${index + 1}`,
    required: question.optional !== true,
    retired: false,
  };
}

function choiceQuestion(
  formId: string,
  question: LegacyQuestion,
  index: number,
  type: "checkboxes" | "dropdown" | "multiple_choice",
): FormQuestion {
  const base = baseQuestion(formId, question, index);
  const presetCatalogId = isPresetCatalogId(question.optionsConst)
    ? question.optionsConst
    : null;
  const labels =
    question.options && question.options.length > 0
      ? question.options
      : ["Legacy option"];
  return {
    ...base,
    allowOther: question.allowOther === true,
    manualOptions: labels.map((label, optionIndex) => ({
      id: deterministicUuid(
        `legacy-form:${formId}:question:${index}:option:${optionIndex}`,
      ),
      label,
      value: machineValue(label),
    })),
    optionSource: presetCatalogId ? "preset" : "manual",
    presetCatalogId,
    type,
  };
}

function normalizeQuestion(
  formId: string,
  question: LegacyQuestion,
  index: number,
): FormQuestion {
  const base = baseQuestion(formId, question, index);
  switch (question.type) {
    case "PARAGRAPH":
      return { ...base, maxLength: 5_000, type: "paragraph" };
    case "MULTIPLE_CHOICE":
      return choiceQuestion(formId, question, index, "multiple_choice");
    case "CHECKBOXES":
      return choiceQuestion(formId, question, index, "checkboxes");
    case "DROPDOWN":
      return choiceQuestion(formId, question, index, "dropdown");
    case "FILE_UPLOAD":
      return {
        ...base,
        allowedMimeTypes: [
          "application/pdf",
          "application/zip",
          "image/jpeg",
          "image/png",
          "text/plain",
        ],
        maxBytes: FORM_UPLOAD_MAX_BYTES,
        type: "file",
      };
    case "LINEAR_SCALE": {
      const min = Number.isInteger(question.min) ? (question.min ?? 1) : 1;
      const candidateMax = Number.isInteger(question.max)
        ? (question.max ?? 5)
        : 5;
      return {
        ...base,
        max: candidateMax > min ? candidateMax : min + 1,
        min,
        type: "linear_scale",
      };
    }
    case "DATE":
      return { ...base, type: "date" };
    case "TIME":
      return { ...base, type: "time" };
    case "EMAIL":
      return { ...base, type: "email" };
    case "NUMBER":
      return {
        ...base,
        max: question.max,
        min: question.min,
        type: "number",
      };
    case "PHONE":
      return { ...base, type: "phone" };
    case "BOOLEAN":
      return { ...base, type: "boolean" };
    case "LINK":
      return { ...base, type: "link" };
    default:
      return { ...base, maxLength: 500, type: "short_text" };
  }
}

function normalizeInstructions(formId: string, instructions: unknown[]) {
  return instructions.flatMap((instruction, index) => {
    if (!isRecord(instruction)) return [];
    const parts = [
      typeof instruction.title === "string" ? instruction.title : "",
      typeof instruction.content === "string" ? instruction.content : "",
      typeof instruction.imageUrl === "string" ? instruction.imageUrl : "",
      typeof instruction.videoUrl === "string" ? instruction.videoUrl : "",
    ].filter(Boolean);
    if (parts.length === 0) return [];
    return [
      {
        body: parts.join("\n\n").slice(0, 20_000),
        id: deterministicUuid(`legacy-form:${formId}:instruction:${index}`),
        type: "text" as const,
      },
    ];
  });
}

export function normalizeStoredFormDefinition(
  formId: string,
  value: unknown,
): FormDefinition {
  const current = formDefinitionSchema.safeParse(value);
  if (current.success) return current.data;
  const legacy = legacyDefinition(value);
  if (!legacy) {
    return {
      description: "",
      instructions: [],
      questions: [],
      title: "Unavailable legacy form",
    };
  }
  return formDefinitionSchema.parse({
    description: (legacy.description ?? "").slice(0, 5_000),
    instructions: normalizeInstructions(formId, legacy.instructions ?? []),
    questions: legacy.questions.map((question, index) =>
      normalizeQuestion(formId, question, index),
    ),
    title: legacy.name.trim().slice(0, 255) || "Legacy form",
  });
}

function activeChoiceLabels(question: FormQuestion) {
  if (!("optionSource" in question)) return [];
  return question.optionSource === "preset" && question.presetCatalogId
    ? FORMS.getDropdownOptionsFromConst(
        question.presetCatalogId as FORMS.DropdownConstantKey,
      )
    : question.manualOptions.map(({ label }) => label);
}

function normalizeLegacySelection(question: FormQuestion, value: unknown) {
  if (typeof value !== "string") return value;
  if (value === "__OTHER__") {
    return { kind: "option" as const, label: "Other", value: "other" };
  }
  const active = activeChoiceLabels(question);
  return !active.includes(value) &&
    "allowOther" in question &&
    question.allowOther
    ? { kind: "other" as const, text: value }
    : { kind: "option" as const, label: value, value: machineValue(value) };
}

function normalizeLegacyAnswer(
  question: FormQuestion,
  value: unknown,
  formId: string,
) {
  if (question.type === "file" && typeof value === "string" && value) {
    return {
      fileName: value.split("/").at(-1) ?? "Uploaded file",
      formId,
      legacyObjectName: value,
    };
  }
  if (question.type === "checkboxes" && Array.isArray(value)) {
    return value.flatMap((selection) =>
      selection === "__OTHER__"
        ? []
        : [normalizeLegacySelection(question, selection)],
    );
  }
  if (question.type === "multiple_choice" || question.type === "dropdown") {
    return normalizeLegacySelection(question, value);
  }
  return value;
}

function snapshotDefinition(rawSnapshot: unknown, currentDefinition: unknown) {
  if (isRecord(rawSnapshot) && "definition" in rawSnapshot) {
    return rawSnapshot.definition;
  }
  if (
    isRecord(rawSnapshot) &&
    Array.isArray(rawSnapshot.questions) &&
    rawSnapshot.questions.length > 0
  ) {
    return rawSnapshot;
  }
  return currentDefinition;
}

export function normalizeStoredFormResponse(input: {
  currentDefinition: unknown;
  formId: string;
  rawAnswers: unknown;
  rawSnapshot: unknown;
}) {
  const rawDefinition = snapshotDefinition(
    input.rawSnapshot,
    input.currentDefinition,
  );
  const definition = normalizeStoredFormDefinition(input.formId, rawDefinition);
  const legacy = legacyDefinition(rawDefinition);
  const answers: Record<string, unknown> = isRecord(input.rawAnswers)
    ? { ...input.rawAnswers }
    : {};
  legacy?.questions.forEach((question, index) => {
    const normalized = definition.questions[index];
    if (!normalized || !(question.question in answers)) return;
    answers[normalized.id] = normalizeLegacyAnswer(
      normalized,
      answers[question.question],
      input.formId,
    );
    delete answers[question.question];
  });
  return {
    answers,
    snapshot: {
      questions: definition.questions.map(({ id, prompt, type }) => ({
        id,
        prompt,
        type,
      })),
    },
  };
}
