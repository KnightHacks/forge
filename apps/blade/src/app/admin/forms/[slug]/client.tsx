"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import type { CSSProperties } from "react";
import type * as z from "zod";
import * as React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Loader2, Plus, Save } from "lucide-react";

import type { QuestionValidator } from "@forge/consts/knight-hacks";
import { Button } from "@forge/ui/button";
import { Card } from "@forge/ui/card";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { Switch } from "@forge/ui/switch";
import { Textarea } from "@forge/ui/textarea";

import { QuestionEditCard } from "~/components/admin/forms/question-edit-card";
import { api } from "~/trpc/react";

type FormQuestion = z.infer<typeof QuestionValidator>;
type UIQuestion = FormQuestion & { id: string };

function SortableQuestion({
  question,
  isActive,
  onUpdate,
  onDelete,
  onDuplicate,
  onClick,
  onForceSave,
  error,
}: {
  question: UIQuestion;
  isActive: boolean;
  onUpdate: (q: UIQuestion) => void;
  onDelete: (id: string) => void;
  onDuplicate: (q: FormQuestion) => void;
  onClick: () => void;
  onForceSave: () => void;
  error?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: question.id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isActive ? 10 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <QuestionEditCard
          question={question}
          isActive={isActive}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onForceSave={onForceSave}
          error={error}
          dragHandleProps={listeners}
        />
      </div>
    </div>
  );
}

