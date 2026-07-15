interface AnalyticsQuestion {
  id: string;
  prompt: string;
  type: string;
}

interface AnalyticsResponse {
  answers: Record<string, unknown>;
  id: string;
  snapshot: { questions: readonly AnalyticsQuestion[] };
}

interface OptionAnswer {
  kind: "option";
  label: string;
  value: string;
}

interface OtherAnswer {
  kind: "other";
  text: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isOptionAnswer(value: unknown): value is OptionAnswer {
  return (
    isRecord(value) &&
    value.kind === "option" &&
    typeof value.label === "string" &&
    typeof value.value === "string"
  );
}

function isOtherAnswer(value: unknown): value is OtherAnswer {
  return (
    isRecord(value) && value.kind === "other" && typeof value.text === "string"
  );
}

function historicalPrompts(
  question: AnalyticsQuestion,
  responses: readonly AnalyticsResponse[],
) {
  return [
    ...new Set(
      responses
        .map(
          ({ snapshot }) =>
            snapshot.questions.find(({ id }) => id === question.id)?.prompt,
        )
        .filter(
          (prompt): prompt is string =>
            typeof prompt === "string" && prompt !== question.prompt,
        ),
    ),
  ];
}

function numericSummary(values: readonly number[]) {
  const distribution: Record<string, number> = {};
  for (const value of values) {
    const key = String(value);
    distribution[key] = (distribution[key] ?? 0) + 1;
  }
  return {
    average:
      values.length === 0
        ? null
        : values.reduce((sum, value) => sum + value, 0) / values.length,
    distribution,
    responseCount: values.length,
  };
}

function choiceSummary(values: readonly unknown[]) {
  const categories = new Map<
    string,
    | { count: number; label: string; value: string }
    | { count: number; label: "Other"; rawValues: string[]; value: "other" }
  >();
  for (const answer of values) {
    if (isOptionAnswer(answer)) {
      const key = `option:${answer.value}`;
      const current = categories.get(key);
      categories.set(key, {
        count: (current?.count ?? 0) + 1,
        label: answer.label,
        value: answer.value,
      });
    } else if (isOtherAnswer(answer)) {
      const current = categories.get("other");
      const rawValues =
        current && "rawValues" in current ? current.rawValues : [];
      categories.set("other", {
        count: (current?.count ?? 0) + 1,
        label: "Other",
        rawValues: [...rawValues, answer.text],
        value: "other",
      });
    }
  }
  return { categories: [...categories.values()] };
}

function checkboxSummary(values: readonly unknown[]) {
  const selections = new Map<
    string,
    { count: number; label: string; value: string }
  >();
  let respondentCount = 0;
  for (const answer of values) {
    if (!Array.isArray(answer) || answer.length === 0) continue;
    respondentCount += 1;
    const counted = new Set<string>();
    for (const selection of answer) {
      if (!isOptionAnswer(selection) || counted.has(selection.value)) continue;
      counted.add(selection.value);
      const current = selections.get(selection.value);
      selections.set(selection.value, {
        count: (current?.count ?? 0) + 1,
        label: selection.label,
        value: selection.value,
      });
    }
  }
  return { respondentCount, selections: [...selections.values()] };
}

function booleanSummary(values: readonly unknown[]) {
  const booleans = values.filter(
    (value): value is boolean => typeof value === "boolean",
  );
  const yes = booleans.filter(Boolean).length;
  return {
    categories: [
      { count: yes, label: "Yes", value: "yes" },
      { count: booleans.length - yes, label: "No", value: "no" },
    ],
    respondentCount: booleans.length,
  };
}

export function summarizeFormResponses({
  definition,
  responses,
}: {
  definition: { questions: readonly AnalyticsQuestion[] };
  responses: readonly AnalyticsResponse[];
}) {
  const byQuestion: Record<string, Record<string, unknown>> = {};

  for (const question of definition.questions) {
    const values = responses.map(({ answers }) => answers[question.id]);
    const common = {
      currentPrompt: question.prompt,
      historicalPrompts: historicalPrompts(question, responses),
      questionId: question.id,
      type: question.type,
    };

    if (question.type === "linear_scale" || question.type === "number") {
      byQuestion[question.id] = {
        ...common,
        ...numericSummary(
          values.filter((value): value is number => typeof value === "number"),
        ),
      };
    } else if (
      question.type === "multiple_choice" ||
      question.type === "dropdown"
    ) {
      byQuestion[question.id] = { ...common, ...choiceSummary(values) };
    } else if (question.type === "checkboxes") {
      byQuestion[question.id] = { ...common, ...checkboxSummary(values) };
    } else if (question.type === "boolean") {
      byQuestion[question.id] = { ...common, ...booleanSummary(values) };
    } else if (
      question.type === "paragraph" ||
      question.type === "short_text" ||
      question.type === "link"
    ) {
      const answers = responses.flatMap((response) => {
        const value = response.answers[question.id];
        return typeof value === "string" && value.trim().length > 0
          ? [{ responseId: response.id, value }]
          : [];
      });
      byQuestion[question.id] = {
        ...common,
        answers,
        nonEmptyCount: answers.length,
      };
    } else if (question.type === "file") {
      const files = responses.flatMap((response) => {
        const value = response.answers[question.id];
        if (!isRecord(value) || typeof value.fileName !== "string") return [];
        if (typeof value.attachmentId === "string") {
          return [{ ...value, responseId: response.id }];
        }
        if (
          typeof value.formId === "string" &&
          typeof value.legacyObjectName === "string"
        ) {
          return [{ ...value, responseId: response.id }];
        }
        return [];
      });
      byQuestion[question.id] = { ...common, files };
    } else {
      byQuestion[question.id] = {
        ...common,
        responseCount: values.filter((value) => value !== undefined).length,
      };
    }
  }

  return { byQuestion, responseCount: responses.length };
}
