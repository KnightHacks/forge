import { arrayMove } from "@dnd-kit/sortable";

import type { FormQuestion } from "@forge/validators";

/**
 * Reordering for the question list. Both helpers return the array they were
 * given when the move is a no-op, so a drag that lands where it started or an
 * arrow press at the end of the list leaves the state identity untouched and
 * React re-renders nothing.
 */

/** Moves the dragged question to the position of the one it was dropped on. */
export function reorderFormQuestions(
  questions: FormQuestion[],
  activeId: string,
  overId: string,
) {
  const oldIndex = questions.findIndex(({ id }) => id === activeId);
  const newIndex = questions.findIndex(({ id }) => id === overId);
  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
    return questions;
  }
  return arrayMove(questions, oldIndex, newIndex);
}

/** Swaps the question at `index` with its neighbour one step in `direction`. */
export function swapQuestions(
  questions: FormQuestion[],
  index: number,
  direction: -1 | 1,
) {
  const target = index + direction;
  if (target < 0 || target >= questions.length) return questions;
  const next = [...questions];
  const question = next[index];
  const neighbor = next[target];
  if (!question || !neighbor) return questions;
  next[index] = neighbor;
  next[target] = question;
  return next;
}
