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
import { ArrowLeft, Loader2, Plus, Save, Users } from "lucide-react";

import type {
  FormType,
  InstructionValidator,
  QuestionValidator,
} from "@forge/consts/knight-hacks";
import { Button } from "@forge/ui/button";
import { Card } from "@forge/ui/card";
import { Checkbox } from "@forge/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { Switch } from "@forge/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@forge/ui/tabs";
import { Textarea } from "@forge/ui/textarea";

import type { MatchingType } from "./linker";
import type { ProcedureMeta } from "~/lib/utils";
import { InstructionEditCard } from "~/components/admin/forms/instruction-edit-card";
import { QuestionEditCard } from "~/components/admin/forms/question-edit-card";
import { api } from "~/trpc/react";
import { ConnectionViewer } from "./con-viewer";
import ListMatcher from "./linker";

type FormQuestion = z.infer<typeof QuestionValidator>;
type FormInstruction = z.infer<typeof InstructionValidator>;
type UIQuestion = FormQuestion & { id: string };
type UIInstruction = FormInstruction & { id: string };

function SortableItem({
  item,
  isActive,
  formId,
  onUpdateQuestion,
  onUpdateInstruction,
  onDelete,
  onDuplicateQuestion,
  onDuplicateInstruction,
  onClick,
  onForceSave,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  error,
}: {
  item: UIQuestion | UIInstruction;
  isActive: boolean;
  formId: string;
  onUpdateQuestion: (q: UIQuestion) => void;
  onUpdateInstruction: (i: UIInstruction) => void;
  onDelete: (id: string) => void;
  onDuplicateQuestion: (q: UIQuestion) => void;
  onDuplicateInstruction: (i: UIInstruction) => void;
  onClick: () => void;
  onForceSave: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  error?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isActive ? 10 : 1,
  };

  const isInstruction = "title" in item;

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        {isInstruction ? (
          <InstructionEditCard
            instruction={item}
            formId={formId}
            onUpdate={onUpdateInstruction}
            onDelete={onDelete}
            onDuplicate={onDuplicateInstruction}
            dragHandleProps={listeners}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
          />
        ) : (
          <QuestionEditCard
            question={item}
            isActive={isActive}
            onUpdate={onUpdateQuestion}
            onDelete={onDelete}
            onDuplicate={onDuplicateQuestion}
            onForceSave={onForceSave}
            error={error}
            dragHandleProps={listeners}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
          />
        )}
      </div>
    </div>
  );
}

function ConnectionsTab(props: {
  procs: Record<string, ProcedureMeta>;
  slug: string;
  id: string;
  formData: FormType;
}) {
  const questions = props.formData.questions.map((q) => q.question);
  const { data: connections } = api.forms.getConnections.useQuery({
    id: props.id,
  });
  return (
    <>
      <ListMatcher procs={props.procs} form={{ questions, id: props.id }} />
      {connections?.map((con) => {
        return (
          <ConnectionViewer
            key={con.id}
            form_slug={props.slug}
            matching={con as MatchingType & { id: string }}
          />
        );
      })}
    </>
  );
}

