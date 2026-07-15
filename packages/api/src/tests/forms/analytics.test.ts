import { describe, expect, it } from "vitest";

import { summarizeFormResponses } from "../../utils/forms/analytics";

const ids = {
  boolean: "00000000-0000-4000-8000-000000000500",
  checkbox: "00000000-0000-4000-8000-000000000501",
  choice: "00000000-0000-4000-8000-000000000502",
  file: "00000000-0000-4000-8000-000000000503",
  link: "00000000-0000-4000-8000-000000000507",
  number: "00000000-0000-4000-8000-000000000504",
  scale: "00000000-0000-4000-8000-000000000505",
  text: "00000000-0000-4000-8000-000000000506",
};

const definition = {
  questions: [
    { id: ids.scale, prompt: "Overall", type: "linear_scale" },
    { id: ids.number, prompt: "Hours", type: "number" },
    { id: ids.choice, prompt: "Source", type: "multiple_choice" },
    { id: ids.checkbox, prompt: "Topics", type: "checkboxes" },
    { id: ids.boolean, prompt: "Can you volunteer?", type: "boolean" },
    { id: ids.link, prompt: "Portfolio", type: "link" },
    { id: ids.text, prompt: "Comments", type: "paragraph" },
    { id: ids.file, prompt: "Work sample", type: "file" },
  ],
};

function snapshot(promptOverrides: Record<string, string> = {}) {
  return {
    questions: definition.questions.map((question) => ({
      id: question.id,
      prompt: promptOverrides[question.id] ?? question.prompt,
      type: question.type,
    })),
  };
}

describe("generic form analytics", () => {
  it("[TC-026] calculates deterministic distributions, respondent checkbox counts, text, and files", () => {
    const analytics = summarizeFormResponses({
      definition,
      responses: [
        {
          answers: {
            [ids.boolean]: true,
            [ids.checkbox]: [
              { kind: "option", label: "Web", value: "web" },
              { kind: "option", label: "AI", value: "ai" },
            ],
            [ids.choice]: {
              kind: "option",
              label: "Discord",
              value: "discord",
            },
            [ids.file]: { attachmentId: "attachment-1", fileName: "one.pdf" },
            [ids.link]: "https://example.com/work-one",
            [ids.number]: 2,
            [ids.scale]: 5,
            [ids.text]: "Loved the demos",
          },
          id: "response-1",
          snapshot: snapshot(),
        },
        {
          answers: {
            [ids.boolean]: false,
            [ids.checkbox]: [{ kind: "option", label: "Web", value: "web" }],
            [ids.choice]: { kind: "other", text: "Flyer" },
            [ids.file]: {
              fileName: "legacy.pdf",
              formId: "00000000-0000-4000-8000-000000000599",
              legacyObjectName:
                "00000000-0000-4000-8000-000000000599/files/legacy.pdf",
            },
            [ids.number]: 4,
            [ids.scale]: 3,
            [ids.link]: "https://example.com/work-two",
            [ids.text]: "",
          },
          id: "response-2",
          snapshot: snapshot(),
        },
      ],
    });

    expect(analytics.byQuestion[ids.scale]).toMatchObject({
      average: 4,
      distribution: { "3": 1, "5": 1 },
      responseCount: 2,
    });
    expect(analytics.byQuestion[ids.number]).toMatchObject({
      average: 3,
      responseCount: 2,
    });
    expect(analytics.byQuestion[ids.choice]).toMatchObject({
      categories: [
        { count: 1, label: "Discord", value: "discord" },
        { count: 1, label: "Other", rawValues: ["Flyer"], value: "other" },
      ],
    });
    expect(analytics.byQuestion[ids.checkbox]).toMatchObject({
      respondentCount: 2,
      selections: [
        { count: 2, label: "Web", value: "web" },
        { count: 1, label: "AI", value: "ai" },
      ],
    });
    expect(analytics.byQuestion[ids.boolean]).toMatchObject({
      categories: [
        { count: 1, label: "Yes", value: "yes" },
        { count: 1, label: "No", value: "no" },
      ],
      respondentCount: 2,
    });
    expect(analytics.byQuestion[ids.link]).toMatchObject({
      answers: [
        { responseId: "response-1", value: "https://example.com/work-one" },
        { responseId: "response-2", value: "https://example.com/work-two" },
      ],
      nonEmptyCount: 2,
    });
    expect(analytics.byQuestion[ids.text]).toMatchObject({
      answers: [{ responseId: "response-1", value: "Loved the demos" }],
      nonEmptyCount: 1,
    });
    expect(analytics.byQuestion[ids.file]).toMatchObject({
      files: [
        {
          attachmentId: "attachment-1",
          fileName: "one.pdf",
          responseId: "response-1",
        },
        {
          fileName: "legacy.pdf",
          formId: "00000000-0000-4000-8000-000000000599",
          legacyObjectName:
            "00000000-0000-4000-8000-000000000599/files/legacy.pdf",
          responseId: "response-2",
        },
      ],
    });
  });

  it("[TC-010, TC-016] keeps response-time prompts and option labels available after live edits", () => {
    const analytics = summarizeFormResponses({
      definition: {
        questions: [
          {
            id: ids.choice,
            prompt: "How did you hear?",
            type: "multiple_choice",
          },
        ],
      },
      responses: [
        {
          answers: {
            [ids.choice]: {
              kind: "option",
              label: "Knight Hacks Discord",
              value: "discord-legacy",
            },
          },
          id: "response-legacy",
          snapshot: {
            questions: [
              {
                id: ids.choice,
                prompt: "Where did you first find us?",
                type: "multiple_choice",
              },
            ],
          },
        },
      ],
    });

    expect(analytics.byQuestion[ids.choice]).toMatchObject({
      currentPrompt: "How did you hear?",
      historicalPrompts: ["Where did you first find us?"],
      categories: [
        {
          count: 1,
          label: "Knight Hacks Discord",
          value: "discord-legacy",
        },
      ],
    });
  });
});
