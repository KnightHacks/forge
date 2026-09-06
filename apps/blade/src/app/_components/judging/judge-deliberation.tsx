"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import { useEffect, useState } from "react";
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
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  ListOrdered,
  Plus,
  Trash2,
} from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
import { Input } from "@forge/ui/input";
import { ResponsiveComboBox } from "@forge/ui/responsive-combo-box";
import { toast } from "@forge/ui/toast";

import { useNavigationRouter as useRouter } from "~/app/_components/shared/route-transition-link";
import { api } from "~/trpc/react";

type Workspace = RouterOutputs["judging"]["getWorkspace"];
type Section = RouterOutputs["judging"]["listMyDeliberation"][number];
type Submission = RouterOutputs["judging"]["listMySubmissions"][number];

function SortableProject({
  disabled,
  entry,
  index,
  onMove,
  onRemove,
  sectionId,
  total,
}: {
  disabled: boolean;
  entry: Section["entries"][number];
  index: number;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  sectionId: string;
  total: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      data: { sectionId, type: "project" },
      disabled,
      id: entry.id,
    });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <li
      className="flex items-center gap-2 rounded-md border border-white/10 bg-background/60 p-2"
      ref={setNodeRef}
      style={style}
    >
      <button
        aria-label={`Reorder ${entry.title}`}
        className="flex size-11 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        type="button"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" aria-hidden="true" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{entry.title}</p>
        {!entry.available ? (
          <p className="text-xs text-muted-foreground">Project unavailable</p>
        ) : null}
      </div>
      <Button
        aria-label={`Move ${entry.title} up`}
        className="size-11 shrink-0"
        disabled={disabled || index === 0}
        onClick={() => onMove(-1)}
        size="icon"
        type="button"
        variant="ghost"
      >
        <ArrowUp className="size-4" aria-hidden="true" />
      </Button>
      <Button
        aria-label={`Move ${entry.title} down`}
        className="size-11 shrink-0"
        disabled={disabled || index === total - 1}
        onClick={() => onMove(1)}
        size="icon"
        type="button"
        variant="ghost"
      >
        <ArrowDown className="size-4" aria-hidden="true" />
      </Button>
      <Button
        aria-label={`Remove ${entry.title} from section`}
        className="size-11 shrink-0"
        disabled={disabled}
        onClick={onRemove}
        size="icon"
        type="button"
        variant="ghost"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </Button>
    </li>
  );
}

function SortableSection({
  disabled,
  onAdd,
  onDelete,
  onMoveEntry,
  onMoveSection,
  onRemove,
  onRename,
  section,
  sectionIndex,
  sectionTotal,
  submissions,
}: {
  disabled: boolean;
  onAdd: (projectId: string) => void;
  onDelete: () => void;
  onMoveEntry: (entryId: string, direction: -1 | 1) => void;
  onMoveSection: (direction: -1 | 1) => void;
  onRemove: (projectId: string) => void;
  onRename: (name: string) => void;
  section: Section;
  sectionIndex: number;
  sectionTotal: number;
  submissions: Submission[];
}) {
  const [name, setName] = useState(section.name);
  const [projectId, setProjectId] = useState("");
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      data: { type: "section" },
      disabled,
      id: section.id,
    });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const available = Array.from(
    new Map(
      submissions
        .filter(
          (submission) =>
            submission.projectAvailable &&
            !section.entries.some(
              (entry) => entry.projectId === submission.projectId,
            ),
        )
        .map((submission) => [submission.projectId, submission]),
    ).values(),
  );
  return (
    <article
      className="rounded-lg border border-white/10 bg-card/95 shadow-xl shadow-black/15"
      ref={setNodeRef}
      style={style}
    >
      <header className="flex flex-wrap items-center gap-2 border-b border-border/70 p-3 sm:p-4">
        <button
          aria-label={`Reorder ${section.name} section`}
          className="flex size-11 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
          type="button"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" aria-hidden="true" />
        </button>
        <Input
          aria-label="Section name"
          className="h-11 min-w-44 flex-1"
          disabled={disabled}
          maxLength={80}
          onChange={(event) => setName(event.target.value)}
          value={name}
        />
        <Button
          className="h-11"
          disabled={disabled || !name.trim() || name.trim() === section.name}
          onClick={() => onRename(name)}
          size="sm"
          type="button"
          variant="outline"
        >
          Save name
        </Button>
        <Button
          aria-label={`Move ${section.name} section up`}
          className="size-11 shrink-0"
          disabled={disabled || sectionIndex === 0}
          onClick={() => onMoveSection(-1)}
          size="icon"
          type="button"
          variant="ghost"
        >
          <ArrowUp className="size-4" aria-hidden="true" />
        </Button>
        <Button
          aria-label={`Move ${section.name} section down`}
          className="size-11 shrink-0"
          disabled={disabled || sectionIndex === sectionTotal - 1}
          onClick={() => onMoveSection(1)}
          size="icon"
          type="button"
          variant="ghost"
        >
          <ArrowDown className="size-4" aria-hidden="true" />
        </Button>
        <Button
          aria-label={`Delete ${section.name} section`}
          className="size-11 shrink-0"
          disabled={disabled}
          onClick={onDelete}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </Button>
      </header>
      <div className="space-y-3 p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="min-w-0 flex-1">
            <ResponsiveComboBox
              ariaLabel={`Add a judged project to ${section.name}`}
              buttonPlaceholder="Select a judged project"
              emptyMessage="No judged projects found."
              getItemLabel={(submission) => submission.projectTitle}
              getItemSearchValue={(submission) => submission.projectTitle}
              getItemValue={(submission) => submission.projectId}
              inputPlaceholder="Search judged projects"
              isDisabled={disabled || available.length === 0}
              items={available}
              onValueChange={(value) => setProjectId(value)}
              renderItem={(submission) => (
                <span className="truncate">{submission.projectTitle}</span>
              )}
              triggerClassName="h-11"
              value={projectId || null}
            />
          </div>
          <Button
            className="h-11"
            disabled={disabled || !projectId}
            onClick={() => {
              onAdd(projectId);
              setProjectId("");
            }}
            type="button"
          >
            <Plus className="mr-2 size-4" aria-hidden="true" /> Add project
          </Button>
        </div>
        {section.entries.length ? (
          <SortableContext
            items={section.entries.map((entry) => entry.id)}
            strategy={verticalListSortingStrategy}
          >
            <ol className="space-y-2">
              {section.entries.map((entry, index) => (
                <SortableProject
                  disabled={disabled}
                  entry={entry}
                  index={index}
                  key={entry.id}
                  onMove={(direction) => onMoveEntry(entry.id, direction)}
                  onRemove={() => onRemove(entry.projectId)}
                  sectionId={section.id}
                  total={section.entries.length}
                />
              ))}
            </ol>
          </SortableContext>
        ) : (
          <p className="rounded-md border border-dashed border-white/15 px-4 py-8 text-center text-sm text-muted-foreground">
            Add projects you have judged, then rank them for deliberation.
          </p>
        )}
      </div>
    </article>
  );
}

