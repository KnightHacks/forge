interface ExportQuestion {
  id: string;
  prompt: string;
  type: string;
}

interface ExportResponse {
  answers: Record<string, unknown>;
  id: string;
  member: { email: string; id: string; name: string };
  snapshot: { questions: readonly ExportQuestion[] };
  status: string;
  submittedAt: Date;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function displayAnswer(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(displayAnswer).join(" | ");
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (isRecord(value)) {
    if (value.kind === "other" && typeof value.text === "string") {
      return value.text;
    }
    if (value.kind === "option" && typeof value.label === "string") {
      return value.label;
    }
    if (typeof value.fileName === "string") return value.fileName;
  }
  return JSON.stringify(value);
}

function neutralizeFormula(value: string) {
  return /^[=+\-@]/.test(value.trimStart()) ? `'${value}` : value;
}

function csvCell(value: unknown) {
  const rendered = neutralizeFormula(displayAnswer(value));
  return /[",\r\n]/.test(rendered)
    ? `"${rendered.replaceAll('"', '""')}"`
    : rendered;
}

function exportPrompt(
  question: ExportQuestion,
  responses: readonly ExportResponse[],
) {
  for (const response of responses) {
    const historical = response.snapshot.questions.find(
      ({ id }) => id === question.id,
    );
    if (historical) return historical.prompt;
  }
  return question.prompt;
}

export function serializeFormResponsesCsv({
  definition,
  responses,
}: {
  definition: { questions: readonly ExportQuestion[] };
  responses: readonly ExportResponse[];
}) {
  const headers = [
    "Response ID",
    "Member ID",
    "Member name",
    "Member email",
    "Submitted at",
    "Status",
    ...definition.questions.map((question) =>
      exportPrompt(question, responses),
    ),
  ];
  const rows = responses.map((response) => [
    response.id,
    response.member.id,
    response.member.name,
    response.member.email,
    response.submittedAt.toISOString(),
    response.status,
    ...definition.questions.map((question) => response.answers[question.id]),
  ]);

  return [headers, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
}
