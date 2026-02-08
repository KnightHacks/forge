"use client";

import type { DraggableSyntheticListeners } from "@dnd-kit/core";
import type { z } from "zod";
import * as React from "react";
import {
  AlignLeft,
  ArrowDown,
  ArrowUp,
  AtSign,
  Calendar,
  CheckSquare,
  ChevronDown,
  Circle,
  CircleDot,
  Clock,
  Copy,
  FileUp,
  GripHorizontal,
  Hash,
  Link,
  Phone,
  Pilcrow,
  SlidersHorizontal,
  ToggleLeft,
  Trash,
  X,
} from "lucide-react";

import { FORMS } from "@forge/consts";
import { cn } from "@forge/ui";
import { Button } from "@forge/ui/button";
import { Card } from "@forge/ui/card";
import { Checkbox } from "@forge/ui/checkbox";
import { DatePicker } from "@forge/ui/date-picker";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";
import { Slider } from "@forge/ui/slider";
import { Textarea } from "@forge/ui/textarea";
import { TimePicker } from "@forge/ui/time-picker";
import { useMediaQuery } from "@forge/ui/use-media-query";

type FormQuestion = z.infer<typeof FORMS.QuestionValidator>;
type QuestionType = FormQuestion["type"];

interface QuestionEditCardProps {
  question: FormQuestion & { id: string };
  isActive: boolean;
  onUpdate: (updatedQuestion: FormQuestion & { id: string }) => void;
  onDelete: (id: string) => void;
  onDuplicate: (question: FormQuestion & { id: string }) => void;
  onForceSave?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  error?: string;
  dragHandleProps?: DraggableSyntheticListeners;
}

const QUESTION_ICONS: Record<string, React.ElementType> = {
  SHORT_ANSWER: AlignLeft,
  PARAGRAPH: Pilcrow,
  MULTIPLE_CHOICE: CircleDot,
  CHECKBOXES: CheckSquare,
  DROPDOWN: ChevronDown,
  LINEAR_SCALE: SlidersHorizontal,
  DATE: Calendar,
  TIME: Clock,
  EMAIL: AtSign,
  NUMBER: Hash,
  PHONE: Phone,
  FILE_UPLOAD: FileUp,
  BOOLEAN: ToggleLeft,
  LINK: Link,
};

/**
 * Renders an editable card for a single form question with controls to edit the question text, change question type, manage options/scale bounds, toggle required, duplicate, delete, and reorder.
 *
 * Changing the question type will auto-initialize or clear options and set default min/max for scale/number types; it also calls `onForceSave` when provided.
 *
 * @returns The React element representing the question edit card configured for the provided `question` and callbacks.
 */
