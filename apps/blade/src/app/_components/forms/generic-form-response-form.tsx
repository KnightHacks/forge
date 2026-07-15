"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import type { RouterInputs } from "@forge/api";
import type { FormDefinition, FormQuestion } from "@forge/validators";
import { Button } from "@forge/ui/button";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { Textarea } from "@forge/ui/textarea";
import {
  FORM_LINEAR_SCALE_ENDPOINT_MAX,
  FORM_LINEAR_SCALE_ENDPOINT_MIN,
  FORM_LINEAR_SCALE_MAX_SPAN,
  validateFormAnswers,
} from "@forge/validators";

import { api } from "~/trpc/react";

type CatalogId = RouterInputs["forms"]["searchCatalog"]["catalogId"];
type AnswerMap = Record<string, unknown>;

export function linearScaleValues(min: number, max: number) {
  const span = max - min;
  if (
    !Number.isInteger(min) ||
    !Number.isInteger(max) ||
    min < FORM_LINEAR_SCALE_ENDPOINT_MIN ||
    max > FORM_LINEAR_SCALE_ENDPOINT_MAX ||
    span < 1 ||
    span > FORM_LINEAR_SCALE_MAX_SPAN
  ) {
    return [];
  }
  return Array.from({ length: span + 1 }, (_, index) => min + index);
}

function InstructionMedia({
  attachmentId,
  alt,
  type,
}: {
  attachmentId: string;
  alt: string;
  type: "image" | "video";
}) {
  const download = api.forms.getAttachmentDownload.useQuery({ attachmentId });
  if (!download.data?.url) {
    return <p className="text-sm text-muted-foreground">Loading media…</p>;
  }
  return type === "image" ? (
    // eslint-disable-next-line @next/next/no-img-element -- private presigned form media
    <img
      alt={alt}
      className="max-h-[60svh] w-full rounded-md border border-white/10 object-contain sm:max-h-[32rem]"
      src={download.data.url}
    />
  ) : (
    <video
      aria-label={alt}
      className="max-h-[60svh] w-full rounded-md border border-white/10 sm:max-h-[32rem]"
      controls
      src={download.data.url}
    />
  );
}

function PresetChoice({
  multiple,
  onChange,
  question,
  value,
}: {
  multiple: boolean;
  onChange: (value: unknown) => void;
  question: Extract<FormQuestion, { optionSource: string }>;
  value: unknown;
}) {
  const [query, setQuery] = useState("");
  const catalog = api.forms.searchCatalog.useQuery(
    {
      catalogId: question.presetCatalogId as CatalogId,
      query,
    },
    { enabled: Boolean(question.presetCatalogId) },
  );
  const entries: unknown[] = multiple
    ? Array.isArray(value)
      ? (value as unknown[])
      : []
    : [value];
  const selectedValues = new Set(
    entries
      .filter(
        (entry): entry is { kind: "option"; value: string } =>
          typeof entry === "object" &&
          entry !== null &&
          "kind" in entry &&
          entry.kind === "option" &&
          "value" in entry &&
          typeof entry.value === "string",
      )
      .map((entry) => entry.value),
  );

  function select(optionValue: string) {
    if (!multiple) {
      onChange({ kind: "option", value: optionValue });
      return;
    }
    const next = new Set(selectedValues);
    if (next.has(optionValue)) next.delete(optionValue);
    else next.add(optionValue);
    onChange([...next].map((item) => ({ kind: "option", value: item })));
  }

  return (
    <div className="grid gap-2">
      <Input
        aria-label={`Search ${question.prompt} options`}
        className="h-11 min-w-0 bg-background/70 text-base sm:text-sm"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search options"
        value={query}
      />
      <div className="max-h-56 overflow-y-auto rounded-md border border-white/10 bg-card/50 p-1">
        {catalog.isLoading ? (
          <p className="p-3 text-sm text-muted-foreground">Loading options…</p>
        ) : catalog.data?.length ? (
          catalog.data.map((option) => {
            const selected = selectedValues.has(option.value);
            return (
              <button
                aria-pressed={selected}
                className="flex min-h-11 w-full min-w-0 items-center gap-3 rounded px-3 text-left text-sm hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                key={option.value}
                onClick={() => select(option.value)}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className={`h-4 w-4 border ${multiple ? "rounded" : "rounded-full"} ${selected ? "border-primary bg-primary" : "border-muted-foreground"}`}
                />
                <span className="min-w-0 break-words">{option.label}</span>
              </button>
            );
          })
        ) : (
          <p className="p-3 text-sm text-muted-foreground">No options found.</p>
        )}
      </div>
    </div>
  );
}

