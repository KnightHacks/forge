"use client";

import * as React from "react";
import { Trash2, X } from "lucide-react";
import { createPortal } from "react-dom";

import { ISSUE } from "@forge/consts";
import { cn } from "@forge/ui";
import { Button } from "@forge/ui/button";
import { Checkbox } from "@forge/ui/checkbox";
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

import { api } from "~/trpc/react";

const baseField = "w-full";

const STATUS_COLORS: Record<string, string> = {
  BACKLOG: "bg-slate-400",
  PLANNING: "bg-amber-400",
  IN_PROGRESS: "bg-emerald-400",
  FINISHED: "bg-rose-400",
};

function getStatusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

const TASK_DUE_HOURS = 23;
const TASK_DUE_MINUTES = 0;
const TASK_DUE_TIME = "23:00";

function normalizeTaskDueDate(dateValue?: string | Date) {
  const dueDate = dateValue ? new Date(dateValue) : new Date();
  if (Number.isNaN(dueDate.getTime())) {
    const fallback = new Date();
    fallback.setHours(TASK_DUE_HOURS, TASK_DUE_MINUTES, 0, 0);
    return fallback.toISOString();
  }

  dueDate.setHours(TASK_DUE_HOURS, TASK_DUE_MINUTES, 0, 0);
  return dueDate.toISOString();
}

function getTaskDueDateInputValue(dateValue: string | Date) {
  return normalizeTaskDueDate(dateValue).slice(0, 10);
}

type IssueDialogFormValues = ISSUE.IssueSubmitValues & { roles: string[] };

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