export function QuestionEditCard({
  question,
  isActive,
  onUpdate,
  onDelete,
  onDuplicate,
  onForceSave,
  error,
  dragHandleProps,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
}: QuestionEditCardProps) {
  const isMobile = !useMediaQuery("(min-width: 768px)");
  // -- Handlers --

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate({ ...question, question: e.target.value });
  };

  const handleTypeChange = (newType: QuestionType) => {
    const updatedQuestion = { ...question, type: newType };

    if (
      ["MULTIPLE_CHOICE", "CHECKBOXES", "DROPDOWN"].includes(newType) &&
      (!question.options || question.options.length === 0)
    ) {
      updatedQuestion.options = ["Option 1"];
    }

    if (
      [
        "SHORT_ANSWER",
        "PARAGRAPH",
        "DATE",
        "TIME",
        "EMAIL",
        "NUMBER",
        "PHONE",
        "LINEAR_SCALE",
        "FILE_UPLOAD",
        "BOOLEAN",
        "LINK",
      ].includes(newType)
    ) {
      updatedQuestion.options = undefined;
    }

    if (newType === "LINEAR_SCALE" || newType === "NUMBER") {
      if (question.min === undefined) updatedQuestion.min = 0;
      if (question.max === undefined && newType === "LINEAR_SCALE")
        updatedQuestion.max = 5;
    }

    onUpdate(updatedQuestion);
    // Trigger auto-save immediately on type change as requested
    onForceSave?.();
  };

  const handleRequiredChange = (checked: boolean) => {
    onUpdate({ ...question, optional: !checked });
  };

  // The 'question' prop now includes 'id' via the extended type.

  return (
    <Card
      className={cn(
        "relative flex flex-col gap-4 border-l-4 bg-card px-4 py-6 text-card-foreground transition-all md:p-6",
        isActive
          ? "border-l-primary shadow-md ring-1 ring-black/5"
          : "border-l-transparent hover:bg-muted/50",
        error && "border-l-destructive ring-destructive/20",
      )}
      onClick={() => {
        // Allow propagation so parent can set active state
      }}
    >
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="flex-1 rounded-md bg-muted/50 p-2 transition-colors focus-within:bg-muted focus-within:ring-1 focus-within:ring-primary/20">
          <Textarea
            value={question.question}
            onChange={handleTitleChange}
            placeholder="Question"
            className="min-h-[3rem] resize-none overflow-hidden border-none bg-transparent px-0 py-0 text-lg font-medium placeholder:text-muted-foreground focus-visible:ring-0"
            rows={1}
            onInput={(e) => {
              // Auto-resize
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = `${target.scrollHeight}px`;
            }}
          />
        </div>

        <div className="w-full md:w-[220px]">
          <Select
            value={question.type}
            onValueChange={(val: QuestionType) => handleTypeChange(val)}
          >
            <SelectTrigger className="h-12 w-full">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {FORMS.FORM_QUESTION_TYPES.map((type) => {
                const Icon = QUESTION_ICONS[type.value];
                return (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-3">
                      {Icon && <Icon className="h-4 w-4" />}
                      <span>{type.label}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <div className="animate-pulse text-sm font-medium text-destructive">
          Please fix: {error}
        </div>
      )}

      {/* Body */}
      <div className="pt-2">
        <QuestionBody question={question} onUpdate={onUpdate} />
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between gap-2 border-t pt-4">
        {isMobile ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp?.();
              }}
              disabled={!canMoveUp}
              className="rounded p-1 text-gray-300 hover:text-gray-500 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Move up"
            >
              <ArrowUp className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown?.();
              }}
              disabled={!canMoveDown}
              className="rounded p-1 text-gray-300 hover:text-gray-500 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Move down"
            >
              <ArrowDown className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div
            className="cursor-move text-gray-300 hover:text-gray-500"
            {...dragHandleProps}
          >
            <GripHorizontal className="h-5 w-5 rotate-90" />
          </div>
        )}
        <div className="flex items-center justify-end gap-2">
          <div className="mr-4 flex items-center gap-2 border-r pr-4">
            <Copy
              className="h-5 w-5 cursor-pointer text-gray-500 hover:text-gray-700"
              onClick={() => onDuplicate(question)}
            />
            <Trash
              className="h-5 w-5 cursor-pointer text-gray-500 hover:text-red-600"
              onClick={() => onDelete(question.id)}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Required</span>
            <Checkbox
              checked={!question.optional}
              onCheckedChange={handleRequiredChange}
            />
          </div>

          {/* <div className="ml-2">
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5 text-gray-500" />
            </Button>
          </div> */}
        </div>
      </div>
    </Card>
  );
}

// -- Sub-Components --

function QuestionBody({
  question,
  onUpdate,
}: {
  question: FormQuestion & { id: string };
  onUpdate: (q: FormQuestion & { id: string }) => void;
}) {
  switch (question.type) {
    case "SHORT_ANSWER":
      return (
        <div className="w-full">
          <Input
            placeholder="Short answer text"
            className="rounded-none border-x-0 border-b border-t-0 border-gray-300 bg-transparent px-0 shadow-none outline-none focus-visible:border-b-2 focus-visible:border-primary focus-visible:ring-0"
            disabled
          />
        </div>
      );
    case "PARAGRAPH":
      return (
        <div className="w-full">
          <Textarea
            placeholder="Long answer text"
            className="resize-none rounded-none border-x-0 border-b border-t-0 border-gray-300 bg-transparent px-0 shadow-none outline-none focus-visible:border-b-2 focus-visible:border-primary focus-visible:ring-0"
            disabled
          />
        </div>
      );
    case "MULTIPLE_CHOICE":
    case "CHECKBOXES":
    case "DROPDOWN":
      return <OptionList question={question} onUpdate={onUpdate} />;
    case "DATE":
      return (
        <div className="pointer-events-none flex items-center gap-2 opacity-50">
          <DatePicker />
        </div>
      );
    case "TIME":
      return (
        <div className="pointer-events-none flex items-center gap-2 opacity-50">
          <TimePicker />
        </div>
      );
    case "EMAIL":
      return (
        <div className="w-full">
          <Input
            type="email"
            placeholder="email@example.com"
            className="rounded-none border-x-0 border-b border-t-0 border-gray-300 bg-transparent px-0 shadow-none outline-none focus-visible:border-b-2 focus-visible:border-primary focus-visible:ring-0"
            disabled
          />
        </div>
      );
    case "NUMBER":
      return (
        <div className="w-full">
          <Input
            type="number"
            placeholder="Enter a number"
            className="rounded-none border-x-0 border-b border-t-0 border-gray-300 bg-transparent px-0 shadow-none outline-none focus-visible:border-b-2 focus-visible:border-primary focus-visible:ring-0"
            disabled
            min={question.min}
            max={question.max}
          />
        </div>
      );
    case "PHONE":
      return (
        <div className="w-full">
          <Input
            type="tel"
            placeholder="(123) 456-7890"
            className="rounded-none border-x-0 border-b border-t-0 border-gray-300 bg-transparent px-0 shadow-none outline-none focus-visible:border-b-2 focus-visible:border-primary focus-visible:ring-0"
            disabled
          />
        </div>
      );
    case "LINEAR_SCALE":
      return <LinearScaleEditor question={question} onUpdate={onUpdate} />;
    case "FILE_UPLOAD":
      return (
        <div className="pointer-events-none flex items-center gap-2 opacity-50">
          <FileUp className="h-5 w-5" />
          <span className="text-sm text-muted-foreground">
            File upload (images, videos, audio, PDFs)
          </span>
        </div>
      );
    case "BOOLEAN":
      return (
        <div className="flex items-center gap-3">
          <Checkbox disabled checked={false} />
          <span className="text-sm text-muted-foreground">Yes / No</span>
        </div>
      );
    case "LINK":
      return (
        <div className="w-full">
          <Input
            type="url"
            placeholder="https://example.com"
            className="rounded-none border-x-0 border-b border-t-0 border-gray-300 bg-transparent px-0 shadow-none outline-none focus-visible:border-b-2 focus-visible:border-primary focus-visible:ring-0"
            disabled
          />
        </div>
      );
    default:
      return null;
  }
}

