"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckSquare2,
  Circle,
  FileUp,
  GripVertical,
  Loader2,
  MoreHorizontal,
  Plus,
  Save,
  Send,
  Settings2,
  Share2,
  Trash2,
  Workflow,
  X,
} from "lucide-react";

import type { FormDefinition, FormQuestion } from "@forge/validators";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";
import { Textarea } from "@forge/ui/textarea";
import {
  FORM_LINEAR_SCALE_ENDPOINT_MAX,
  FORM_LINEAR_SCALE_ENDPOINT_MIN,
  FORM_LINEAR_SCALE_MAX_SPAN,
  formDefinitionSchema,
} from "@forge/validators";

import { api } from "~/trpc/react";
import { FormShareActions } from "./form-share-actions";

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

function newQuestion(type: FormQuestion["type"]): FormQuestion {
  const base = {
    id: crypto.randomUUID(),
    prompt: "Untitled question",
    required: false,
    retired: false,
  };
  if (type === "short_text") return { ...base, maxLength: 500, type };
  if (type === "paragraph") return { ...base, maxLength: 5_000, type };
  if (type === "file") {
    return {
      ...base,
      allowedMimeTypes: ["application/pdf", "image/png", "image/jpeg"],
      maxBytes: 100 * 1024 * 1024,
      type,
    };
  }
  if (type === "linear_scale") return { ...base, max: 5, min: 1, type };
  if (type === "number") return { ...base, type };
  if (
    type === "multiple_choice" ||
    type === "checkboxes" ||
    type === "dropdown"
  ) {
    return {
      ...base,
      allowOther: false,
      manualOptions: [
        { id: crypto.randomUUID(), label: "Option 1", value: "option-1" },
      ],
      optionSource: "manual",
      presetCatalogId: null,
      type,
    };
  }
  return { ...base, type } as FormQuestion;
}

function changeQuestionType(
  question: FormQuestion,
  type: FormQuestion["type"],
): FormQuestion {
  const replacement = newQuestion(type);
  return {
    ...replacement,
    id: question.id,
    prompt: question.prompt,
    required: question.required,
    retired: question.retired,
  };
}

export function reorderFormQuestions(
  questions: FormQuestion[],
  activeId: string,
  overId: string,
) {
  const oldIndex = questions.findIndex(({ id }) => id === activeId);
  const newIndex = questions.findIndex(({ id }) => id === overId);
  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
    return questions;
  }
  return arrayMove(questions, oldIndex, newIndex);
}

function SortableQuestionCard({
  children,
  disabled = false,
  id,
  index,
}: {
  children: ReactNode;
  disabled?: boolean;
  id: string;
  index: number;
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ disabled, id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <article
      className="relative grid gap-3 rounded-md border border-white/10 bg-background/60 p-4 pl-12 data-[dragging=true]:border-primary/60 data-[dragging=true]:shadow-lg"
      data-dragging={isDragging}
      data-sortable-question={id}
      ref={setNodeRef}
      style={style}
    >
      <Button
        {...attributes}
        {...listeners}
        aria-label={`Drag question ${index + 1} to reorder`}
        className="absolute left-1 top-1 min-h-11 min-w-11 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
        disabled={disabled}
        size="icon"
        type="button"
        variant="ghost"
      >
        <GripVertical className="size-4" />
      </Button>
      {children}
    </article>
  );
}

type ChoiceQuestion = Extract<
  FormQuestion,
  { type: "checkboxes" | "dropdown" | "multiple_choice" }
>;

function focusOption(questionId: string, optionId: string) {
  requestAnimationFrame(() => {
    document.getElementById(`option-${questionId}-${optionId}`)?.focus();
  });
}

function newManualOption(label: string) {
  const id = crypto.randomUUID();
  return {
    id,
    label,
    value: toSlug(label) || `option-${id.slice(0, 8)}`,
  };
}