const defaultForm = (): IssueDialogFormValues => {
  return {
    status: ISSUE.ISSUE_STATUS[0],
    name: "",
    description: "",
    links: [],
    date: normalizeTaskDueDate(),
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
    requiresFood: false,
    roles: [],
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
  const rolesQuery = api.roles.getAllLinks.useQuery();
  const rolesData = rolesQuery.data;
  const [portalElement, setPortalElement] = React.useState<Element | null>(
    null,
  );
  const buildInitialFormValues = React.useCallback(() => {
    const defaults = defaultForm();
    if (initialValues?.isEvent) {
      return {
        ...defaults,
        ...initialValues,
        isEvent: true,
        event: initialValues.event ?? defaultEventForm(),
        links: initialValues?.links ?? defaults.links,
        roles:
          (initialValues as Partial<IssueDialogFormValues>)?.roles ??
          defaults.roles,
      };
    }
    return {
      ...defaults,
      ...initialValues,
      isEvent: false,
      event: undefined,
      date: normalizeTaskDueDate(initialValues?.date ?? defaults.date),
      links: initialValues?.links ?? defaults.links,
      roles:
        (initialValues as Partial<IssueDialogFormValues>)?.roles ??
        defaults.roles,
    };
  }, [initialValues]);
  const [formValues, setFormValues] = React.useState<IssueDialogFormValues>(
    buildInitialFormValues,
  );
  const baseId = React.useId();
  const isSubmitDisabled =
    !(
      formValues.isEvent ? formValues.event?.name : formValues.name
    )?.trim() || (!formValues.isEvent && !formValues.team.trim());

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

  React.useEffect(() => {
    if (!open || formValues.isEvent || formValues.team || !rolesData?.length) {
      return;
    }

    updateForm("team", rolesData[0]!.id);
  }, [formValues.isEvent, formValues.team, open, rolesData]);

  const handleOverlayPointerDown = (
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  };

  const updateForm = <K extends keyof IssueDialogFormValues>(
    key: K,
    value: IssueDialogFormValues[K],
  ) => {
    setFormValues((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // If not event, clear event field
    if (!formValues.isEvent) {
      onSubmit?.({
        ...formValues,
        description: formValues.description.trim(),
        event: undefined,
        date: new Date(normalizeTaskDueDate(formValues.date)),
        teamVisibilityIds: formValues.roles,
      });
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
              : "Create Issue"}
          </p>
          <h2 className="mt-1 text-lg font-semibold">
            {intent === "edit"
              ? formValues.isEvent
                ? "Update the event details below"
                : "Update the task details below"
              : "Enter the issue details below"}
          </h2>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-6 px-6 py-6">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{"Name"}</Label>

              <Input
                className={cn(baseField, "col-span-3")}
                value={
                  formValues.isEvent
                    ? (formValues.event?.name ?? "")
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
              <Label className="text-right">Is Event?</Label>
              <div className="col-span-3 flex items-center space-x-2">
                <Checkbox
                  checked={formValues.isEvent}
                  onCheckedChange={() => undefined}
                />
                <span className="text-sm text-muted-foreground">
                  Placeholder toggle (no behavior yet)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Status</Label>
              <Select
                value={formValues.status}
                onValueChange={(value) =>
                  updateForm(
                    "status",
                    value as (typeof ISSUE.ISSUE_STATUS)[number],
                  )
                }
              >
                <SelectTrigger
                  className={cn(baseField, "col-span-3")}
                  aria-label="Issue status"
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
                        <span
                          className={cn(
                            "size-2 rounded-full",
                            STATUS_COLORS[status] || "bg-slate-400",
                          )}
                        />
                        <span className="text-sm">
                          {getStatusLabel(status)}
                        </span>
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
              <>
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
                    value={getTaskDueDateInputValue(formValues.date)}
                    onChange={(e) =>
                      updateForm("date", normalizeTaskDueDate(e.target.value))
                    }
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label
                    htmlFor={`${baseId}-task-due-time`}
                    className="text-right"
                  >
                    Due Time
                  </Label>
                  <Input
                    id={`${baseId}-task-due-time`}
                    type="time"
                    className={cn(baseField, "col-span-3")}
                    value={TASK_DUE_TIME}
                    readOnly
                    disabled
                  />
                </div>
              </>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Priority</Label>
              <Select
                value={formValues.priority}
                onValueChange={(value) =>
                  updateForm(
                    "priority",
                    value as (typeof ISSUE.PRIORITY)[number],
                  )
                }
              >
                <SelectTrigger
                  className={cn(baseField, "col-span-3")}
                  aria-label="Priority"
                >
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE.PRIORITY.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Team</Label>
              <Select
                value={formValues.team}
                onValueChange={(value) => updateForm("team", value)}
              >
                <SelectTrigger
                  className={cn(baseField, "col-span-3")}
                  aria-label="Team"
                >
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {rolesData?.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label
                htmlFor={`${baseId}-description`}
                className="pt-2 text-right"
              >
                Description
              </Label>
              <Textarea
                id={`${baseId}-description`}
                className={cn(
                  baseField,
                  "col-span-3 min-h-[140px] resize-none",
                )}
                placeholder="Description..."
                value={formValues.description}
                onChange={(event) =>
                  updateForm("description", event.target.value)
                }
              />
            </div>

            {/* Visible To Roles */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="mt-1 text-right">Visible To Roles</Label>
              <div className="col-span-3 mt-1 grid grid-cols-2 gap-x-2 gap-y-3">
                {rolesData?.map((role) => (
                  <div
                    key={role.id}
                    className="flex flex-row items-start space-x-3 space-y-0"
                  >
                    <Checkbox
                      checked={formValues.roles?.includes(role.id)}
                      onCheckedChange={(checked) => {
                        return checked
                          ? updateForm("roles", [
                              ...(formValues.roles || []),
                              role.id,
                            ])
                          : updateForm(
                              "roles",
                              formValues.roles?.filter(
                                (value: string) => value !== role.id,
                              ) || [],
                            );
                      }}
                    />
                    <Label className="cursor-pointer font-normal">
                      {role.name}
                    </Label>
                  </div>
                ))}
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
                {intent === "edit"
                  ? formValues.isEvent
                    ? "Update Event"
                    : "Update Issue"
                  : "Create Issue"}
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