export function JudgeDeliberation({
  initialSections,
  submissions,
  workspace,
}: {
  initialSections: Section[];
  submissions: Submission[];
  workspace: Workspace;
}) {
  const router = useRouter();
  const [sections, setSections] = useState(initialSections);
  const [name, setName] = useState("");
  const [deleteSection, setDeleteSection] = useState<Section | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const create = api.judging.createDeliberationSection.useMutation();
  const rename = api.judging.renameDeliberationSection.useMutation();
  const removeSection = api.judging.deleteDeliberationSection.useMutation();
  const reorderSections = api.judging.reorderDeliberationSections.useMutation();
  const addProject = api.judging.addDeliberationProject.useMutation();
  const removeProject = api.judging.removeDeliberationProject.useMutation();
  const reorderProjects = api.judging.reorderDeliberationProjects.useMutation();
  const disabled = workspace.state !== "open";

  useEffect(() => {
    setSections(initialSections);
  }, [initialSections]);

  async function refreshMutation(
    action: () => Promise<unknown>,
    message: string,
  ) {
    try {
      setMutationError(null);
      await action();
      toast.success(message);
      router.refresh();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Update failed.";
      setMutationError(message);
      toast.error(message);
      setSections(initialSections);
      return false;
    }
  }

  function saveSectionOrder(next: Section[]) {
    setSections(next);
    void refreshMutation(
      () =>
        reorderSections.mutateAsync({
          hackathonId: workspace.hackathonId,
          ids: next.map((section) => section.id),
        }),
      "Section order saved.",
    );
  }

  function saveEntryOrder(sectionId: string, entries: Section["entries"]) {
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId ? { ...section, entries } : section,
      ),
    );
    void refreshMutation(
      () =>
        reorderProjects.mutateAsync({
          hackathonId: workspace.hackathonId,
          ids: entries.map((entry) => entry.id),
          sectionId,
        }),
      "Project order saved.",
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    const activeData = event.active.data.current as
      | { sectionId?: string; type?: unknown }
      | undefined;
    const overData = event.over.data.current as
      | { sectionId?: string }
      | undefined;
    const type = activeData?.type;
    if (type === "section") {
      const from = sections.findIndex(
        (section) => section.id === event.active.id,
      );
      const to = sections.findIndex((section) => section.id === event.over?.id);
      if (from >= 0 && to >= 0) saveSectionOrder(arrayMove(sections, from, to));
      return;
    }
    const sectionId = activeData?.sectionId;
    const overSectionId = overData?.sectionId;
    if (!sectionId || sectionId !== overSectionId) return;
    const section = sections.find((candidate) => candidate.id === sectionId);
    if (!section) return;
    const from = section.entries.findIndex(
      (entry) => entry.id === event.active.id,
    );
    const to = section.entries.findIndex(
      (entry) => entry.id === event.over?.id,
    );
    if (from >= 0 && to >= 0) {
      saveEntryOrder(sectionId, arrayMove(section.entries, from, to));
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-primary/20 bg-primary/5 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <ListOrdered
            className="mt-0.5 size-5 text-primary"
            aria-hidden="true"
          />
          <div>
            <h2 className="font-semibold">Your private scratch space</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              Group projects you have judged and rank them before award
              deliberation. Your sections are private and never change a saved
              score.
            </p>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-2 rounded-lg border border-white/10 bg-card/95 p-3 sm:flex-row sm:p-4">
        <Input
          aria-label="New deliberation section name"
          className="h-11 flex-1"
          disabled={disabled}
          maxLength={80}
          onChange={(event) => setName(event.target.value)}
          placeholder="Section name, such as Best demos"
          value={name}
        />
        <Button
          className="h-11"
          disabled={disabled || !name.trim() || create.isPending}
          onClick={() => {
            void refreshMutation(
              () =>
                create.mutateAsync({
                  hackathonId: workspace.hackathonId,
                  name: name.trim(),
                }),
              "Section created.",
            ).then((saved) => saved && setName(""));
          }}
          type="button"
        >
          <Plus className="mr-2 size-4" aria-hidden="true" /> Create section
        </Button>
      </section>

      {mutationError ? (
        <p
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {mutationError}
        </p>
      ) : null}

      {disabled ? (
        <p className="rounded-md border border-white/10 bg-card/75 p-3 text-sm text-muted-foreground">
          Deliberation lists are read-only while judging is {workspace.state}.
        </p>
      ) : null}

      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        sensors={sensors}
      >
        <SortableContext
          items={sections.map((section) => section.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {sections.map((section, sectionIndex) => (
              <SortableSection
                disabled={disabled}
                key={section.id}
                onAdd={(projectId) =>
                  void refreshMutation(
                    () =>
                      addProject.mutateAsync({
                        hackathonId: workspace.hackathonId,
                        projectId,
                        sectionId: section.id,
                      }),
                    "Project added.",
                  )
                }
                onDelete={() => setDeleteSection(section)}
                onMoveEntry={(entryId, direction) => {
                  const index = section.entries.findIndex(
                    (entry) => entry.id === entryId,
                  );
                  const target = index + direction;
                  if (
                    index >= 0 &&
                    target >= 0 &&
                    target < section.entries.length
                  ) {
                    saveEntryOrder(
                      section.id,
                      arrayMove(section.entries, index, target),
                    );
                  }
                }}
                onMoveSection={(direction) => {
                  const target = sectionIndex + direction;
                  if (target >= 0 && target < sections.length) {
                    saveSectionOrder(arrayMove(sections, sectionIndex, target));
                  }
                }}
                onRemove={(projectId) =>
                  void refreshMutation(
                    () =>
                      removeProject.mutateAsync({
                        hackathonId: workspace.hackathonId,
                        projectId,
                        sectionId: section.id,
                      }),
                    "Project removed.",
                  )
                }
                onRename={(nextName) =>
                  void refreshMutation(
                    () =>
                      rename.mutateAsync({
                        hackathonId: workspace.hackathonId,
                        name: nextName.trim(),
                        sectionId: section.id,
                      }),
                    "Section renamed.",
                  )
                }
                section={section}
                sectionIndex={sectionIndex}
                sectionTotal={sections.length}
                submissions={submissions}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {sections.length === 0 ? (
        <section className="rounded-lg border border-dashed border-white/15 bg-card/70 px-5 py-14 text-center">
          <h2 className="text-lg font-semibold">No deliberation sections</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            Create a section, then add projects from your judging history.
          </p>
        </section>
      ) : null}

      <Dialog
        onOpenChange={(open) => !open && setDeleteSection(null)}
        open={deleteSection !== null}
      >
        <DialogContent className="w-[calc(100%-1rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {deleteSection?.name}?</DialogTitle>
            <DialogDescription>
              This removes the section and its ranked project list. Your saved
              evaluations are not affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              className="h-11"
              onClick={() => setDeleteSection(null)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className="h-11"
              disabled={removeSection.isPending}
              onClick={() => {
                if (!deleteSection) return;
                const sectionId = deleteSection.id;
                void refreshMutation(
                  () =>
                    removeSection.mutateAsync({
                      hackathonId: workspace.hackathonId,
                      sectionId,
                    }),
                  "Section deleted.",
                ).then((deleted) => deleted && setDeleteSection(null));
              }}
              type="button"
              variant="destructive"
            >
              {removeSection.isPending ? "Deleting..." : "Delete section"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