export function EditorClient({ slug }: { slug: string }) {
  const router = useRouter();

  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formBanner, setFormBanner] = useState("");
  const [questions, setQuestions] = useState<UIQuestion[]>([]);
  const [duesOnly, setDuesOnly] = useState(false);
  const [allowResubmission, setAllowResubmission] = useState(true);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<string>("");

  const {
    data: formData,
    error: fetchError,
    isLoading: isFetching,
  } = api.forms.getForm.useQuery(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    { slug_name: slug } as any,
    { retry: false, refetchOnWindowFocus: false },
  );

  const updateFormMutation = api.forms.updateForm.useMutation({
    onMutate: () => setSaveStatus("Saving..."),
    onSuccess: () =>
      setSaveStatus(`Saved at ${new Date().toLocaleTimeString()}`),
    onError: () => setSaveStatus("Error saving changes."),
  });

  const handleSaveForm = React.useCallback(() => {
    if (isLoading || isFetching || !formTitle) return;

    // Allow mock mode to proceed without real formData
    if (!formData && slug !== "test-form") return;

    // Check for duplicate question names/titles to prevent backend/frontend collisions
    const questionNames = new Set<string>();
    const hasDuplicates = questions.some((q) => {
      // Logic handled in render now for visualization, but check here for save block
      if (questionNames.has(q.question)) return true;
      questionNames.add(q.question);
      return false;
    });

    if (hasDuplicates) {
      setSaveStatus("Error: Duplicate question titles");
      return;
    }

    // Mock save for UI testing
    if (slug === "test-form") {
      setSaveStatus(`Saved (Mock) at ${new Date().toLocaleTimeString()}`);
      return;
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    /* eslint-disable @typescript-eslint/no-unsafe-argument */
    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    updateFormMutation.mutate({
      id: (formData as any).id,
      formData: {
        name: formTitle,
        description: formDescription,
        banner: formBanner || undefined,
        questions: questions.map(({ id: _, ...rest }) => rest),
      },
      duesOnly,
      allowResubmission,
    } as any);
  }, [
    formTitle,
    formDescription,
    formBanner,
    questions,
    duesOnly,
    allowResubmission,
    formData,
    isLoading,
    isFetching,
    updateFormMutation,
    slug,
  ]);

  useEffect(() => {
    if (!isFetching) {
      if (fetchError || !formData) {
        if (slug === "test-form") {
          setFormTitle("Test Form (Mock)");
          setFormDescription(
            "This is a mock form description for testing UI components.",
          );
          setIsLoading(false);
          return;
        }
        router.push("/admin/forms");

        // Fallback (redundant due to push, but keeps logic structure)
        setFormTitle(slug);
        setIsLoading(false);
      } else {
        setFormTitle(formData.name);
        setFormDescription(formData.formData.description);
        setFormBanner(formData.formData.banner || "");
        setDuesOnly(formData.duesOnly);
        setAllowResubmission(formData.allowResubmission);

        const loadedQuestions = formData.formData.questions.map(
          (q: FormQuestion) => ({
            ...q,
            id: crypto.randomUUID(),
          }),
        );

        setQuestions(loadedQuestions as UIQuestion[]);
        setIsLoading(false);
      }
    }
  }, [formData, fetchError, isFetching, slug, router]);

  // auto save trigger when toggle switches are changed
  useEffect(() => {
    if (!isLoading) handleSaveForm();
  }, [duesOnly, allowResubmission, isLoading]); // removed handleSaveForm to prevent save-on-every-render

  // auto save when finishing editing a question (changing active card)
  useEffect(() => {
    if (!isLoading) handleSaveForm();
  }, [activeQuestionId, isLoading]); // triggers when switching questions or clicking off

  // Periodic auto-save every 40 seconds
  useEffect(() => {
    if (isLoading) return;

    const interval = setInterval(() => {
      handleSaveForm();
    }, 40000);

    return () => clearInterval(interval);
  }, [isLoading, handleSaveForm]);

  // Memoize duplicate detection for UI feedback
  const duplicateIds = React.useMemo(() => {
    const counts = new Map<string, number>();
    questions.forEach((q) => {
      counts.set(q.question, (counts.get(q.question) || 0) + 1);
    });

    const duplicates = new Set<string>();
    questions.forEach((q) => {
      if ((counts.get(q.question) || 0) > 1) {
        duplicates.add(q.id);
      }
    });
    return duplicates;
  }, [questions]);

  const updateQuestion = React.useCallback((updatedQ: UIQuestion) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === updatedQ.id ? updatedQ : q)),
    );
  }, []);

  const deleteQuestion = React.useCallback(
    (id: string) => {
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      if (activeQuestionId === id) setActiveQuestionId(null);
    },
    [activeQuestionId],
  );

  const duplicateQuestion = React.useCallback((q: FormQuestion) => {
    const newId = crypto.randomUUID();
    setQuestions((prev) => [...prev, { ...q, id: newId }]);
    setActiveQuestionId(newId);
  }, []);

  const addQuestion = () => {
    const newId = crypto.randomUUID();
    setQuestions((prev) => [
      ...prev,
      {
        id: newId,
        question: "New Question",
        type: "SHORT_ANSWER",
        optional: true,
      },
    ]);
    setActiveQuestionId(newId);
  };

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
      setTimeout(() => handleSaveForm(), 100);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="animate-pulse text-muted-foreground">Loading {slug}...</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-primary/5 p-8 pb-32"
      onClick={() => setActiveQuestionId(null)}
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-col items-center justify-between gap-4 rounded-xl border bg-card/50 p-4 shadow-sm backdrop-blur-sm md:flex-row">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <Save className="h-3 w-3" />
            {saveStatus || "Synced with Database"}
          </div>

          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <Switch
                id="dues-only"
                checked={duesOnly}
                onCheckedChange={setDuesOnly}
              />
              <Label
                htmlFor="dues-only"
                className="cursor-pointer text-sm font-bold"
              >
                Dues Only
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="allow-resubmit"
                checked={allowResubmission}
                onCheckedChange={setAllowResubmission}
              />
              <Label
                htmlFor="allow-resubmit"
                className="cursor-pointer text-sm font-bold"
              >
                Allow Multiple Responses
              </Label>
            </div>
          </div>
        </div>

        <Card className="overflow-hidden border-t-[12px] border-t-primary bg-card shadow-lg transition-all">
          <div className="flex flex-col gap-4 p-8">
            <Input
              className="h-auto border-none p-0 text-4xl font-extrabold focus-visible:ring-0"
              placeholder="Form Title"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              onBlur={handleSaveForm}
            />
            <Input
              className="border-none p-0 text-sm text-primary/60 focus-visible:ring-0"
              placeholder="Banner Image URL (https://...)"
              value={formBanner}
              onChange={(e) => setFormBanner(e.target.value)}
              onBlur={handleSaveForm}
            />
            <Textarea
              className="min-h-[80px] resize-none border-none p-0 text-lg focus-visible:ring-0"
              placeholder="What is this form about?"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              onBlur={handleSaveForm}
            />
          </div>
        </Card>

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
                  onForceSave={handleSaveForm}
                  error={
                    duplicateIds.has(q.id)
                      ? "Duplicate question title"
                      : undefined
                  }
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="flex justify-center pt-8">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              addQuestion();
            }}
            size="lg"
            className="h-14 rounded-full px-10 text-lg font-bold shadow-2xl transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="mr-3 h-6 w-6" /> Add New Question
          </Button>
        </div>
      </div>
    </div>
  );
}
