"use client";

import { FileUp, X } from "lucide-react";

import type { FormQuestion } from "@forge/validators";
import { Button } from "@forge/ui/button";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import {
  FORM_LINEAR_SCALE_ENDPOINT_MAX,
  FORM_LINEAR_SCALE_ENDPOINT_MIN,
  FORM_LINEAR_SCALE_MAX_SPAN,
} from "@forge/validators";

import { ChoiceQuestionEditor } from "./form-choice-question-editor";

interface EditorProps<Type extends FormQuestion["type"]> {
  disabled?: boolean;
  onUpdate: (question: FormQuestion) => void;
  question: Extract<FormQuestion, { type: Type }>;
}

function LinearScaleEditor({
  disabled = false,
  onUpdate,
  question,
}: EditorProps<"linear_scale">) {
  return (
    <div
      className="grid gap-3 rounded-md border border-white/10 bg-card/40 p-3"
      data-question-editor="linear-scale"
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor={`scale-min-${question.id}`}>Minimum</Label>
          <Input
            disabled={disabled}
            id={`scale-min-${question.id}`}
            inputMode="numeric"
            max={question.max - 1}
            min={Math.max(
              FORM_LINEAR_SCALE_ENDPOINT_MIN,
              question.max - FORM_LINEAR_SCALE_MAX_SPAN,
            )}
            onChange={(event) =>
              onUpdate({ ...question, min: Number(event.target.value) })
            }
            type="number"
            value={question.min}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`scale-max-${question.id}`}>Maximum</Label>
          <Input
            disabled={disabled}
            id={`scale-max-${question.id}`}
            inputMode="numeric"
            max={Math.min(
              FORM_LINEAR_SCALE_ENDPOINT_MAX,
              question.min + FORM_LINEAR_SCALE_MAX_SPAN,
            )}
            min={question.min + 1}
            onChange={(event) =>
              onUpdate({ ...question, max: Number(event.target.value) })
            }
            type="number"
            value={question.max}
          />
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-md border border-white/10 bg-background/60 px-3 py-3 text-sm text-muted-foreground">
        <span className="font-mono text-foreground">{question.min}</span>
        <span className="h-px flex-1 bg-border" />
        <span className="font-mono text-foreground">{question.max}</span>
        <span className="sr-only">Linear scale preview</span>
      </div>
    </div>
  );
}

function NumberRangeEditor({
  disabled = false,
  onUpdate,
  question,
}: EditorProps<"number">) {
  return (
    <div
      className="grid gap-3 rounded-md border border-white/10 bg-card/40 p-3 sm:grid-cols-2"
      data-question-editor="number"
    >
      <div className="grid gap-2">
        <Label htmlFor={`number-min-${question.id}`}>Minimum (optional)</Label>
        <Input
          disabled={disabled}
          id={`number-min-${question.id}`}
          onChange={(event) =>
            onUpdate({
              ...question,
              min:
                event.target.value === ""
                  ? undefined
                  : Number(event.target.value),
            })
          }
          type="number"
          value={question.min ?? ""}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`number-max-${question.id}`}>Maximum (optional)</Label>
        <Input
          disabled={disabled}
          id={`number-max-${question.id}`}
          onChange={(event) =>
            onUpdate({
              ...question,
              max:
                event.target.value === ""
                  ? undefined
                  : Number(event.target.value),
            })
          }
          type="number"
          value={question.max ?? ""}
        />
      </div>
    </div>
  );
}

function TextLengthEditor({
  disabled = false,
  onUpdate,
  question,
}: EditorProps<"paragraph" | "short_text">) {
  const maximum = question.type === "short_text" ? 10_000 : 100_000;
  return (
    <div
      className="grid gap-2 rounded-md border border-white/10 bg-card/40 p-3 sm:grid-cols-[minmax(0,16rem)_1fr] sm:items-end"
      data-question-editor={question.type}
    >
      <div className="grid gap-2">
        <Label htmlFor={`max-length-${question.id}`}>Character limit</Label>
        <Input
          disabled={disabled}
          id={`max-length-${question.id}`}
          max={maximum}
          min={1}
          onChange={(event) =>
            onUpdate({ ...question, maxLength: Number(event.target.value) })
          }
          type="number"
          value={question.maxLength}
        />
      </div>
      <p className="pb-2 text-sm text-muted-foreground">
        {question.type === "short_text"
          ? "Single-line response"
          : "Multi-line response"}
      </p>
    </div>
  );
}

