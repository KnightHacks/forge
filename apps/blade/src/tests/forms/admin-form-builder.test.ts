import { describe, expect, it } from "vitest";

import type { FormQuestion } from "@forge/validators";

import {
  formBuilderShareHref,
  reorderFormQuestions,
} from "~/app/_components/admin/forms/admin-form-builder";

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
