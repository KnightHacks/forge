import { describe, expect, it } from "vitest";

import type { FormDefinition, FormQuestion } from "@forge/validators";

import { formBuilderShareHref } from "~/app/_components/admin/forms/form-builder-formatting";
import {
  buildFormDefinition,
  draftInstructionsBody,
  draftMediaInstructions,
  draftTextInstructionId,
} from "~/app/_components/admin/forms/form-definition-draft";
import { reorderFormQuestions } from "~/app/_components/admin/forms/form-question-ordering";

function question(id: string): FormQuestion {
  return {
    id,
    maxLength: 500,
    prompt: `Question ${id}`,
    required: false,
    retired: false,
    type: "short_text",
  };
}

describe("admin form builder", () => {
  it("TC-006 reorders stable question records through drag-and-drop IDs", () => {
    const questions = [question("one"), question("two"), question("three")];

    const reordered = reorderFormQuestions(questions, "three", "one");

    expect(reordered.map(({ id }) => id)).toEqual(["three", "one", "two"]);
    expect(reordered[0]?.prompt).toBe("Question three");
  });

  it("TC-006 ignores a drag target outside the question list", () => {
    const questions = [question("one"), question("two")];

    expect(reorderFormQuestions(questions, "one", "missing")).toBe(questions);
  });

  it("TC-018 round-trips text, image, and video instructions through the draft fields", () => {
    const instructions: FormDefinition["instructions"] = [
      { body: "Read this first", id: "text-1", type: "text" },
      {
        alt: "Event flyer",
        attachmentId: "att-image",
        id: "img-1",
        type: "image",
      },
      {
        alt: "Walkthrough",
        attachmentId: "att-video",
        id: "vid-1",
        type: "video",
      },
    ];

    const textId = draftTextInstructionId(instructions);
    const body = draftInstructionsBody(instructions);
    const media = draftMediaInstructions(instructions);

    expect(textId).toBe("text-1");
    expect(body).toBe("Read this first");
    expect(media).toEqual([instructions[1], instructions[2]]);

    const rebuilt = buildFormDefinition({
      description: "",
      instructions: body,
      media,
      name: "Form",
      questions: [],
      textId,
    });

    expect(rebuilt.instructions).toEqual(instructions);
  });

  it("TC-018 drops the text block on save when the textarea is cleared, keeping media", () => {
    const media = draftMediaInstructions([
      { alt: "Flyer", attachmentId: "att-image", id: "img-1", type: "image" },
    ]);

    const rebuilt = buildFormDefinition({
      description: "",
      instructions: "   ",
      media,
      name: "Form",
      questions: [],
      textId: "unused-once-blank",
    });

    expect(rebuilt.instructions).toEqual(media);
  });

  it("TC-018 removing one media instruction from the draft list drops only that block on save", () => {
    const instructions: FormDefinition["instructions"] = [
      { alt: "Flyer", attachmentId: "att-image", id: "img-1", type: "image" },
      {
        alt: "Walkthrough",
        attachmentId: "att-video",
        id: "vid-1",
        type: "video",
      },
    ];
    const media = draftMediaInstructions(instructions).filter(
      (item) => item.id !== "img-1",
    );

    const rebuilt = buildFormDefinition({
      description: "",
      instructions: "",
      media,
      name: "Form",
      questions: [],
      textId: "unused",
    });

    expect(rebuilt.instructions).toEqual([instructions[1]]);
  });

  it("opens and closes sharing through durable query state", () => {
    expect(
      formBuilderShareHref("/admin/forms/form-id", "view=details", true),
    ).toBe("/admin/forms/form-id?view=details&dialog=share");
    expect(
      formBuilderShareHref(
        "/admin/forms/form-id",
        "view=details&dialog=share",
        false,
      ),
    ).toBe("/admin/forms/form-id?view=details");
  });
});
