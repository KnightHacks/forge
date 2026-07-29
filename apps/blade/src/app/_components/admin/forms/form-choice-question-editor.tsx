"use client";

import { CheckSquare2, Circle, Plus, X } from "lucide-react";

import type { FormQuestion } from "@forge/validators";
import { Button } from "@forge/ui/button";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";

import { newManualOption } from "./form-question-model";

const presetCatalogs = [
  "LEVELS_OF_STUDY",
  "ALLERGIES",
  "MAJORS",
  "GENDERS",
  "RACES_OR_ETHNICITIES",
  "COUNTRIES",
  "SCHOOLS",
  "COMPANIES",
  "SHIRT_SIZES",
  "EVENT_FEEDBACK_HEARD",
  "SHORT_LEVELS_OF_STUDY",
  "SHORT_RACES_AND_ETHNICITIES",
];

type ChoiceQuestion = Extract<
  FormQuestion,
  { type: "checkboxes" | "dropdown" | "multiple_choice" }
>;

function focusOption(questionId: string, optionId: string) {
  requestAnimationFrame(() => {
    document.getElementById(`option-${questionId}-${optionId}`)?.focus();
  });
}

function ManualOptionList({
  disabled = false,
  onUpdate,
  question,
}: {
  disabled?: boolean;
  onUpdate: (question: FormQuestion) => void;
  question: ChoiceQuestion;
}) {
  function updateOption(index: number, label: string) {
    onUpdate({
      ...question,
      manualOptions: question.manualOptions.map((option, optionIndex) =>
        optionIndex === index ? { ...option, label } : option,
      ),
    });
  }

  function addOption(afterIndex = question.manualOptions.length - 1) {
    const option = newManualOption(
      `Option ${question.manualOptions.length + 1}`,
    );
    const manualOptions = [...question.manualOptions];
    manualOptions.splice(afterIndex + 1, 0, option);
    onUpdate({ ...question, manualOptions });
    focusOption(question.id, option.id);
  }

  function removeOption(index: number) {
    if (question.manualOptions.length === 1) return;
    onUpdate({
      ...question,
      manualOptions: question.manualOptions.filter(
        (_, optionIndex) => optionIndex !== index,
      ),
    });
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label>Options</Label>
        <span className="text-xs text-muted-foreground">
          Enter adds the next option
        </span>
      </div>
      <div className="grid gap-1.5">
        {question.manualOptions.map((option, optionIndex) => (
          <div
            className="group flex min-w-0 items-center gap-2"
            key={option.id}
          >
            {question.type === "dropdown" ? (
              <span className="w-5 shrink-0 text-center font-mono text-xs text-muted-foreground">
                {optionIndex + 1}.
              </span>
            ) : question.type === "checkboxes" ? (
              <CheckSquare2
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground"
              />
            ) : (
              <Circle
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground"
              />
            )}
            <Input
              aria-label={`Option ${optionIndex + 1}`}
              className="h-11 min-w-0 flex-1"
              disabled={disabled}
              id={`option-${question.id}-${option.id}`}
              onBlur={() => {
                if (!option.label.trim()) {
                  updateOption(optionIndex, `Option ${optionIndex + 1}`);
                }
              }}
              onChange={(event) =>
                updateOption(optionIndex, event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addOption(optionIndex);
                } else if (
                  event.key === "Backspace" &&
                  option.label === "" &&
                  question.manualOptions.length > 1
                ) {
                  event.preventDefault();
                  removeOption(optionIndex);
                }
              }}
              onPaste={(event) => {
                const lines = event.clipboardData
                  .getData("text")
                  .split(/\r?\n/)
                  .map((line) => line.trim())
                  .filter(Boolean);
                if (lines.length <= 1) return;
                event.preventDefault();
                const manualOptions = [...question.manualOptions];
                const pastedOptions = lines.map((label, lineIndex) =>
                  lineIndex === 0
                    ? { ...option, label }
                    : newManualOption(label),
                );
                manualOptions.splice(optionIndex, 1, ...pastedOptions);
                onUpdate({ ...question, manualOptions });
              }}
              value={option.label}
            />
            <Button
              aria-label={`Remove option ${optionIndex + 1}`}
              className="min-h-11 min-w-11 shrink-0 text-muted-foreground sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
              disabled={disabled || question.manualOptions.length === 1}
              onClick={() => !disabled && removeOption(optionIndex)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <X className="size-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        className="min-h-11 w-fit"
        disabled={disabled}
        onClick={() => addOption()}
        type="button"
        variant="ghost"
      >
        <Plus className="size-4" /> Add option
      </Button>
    </div>
  );
}

export function ChoiceQuestionEditor({
  disabled = false,
  onUpdate,
  question,
}: {
  disabled?: boolean;
  onUpdate: (question: FormQuestion) => void;
  question: ChoiceQuestion;
}) {
  return (
    <div
      className="grid gap-3 rounded-md border border-white/10 bg-card/40 p-3"
      data-question-editor="choices"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Option source</Label>
          <Select
            disabled={disabled}
            onValueChange={(value) =>
              onUpdate({
                ...question,
                optionSource: value as "manual" | "preset",
                presetCatalogId:
                  value === "preset"
                    ? (question.presetCatalogId ?? "MAJORS")
                    : question.presetCatalogId,
              })
            }
            value={question.optionSource}
          >
            <SelectTrigger aria-label="Option source" className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual options</SelectItem>
              <SelectItem value="preset">Const</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {question.optionSource === "preset" && (
          <div className="grid gap-2">
            <Label>Const list</Label>
            <Select
              disabled={disabled}
              onValueChange={(presetCatalogId) =>
                onUpdate({ ...question, presetCatalogId })
              }
              value={question.presetCatalogId ?? "MAJORS"}
            >
              <SelectTrigger aria-label="Const list" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {presetCatalogs.map((catalog) => (
                  <SelectItem key={catalog} value={catalog}>
                    {catalog.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {question.optionSource === "manual" && (
        <ManualOptionList
          disabled={disabled}
          onUpdate={onUpdate}
          question={question}
        />
      )}

      {question.type !== "dropdown" && (
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            checked={question.allowOther}
            disabled={disabled}
            onChange={(event) =>
              onUpdate({ ...question, allowOther: event.target.checked })
            }
            type="checkbox"
          />
          Allow an “Other” answer
        </label>
      )}
    </div>
  );
}