function ManualChoice({
  multiple,
  onChange,
  question,
  value,
}: {
  multiple: boolean;
  onChange: (value: unknown) => void;
  question: Extract<FormQuestion, { optionSource: string }>;
  value: unknown;
}) {
  const values: unknown[] = multiple
    ? Array.isArray(value)
      ? (value as unknown[])
      : []
    : [value];
  const selected = new Set(
    values
      .filter(
        (entry): entry is { kind: "option"; value: string } =>
          typeof entry === "object" &&
          entry !== null &&
          "kind" in entry &&
          entry.kind === "option" &&
          "value" in entry &&
          typeof entry.value === "string",
      )
      .map((entry) => entry.value),
  );
  const other = values.find(
    (entry): entry is { kind: "other"; text: string } =>
      typeof entry === "object" &&
      entry !== null &&
      "kind" in entry &&
      entry.kind === "other",
  );

  function updateOption(optionValue: string) {
    if (!multiple) return onChange({ kind: "option", value: optionValue });
    const next = new Set(selected);
    if (next.has(optionValue)) next.delete(optionValue);
    else next.add(optionValue);
    const nextValues: unknown[] = [...next].map((item) => ({
      kind: "option",
      value: item,
    }));
    if (other) nextValues.push(other);
    onChange(nextValues);
  }

  function updateOther(text: string) {
    const nextOther = { kind: "other" as const, text };
    if (!multiple) return onChange(nextOther);
    onChange([
      ...[...selected].map((item) => ({ kind: "option", value: item })),
      nextOther,
    ]);
  }

  return (
    <div className="grid gap-2">
      {question.manualOptions.map((option) => (
        <label
          className={`flex min-h-11 min-w-0 items-center gap-3 rounded-md border px-3 text-sm transition-colors ${selected.has(option.value) ? "border-primary/60 bg-primary/10" : "border-white/10 bg-card/50"}`}
          key={option.id}
        >
          <input
            checked={selected.has(option.value)}
            name={question.id}
            onChange={() => updateOption(option.value)}
            type={multiple ? "checkbox" : "radio"}
          />
          <span className="min-w-0 break-words">{option.label}</span>
        </label>
      ))}
      {question.allowOther && (
        <div className="grid gap-2 rounded-md border border-white/10 bg-card/50 p-3">
          <Label htmlFor={`${question.id}-other`}>Other</Label>
          <Input
            className="h-11 min-w-0 bg-background/70 text-base sm:text-sm"
            id={`${question.id}-other`}
            onChange={(event) => updateOther(event.target.value)}
            placeholder="Enter your answer"
            value={other?.text ?? ""}
          />
        </div>
      )}
    </div>
  );
}

function ManualDropdown({
  onChange,
  question,
  value,
}: {
  onChange: (value: unknown) => void;
  question: Extract<FormQuestion, { optionSource: string }>;
  value: unknown;
}) {
  const selected =
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    value.kind === "option" &&
    "value" in value &&
    typeof value.value === "string"
      ? value.value
      : "";
  const other =
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    value.kind === "other" &&
    "text" in value &&
    typeof value.text === "string"
      ? value.text
      : null;

  return (
    <div className="grid min-w-0 gap-2">
      <select
        aria-label={question.prompt}
        className="h-11 w-full min-w-0 rounded-md border border-input bg-background/70 px-3 text-base shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
        onChange={(event) => {
          if (event.target.value === "__other__") {
            onChange({ kind: "other", text: other ?? "" });
          } else {
            onChange({ kind: "option", value: event.target.value });
          }
        }}
        value={other !== null ? "__other__" : selected}
      >
        <option disabled value="">
          Select an option
        </option>
        {question.manualOptions.map((option) => (
          <option key={option.id} value={option.value}>
            {option.label}
          </option>
        ))}
        {question.allowOther && <option value="__other__">Other</option>}
      </select>
      {other !== null && (
        <Input
          aria-label={`${question.prompt} — Other`}
          className="h-11 min-w-0 bg-background/70 text-base sm:text-sm"
          onChange={(event) =>
            onChange({ kind: "other", text: event.target.value })
          }
          placeholder="Enter your answer"
          value={other}
        />
      )}
    </div>
  );
}

