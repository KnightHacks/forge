"use client";

import type { DraggableSyntheticListeners } from "@dnd-kit/core";
import type { z } from "zod";
import * as React from "react";
import {
  AlignLeft,
  Calendar,
  CheckSquare,
  ChevronDown,
  Circle,
  CircleDot,
  Clock,
  Copy,
  GripHorizontal,
  Pilcrow,
  Trash,
  X,
} from "lucide-react";

import type { QuestionValidator } from "@forge/consts/knight-hacks";
import { FORM_QUESTION_TYPES } from "@forge/consts/knight-hacks";
import { cn } from "@forge/ui";
import { Button } from "@forge/ui/button";
import { Card } from "@forge/ui/card";
import { Checkbox } from "@forge/ui/checkbox";
import { DatePicker } from "@forge/ui/date-picker";
import { Input } from "@forge/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";
import { Textarea } from "@forge/ui/textarea";
import { TimePicker } from "@forge/ui/time-picker";

type FormQuestion = z.infer<typeof QuestionValidator>;
type QuestionType = FormQuestion["type"];

interface QuestionEditCardProps {
  question: FormQuestion & { id: string };
  isActive: boolean;
  onUpdate: (updatedQuestion: FormQuestion & { id: string }) => void;
  onDelete: (id: string) => void;
  onDuplicate: (question: FormQuestion & { id: string }) => void;
  onForceSave?: () => void;
  error?: string;
  dragHandleProps?: DraggableSyntheticListeners;
}

const QUESTION_ICONS: Record<string, React.ElementType> = {
  SHORT_ANSWER: AlignLeft,
  PARAGRAPH: Pilcrow,
  MULTIPLE_CHOICE: CircleDot,
  CHECKBOXES: CheckSquare,
  DROPDOWN: ChevronDown,
  DATE: Calendar,
  TIME: Clock,
};

export function QuestionEditCard({
  question,
  isActive,
  onUpdate,
  onDelete,
  onDuplicate,
  onForceSave,
  error,
  dragHandleProps,
}: QuestionEditCardProps) {
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
      ["SHORT_ANSWER", "PARAGRAPH", "DATE", "TIME", "INSTRUCTION"].includes(
        newType,
      )
    ) {
      updatedQuestion.options = undefined;
    }

    // Initialize content for INSTRUCTION type
    if (newType === "INSTRUCTION" && !updatedQuestion.content) {
      updatedQuestion.content = "";
    }

    onUpdate(updatedQuestion);
    // Trigger auto-save immediately on type change as requested
    onForceSave?.();
  };

  const handleRequiredChange = (checked: boolean) => {
    onUpdate({ ...question, optional: !checked });
  };

  // The 'question' prop now includes 'id' via the extended type.

  const isInstruction = question.type === "INSTRUCTION";

  return (
    <Card
      className={cn(
        "relative flex flex-col gap-4 bg-card p-6 text-card-foreground transition-all",
        isInstruction
          ? "mt-20 border-t-4 border-t-primary shadow-lg"
          : "border-l-4",
        !isInstruction && isActive
          ? "border-l-primary shadow-md ring-1 ring-black/5"
          : !isInstruction && "border-l-1 hover:bg-muted/50",
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
            placeholder={isInstruction ? "Instruction Title" : "Question"}
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

        {!isInstruction && (
          <div className="w-full md:w-[220px]">
            <Select
              value={question.type}
              onValueChange={(val: QuestionType) => handleTypeChange(val)}
            >
              <SelectTrigger className="h-12 w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {FORM_QUESTION_TYPES.map((type) => {
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
        )}
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
        <div
          className="cursor-move text-gray-300 hover:text-gray-500"
          {...dragHandleProps}
        >
          <GripHorizontal className="h-5 w-5 rotate-90" />
        </div>
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

          {question.type !== "INSTRUCTION" && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Required</span>
              <Checkbox
                checked={!question.optional}
                onCheckedChange={handleRequiredChange}
              />
            </div>
          )}

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
    case "INSTRUCTION":
      return (
        <div className="w-full">
          <Textarea
            value={question.content || ""}
            onChange={(e) => onUpdate({ ...question, content: e.target.value })}
            placeholder="Instruction content (optional)"
            className="min-h-[80px] resize-none rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>
      );
    case "SHORT_ANSWER":
      return (
        <div className="w-1/2">
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
    default:
      return null;
  }
}

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

  const Icon =
    question.type === "MULTIPLE_CHOICE"
      ? Circle
      : question.type === "CHECKBOXES"
        ? CheckSquare
        : Circle;

  return (
    <div className="flex flex-col gap-2">
      {options.map((optionValue, idx) => (
        <div key={idx} className="group flex items-center gap-2">
          {question.type === "DROPDOWN" ? (
            <span className="w-6 text-center text-sm">{idx + 1}.</span>
          ) : (
            <Icon className="h-5 w-5 text-gray-300" />
          )}

          <Input
            value={optionValue}
            onChange={(e) => handleOptionChange(idx, e.target.value)}
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

      {/* Add Option Button */}
      <div className="mt-1 flex items-center gap-2">
        {question.type === "DROPDOWN" ? (
          <span className="w-6 text-center text-sm">{options.length + 1}.</span>
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
    </div>
  );
}
