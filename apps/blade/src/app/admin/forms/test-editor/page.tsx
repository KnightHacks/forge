"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import type { CSSProperties } from "react";
import type { z } from "zod";
import { useState } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus } from "lucide-react";

import type { QuestionValidator } from "@forge/consts/knight-hacks";
import { Button } from "@forge/ui/button";
import { Card } from "@forge/ui/card";
import { Input } from "@forge/ui/input";
import { Textarea } from "@forge/ui/textarea";

import { QuestionEditCard } from "~/components/admin/forms/question-edit-card";

type FormQuestion = z.infer<typeof QuestionValidator>;
type UIQuestion = FormQuestion & { id: string };

// Wrapper for Sortable item
function SortableQuestion({
  question,
  isActive,
  onUpdate,
  onDelete,
  onDuplicate,
  onClick,
}: {
  question: UIQuestion;
  isActive: boolean;
  onUpdate: (q: UIQuestion) => void;
  onDelete: (id: string) => void;
  onDuplicate: (q: FormQuestion) => void;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: question.id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div onClick={onClick}>
        <QuestionEditCard
          question={question}
          isActive={isActive}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          dragHandleProps={listeners}
        />
      </div>
    </div>
  );
}

export default function FormEditorPage() {
  const [questions, setQuestions] = useState<UIQuestion[]>([
    {
      id: crypto.randomUUID(),
      question: "Untitled Question",
      type: "SHORT_ANSWER",
      optional: true,
    },
  ]);

  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setQuestions((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addQuestion = () => {
    const newId = crypto.randomUUID();
    const newQuestion: UIQuestion = {
      id: newId,
      question: "Untitled Question",
      type: "SHORT_ANSWER",
      optional: true,
    };
    setQuestions([...questions, newQuestion]);
    setActiveQuestionId(newId);
  };

  const updateQuestion = (updatedQ: UIQuestion) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === updatedQ.id ? updatedQ : q)),
    );
  };

  const deleteQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    if (activeQuestionId === id) {
      setActiveQuestionId(null);
    }
  };

  const duplicateQuestion = (q: FormQuestion) => {
    const newId = crypto.randomUUID();
    const newQ = { ...q, id: newId };
    setQuestions((prev) => [...prev, newQ]);
    setActiveQuestionId(newId);
  };

  return (
    <div className="min-h-screen bg-primary/5 p-8 pb-32">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Form Title Card */}
        <Card className="border-t-[10px] border-t-primary bg-card shadow-sm">
          <div className="flex flex-col gap-4 p-6">
            <Input
              className="border-none px-0 text-3xl font-bold focus-visible:ring-0 md:text-4xl"
              placeholder="Form Title"
              defaultValue="Untitled Form"
            />
            <Textarea
              className="resize-none border-none px-0 text-base text-muted-foreground focus-visible:ring-0"
              placeholder="Form description"
              defaultValue="Form description goes here"
            />
          </div>
        </Card>

        {/* Questions List */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={questions}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {questions.map((q) => (
                <SortableQuestion
                  key={q.id}
                  question={q}
                  isActive={activeQuestionId === q.id}
                  onUpdate={updateQuestion}
                  onDelete={deleteQuestion}
                  onDuplicate={duplicateQuestion}
                  onClick={() => setActiveQuestionId(q.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="flex justify-center pt-4">
          <Button
            onClick={addQuestion}
            size="lg"
            className="gap-2 rounded-full shadow-lg transition-all hover:-translate-y-0.5"
          >
            <Plus className="h-5 w-5" />
            Add Question
          </Button>
        </div>
      </div>
    </div>
  );
}
