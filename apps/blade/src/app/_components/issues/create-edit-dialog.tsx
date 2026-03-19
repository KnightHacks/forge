"use client";

import * as React from "react";
import { Plus, Trash2, X } from "lucide-react";
import { createPortal } from "react-dom";

import { ISSUE } from "@forge/consts";

const baseField = "w-full";

const tabButtonBase =
  "rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground";

const REQUIREMENT_FLAGS = [
  {
    key: "requiresAV",
    label: "AV Equipment",
    caption: "Projector, microphones, speakers",
  },
  {
    key: "requiresFood",
    label: "Food",
    caption: "Snacks, catering, drinks",
  },
] as const;

const STATUS_COLORS: Record<string, string> = {
  BACKLOG: "bg-slate-400",
  PLANNING: "bg-amber-400",
  IN_PROGRESS: "bg-emerald-400",
  FINISHED: "bg-rose-400",
};

const SECTION_TABS: { key: ISSUE.DetailSectionKey; label: string }[] = [
  { key: "details", label: "Details" },
  { key: "requirements", label: "Room & Requirements" },
  { key: "links", label: "Links & Notes" },
];

import { cn } from "@forge/ui";
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
import { Switch } from "@forge/ui/switch";
import { Textarea } from "@forge/ui/textarea";

function getStatusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

const TEAM_OPTIONS = [
  "Design",
  "Workshop",
  "Outreach",
  "Programs",
  "Sponsorship",
  "E-Board",
];

// Helper to create a new link string
const createLinkItem = (): string => "";

const defaultEventForm = (): ISSUE.EventFormValues => {
  const now = new Date();
  const end = new Date(now.getTime() + 60 * 60 * 1000);
  return {
    discordId: "",
    googleId: "",
    name: "",
    tag: "",
    description: "",
    startDate: formatDateForInput(now),
    startTime: formatTimeForInput(now),
    endDate: formatDateForInput(end),
    endTime: formatTimeForInput(end),
    location: "",
    dues_paying: false,
    points: undefined,
    hackathonId: undefined,
  };
};

const defaultForm = (): ISSUE.IssueFormValues => {
  const now = new Date();
  // Default due date for tasks is today at 11:00 PM
  const dueDate = new Date(now);
  dueDate.setHours(23, 0, 0, 0);
  return {
    status: ISSUE.ISSUE_STATUS[0],
    name: "",
    description: "",
    links: [],
    date: dueDate.toISOString(),
    priority: ISSUE.PRIORITY[0],
    team: "",
    parent: undefined,
    isEvent: false,
    event: undefined,
    //ui
    details: "",
    notes: "",
    isHackathonCritical: false,
    requiresRoom: false,
    requiresAV: false,
    requiresFood: false
  };
};