/**
 * Render and manage the editable options UI for a choice-style form question.
 *
 * Renders either a preset-constant selector or a list of editable option inputs (with add/remove,
 * paste-to-insert-multiple, and keyboard behaviors), and exposes controls for toggling the
 * "Allow Other" option when applicable.
 *
 * @param question - The question object (including `id`) whose options, type, and related flags drive the UI.
 * @param onUpdate - Called with an updated question whenever options, `optionsConst`, or `allowOther` change.
 * @returns The React element for the options editor for the provided question.
 */
function OptionList({
  question,
  onUpdate,
}: {
  question: FormQuestion & { id: string };
  onUpdate: (q: FormQuestion & { id: string }) => void;
}) {
  const options = question.options || [];

  const handleOptionChange = (index: number, newValue: string) => {
    const newOptions = [...options];
    newOptions[index] = newValue;
    onUpdate({ ...question, options: newOptions });
  };

  const addOption = () => {
    onUpdate({
      ...question,
      options: [...options, `Option ${options.length + 1}`],
    });
  };

  const removeOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    onUpdate({ ...question, options: newOptions });
  };

  const handlePaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    currentIndex: number,
  ) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");

    const lines = pastedText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) return;

    if (lines.length === 1) {
      handleOptionChange(currentIndex, lines[0] ?? "");
      return;
    }

    const firstLine = lines[0];
    const remainingLines = lines.slice(1);

    const newOptions = [...options];

    newOptions[currentIndex] = firstLine ?? "";

    newOptions.splice(currentIndex + 1, 0, ...remainingLines);

    onUpdate({ ...question, options: newOptions });
  };

  const Icon =
    question.type === "MULTIPLE_CHOICE"
      ? Circle
      : question.type === "CHECKBOXES"
        ? CheckSquare
        : Circle;

  const handleAllowOtherChange = (checked: boolean) => {
    onUpdate({ ...question, allowOther: checked });
  };

  const allowOther = question.allowOther ?? false;
  const optionsConst = question.optionsConst;
  const isUsingConst = Boolean(optionsConst);

  const handleConstChange = (constName: string | null) => {
    if (constName) {
      onUpdate({ ...question, optionsConst: constName, options: [] });
    } else {
      onUpdate({ ...question, optionsConst: undefined });
    }
  };

  const showConstSelector =
    question.type === "DROPDOWN" ||
    question.type === "MULTIPLE_CHOICE" ||
    question.type === "CHECKBOXES";

  const isRestrictedType =
    question.type === "MULTIPLE_CHOICE" || question.type === "CHECKBOXES";

  const availableConstants = Object.entries(
    FORMS.AVAILABLE_DROPDOWN_CONSTANTS,
  ).map(([key, label]) => {
    const constOptions = FORMS.getDropdownOptionsFromConst(key);
    const isDisabled = isRestrictedType && constOptions.length >= 15;
    return { key, label, isDisabled, length: constOptions.length };
  });

  return (
    <div className="flex flex-col gap-2">
      {showConstSelector && (
        <div className="mb-3 flex flex-col gap-2 border-b pb-3">
          <Label className="text-sm font-medium">Use Preset Options</Label>
          <Select
            value={optionsConst || "__MANUAL__"}
            onValueChange={(value) =>
              handleConstChange(value === "__MANUAL__" ? null : value)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a constant (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__MANUAL__">Manual options</SelectItem>
              {availableConstants.map(({ key, label, isDisabled }) => (
                <SelectItem
                  key={key}
                  value={key}
                  disabled={isDisabled}
                  className={isDisabled ? "cursor-not-allowed opacity-50" : ""}
                >
                  {label}
                  {isDisabled &&
                    " (too long for this question type, max 15 options) Use Dropdown instead"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isUsingConst && (
            <p className="text-xs text-muted-foreground">
              Using constant:{" "}
              {
                FORMS.AVAILABLE_DROPDOWN_CONSTANTS[
                  optionsConst as keyof typeof FORMS.AVAILABLE_DROPDOWN_CONSTANTS
                ]
              }
            </p>
          )}
        </div>
      )}

      {!isUsingConst &&
        options.map((optionValue, idx) => (
          <div key={idx} className="group flex items-center gap-2">
            {question.type === "DROPDOWN" ? (
              <span className="w-6 text-center text-sm">{idx + 1}.</span>
            ) : (
              <Icon className="h-5 w-5 text-gray-300" />
            )}

            <Input
              value={optionValue}
              onChange={(e) => handleOptionChange(idx, e.target.value)}
              onPaste={(e) => handlePaste(e, idx)}
              className="flex-1 rounded-none border-none px-0 hover:border-b hover:border-gray-200 focus:border-b-2 focus:border-blue-500 focus:ring-0"
              placeholder={`Option ${idx + 1}`}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addOption();
                }
                if (e.key === "Backspace" && optionValue === "") {
                  e.preventDefault();
                  removeOption(idx);
                }
              }}
              autoFocus={idx === options.length - 1 && options.length > 1}
            />

            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 transition-opacity group-hover:opacity-100"
              onClick={() => removeOption(idx)}
              tabIndex={-1}
            >
              <X className="h-5 w-5 text-gray-500" />
            </Button>
          </div>
        ))}

      {/* Add Option Button - Only show when not using a constant */}
      {!isUsingConst && (
        <div className="mt-1 flex items-center gap-2">
          {question.type === "DROPDOWN" ? (
            <span className="w-6 text-center text-sm">
              {options.length + 1}.
            </span>
          ) : (
            <Icon className="h-5 w-5 text-transparent" />
          )}

          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Button
              variant="ghost"
              className="h-auto px-0 py-1 text-gray-500 hover:bg-transparent hover:text-gray-800"
              onClick={addOption}
            >
              Add option
            </Button>
          </div>
        </div>
      )}

      {/* Allow Other Option Toggle - Only for MULTIPLE_CHOICE and CHECKBOXES */}
      {(question.type === "MULTIPLE_CHOICE" ||
        question.type === "CHECKBOXES") && (
        <div className="mt-3 flex items-center gap-2 border-t pt-3">
          <Checkbox
            checked={allowOther}
            onCheckedChange={handleAllowOtherChange}
            id={`${question.id}-allowOther`}
          />
          <Label
            htmlFor={`${question.id}-allowOther`}
            className="cursor-pointer text-sm font-normal"
          >
            Allow "Other" option with custom text input
          </Label>
        </div>
      )}
    </div>
  );
}

function LinearScaleEditor({
  question,
  onUpdate,
}: {
  question: FormQuestion & { id: string };
  onUpdate: (q: FormQuestion & { id: string }) => void;
}) {
  const min = question.min ?? 0;
  const max = question.max ?? 5;

  const handleMinChange = (newMin: number) => {
    onUpdate({ ...question, min: newMin });
  };

  const handleMaxChange = (newMax: number) => {
    onUpdate({ ...question, max: newMax });
  };

  const scaleValues = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="linear-scale-min" className="text-sm">
            Min:
          </Label>
          <Input
            id="linear-scale-min"
            type="number"
            value={min}
            onChange={(e) => handleMinChange(Number(e.target.value))}
            className="w-20"
            min={0}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="linear-scale-max" className="text-sm">
            Max:
          </Label>
          <Input
            id="linear-scale-max"
            type="number"
            value={max}
            onChange={(e) => handleMaxChange(Number(e.target.value))}
            className="w-20"
            min={min + 1}
          />
        </div>
      </div>
      <div className="pointer-events-none opacity-50">
        <div className="flex items-center justify-between gap-2">
          {scaleValues.map((value) => (
            <div
              key={value}
              className="flex flex-col items-center gap-1 text-sm text-muted-foreground"
            >
              <Circle className="h-4 w-4" />
              <span>{value}</span>
            </div>
          ))}
        </div>
        <Slider
          value={[Math.floor((min + max) / 2)]}
          min={min}
          max={max}
          step={1}
          className="mt-2"
          disabled
        />
      </div>
    </div>
  );
}