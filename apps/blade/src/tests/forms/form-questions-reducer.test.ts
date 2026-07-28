import { describe, expect, it } from "vitest";

import type { FormQuestion } from "@forge/validators";

import { formQuestionsReducer } from "~/app/_components/admin/forms/form-questions-reducer";

function question(id: string, prompt = `Question ${id}`): FormQuestion {
  return {
    id,
    maxLength: 500,
    prompt,
    required: false,
    retired: false,
    type: "short_text",
  };
}

describe("form questions reducer", () => {
  const questions = [question("one"), question("two"), question("three")];

  it("appends a question the caller already built", () => {
    const added = question("four");

    const next = formQuestionsReducer(questions, {
      question: added,
      type: "added",
    });

    expect(next.map(({ id }) => id)).toEqual(["one", "two", "three", "four"]);
    expect(questions).toHaveLength(3);
  });

  it("removes by id rather than by index", () => {
    const next = formQuestionsReducer(questions, {
      id: "two",
      type: "removed",
    });

    expect(next.map(({ id }) => id)).toEqual(["one", "three"]);
  });

  it("patches only the addressed question and leaves the rest identical", () => {
    const next = formQuestionsReducer(questions, {
      id: "two",
      patch: { required: true },
      type: "patched",
    });

    expect(next[1]?.required).toBe(true);
    expect(next[1]?.prompt).toBe("Question two");
    expect(next[0]).toBe(questions[0]);
    expect(next[2]).toBe(questions[2]);
  });

  it("replaces the record whose id matches the incoming question", () => {
    const retyped: FormQuestion = {
      id: "two",
      prompt: "Question two",
      required: false,
      retired: false,
      type: "date",
    };

    const next = formQuestionsReducer(questions, {
      question: retyped,
      type: "replaced",
    });

    expect(next[1]).toBe(retyped);
    expect(next.map(({ id }) => id)).toEqual(["one", "two", "three"]);
  });

  it("swaps a question with its neighbour in the given direction", () => {
    const next = formQuestionsReducer(questions, {
      direction: 1,
      index: 0,
      type: "moved",
    });

    expect(next.map(({ id }) => id)).toEqual(["two", "one", "three"]);
  });

  it("moves the dragged question to the drop target's position", () => {
    const next = formQuestionsReducer(questions, {
      activeId: "three",
      overId: "one",
      type: "reordered",
    });

    expect(next.map(({ id }) => id)).toEqual(["three", "one", "two"]);
  });

  // Returning the same array is what keeps a drag that lands where it started,
  // or an arrow press at the end of the list, from re-rendering the editor.
  it("returns the same array for a move that cannot happen", () => {
    expect(
      formQuestionsReducer(questions, {
        direction: -1,
        index: 0,
        type: "moved",
      }),
    ).toBe(questions);
    expect(
      formQuestionsReducer(questions, {
        activeId: "one",
        overId: "one",
        type: "reordered",
      }),
    ).toBe(questions);
  });
});
