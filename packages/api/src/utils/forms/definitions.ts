import { TRPCError } from "@trpc/server";

export type FormState = "archived" | "draft" | "published";

interface FormQuestionRecord {
  id?: unknown;
  retired?: unknown;
  type?: unknown;
  [key: string]: unknown;
}

interface FormDefinitionRecord {
  questions: readonly (FormQuestionRecord | undefined)[];
  [key: string]: unknown;
}

interface MutableFormDefinitionRecord {
  archivedAt: Date | null;
  definition: FormDefinitionRecord;
  publishedAt: Date | null;
  revision: number;
  slug: string;
  state: FormState;
  [key: string]: unknown;
}

function conflict(message: string): never {
  throw new TRPCError({ code: "CONFLICT", message });
}

function assertRevision(
  current: { revision: number },
  expectedRevision: number,
) {
  if (current.revision !== expectedRevision) {
    conflict("This form changed after it was opened.");
  }
}

function questionsById(definition: FormDefinitionRecord) {
  return new Map(
    definition.questions.flatMap((question) =>
      question && typeof question.id === "string"
        ? [[question.id, question] as const]
        : [],
    ),
  );
}

export function applyFormDefinitionMutation<
  T extends MutableFormDefinitionRecord,
>({
  answeredQuestionIds,
  callbackMappedQuestionIds,
  current,
  expectedRevision,
  patch,
}: {
  answeredQuestionIds: readonly string[];
  callbackMappedQuestionIds: readonly string[];
  current: T;
  expectedRevision: number;
  now: Date;
  patch: {
    definition?: FormDefinitionRecord;
    slug?: string;
  };
}): T {
  assertRevision(current, expectedRevision);

  if (
    patch.slug !== undefined &&
    patch.slug !== current.slug &&
    (current.state !== "draft" || current.publishedAt !== null)
  ) {
    conflict("A form slug cannot change after first publication.");
  }

  if (patch.definition) {
    const currentQuestions = questionsById(current.definition);
    const nextQuestions = questionsById(patch.definition);

    for (const questionId of answeredQuestionIds) {
      const currentQuestion = currentQuestions.get(questionId);
      const nextQuestion = nextQuestions.get(questionId);
      if (currentQuestion && !nextQuestion) {
        conflict("A question with saved answers must be retired, not removed.");
      }
      if (
        currentQuestion &&
        nextQuestion &&
        currentQuestion.type !== nextQuestion.type
      ) {
        conflict("A question with saved answers cannot change type.");
      }
    }

    for (const questionId of callbackMappedQuestionIds) {
      const currentQuestion = currentQuestions.get(questionId);
      const nextQuestion = nextQuestions.get(questionId);
      if (
        currentQuestion &&
        (!nextQuestion ||
          currentQuestion.type !== nextQuestion.type ||
          (currentQuestion.retired !== true && nextQuestion.retired === true))
      ) {
        conflict(
          "Disconnect the callback before removing, retiring, or changing this question.",
        );
      }
    }
  }

  return {
    ...current,
    ...(patch.definition === undefined
      ? {}
      : { definition: patch.definition as T["definition"] }),
    ...(patch.slug === undefined ? {} : { slug: patch.slug }),
    revision: current.revision + 1,
  };
}

export function transitionFormState<T extends MutableFormDefinitionRecord>({
  current,
  expectedRevision,
  now,
  targetState,
}: {
  current: T;
  expectedRevision: number;
  now: Date;
  targetState: FormState;
}): T {
  assertRevision(current, expectedRevision);
  const allowed =
    (current.state === "draft" && targetState === "published") ||
    (current.state === "published" && targetState === "archived") ||
    (current.state === "archived" && targetState === "published");
  if (!allowed) conflict("That form state transition is not allowed.");

  return {
    ...current,
    archivedAt: targetState === "archived" ? now : null,
    publishedAt:
      targetState === "published"
        ? (current.publishedAt ?? now)
        : current.publishedAt,
    revision: current.revision + 1,
    state: targetState,
  };
}
