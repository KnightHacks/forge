import { describe, expect, it } from "vitest";

import type { FormDefinition, FormQuestion } from "@forge/validators";
import { formDefinitionSchema } from "@forge/validators";

import {
  buildFormDefinition,
  draftInstructionsBody,
  draftMediaInstructions,
  draftTextInstructionId,
} from "~/app/_components/admin/forms/form-definition-draft";

const id = (n: number) => `00000000-0000-4000-8000-0000000010${n}`;

const text = { body: "Read this first.", id: id(10), type: "text" as const };
const secondText = { body: "And this.", id: id(11), type: "text" as const };
const image = {
  alt: "poster.png",
  attachmentId: id(20),
  id: id(21),
  type: "image" as const,
};
const video = {
  alt: "walkthrough.mp4",
  attachmentId: id(22),
  id: id(23),
  type: "video" as const,
};

const instructions: FormDefinition["instructions"] = [
  image,
  text,
  video,
  secondText,
];

const question: FormQuestion = {
  id: id(30),
  maxLength: 500,
  prompt: "Which workshops interest you?",
  required: false,
  retired: false,
  type: "short_text",
};

describe("draftTextInstructionId", () => {
  it("reuses the saved text block's id so it stays in place across saves", () => {
    expect(draftTextInstructionId(instructions)).toBe(text.id);
  });

  it("mints a fresh id when the form has only media or nothing at all", () => {
    const minted = draftTextInstructionId([image]);

    expect(minted).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(draftTextInstructionId([])).not.toBe(minted);
  });
});

describe("draftInstructionsBody", () => {
  it("joins every saved text block instead of dropping the extras", () => {
    expect(draftInstructionsBody(instructions)).toBe(
      "Read this first.\n\nAnd this.",
    );
  });

  it("is empty for a form with no text instructions", () => {
    expect(draftInstructionsBody([image, video])).toBe("");
    expect(draftInstructionsBody([])).toBe("");
  });
});

describe("draftMediaInstructions", () => {
  it("keeps images and videos in their saved order", () => {
    expect(draftMediaInstructions(instructions)).toEqual([image, video]);
  });

  it("is empty for a text-only form", () => {
    expect(draftMediaInstructions([text])).toEqual([]);
  });
});

describe("buildFormDefinition", () => {
  const draft = {
    description: "Tell us which workshops you want.",
    instructions: "Answer everything.",
    media: [image, video],
    name: "Workshop Interest",
    questions: [question],
    textId: id(10),
  };

  it("writes the text block back under the id it was read from", () => {
    expect(buildFormDefinition(draft).instructions).toEqual([
      { body: "Answer everything.", id: id(10), type: "text" },
      image,
      video,
    ]);
  });

  it("omits the text block entirely when the textarea is blank", () => {
    expect(
      buildFormDefinition({ ...draft, instructions: "   \n  " }).instructions,
    ).toEqual([image, video]);
    expect(
      buildFormDefinition({ ...draft, instructions: "" }).instructions,
    ).toEqual([image, video]);
  });

  it("stores the body as typed once it is not blank", () => {
    const [block] = buildFormDefinition({
      ...draft,
      instructions: "  Leading space is kept.  ",
    }).instructions;

    expect(block).toEqual({
      body: "  Leading space is kept.  ",
      id: id(10),
      type: "text",
    });
  });

  it("titles an unnamed form so the schema still accepts the save", () => {
    expect(buildFormDefinition({ ...draft, name: "" }).title).toBe(
      "Untitled form",
    );
  });

  it("passes the description and questions through untouched", () => {
    const definition = buildFormDefinition(draft);

    expect(definition.description).toBe(draft.description);
    expect(definition.questions).toBe(draft.questions);
  });

  it("produces a definition the save mutation's schema accepts", () => {
    expect(
      formDefinitionSchema.safeParse(buildFormDefinition(draft)).success,
    ).toBe(true);
  });
});