function QuestionControl({
  formId,
  onChange,
  onUploadPendingChange,
  question,
  value,
}: {
  formId: string;
  onChange: (value: unknown) => void;
  onUploadPendingChange?: (pending: boolean) => void;
  question: FormQuestion;
  value: unknown;
}) {
  if (
    question.type === "multiple_choice" ||
    question.type === "checkboxes" ||
    question.type === "dropdown"
  ) {
    const multiple = question.type === "checkboxes";
    if (question.type === "dropdown" && question.optionSource === "manual") {
      return (
        <ManualDropdown onChange={onChange} question={question} value={value} />
      );
    }
    return question.optionSource === "preset" ? (
      <PresetChoice
        multiple={multiple}
        onChange={onChange}
        question={question}
        value={value}
      />
    ) : (
      <ManualChoice
        multiple={multiple}
        onChange={onChange}
        question={question}
        value={value}
      />
    );
  }

  if (question.type === "paragraph") {
    return (
      <Textarea
        aria-label={question.prompt}
        className="min-h-32 min-w-0 bg-background/70 text-base sm:text-sm"
        maxLength={question.maxLength}
        onChange={(event) => onChange(event.target.value)}
        value={typeof value === "string" ? value : ""}
      />
    );
  }

  if (question.type === "linear_scale") {
    const values = linearScaleValues(question.min, question.max);
    if (values.length === 0) {
      return (
        <p
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          This scale is unavailable. Ask a form editor to correct its range.
        </p>
      );
    }
    return (
      <div className="grid min-w-0 grid-cols-5 gap-1.5 sm:gap-2">
        {values.map((scale) => (
          <label
            className={`grid min-h-11 min-w-11 justify-items-center gap-1 rounded-md border p-1.5 text-sm transition-colors sm:p-2 ${value === scale ? "border-primary/60 bg-primary/10" : "border-white/10 bg-card/50"}`}
            key={scale}
          >
            <input
              checked={value === scale}
              name={question.id}
              onChange={() => onChange(scale)}
              type="radio"
            />
            {scale}
          </label>
        ))}
      </div>
    );
  }

  if (question.type === "boolean") {
    return (
      <div className="grid min-w-0 grid-cols-1 gap-2 min-[360px]:grid-cols-2">
        {[true, false].map((option) => (
          <label
            className="flex min-h-11 items-center gap-3 rounded-md border border-white/10 bg-card/50 px-3 text-sm"
            key={String(option)}
          >
            <input
              checked={value === option}
              name={question.id}
              onChange={() => onChange(option)}
              type="radio"
            />
            {option ? "Yes" : "No"}
          </label>
        ))}
      </div>
    );
  }

  if (question.type === "file") {
    return (
      <FormFileUpload
        allowedMimeTypes={question.allowedMimeTypes}
        formId={formId}
        label={question.prompt}
        onChange={onChange}
        onPendingChange={onUploadPendingChange}
        questionId={question.id}
      />
    );
  }

  const inputType =
    question.type === "short_text"
      ? "text"
      : question.type === "phone"
        ? "tel"
        : question.type === "link"
          ? "url"
          : question.type;
  return (
    <Input
      aria-label={question.prompt}
      className="h-11 min-w-0 bg-background/70 text-base sm:text-sm"
      max={"max" in question ? question.max : undefined}
      maxLength={"maxLength" in question ? question.maxLength : undefined}
      min={"min" in question ? question.min : undefined}
      inputMode={question.type === "phone" ? "tel" : undefined}
      onChange={(event) =>
        onChange(
          question.type === "number"
            ? event.target.value === ""
              ? undefined
              : Number(event.target.value)
            : event.target.value,
        )
      }
      type={inputType}
      value={
        typeof value === "string" || typeof value === "number" ? value : ""
      }
    />
  );
}

function FormFileUpload({
  allowedMimeTypes,
  formId,
  label,
  onChange,
  onPendingChange,
  questionId,
}: {
  allowedMimeTypes: string[];
  formId: string;
  label: string;
  onChange: (value: unknown) => void;
  onPendingChange?: (pending: boolean) => void;
  questionId: string;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const createUpload = api.forms.createUpload.useMutation();
  const finalizeUpload = api.forms.finalizeUpload.useMutation();

  return (
    <div className="grid gap-2">
      <Input
        accept={allowedMimeTypes.join(",")}
        aria-label={label}
        className="h-11 min-w-0 max-w-full overflow-hidden bg-background/70 text-sm"
        disabled={createUpload.isPending || finalizeUpload.isPending}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          void (async () => {
            onPendingChange?.(true);
            try {
              setStatus("Uploading…");
              const upload = await createUpload.mutateAsync({
                contentType: file.type || "application/octet-stream",
                fileName: file.name,
                formId,
                purpose: "response",
                questionId,
                size: file.size,
              });
              const response = await fetch(upload.uploadUrl, {
                body: file,
                headers: { "Content-Type": file.type },
                method: "PUT",
              });
              if (!response.ok) throw new Error("Upload failed.");
              await finalizeUpload.mutateAsync({
                attachmentId: upload.attachmentId,
              });
              onChange({
                attachmentId: upload.attachmentId,
                fileName: file.name,
              });
              setStatus(`${file.name} uploaded`);
            } catch (cause) {
              onChange(undefined);
              setStatus(
                cause instanceof Error ? cause.message : "Upload failed.",
              );
            } finally {
              onPendingChange?.(false);
            }
          })();
        }}
        type="file"
      />
      {status && (
        <p className="text-sm text-muted-foreground" role="status">
          {status}
        </p>
      )}
    </div>
  );
}

