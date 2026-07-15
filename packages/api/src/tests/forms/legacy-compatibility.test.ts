import { describe, expect, it } from "vitest";

import { formDefinitionSchema } from "@forge/validators";

import { summarizeFormResponses } from "../../utils/forms/analytics";
import {
  normalizeStoredFormDefinition,
  normalizeStoredFormResponse,
} from "../../utils/forms/legacy";

const FORM_ID = "60eeb26e-5ac8-4368-afee-39ed47661037";

const legacyDefinition = {
  description: "Tell us how it went.",
  name: "Legacy event feedback",
  questions: [
    {
      max: 10,
      min: 0,
      optional: false,
      question: "How would you rate the event overall?",
      type: "LINEAR_SCALE",
    },
    {
      allowOther: true,
      optional: false,
      options: [],
      optionsConst: "EVENT_FEEDBACK_HEARD",
      question: "Where did you hear this event?",
      type: "CHECKBOXES",
    },
    {
      optional: true,
      question: "Additional feedback",
      type: "SHORT_ANSWER",
    },
  ],
};

describe("legacy form compatibility", () => {
  it("normalizes archived definitions into a deterministic editable platform definition", () => {
    const first = normalizeStoredFormDefinition(FORM_ID, legacyDefinition);
    const second = normalizeStoredFormDefinition(FORM_ID, legacyDefinition);

    expect(formDefinitionSchema.safeParse(first).success).toBe(true);
    expect(second).toEqual(first);
    expect(first).toMatchObject({
      description: "Tell us how it went.",
      instructions: [],
      title: "Legacy event feedback",
    });
    expect(first.questions).toEqual([
      expect.objectContaining({
        max: 10,
        min: 0,
        prompt: "How would you rate the event overall?",
        required: true,
        type: "linear_scale",
      }),
      expect.objectContaining({
        allowOther: true,
        optionSource: "preset",
        presetCatalogId: "EVENT_FEEDBACK_HEARD",
        prompt: "Where did you hear this event?",
        type: "checkboxes",
      }),
      expect.objectContaining({
        maxLength: 500,
        prompt: "Additional feedback",
        required: false,
        type: "short_text",
      }),
    ]);
  });

  it("maps prompt-keyed legacy answers and wrapped snapshots before analytics", () => {
    const definition = normalizeStoredFormDefinition(FORM_ID, legacyDefinition);
    const response = normalizeStoredFormResponse({
      currentDefinition: legacyDefinition,
      formId: FORM_ID,
      rawAnswers: {
        "Additional feedback": "More workshops, please.",
        "How would you rate the event overall?": 8,
        "Where did you hear this event?": ["Discord", "A friend"],
      },
      rawSnapshot: {
        definition: legacyDefinition,
        formRevision: 1,
        legacy: true,
      },
    });
    const [scale, discovery, comments] = definition.questions;
    if (!scale || !discovery || !comments) {
      throw new Error("Expected normalized legacy questions.");
    }

    expect(response.answers).not.toHaveProperty(
      "How would you rate the event overall?",
    );
    expect(response.answers[scale.id]).toBe(8);
    expect(response.answers[discovery.id]).toEqual([
      { kind: "option", label: "Discord", value: "discord" },
      { kind: "other", text: "A friend" },
    ]);
    expect(response.answers[comments.id]).toBe("More workshops, please.");
    expect(response.snapshot.questions).toHaveLength(3);

    expect(
      summarizeFormResponses({
        definition,
        responses: [{ ...response, id: "legacy-response" }],
      }),
    ).toMatchObject({
      byQuestion: {
        [scale.id]: { average: 8, responseCount: 1 },
        [discovery.id]: { respondentCount: 1 },
        [comments.id]: { nonEmptyCount: 1 },
      },
      responseCount: 1,
    });
  });

  it("falls back to the current legacy definition when a snapshot is empty", () => {
    const response = normalizeStoredFormResponse({
      currentDefinition: legacyDefinition,
      formId: FORM_ID,
      rawAnswers: { "Additional feedback": "Still readable" },
      rawSnapshot: {},
    });

    expect(response.snapshot.questions).toHaveLength(3);
    expect(Object.values(response.answers)).toContain("Still readable");
  });

  it("preserves legacy file object names as downloadable response metadata", () => {
    const fileDefinition = {
      description: "Upload a resume.",
      name: "Legacy application",
      questions: [
        {
          optional: false,
          question: "Resume",
          type: "FILE_UPLOAD",
        },
      ],
    };
    const response = normalizeStoredFormResponse({
      currentDefinition: fileDefinition,
      formId: FORM_ID,
      rawAnswers: {
        Resume: `${FORM_ID}/files/1700000000000-resume.pdf`,
      },
      rawSnapshot: {},
    });
    const [question] = response.snapshot.questions;
    if (!question) throw new Error("Expected legacy file question.");

    expect(response.answers[question.id]).toEqual({
      fileName: "1700000000000-resume.pdf",
      formId: FORM_ID,
      legacyObjectName: `${FORM_ID}/files/1700000000000-resume.pdf`,
    });
  });
});
