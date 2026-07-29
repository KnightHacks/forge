import { describe, expect, it } from "vitest";

import type { FormQuestion } from "@forge/validators";

import {
  reorderFormQuestions,
  swapQuestions,
} from "~/app/_components/admin/forms/form-question-ordering";

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

const questions = [question("one"), question("two"), question("three")];

describe("reorderFormQuestions", () => {
  it("moves a question forward to the slot it was dropped on", () => {
    expect(
      reorderFormQuestions(questions, "one", "three").map(({ id }) => id),
    ).toEqual(["two", "three", "one"]);
  });

  it("keeps the same array when a drag lands where it started", () => {
    expect(reorderFormQuestions(questions, "two", "two")).toBe(questions);
  });

  it("keeps the same array when either id is unknown", () => {
    expect(reorderFormQuestions(questions, "missing", "two")).toBe(questions);
    expect(reorderFormQuestions(questions, "two", "missing")).toBe(questions);
  });

  it("does not mutate the list it was given", () => {
    reorderFormQuestions(questions, "one", "three");

    expect(questions.map(({ id }) => id)).toEqual(["one", "two", "three"]);
  });
});

describe("swapQuestions", () => {
  it("swaps a question with the neighbour above it", () => {
    expect(swapQuestions(questions, 2, -1).map(({ id }) => id)).toEqual([
      "one",
      "three",
      "two",
    ]);
  });

  it("swaps a question with the neighbour below it", () => {
    expect(swapQuestions(questions, 0, 1).map(({ id }) => id)).toEqual([
      "two",
      "one",
      "three",
    ]);
  });

  it("keeps the same array at either end of the list", () => {
    expect(swapQuestions(questions, 0, -1)).toBe(questions);
    expect(swapQuestions(questions, 2, 1)).toBe(questions);
    expect(swapQuestions([], 0, 1)).toEqual([]);
  });

  it("keeps the same array for an index outside the list", () => {
    expect(swapQuestions(questions, 9, -1)).toBe(questions);
    expect(swapQuestions(questions, -1, 1)).toBe(questions);
  });

  it("does not mutate the list it was given", () => {
    swapQuestions(questions, 0, 1);

    expect(questions.map(({ id }) => id)).toEqual(["one", "two", "three"]);
  });
});
