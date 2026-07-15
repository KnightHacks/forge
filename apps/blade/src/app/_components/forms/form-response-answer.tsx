interface OtherAnswer {
  kind: "other";
  optionId: string;
  value: string;
}

export function FormResponseAnswer({
  answer,
  questionLabel,
}: {
  answer: OtherAnswer;
  questionLabel: string;
  questionType: "checkboxes" | "dropdown" | "multiple_choice";
}) {
  return (
    <div
      aria-label={`Answer to ${questionLabel}`}
      className="grid gap-1 rounded-md border border-white/10 bg-background/60 p-3"
    >
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Other
      </span>
      <span className="break-words text-sm [overflow-wrap:anywhere]">
        {answer.value}
      </span>
    </div>
  );
}