function FileUploadEditor({
  disabled = false,
  onUpdate,
  question,
}: EditorProps<"file">) {
  return (
    <div
      className="grid gap-3 rounded-md border border-white/10 bg-card/40 p-3"
      data-question-editor="file"
    >
      <div className="grid gap-2 sm:max-w-64">
        <Label htmlFor={`max-file-size-${question.id}`}>
          Maximum file size (MB)
        </Label>
        <Input
          disabled={disabled}
          id={`max-file-size-${question.id}`}
          max={100}
          min={1}
          onChange={(event) =>
            onUpdate({
              ...question,
              maxBytes: Number(event.target.value) * 1024 * 1024,
            })
          }
          type="number"
          value={question.maxBytes / 1024 / 1024}
        />
      </div>
      <div className="grid gap-2">
        <Label>Accepted MIME types</Label>
        {question.allowedMimeTypes.map((mimeType, index) => (
          <div className="flex items-center gap-2" key={`${mimeType}-${index}`}>
            <Input
              disabled={disabled}
              aria-label={`Accepted MIME type ${index + 1}`}
              onChange={(event) =>
                onUpdate({
                  ...question,
                  allowedMimeTypes: question.allowedMimeTypes.map(
                    (current, mimeIndex) =>
                      mimeIndex === index ? event.target.value : current,
                  ),
                })
              }
              value={mimeType}
            />
            <Button
              aria-label={`Remove MIME type ${index + 1}`}
              className="min-h-11 min-w-11"
              disabled={disabled || question.allowedMimeTypes.length === 1}
              onClick={() =>
                !disabled &&
                onUpdate({
                  ...question,
                  allowedMimeTypes: question.allowedMimeTypes.filter(
                    (_, mimeIndex) => mimeIndex !== index,
                  ),
                })
              }
              size="icon"
              type="button"
              variant="ghost"
            >
              <X className="size-4" />
            </Button>
          </div>
        ))}
        <Button
          className="min-h-11 w-fit"
          disabled={disabled}
          onClick={() =>
            onUpdate({
              ...question,
              allowedMimeTypes: [
                ...question.allowedMimeTypes,
                "application/octet-stream",
              ],
            })
          }
          type="button"
          variant="ghost"
        >
          <FileUp className="size-4" /> Add MIME type
        </Button>
      </div>
    </div>
  );
}

export function QuestionSpecificEditor({
  disabled = false,
  onUpdate,
  question,
}: {
  disabled?: boolean;
  onUpdate: (question: FormQuestion) => void;
  question: FormQuestion;
}) {
  if (
    question.type === "multiple_choice" ||
    question.type === "checkboxes" ||
    question.type === "dropdown"
  ) {
    return (
      <ChoiceQuestionEditor
        disabled={disabled}
        onUpdate={onUpdate}
        question={question}
      />
    );
  }

  if (question.type === "linear_scale") {
    return (
      <LinearScaleEditor
        disabled={disabled}
        onUpdate={onUpdate}
        question={question}
      />
    );
  }

  if (question.type === "number") {
    return (
      <NumberRangeEditor
        disabled={disabled}
        onUpdate={onUpdate}
        question={question}
      />
    );
  }

  if (question.type === "short_text" || question.type === "paragraph") {
    return (
      <TextLengthEditor
        disabled={disabled}
        onUpdate={onUpdate}
        question={question}
      />
    );
  }

  if (question.type === "file") {
    return (
      <FileUploadEditor
        disabled={disabled}
        onUpdate={onUpdate}
        question={question}
      />
    );
  }

  const responseFormat: Record<
    Exclude<
      FormQuestion["type"],
      | "checkboxes"
      | "dropdown"
      | "file"
      | "linear_scale"
      | "multiple_choice"
      | "number"
      | "paragraph"
      | "short_text"
    >,
    string
  > = {
    boolean: "Yes / no",
    date: "Date picker",
    email: "Email address",
    link: "Web link",
    phone: "Phone number",
    time: "Time picker",
  };

  return (
    <div
      className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-white/10 bg-card/40 px-3 text-sm"
      data-question-editor={question.type}
    >
      <span className="text-muted-foreground">Response format</span>
      <span>{responseFormat[question.type]}</span>
    </div>
  );
}
