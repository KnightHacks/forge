"use client";

import type {
  DragEndEvent,
  SensorDescriptor,
  SensorOptions,
} from "@dnd-kit/core";
import type { Dispatch } from "react";
import { closestCenter, DndContext } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

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

import type { FormQuestionsAction } from "./form-questions-reducer";
import { changeQuestionType, newQuestion } from "./form-question-model";
import { QuestionSpecificEditor } from "./form-question-specific-editor";
import { SortableQuestionCard } from "./form-sortable-question-card";

const questionTypes = [
  ["short_text", "Short answer"],
  ["paragraph", "Paragraph"],
  ["multiple_choice", "Multiple choice"],
  ["checkboxes", "Checkboxes"],
  ["dropdown", "Dropdown"],
  ["file", "File upload"],
  ["linear_scale", "Linear scale"],
  ["date", "Date"],
  ["time", "Time"],
  ["email", "Email"],
  ["number", "Number"],
  ["phone", "Phone"],
  ["boolean", "Yes / no"],
  ["link", "Link"],
] as const;

/**
 * One question card's contents. This returns a fragment rather than a wrapper
 * because these four blocks are the direct children of the card's `grid gap-3`
 * article — an element around them would delete the gaps between them.
 */
function QuestionCardFields({
  dispatchQuestions,
  index,
  question,
  questionCount,
  readOnly,
}: {
  dispatchQuestions: Dispatch<FormQuestionsAction>;
  index: number;
  question: FormQuestion;
  questionCount: number;
  readOnly: boolean;
}) {
  function updateQuestion(id: string, patch: Partial<FormQuestion>) {
    dispatchQuestions({ id, patch, type: "patched" });
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    dispatchQuestions({ direction, index, type: "moved" });
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          Question {index + 1}
        </span>
        {!readOnly && (
          <div className="flex gap-1">
            <Button
              aria-label={`Move question ${index + 1} up`}
              disabled={index === 0}
              size="icon"
              variant="ghost"
              onClick={() => moveQuestion(index, -1)}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              aria-label={`Move question ${index + 1} down`}
              disabled={index === questionCount - 1}
              size="icon"
              variant="ghost"
              onClick={() => moveQuestion(index, 1)}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button
              aria-label={`Remove question ${index + 1}`}
              size="icon"
              variant="ghost"
              onClick={() =>
                dispatchQuestions({
                  id: question.id,
                  type: "removed",
                })
              }
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_14rem] md:items-end">
        <div className="grid min-w-0 gap-2">
          <Label htmlFor={`prompt-${question.id}`}>Prompt</Label>
          <Input
            disabled={readOnly}
            id={`prompt-${question.id}`}
            aria-label={`Question ${index + 1}`}
            className="h-11"
            value={question.prompt}
            onChange={(event) =>
              updateQuestion(question.id, {
                prompt: event.target.value,
              })
            }
          />
        </div>
        <div className="grid min-w-0 gap-2">
          <Label htmlFor={`type-${question.id}`}>Type</Label>
          <Select
            disabled={readOnly}
            value={question.type}
            onValueChange={(value) =>
              dispatchQuestions({
                question: changeQuestionType(
                  question,
                  value as FormQuestion["type"],
                ),
                type: "replaced",
              })
            }
          >
            <SelectTrigger
              aria-label={`Question ${index + 1} type`}
              className="h-11 w-full"
              id={`type-${question.id}`}
            >
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {questionTypes.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <QuestionSpecificEditor
        disabled={readOnly}
        onUpdate={(nextQuestion) =>
          dispatchQuestions({
            question: nextQuestion,
            type: "replaced",
          })
        }
        question={question}
      />
      <label className="flex min-h-11 items-center gap-3 border-t border-white/10 pt-2 text-sm">
        <input
          checked={question.required}
          disabled={readOnly}
          onChange={(event) =>
            updateQuestion(question.id, {
              required: event.target.checked,
            })
          }
          type="checkbox"
        />
        Required
      </label>
    </>
  );
}

export function FormBuilderQuestionsSection({
  dispatchQuestions,
  questionSensors,
  questions,
  readOnly,
}: {
  dispatchQuestions: Dispatch<FormQuestionsAction>;
  questionSensors: SensorDescriptor<SensorOptions>[];
  questions: FormQuestion[];
  readOnly: boolean;
}) {
  function handleQuestionDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    dispatchQuestions({
      activeId: String(active.id),
      overId: String(over.id),
      type: "reordered",
    });
  }

  return (
    <section className="min-w-0 rounded-lg border border-white/10 bg-card/95 p-4 shadow-xl shadow-black/20 sm:p-5">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Questions</h2>
          <p className="text-sm text-muted-foreground">
            Drag to reorder. Stable IDs keep answers attached while wording
            changes.
          </p>
        </div>
        {!readOnly && (
          <Button
            variant="outline"
            className="min-h-11 gap-2"
            onClick={() =>
              dispatchQuestions({
                question: newQuestion("short_text"),
                type: "added",
              })
            }
          >
            <Plus className="h-4 w-4" /> Add question
          </Button>
        )}
      </div>
      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={handleQuestionDragEnd}
        sensors={questionSensors}
      >
        <SortableContext
          items={questions.map(({ id }) => id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="mt-4 grid min-w-0 gap-3">
            {questions.length === 0 && (
              <p className="rounded-md border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground">
                Add the first question.
              </p>
            )}
            {questions.map((question, index) => (
              <SortableQuestionCard
                disabled={readOnly}
                id={question.id}
                index={index}
                key={question.id}
              >
                <QuestionCardFields
                  dispatchQuestions={dispatchQuestions}
                  index={index}
                  question={question}
                  questionCount={questions.length}
                  readOnly={readOnly}
                />
              </SortableQuestionCard>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
}