function ChoiceQuestionEditor({
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

function QuestionSpecificEditor({
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

  if (question.type === "number") {
    return (
      <div
        className="grid gap-3 rounded-md border border-white/10 bg-card/40 p-3 sm:grid-cols-2"
        data-question-editor="number"
      >
        <div className="grid gap-2">
          <Label htmlFor={`number-min-${question.id}`}>
            Minimum (optional)
          </Label>
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
          <Label htmlFor={`number-max-${question.id}`}>
            Maximum (optional)
          </Label>
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

  if (question.type === "short_text" || question.type === "paragraph") {
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

  if (question.type === "file") {
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
            <div
              className="flex items-center gap-2"
              key={`${mimeType}-${index}`}
            >
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

function toSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

interface BuilderInitial {
  closesAt: string | null;
  definition: FormDefinition;
  duesOnly: boolean;
  id: string;
  manuallyClosed: boolean;
  name: string;
  opensAt: string | null;
  responseMode: "multiple_locked" | "single_editable" | "single_locked";
  respondentRoleIds: string[];
  revision: number;
  sectionId: string;
  slugName: string;
  state: "archived" | "draft" | "published";
}

interface CallbackCatalogItem {
  available: boolean;
  description: string;
  label: string;
  requiredPermission: string;
  slug: string;
}

function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function formBuilderShareHref(
  pathname: string,
  currentSearch: string,
  open: boolean,
) {
  const next = new URLSearchParams(currentSearch);
  if (open) next.set("dialog", "share");
  else next.delete("dialog");
  const query = next.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function AdminFormBuilder({
  callbacks,
  configuredCallbacks = [],
  initial,
  readOnly = false,
  respondentRoles,
  sections,
}: {
  callbacks: CallbackCatalogItem[];
  configuredCallbacks?: { active: boolean; callbackSlug: string; id: string }[];
  initial?: BuilderInitial;
  readOnly?: boolean;
  respondentRoles: { id: string; name: string }[];
  sections: { id: string; name: string }[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTextInstruction = initial?.definition.instructions.find(
    (instruction) => instruction.type === "text",
  );
  const [textInstructionId] = useState(
    initialTextInstruction?.id ?? crypto.randomUUID(),
  );
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slugName ?? "");
  const [description, setDescription] = useState(
    initial?.definition.description ?? "",
  );
  const [instructions, setInstructions] = useState(
    initial?.definition.instructions
      .filter(
        (item): item is Extract<typeof item, { type: "text" }> =>
          item.type === "text",
      )
      .map((item) => item.body)
      .join("\n\n") ?? "",
  );
  const [mediaInstructions, setMediaInstructions] = useState<
    Extract<
      FormDefinition["instructions"][number],
      { type: "image" | "video" }
    >[]
  >(
    initial?.definition.instructions.filter(
      (
        item,
      ): item is Extract<
        FormDefinition["instructions"][number],
        { type: "image" | "video" }
      > => item.type === "image" || item.type === "video",
    ) ?? [],
  );
  const [questions, setQuestions] = useState<FormQuestion[]>(
    initial?.definition.questions ?? [],
  );
  const [revision, setRevision] = useState(initial?.revision ?? null);
  const [sectionId, setSectionId] = useState(
    initial?.sectionId ?? sections[0]?.id ?? "",
  );
  const [responseMode, setResponseMode] = useState<
    BuilderInitial["responseMode"]
  >(initial?.responseMode ?? "single_locked");
  const [duesOnly, setDuesOnly] = useState(initial?.duesOnly ?? false);
  const [respondentRoleIds, setRespondentRoleIds] = useState<string[]>(
    initial?.respondentRoleIds ?? [],
  );
  const [manuallyClosed, setManuallyClosed] = useState(
    initial?.manuallyClosed ?? false,
  );
  const [opensAt, setOpensAt] = useState(
    localDateTime(initial?.opensAt ?? null),
  );
  const [closesAt, setClosesAt] = useState(
    localDateTime(initial?.closesAt ?? null),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [callbackSlug, setCallbackSlug] = useState("discord.assign-role");
  const [callbackValue, setCallbackValue] = useState("");
  const [callbackQuestionId, setCallbackQuestionId] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [callbacksOpen, setCallbacksOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [respondentRoleSearch, setRespondentRoleSearch] = useState("");
  const questionSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const create = api.forms.createForm.useMutation();
  const update = api.forms.updateForm.useMutation();
  const updateSettings = api.forms.updateSettings.useMutation();
  const changeState = api.forms.changeState.useMutation();
  const deleteForm = api.forms.deleteForm.useMutation();
  const configureCallback = api.forms.configureCallback.useMutation();
  const disableCallback = api.forms.disableCallback.useMutation();
  const createUpload = api.forms.createUpload.useMutation();
  const finalizeUpload = api.forms.finalizeUpload.useMutation();
  const share = api.forms.getShareAssets.useQuery(
    { formId: initial?.id ?? "00000000-0000-0000-0000-000000000000" },
    { enabled: Boolean(initial?.id) },
  );
  const shareOpen = searchParams.get("dialog") === "share";

  useEffect(() => {
    setRevision(initial?.revision ?? null);
  }, [initial?.revision]);

  function setShareOpen(open: boolean) {
    router.replace(
      formBuilderShareHref(pathname, searchParams.toString(), open),
      { scroll: false },
    );
  }

  const definition: FormDefinition = {
    description,
    instructions: [
      ...(instructions.trim()
        ? [
            {
              body: instructions,
              id: textInstructionId,
              type: "text" as const,
            },
          ]
        : []),
      ...mediaInstructions,
    ],
    questions,
    title: name || "Untitled form",
  };

  function updateQuestion(id: string, patch: Partial<FormQuestion>) {
    setQuestions((current) =>
      current.map((question) =>
        question.id === id
          ? ({ ...question, ...patch } as FormQuestion)
          : question,
      ),
    );
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    setQuestions((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const question = next[index];
      const neighbor = next[target];
      if (!question || !neighbor) return current;
      next[index] = neighbor;
      next[target] = question;
      return next;
    });
  }

  function handleQuestionDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    setQuestions((current) =>
      reorderFormQuestions(current, String(active.id), String(over.id)),
    );
  }

  async function save() {
    if (readOnly) return;
    setMessage(null);
    const parsedDefinition = formDefinitionSchema.safeParse(definition);
    if (!parsedDefinition.success) {
      const issue = parsedDefinition.error.issues[0];
      setMessage(issue?.message ?? "Check the form questions and try again.");
      return;
    }
    const parsed = parsedDefinition.data;
    try {
      if (!initial) {
        const saved = await create.mutateAsync({
          closesAt: closesAt ? new Date(closesAt) : null,
          definition: parsed,
          duesOnly,
          name,
          opensAt: opensAt ? new Date(opensAt) : null,
          respondentRoleIds,
          responseMode,
          sectionId,
          slugName: slug || toSlug(name),
        });
        router.replace(`/admin/forms/${saved.id}`);
        router.refresh();
        return;
      }
      const saved = await update.mutateAsync({
        definition: parsed,
        expectedRevision: revision ?? initial.revision,
        formId: initial.id,
        name,
        ...(initial.state === "draft" ? { slugName: slug } : {}),
      });
      setRevision(saved.revision);
      try {
        await updateSettings.mutateAsync({
          closesAt: closesAt ? new Date(closesAt) : null,
          duesOnly,
          formId: initial.id,
          manuallyClosed,
          opensAt: opensAt ? new Date(opensAt) : null,
          respondentRoleIds,
          responseMode,
          sectionId,
        });
      } catch (cause) {
        setMessage(
          `Form content saved, but availability settings were not saved. ${
            cause instanceof Error ? cause.message : "Refresh and try again."
          }`,
        );
        router.refresh();
        return;
      }
      setMessage("Form saved.");
      router.refresh();
    } catch (cause) {
      setMessage(
        cause instanceof Error ? cause.message : "The form could not be saved.",
      );
    }
  }

  async function transition(targetState: "archived" | "published") {
    if (!initial || readOnly) return;
    try {
      const saved = await changeState.mutateAsync({
        expectedRevision: revision ?? initial.revision,
        formId: initial.id,
        targetState,
      });
      setRevision(saved.revision);
      router.refresh();
    } catch (cause) {
      setMessage(
        cause instanceof Error ? cause.message : "State change failed.",
      );
    }
  }

  async function addCallback() {
    if (!initial) return;
    const mappings =
      callbackSlug === "discord.assign-role"
        ? [
            {
              inputKey: "memberId",
              source: { kind: "system", value: "member_id" },
            },
            {
              inputKey: "roleId",
              source: { kind: "fixed", value: callbackValue },
            },
          ]
        : [
            {
              inputKey: "memberId",
              source: { kind: "system", value: "member_id" },
            },
            callbackQuestionId
              ? {
                  inputKey: "note",
                  source: { kind: "question", questionId: callbackQuestionId },
                }
              : {
                  inputKey: "note",
                  source: { kind: "fixed", value: callbackValue },
                },
          ];
    try {
      await configureCallback.mutateAsync({
        callbackSlug,
        formId: initial.id,
        mappings,
      });
      setMessage("Callback configured for future responses.");
    } catch (cause) {
      setMessage(
        cause instanceof Error
          ? cause.message
          : "Callback configuration failed.",
      );
    }
  }

  async function uploadInstruction(file: File, type: "image" | "video") {
    if (!initial) return;
    try {
      setMessage(`Uploading ${file.name}…`);
      const upload = await createUpload.mutateAsync({
        contentType: file.type,
        fileName: file.name,
        formId: initial.id,
        purpose: "instruction",
        size: file.size,
      });
      const result = await fetch(upload.uploadUrl, {
        body: file,
        headers: { "Content-Type": file.type },
        method: "PUT",
      });
      if (!result.ok) throw new Error("Instruction upload failed.");
      await finalizeUpload.mutateAsync({ attachmentId: upload.attachmentId });
      setMediaInstructions((current) => [
        ...current,
        {
          alt: file.name,
          attachmentId: upload.attachmentId,
          id: crypto.randomUUID(),
          type,
        },
      ]);
      setMessage("Instruction media uploaded. Save the form to publish it.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Upload failed.");
    }
  }

  const busy = create.isPending || update.isPending || updateSettings.isPending;

  return (
    <main className="container min-w-0 space-y-5 pb-16 pt-5 sm:pt-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button asChild variant="ghost" className="-ml-3 min-h-11 gap-2">
            <Link href="/admin/forms">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Forms
            </Link>
          </Button>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold sm:text-4xl">
              {readOnly ? "View form" : initial ? "Edit form" : "Create form"}
            </h1>
            {initial && <Badge variant="outline">{initial.state}</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!readOnly && (
            <Button
              variant="outline"
              className="min-h-11 gap-2"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 className="h-4 w-4" aria-hidden="true" /> Settings
            </Button>
          )}
          {initial && !readOnly && (
            <Button
              variant="outline"
              className="min-h-11 gap-2"
              onClick={() => setCallbacksOpen(true)}
            >
              <Workflow className="h-4 w-4" aria-hidden="true" /> Callbacks
            </Button>
          )}
          {initial && !readOnly && (
            <Button
              variant="outline"
              className="min-h-11 gap-2"
              disabled={!share.data}
              onClick={() => setShareOpen(true)}
            >
              <Share2 className="h-4 w-4" aria-hidden="true" /> Share
            </Button>
          )}
          {initial && (
            <Button
              variant="outline"
              className="min-h-11 gap-2"
              aria-label="More form actions"
              onClick={() => setActionsOpen(true)}
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" /> More
            </Button>
          )}
          {!readOnly && initial?.state === "draft" && (
            <Button
              className="min-h-11 gap-2"
              onClick={() => void transition("published")}
            >
              <Send className="h-4 w-4" aria-hidden="true" /> Publish
            </Button>
          )}
          {!readOnly && initial?.state === "published" && (
            <Button
              variant="outline"
              className="min-h-11 gap-2"
              onClick={() => void transition("archived")}
            >
              <Archive className="h-4 w-4" aria-hidden="true" /> Archive
            </Button>
          )}
          {!readOnly && initial?.state === "archived" && (
            <Button
              className="min-h-11"
              onClick={() => void transition("published")}
            >
              Republish
            </Button>
          )}
          {!readOnly && (
            <Button
              className="min-h-11 gap-2"
              disabled={busy}
              onClick={() => void save()}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save
            </Button>
          )}
        </div>
      </header>

      <div
        className="flex flex-wrap gap-2"
        aria-label="Form configuration summary"
      >
        <Badge variant="outline">
          {sections.find((section) => section.id === sectionId)?.name ??
            "No section"}
        </Badge>
        <Badge variant="outline">
          {responseMode === "single_locked"
            ? "One locked response"
            : responseMode === "single_editable"
              ? "One editable response"
              : "Multiple locked responses"}
        </Badge>
        <Badge variant="outline">
          {respondentRoleIds.length === 0
            ? "All eligible members"
            : `${respondentRoleIds.length} respondent roles`}
        </Badge>
        <Badge variant="outline">
          {manuallyClosed ? "Manually closed" : "Schedule active"}
        </Badge>
      </div>

      {message && (
        <p
          role="status"
          className="rounded-md border border-white/10 bg-card/95 p-3 text-sm"
        >
          {message}
        </p>
      )}

      <div className="grid gap-5">
        <section className="grid gap-4">
          <Card className="border-white/10 bg-card/95 shadow-xl shadow-black/20">
            <CardHeader>
              <CardTitle>Form details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="form-name">Title</Label>
                <Input
                  disabled={readOnly}
                  id="form-name"
                  className="h-11"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    if (!initial) setSlug(toSlug(event.target.value));
                  }}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="form-slug">Stable link slug</Label>
                <Input
                  id="form-slug"
                  className="h-11"
                  disabled={
                    readOnly || Boolean(initial && initial.state !== "draft")
                  }
                  value={slug}
                  onChange={(event) => setSlug(toSlug(event.target.value))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="form-description">Description</Label>
                <Textarea
                  disabled={readOnly}
                  id="form-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="form-instructions">Instructions</Label>
                <Textarea
                  disabled={readOnly}
                  id="form-instructions"
                  className="min-h-28"
                  value={instructions}
                  onChange={(event) => setInstructions(event.target.value)}
                />
              </div>
              {initial && (
                <div className="grid gap-3 rounded-md border border-white/10 bg-background/60 p-3">
                  <Label>Instruction media</Label>
                  {!readOnly && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="h-11"
                        aria-label="Add instruction image"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void uploadInstruction(file, "image");
                        }}
                      />
                      <Input
                        type="file"
                        accept="video/mp4,video/webm,video/ogg"
                        className="h-11"
                        aria-label="Add instruction video"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void uploadInstruction(file, "video");
                        }}
                      />
                    </div>
                  )}
                  {mediaInstructions.map((media) => (
                    <div
                      className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-card/50 p-2 text-sm"
                      key={media.id}
                    >
                      <span className="truncate">
                        {media.type}: {media.alt}
                      </span>
                      {!readOnly && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setMediaInstructions((current) =>
                              current.filter(({ id }) => id !== media.id),
                            )
                          }
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <section className="rounded-lg border border-white/10 bg-card/95 p-4 shadow-xl shadow-black/20 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Questions</h2>
                <p className="text-sm text-muted-foreground">
                  Drag to reorder. Stable IDs keep answers attached while
                  wording changes.
                </p>
              </div>
              {!readOnly && (
                <Button
                  variant="outline"
                  className="min-h-11 gap-2"
                  onClick={() =>
                    setQuestions((current) => [
                      ...current,
                      newQuestion("short_text"),
                    ])
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
                <div className="mt-4 grid gap-3">
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
                              disabled={index === questions.length - 1}
                              size="icon"
                              variant="ghost"
                              onClick={() => moveQuestion(index, 1)}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setQuestions((current) =>
                                  current.filter(
                                    ({ id }) => id !== question.id,
                                  ),
                                )
                              }
                            >
                              Remove
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem] md:items-end">
                        <div className="grid gap-2">
                          <Label htmlFor={`prompt-${question.id}`}>
                            Prompt
                          </Label>
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
                        <div className="grid gap-2">
                          <Label htmlFor={`type-${question.id}`}>Type</Label>
                          <Select
                            disabled={readOnly}
                            value={question.type}
                            onValueChange={(value) =>
                              setQuestions((current) =>
                                current.map((currentQuestion) =>
                                  currentQuestion.id === question.id
                                    ? changeQuestionType(
                                        currentQuestion,
                                        value as FormQuestion["type"],
                                      )
                                    : currentQuestion,
                                ),
                              )
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
                          setQuestions((current) =>
                            current.map((currentQuestion) =>
                              currentQuestion.id === question.id
                                ? nextQuestion
                                : currentQuestion,
                            ),
                          )
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
                    </SortableQuestionCard>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </section>
        </section>
      </div>

      <Dialog open={!readOnly && settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="flex max-h-[90svh] max-w-2xl flex-col overflow-hidden p-0">
          <DialogHeader className="border-b border-border/70 px-5 py-4 text-left">
            <DialogTitle>Availability & access</DialogTitle>
            <DialogDescription>
              Set who can respond and when the direct link accepts responses.
            </DialogDescription>
          </DialogHeader>
          <div className="grid min-h-0 gap-4 overflow-y-auto px-5 py-4">
            <div className="grid gap-2">
              <Label>Section</Label>
              <select
                className="h-11 rounded-md border border-input bg-background px-3"
                value={sectionId}
                onChange={(event) => setSectionId(event.target.value)}
              >
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Response mode</Label>
              <select
                className="h-11 rounded-md border border-input bg-background px-3"
                value={responseMode}
                onChange={(event) =>
                  setResponseMode(
                    event.target.value as BuilderInitial["responseMode"],
                  )
                }
              >
                <option value="single_locked">One, locked</option>
                <option value="single_editable">One, editable</option>
                <option value="multiple_locked">Multiple, locked</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="opens-at">Opens</Label>
              <Input
                id="opens-at"
                type="datetime-local"
                className="h-11"
                value={opensAt}
                onChange={(event) => setOpensAt(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="closes-at">Closes</Label>
              <Input
                id="closes-at"
                type="datetime-local"
                className="h-11"
                value={closesAt}
                onChange={(event) => setClosesAt(event.target.value)}
              />
            </div>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={duesOnly}
                onChange={(event) => setDuesOnly(event.target.checked)}
              />
              Dues-paid members only
            </label>
            <fieldset className="grid gap-2 rounded-md border border-white/10 bg-background/60 p-3">
              <legend className="px-1 text-sm font-medium">
                Respondent roles
              </legend>
              <p className="text-xs text-muted-foreground">
                Leave all unchecked to allow every eligible member with the
                direct link.
              </p>
              <Input
                aria-label="Search respondent roles"
                className="h-11"
                placeholder="Search roles"
                value={respondentRoleSearch}
                onChange={(event) =>
                  setRespondentRoleSearch(event.target.value)
                }
              />
              <div className="grid max-h-56 gap-1 overflow-y-auto pr-1">
                {respondentRoles
                  .filter((role) =>
                    role.name
                      .toLowerCase()
                      .includes(respondentRoleSearch.trim().toLowerCase()),
                  )
                  .map((role) => (
                    <label
                      className="flex min-h-11 items-center justify-between gap-3 rounded-md px-2 text-sm hover:bg-accent/50"
                      key={role.id}
                    >
                      <span className="min-w-0 truncate">{role.name}</span>
                      <input
                        checked={respondentRoleIds.includes(role.id)}
                        type="checkbox"
                        onChange={(event) =>
                          setRespondentRoleIds((current) =>
                            event.target.checked
                              ? [...current, role.id]
                              : current.filter((id) => id !== role.id),
                          )
                        }
                      />
                    </label>
                  ))}
              </div>
            </fieldset>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={manuallyClosed}
                onChange={(event) => setManuallyClosed(event.target.checked)}
              />
              Manually closed
            </label>
          </div>
          <DialogFooter className="border-t border-border/70 px-5 py-4">
            <Button className="min-h-11" onClick={() => setSettingsOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {initial && !readOnly && (
        <Dialog open={callbacksOpen} onOpenChange={setCallbacksOpen}>
          <DialogContent className="max-h-[90svh] max-w-xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Callbacks</DialogTitle>
              <DialogDescription>
                Configure code-owned actions for future locked responses.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              {configuredCallbacks
                .filter(({ active }) => active)
                .map((callback) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-background/60 p-3 text-sm"
                    key={callback.id}
                  >
                    <span>{callback.callbackSlug}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={disableCallback.isPending}
                      onClick={() =>
                        void disableCallback
                          .mutateAsync({
                            callbackSlug: callback.callbackSlug,
                            formId: initial.id,
                          })
                          .then(() => {
                            setMessage(
                              "Callback disabled for future responses.",
                            );
                            router.refresh();
                          })
                      }
                    >
                      Disable
                    </Button>
                  </div>
                ))}
              <select
                aria-label="Callback"
                className="h-11 rounded-md border border-input bg-background px-3"
                value={callbackSlug}
                onChange={(event) => setCallbackSlug(event.target.value)}
              >
                {callbacks.map((callback) => (
                  <option
                    disabled={!callback.available}
                    key={callback.slug}
                    value={callback.slug}
                  >
                    {callback.label}
                    {callback.available
                      ? ""
                      : ` — needs ${callback.requiredPermission}`}
                  </option>
                ))}
              </select>
              {callbackSlug === "recruiting.notify" && (
                <select
                  aria-label="Map note from question"
                  className="h-11 rounded-md border border-input bg-background px-3"
                  value={callbackQuestionId}
                  onChange={(event) =>
                    setCallbackQuestionId(event.target.value)
                  }
                >
                  <option value="">Use fixed note</option>
                  {questions
                    .filter(
                      (question) =>
                        question.type === "short_text" ||
                        question.type === "paragraph",
                    )
                    .map((question) => (
                      <option key={question.id} value={question.id}>
                        {question.prompt}
                      </option>
                    ))}
                </select>
              )}
              {(!callbackQuestionId ||
                callbackSlug === "discord.assign-role") && (
                <Input
                  className="h-11"
                  placeholder={
                    callbackSlug === "discord.assign-role"
                      ? "Assignable Blade role UUID"
                      : "Fixed recruiting note"
                  }
                  value={callbackValue}
                  onChange={(event) => setCallbackValue(event.target.value)}
                />
              )}
              <Button
                variant="outline"
                className="min-h-11"
                disabled={
                  responseMode === "single_editable" ||
                  configureCallback.isPending
                }
                onClick={() => void addCallback()}
              >
                Configure for future responses
              </Button>
              <p className="text-xs text-muted-foreground">
                Respondents never see callback configuration or execution
                status.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCallbacksOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {initial && share.data && (
        <Dialog open={shareOpen} onOpenChange={setShareOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Share form</DialogTitle>
              <DialogDescription>
                Copy the stable link or share its QR code.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <FormShareActions
                canonicalUrl={share.data.canonicalUrl}
                formName={name}
                onCopyLink={() =>
                  void navigator.clipboard.writeText(share.data.canonicalUrl)
                }
                onOpenQrPreview={() =>
                  window.open(
                    share.data.qrPngDataUrl,
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
                qrPngDataUrl={share.data.qrPngDataUrl}
                slugName={slug}
              />
              {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL QR preview */}
              <img
                src={share.data.qrPngDataUrl}
                alt={`QR code for ${name}`}
                className="mx-auto w-48 rounded-md border border-white/10 bg-white p-2"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {initial && !readOnly && (
        <Dialog open={actionsOpen} onOpenChange={setActionsOpen}>
          <DialogContent className="max-w-lg border-destructive/30">
            <DialogHeader>
              <DialogTitle>Delete form?</DialogTitle>
              <DialogDescription>
                This is only allowed when the form has no responses. Forms with
                retained responses should be archived instead.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm text-muted-foreground">
                This permanently removes the form definition and cannot be
                undone.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActionsOpen(false)}>
                Cancel
              </Button>
              <Button
                className="min-h-11 gap-2"
                disabled={deleteForm.isPending}
                variant="destructive"
                onClick={() =>
                  void deleteForm
                    .mutateAsync({ formId: initial.id })
                    .then(() => router.replace("/admin/forms"))
                    .catch((cause: unknown) =>
                      setMessage(
                        cause instanceof Error
                          ? cause.message
                          : "The form could not be deleted.",
                      ),
                    )
                }
              >
                <Trash2 className="h-4 w-4" /> Delete permanently
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </main>
  );
}