export function EditorClient({
  procs,
  slug,
}: {
  procs: Record<string, ProcedureMeta>;
  slug: string;
}) {
  const router = useRouter();

  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formBanner, setFormBanner] = useState("");
  const [questions, setQuestions] = useState<UIQuestion[]>([]);
  const [instructions, setInstructions] = useState<UIInstruction[]>([]);
  const [duesOnly, setDuesOnly] = useState(false);
  const [allowResubmission, setAllowResubmission] = useState(true);
  const [allowEdit, setAllowEdit] = useState(true);
  const [responseRoleIds, setResponseRoleIds] = useState<string[]>([]);
  const [responseRolesDialogOpen, setResponseRolesDialogOpen] = useState(false);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

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

  const { data: allRoles = [] } = api.roles.getAllLinks.useQuery();

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

    // Check for duplicate question names
    const questionNames = new Set<string>();
    const hasDuplicates = questions.some((q) => {
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
        instructions: instructions.map(
          ({ id: _, imageUrl: _imageUrl, videoUrl: _videoUrl, ...rest }) =>
            rest,
        ),
      },
      duesOnly,
      allowResubmission,
      allowEdit,
      responseRoleIds,
    } as any);
  }, [
    formTitle,
    formDescription,
    formBanner,
    questions,
    instructions,
    duesOnly,
    allowResubmission,
    allowEdit,
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
        setAllowEdit(formData.allowEdit);
        setResponseRoleIds((formData as any).responseRoleIds || []);

        const loadedQuestions: UIQuestion[] = formData.formData.questions.map(
          (q: FormQuestion & { order?: number }) => ({
            ...q,
            id: crypto.randomUUID(),
          }),
        );

        /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
        const loadedInstructions: UIInstruction[] = (
          (formData.formData as any).instructions || []
        ).map((inst: FormInstruction & { order?: number }) => ({
          ...inst,
          id: crypto.randomUUID(),
        }));
        /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

        setQuestions(loadedQuestions);
        setInstructions(loadedInstructions);
        setIsLoading(false);
      }
    }
  }, [formData, fetchError, isFetching, slug, router]);

  // auto save trigger when toggle switches are changed
  useEffect(() => {
    if (!isLoading) handleSaveForm();
  }, [duesOnly, allowResubmission, responseRoleIds, isLoading]); // removed handleSaveForm to prevent save-on-every-render

  // auto save when finishing editing an item (changing active card)
  useEffect(() => {
    if (!isLoading) handleSaveForm();
  }, [activeItemId, isLoading]); // triggers when switching items or clicking off

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

  const updateQuestion = React.useCallback((updated: UIQuestion) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === updated.id ? updated : q)),
    );
  }, []);

  const updateInstruction = React.useCallback((updated: UIInstruction) => {
    setInstructions((prev) =>
      prev.map((i) => (i.id === updated.id ? updated : i)),
    );
  }, []);

  const deleteItem = React.useCallback(
    (id: string) => {
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      setInstructions((prev) => prev.filter((i) => i.id !== id));
      if (activeItemId === id) setActiveItemId(null);
    },
    [activeItemId],
  );

  const duplicateQuestion = React.useCallback(
    (q: UIQuestion) => {
      const newId = crypto.randomUUID();
      const order = questions.length + instructions.length;
      setQuestions((prev) => [...prev, { ...q, id: newId, order }]);
      setActiveItemId(newId);
    },
    [questions.length, instructions.length],
  );

  const duplicateInstruction = React.useCallback(
    (inst: UIInstruction) => {
      const newId = crypto.randomUUID();
      const order = questions.length + instructions.length;
      setInstructions((prev) => [...prev, { ...inst, id: newId, order }]);
      setActiveItemId(newId);
    },
    [questions.length, instructions.length],
  );

  const addQuestion = () => {
    const newId = crypto.randomUUID();
    const order = questions.length + instructions.length;
    setQuestions((prev) => [
      ...prev,
      {
        id: newId,
        question: "New Question",
        type: "SHORT_ANSWER",
        optional: true,
        order,
      },
    ]);
    setActiveItemId(newId);
  };

  const addInstruction = () => {
    const newId = crypto.randomUUID();
    const order = questions.length + instructions.length;
    setInstructions((prev) => [
      ...prev,
      {
        id: newId,
        title: "Instruction Title",
        content: "",
        order,
      },
    ]);
    setActiveItemId(newId);
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const reorderItems = React.useCallback(
    (itemId: string, direction: "up" | "down") => {
      const combined = [...questions, ...instructions].sort(
        (a, b) => (a.order ?? 999) - (b.order ?? 999),
      );
      const currentIndex = combined.findIndex((item) => item.id === itemId);

      if (currentIndex === -1) return;

      const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

      if (newIndex < 0 || newIndex >= combined.length) return;

      const reordered = arrayMove(combined, currentIndex, newIndex);

      // Update order and split back into separate arrays
      const updatedItems = reordered.map((item, idx) => ({
        ...item,
        order: idx,
      }));
      const newQuestions: UIQuestion[] = [];
      const newInstructions: UIInstruction[] = [];

      updatedItems.forEach((item) => {
        if ("question" in item) {
          newQuestions.push(item as UIQuestion);
        } else {
          newInstructions.push(item as UIInstruction);
        }
      });

      setQuestions(newQuestions);
      setInstructions(newInstructions);
      setTimeout(() => handleSaveForm(), 100);
    },
    [questions, instructions, handleSaveForm],
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      // Combine for reordering
      const combined = [...questions, ...instructions];
      const oldIndex = combined.findIndex((item) => item.id === active.id);
      const newIndex = combined.findIndex((item) => item.id === over.id);
      const reordered = arrayMove(combined, oldIndex, newIndex);

      // Update order and split back into separate arrays
      const updatedItems = reordered.map((item, idx) => ({
        ...item,
        order: idx,
      }));
      const newQuestions: UIQuestion[] = [];
      const newInstructions: UIInstruction[] = [];

      updatedItems.forEach((item) => {
        if ("question" in item) {
          newQuestions.push(item as UIQuestion);
        } else {
          newInstructions.push(item as UIInstruction);
        }
      });

      setQuestions(newQuestions);
      setInstructions(newInstructions);
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
      className="min-h-screen bg-primary/5 px-3 py-8 pb-32 md:px-8"
      onClick={() => setActiveItemId(null)}
    >
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex flex-col gap-3 rounded-xl border bg-card/50 p-3 shadow-sm backdrop-blur-sm md:flex-row md:items-center md:justify-between md:gap-4 md:p-4">
          <div className="flex items-center gap-3 md:gap-4">
            <Button
              variant="primary"
              size="icon"
              onClick={() => router.push("/admin/forms")}
              aria-label="Back to forms"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="icon"
                onClick={handleSaveForm}
                aria-label="Save form"
              >
                <Save className="h-3 w-3" />
              </Button>
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {saveStatus || "Synced with Database"}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6 lg:gap-3">
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
            <div className="flex items-center gap-3">
              <Switch
                id="allow-resubmit"
                checked={allowEdit}
                onCheckedChange={setAllowEdit}
              />
              <Label
                htmlFor="allow-edit"
                className="cursor-pointer text-sm font-bold"
              >
                Allow Response Edit
              </Label>
            </div>
            <Dialog
              open={responseRolesDialogOpen}
              onOpenChange={setResponseRolesDialogOpen}
            >
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Users className="h-4 w-4" />
                  Response Roles
                  {responseRoleIds.length > 0 && (
                    <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                      {responseRoleIds.length}
                    </span>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Configure Response Roles</DialogTitle>
                  <DialogDescription>
                    Select which roles can respond to this form. If no roles are
                    selected, anyone can respond.
                  </DialogDescription>
                </DialogHeader>
                <div className="max-h-[400px] overflow-y-auto py-4">
                  <div className="space-y-3">
                    {allRoles.map((role) => {
                      const isSelected = responseRoleIds.includes(role.id);
                      return (
                        <div
                          key={role.id}
                          className="flex items-center gap-3 rounded-md border p-3 hover:bg-muted/50"
                        >
                          <Checkbox
                            id={`role-${role.id}`}
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setResponseRoleIds([
                                  ...responseRoleIds,
                                  role.id,
                                ]);
                              } else {
                                setResponseRoleIds(
                                  responseRoleIds.filter(
                                    (id) => id !== role.id,
                                  ),
                                );
                              }
                            }}
                          />
                          <Label
                            htmlFor={`role-${role.id}`}
                            className="flex-1 cursor-pointer text-sm font-normal"
                          >
                            {role.name}
                          </Label>
                        </div>
                      );
                    })}
                    {allRoles.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No roles available. Create roles first.
                      </p>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setResponseRoleIds([])}
                  >
                    Clear All
                  </Button>
                  <Button onClick={() => setResponseRolesDialogOpen(false)}>
                    Done
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="overflow-hidden border-t-[12px] border-t-primary bg-card shadow-lg transition-all">
          <div className="flex flex-col gap-2 px-4 py-8 md:px-8">
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

        <Tabs defaultValue="questions" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="connections">Connections</TabsTrigger>
          </TabsList>

          <TabsContent value="questions" className="mt-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={[...questions, ...instructions]}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {[...questions, ...instructions]
                    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
                    .map((item, index, sortedArray) => {
                      const isInstruction = "title" in item;
                      const canMoveUp = index > 0;
                      const canMoveDown = index < sortedArray.length - 1;
                      return (
                        <div
                          key={item.id}
                          className={isInstruction ? "mt-8" : ""}
                        >
                          <SortableItem
                            item={item}
                            isActive={activeItemId === item.id}
                            formId={formData?.id ?? ""}
                            onUpdateQuestion={updateQuestion}
                            onUpdateInstruction={updateInstruction}
                            onDelete={deleteItem}
                            onDuplicateQuestion={duplicateQuestion}
                            onDuplicateInstruction={duplicateInstruction}
                            onClick={() => setActiveItemId(item.id)}
                            onForceSave={handleSaveForm}
                            onMoveUp={() => reorderItems(item.id, "up")}
                            onMoveDown={() => reorderItems(item.id, "down")}
                            canMoveUp={canMoveUp}
                            canMoveDown={canMoveDown}
                            error={
                              !isInstruction && duplicateIds.has(item.id)
                                ? "Duplicate question title"
                                : undefined
                            }
                          />
                        </div>
                      );
                    })}
                </div>
              </SortableContext>
            </DndContext>

            <div className="flex flex-col justify-center gap-3 pt-8 md:flex-row md:gap-4">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  addQuestion();
                }}
                size="lg"
                className="h-14 rounded-full px-6 text-lg font-bold shadow-2xl transition-all hover:scale-105 active:scale-95 md:px-10"
              >
                <Plus className="mr-3 h-6 w-6" /> Add Question
              </Button>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  addInstruction();
                }}
                size="lg"
                variant="secondary"
                className="h-14 rounded-full px-6 text-lg font-bold shadow-2xl transition-all hover:scale-105 active:scale-95 md:px-10"
              >
                <Plus className="mr-3 h-6 w-6" /> Add Instruction
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="connections" className="mt-4">
            {formData && (
              <ConnectionsTab
                slug={formData.slugName}
                procs={procs}
                id={formData.id}
                formData={formData.formData}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
