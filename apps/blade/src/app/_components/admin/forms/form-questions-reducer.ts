import type { FormQuestion } from "@forge/validators";

import { reorderFormQuestions, swapQuestions } from "./form-question-ordering";

/**
 * The question list is the one collection in the builder that many handlers
 * mutate: the toolbar appends, each card removes, the arrow buttons and the
 * drag layer reorder, the prompt and required inputs patch a field, and the
 * type select and per-type editors swap a whole record. Seven call sites all
 * re-implementing `current.map(...)` inline is what a reducer is for, and it
 * puts every one of those edits behind a name a test can call.
 *
 * Every action is data-only. New questions and options mint ids with
 * `crypto.randomUUID`, so they are constructed at the dispatch site and handed
 * in already built — the reducer itself stays pure and therefore safe under
 * StrictMode's double invocation.
 */
export type FormQuestionsAction =
  | { direction: -1 | 1; index: number; type: "moved" }
  | { activeId: string; overId: string; type: "reordered" }
  | { id: string; patch: Partial<FormQuestion>; type: "patched" }
  | { id: string; type: "removed" }
  | { question: FormQuestion; type: "added" }
  | { question: FormQuestion; type: "replaced" };

export function formQuestionsReducer(
  questions: FormQuestion[],
  action: FormQuestionsAction,
): FormQuestion[] {
  switch (action.type) {
    case "added":
      return [...questions, action.question];
    case "removed":
      return questions.filter(({ id }) => id !== action.id);
    case "moved":
      return swapQuestions(questions, action.index, action.direction);
    case "reordered":
      return reorderFormQuestions(questions, action.activeId, action.overId);
    case "patched":
      return questions.map((question) =>
        question.id === action.id
          ? ({ ...question, ...action.patch } as FormQuestion)
          : question,
      );
    case "replaced":
      return questions.map((question) =>
        question.id === action.question.id ? action.question : question,
      );
  }
}