export function CreateEditDialog(props: ISSUE.CreateEditDialogProps) {
  const {
    open,
    intent = "create",
    initialValues,
    onClose,
    onDelete,
    onSubmit,
  } = props;
  const [portalElement, setPortalElement] = React.useState<Element | null>(
    null,
  );
  const [activeSection, setActiveSection] =
    React.useState<ISSUE.DetailSectionKey>("details");
  const buildInitialFormValues = React.useCallback(() => {
    const defaults = defaultForm();
    if (initialValues?.isEvent) {
      return {
        ...defaults,
        ...initialValues,
        isEvent: true,
        event: initialValues.event ?? defaultEventForm(),
        links: initialValues?.links ?? defaults.links,
      };
    }
    return {
      ...defaults,
      ...initialValues,
      isEvent: false,
      event: undefined,
      links: initialValues?.links ?? defaults.links,
    };
  }, [initialValues]);
  const [formValues, setFormValues] = React.useState<ISSUE.IssueFormValues>(
    buildInitialFormValues,
  );
  const baseId = React.useId();
  const isSubmitDisabled = !(
    formValues.isEvent ? formValues.event?.name : formValues.name
  )?.trim();

  // Helper for event form
  const updateEventForm = <K extends keyof ISSUE.EventFormValues>(
    key: K,
    value: ISSUE.EventFormValues[K],
  ) => {
    setFormValues((previous) => ({
      ...previous,
      event: {
        ...(previous.event ?? defaultEventForm()),
        [key]: value,
      },
    }));
  };

  React.useEffect(() => {
    setPortalElement(document.body);
  }, []);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setFormValues(buildInitialFormValues());
    setActiveSection("details");
  }, [buildInitialFormValues, open]);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeydown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [open, onClose]);

  const handleOverlayPointerDown = (
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  };

  const updateForm = <K extends keyof ISSUE.IssueFormValues>(
    key: K,
    value: ISSUE.IssueFormValues[K],
  ) => {
    setFormValues((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const handleAddLink = () => {
    setFormValues((previous) => ({
      ...previous,
      links: [...previous.links, createLinkItem()],
    }));
  };

  const handleRemoveLink = (index: number) => {
    setFormValues((previous) => ({
      ...previous,
      links: previous.links.filter((_, i) => i !== index),
    }));
  };

  const handleLinkUpdate = (index: number, value: string) => {
    setFormValues((previous) => ({
      ...previous,
      links: previous.links.map((link, i) => (i === index ? value : link)),
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // If not event, clear event field
    if (!formValues.isEvent) {
      onSubmit?.({ ...formValues, event: undefined });
    } else {
      onSubmit?.(formValues);
    }
  };

  const handleDelete = () => {
    if (intent === "edit") {
      onDelete?.(formValues);
    }
  };

  if (!open || !portalElement) {
    return null;
  }

  return createPortal(
    <div
      aria-modal
      role="dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-10"
      onMouseDown={handleOverlayPointerDown}
    >
      <form
        className="relative flex max-h-[70vh] w-full max-w-[800px] flex-col overflow-hidden rounded-lg border bg-background shadow-lg"
        onSubmit={handleSubmit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-md border border-input text-muted-foreground transition hover:text-foreground"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>

        <header className="border-b px-6 py-4 pr-12">
          <p className="text-xs font-medium text-muted-foreground">
            {intent === "edit"
              ? formValues.isEvent
                ? "Edit Event"
                : "Edit Task"
              : formValues.isEvent
                ? "Create Event"
                : "Create Task"}
          </p>
          <h2 className="mt-1 text-lg font-semibold">
            {intent === "edit"
              ? formValues.isEvent
                ? "Update the event details below"
                : "Update the task details below"
              : formValues.isEvent
                ? "Enter the event details below"
                : "Enter the task details below"}
          </h2>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-6 px-6 py-6">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
              {formValues.isEvent ? "Event Name" : "Task Name"}
              </Label>

              <Input
                className={cn(baseField, "col-span-3")}
                value={
                  formValues.isEvent
                    ? formValues.event?.name ?? ""
                    : formValues.name
                }
                onChange={(event) => {
                  if (formValues.isEvent) {
                    updateEventForm("name", event.target.value);
                  } else {
                    updateForm("name", event.target.value);
                  }
                }}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Status</Label>
              <Select
                value={formValues.status}
                onValueChange={(value) =>
                  updateForm("status", value as (typeof ISSUE.ISSUE_STATUS)[number])
                }
              >
                <SelectTrigger
                  className={cn(baseField, "col-span-3")}
                  aria-label="Event status"
                >
                  <div className="flex flex-1 items-center gap-2 text-left">
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        STATUS_COLORS[formValues.status] || "bg-slate-400",
                      )}
                    />

                    <span className="text-sm font-medium">
                      {getStatusLabel(formValues.status)}
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {ISSUE.ISSUE_STATUS.map((status) => (
                    <SelectItem key={status} value={status}>
                      <div className="flex items-center gap-2">
                        <span className={cn("size-2 rounded-full", STATUS_COLORS[status] || "bg-slate-400")} />
                        <span className="text-sm">{getStatusLabel(status)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date/Time fields */}
            {formValues.isEvent ? (
              <div className="grid gap-4 rounded-md border p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor={`${baseId}-event-start-date`}
                      className="text-sm"
                    >
                      Start Date
                    </Label>
                    <Input
                      id={`${baseId}-event-start-date`}
                      type="date"
                      className={baseField}
                      value={formValues.event?.startDate ?? ""}
                      onChange={(e) =>
                        updateEventForm("startDate", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor={`${baseId}-event-start-time`}
                      className="text-sm"
                    >
                      Start Time
                    </Label>
                    <Input
                      id={`${baseId}-event-start-time`}
                      type="time"
                      className={baseField}
                      value={formValues.event?.startTime ?? ""}
                      onChange={(e) =>
                        updateEventForm("startTime", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor={`${baseId}-event-end-date`}
                      className="text-sm"
                    >
                      End Date
                    </Label>
                    <Input
                      id={`${baseId}-event-end-date`}
                      type="date"
                      className={baseField}
                      value={formValues.event?.endDate ?? ""}
                      onChange={(e) =>
                        updateEventForm("endDate", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor={`${baseId}-event-end-time`}
                      className="text-sm"
                    >
                      End Time
                    </Label>
                    <Input
                      id={`${baseId}-event-end-time`}
                      type="time"
                      className={baseField}
                      value={formValues.event?.endTime ?? ""}
                      onChange={(e) =>
                        updateEventForm("endTime", e.target.value)
                      }
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label
                    htmlFor={`${baseId}-event-location`}
                    className="text-sm"
                  >
                    Location
                  </Label>
                  <Input
                    id={`${baseId}-event-location`}
                    className={baseField}
                    value={formValues.event?.location ?? ""}
                    onChange={(e) =>
                      updateEventForm("location", e.target.value)
                    }
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label
                  htmlFor={`${baseId}-task-due-date`}
                  className="text-right"
                >
                  Due Date
                </Label>
                <Input
                  id={`${baseId}-task-due-date`}
                  type="date"
                  className={cn(baseField, "col-span-3")}
                  value={formValues.date.slice(0, 10)}
                  onChange={(e) => {
                    // Always set to 11:00 PM
                    const d = new Date(e.target.value);
                    d.setHours(23, 0, 0, 0);
                    updateForm("date", d.toISOString());
                  }}
                />
              </div>
            )}

            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                Sections
              </p>
              <div className="flex flex-wrap gap-3">
                {SECTION_TABS.map((section) => (
                  <button
                    key={section.key}
                    type="button"
                    className={cn(
                      tabButtonBase,
                      activeSection === section.key
                        ? "border-primary bg-primary/10 text-foreground"
                        : "",
                    )}
                    onClick={() => setActiveSection(section.key)}
                  >
                    {section.label}
                  </button>
                ))}
              </div>

              <div className="rounded-md border p-4">
                {activeSection === "details" && (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-sm">Team</Label>
                        <Select
                          value={formValues.team}
                          onValueChange={(value) => updateForm("team", value)}
                        >
                          <SelectTrigger
                            className={baseField}
                            aria-label="Team"
                          >
                            <SelectValue placeholder="Select team" />
                          </SelectTrigger>
                          <SelectContent>
                            {TEAM_OPTIONS.map((team) => (
                              <SelectItem key={team} value={team.toLowerCase()}>
                                {team}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">
                          Priority
                        </Label>
                        <Select
                          value={formValues.priority}
                          onValueChange={(value) =>
                            updateForm("priority", value as (typeof ISSUE.PRIORITY)[number])
                          }
                        >
                          <SelectTrigger
                            className={baseField}
                            aria-label="Priority"
                          >
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            {ISSUE.PRIORITY.map((priority) => (
                              <SelectItem
                                key={priority}
                                value={priority.toLowerCase()}
                              >
                                {priority}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor={`${baseId}-details`}
                        className="text-sm"
                      >
                        Description
                      </Label>
                      <Textarea
                        id={`${baseId}-details`}
                        className={cn(
                          baseField,
                          "min-h-[140px] resize-none",
                        )}
                        placeholder="Approve design system updates, outline agenda, attach quick summary."
                        value={formValues.details}
                        onChange={(event) =>
                          updateForm("details", event.target.value)
                        }
                      />
                    </div>

                    <div className="flex items-start justify-between rounded-md border p-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Visibility
                        </p>
                        <p className="mt-1 text-base font-medium">
                          Hackathon critical
                        </p>
                        <p className="text-xs text-muted-foreground">
                          High visibility during hackathon mode
                        </p>
                      </div>
                      <Switch
                        checked={formValues.isHackathonCritical}
                        onCheckedChange={(checked) =>
                          updateForm("isHackathonCritical", checked)
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}

                {activeSection === "requirements" && (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between rounded-md border p-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Room Booking
                        </p>
                        <p className="mt-1 text-base font-medium">
                          Room needed for this event
                        </p>
                      </div>
                      <Switch
                        checked={formValues.requiresRoom}
                        onCheckedChange={(checked) =>
                          updateForm("requiresRoom", checked)
                        }
                        className="mt-1"
                      />
                    </div>

                    <div className="rounded-md border p-4">
                      <p className="text-xs text-muted-foreground">
                        Requirements
                      </p>
                      <div className="mt-4 space-y-4">
                        {REQUIREMENT_FLAGS.map((flag) => (
                          <div
                            key={flag.key}
                            className="flex items-start justify-between rounded-md border p-3"
                          >
                            <div className="pr-4">
                              <p className="text-base font-medium">
                                {flag.label}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {flag.caption}
                              </p>
                            </div>
                            <Switch
                              checked={formValues[flag.key]}
                              onCheckedChange={(checked) =>
                                updateForm(flag.key, checked)
                              }
                              className="mt-1"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeSection === "links" && (
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Label className="text-sm">Links</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-9 border"
                        onClick={handleAddLink}
                      >
                        <Plus className="mr-2 h-4 w-4" /> Add Link
                      </Button>
                    </div>
                    {formValues.links.length === 0 ? (
                      <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                        No links added. Click "Add Link" to include Notion docs,
                        Figma files, or sign-up forms.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {formValues.links.map((link, i) => (
                          <div
                            key={i}
                            className="flex flex-col gap-3 rounded-md border p-4 sm:flex-row"
                          >
                            <div className="flex-1 space-y-2">
                              <Input
                                className={baseField}
                                placeholder="Paste link (e.g., https://...)"
                                value={link}
                                onChange={(event) =>
                                  handleLinkUpdate(i, event.target.value)
                                }
                              />
                            </div>
                            <Button
                              variant="ghost"
                              type="button"
                              className="h-10 w-10 border"
                              onClick={() => handleRemoveLink(i)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-3">
                      <Label
                        htmlFor={`${baseId}-notes`}
                        className="text-sm"
                      >
                        Additional notes
                      </Label>
                      <Textarea
                        id={`${baseId}-notes`}
                        className={cn(
                          baseField,
                          "min-h-[140px] resize-none",
                        )}
                        placeholder="Any other context teammates should know before kicking off."
                        value={formValues.notes}
                        onChange={(event) =>
                          updateForm("notes", event.target.value)
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <footer className="border-t px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {intent === "edit" && (
              <Button
                type="button"
                variant="destructive"
                className="w-full sm:w-auto"
                onClick={handleDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            )}

            <div
              className={cn(
                "flex flex-col gap-3 sm:flex-row",
                intent !== "edit" && "sm:ml-auto",
              )}
            >
              <Button
                type="button"
                variant="ghost"
                className="w-full border sm:w-auto"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="w-full disabled:opacity-40 sm:w-auto"
                disabled={isSubmitDisabled}
              >
                {intent === "edit" ? "Update Event" : "Create Event"}
              </Button>
            </div>
          </div>
        </footer>
      </form>
    </div>,
    portalElement,
  );
}

function formatDateForInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatTimeForInput(date: Date) {
  return date.toTimeString().slice(0, 5);
}