export function GenericFormResponseForm({
  definition,
  formId,
  initialAnswers = {},
  mode = "create",
  onSubmitted,
}: {
  definition: FormDefinition;
  formId: string;
  initialAnswers?: AnswerMap;
  mode?: "create" | "edit";
  onSubmitted?: () => void;
}) {
  const [answers, setAnswers] = useState<AnswerMap>(initialAnswers);
  const [error, setError] = useState<string | null>(null);
  const [pendingUploadQuestionIds, setPendingUploadQuestionIds] = useState(
    () => new Set<string>(),
  );
  const questions = useMemo(
    () => definition.questions.filter((question) => !question.retired),
    [definition.questions],
  );
  const submit = api.forms.createResponse.useMutation({
    onError(mutationError) {
      setError(mutationError.message);
    },
    onSuccess() {
      setError(null);
      if (onSubmitted) onSubmitted();
      else window.location.reload();
    },
  });
  const update = api.forms.updateResponse.useMutation({
    onError(mutationError) {
      setError(mutationError.message);
    },
    onSuccess() {
      setError(null);
      if (onSubmitted) onSubmitted();
      else window.location.reload();
    },
  });

  async function handleSubmit() {
    setError(null);
    const missingQuestion = questions.find((question) => {
      if (!question.required) return false;
      const answer = answers[question.id];
      if (answer === undefined || answer === null || answer === "") return true;
      if (Array.isArray(answer)) return answer.length === 0;
      return false;
    });
    if (missingQuestion) {
      setError(`Answer “${missingQuestion.prompt}” before submitting.`);
      requestAnimationFrame(() => {
        const question = document.querySelector(
          `[data-question-id="${missingQuestion.id}"]`,
        );
        question?.scrollIntoView({ behavior: "smooth", block: "center" });
        question
          ?.querySelector<HTMLElement>("input, textarea, select, button")
          ?.focus();
      });
      return;
    }
    if (pendingUploadQuestionIds.size > 0) {
      setError("Finish uploading selected files before submitting.");
      return;
    }
    try {
      const validated = validateFormAnswers(
        definition,
        Object.entries(answers).map(([questionId, value]) => ({
          questionId,
          value,
        })),
      );
      if (mode === "edit") {
        await update.mutateAsync({
          form: formId,
          responseData: validated,
          upsert: false,
        });
      } else {
        await submit.mutateAsync({ form: formId, responseData: validated });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Check your answers.");
    }
  }

  return (
    <form
      className="grid min-w-0 gap-3 sm:gap-4"
      data-form-response-layout="mobile-first"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
    >
      {definition.instructions.map((instruction) =>
        instruction.type === "text" ? (
          <div
            className="min-w-0 whitespace-pre-wrap break-words rounded-md border border-white/10 bg-background/60 p-3 text-sm leading-6 text-muted-foreground sm:p-4"
            key={instruction.id}
          >
            {instruction.body}
          </div>
        ) : (
          <InstructionMedia
            alt={instruction.alt}
            attachmentId={instruction.attachmentId}
            key={instruction.id}
            type={instruction.type}
          />
        ),
      )}
      {questions.map((question, index) => (
        <fieldset
          className="grid min-w-0 gap-3 rounded-md border border-white/10 bg-background/60 p-3 sm:p-4"
          data-question-id={question.id}
          key={question.id}
        >
          <legend className="max-w-full break-words px-1 text-sm font-medium leading-5">
            {question.prompt}
            {question.required && <span className="text-destructive"> *</span>}
          </legend>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Question {index + 1} of {questions.length}
          </p>
          <QuestionControl
            formId={formId}
            onChange={(value) =>
              setAnswers((current) => ({ ...current, [question.id]: value }))
            }
            onUploadPendingChange={(pending) =>
              setPendingUploadQuestionIds((current) => {
                const next = new Set(current);
                if (pending) next.add(question.id);
                else next.delete(question.id);
                return next;
              })
            }
            question={question}
            value={answers[question.id]}
          />
        </fieldset>
      ))}
      <div
        className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 grid min-w-0 gap-2 rounded-lg border border-white/10 bg-card/95 p-2 shadow-2xl shadow-black/40 backdrop-blur sm:static sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none"
        data-form-submit-bar="sticky-mobile"
      >
        {error && (
          <p
            className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        )}
        <Button
          className="min-h-11 w-full"
          disabled={
            pendingUploadQuestionIds.size > 0 ||
            submit.isPending ||
            update.isPending
          }
          type="submit"
        >
          {(submit.isPending || update.isPending) && (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          )}
          {mode === "edit" ? "Save response" : "Submit response"}
        </Button>
      </div>
    </form>
  );
}
