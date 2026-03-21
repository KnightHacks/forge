"use client";

import * as React from "react";
import { Trash2, X } from "lucide-react";
import { createPortal } from "react-dom";

import { EVENTS, ISSUE } from "@forge/consts";
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

function getStatusLabel(status: string) {
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeTaskDueDate(dateValue?: string | Date) {
  const dueDate = dateValue ? new Date(dateValue) : new Date();
  if (Number.isNaN(dueDate.getTime())) {
    const fallback = new Date();
    fallback.setHours(ISSUE.TASK_DUE_HOURS, ISSUE.TASK_DUE_MINUTES, 0, 0);
    return fallback;
  }

  dueDate.setHours(ISSUE.TASK_DUE_HOURS, ISSUE.TASK_DUE_MINUTES, 0, 0);
  return dueDate;
}

function getTaskDueDateInputValue(dateValue: Date) {
  return normalizeTaskDueDate(dateValue).toISOString().slice(0, 10);
}

function parseTimeTo12h(timeValue?: string): {
  hour: string;
  minute: string;
  amPm: (typeof ISSUE.EVENT_TIME_AM_PM_OPTIONS)[number];
} {
  const [hRaw, mRaw] = (timeValue ?? "").split(":");
  const h = Number(hRaw);
  const m = Number(mRaw);

  if (Number.isNaN(h) || Number.isNaN(m)) {
    return {
      hour: "",
      minute: "",
      amPm: "PM" as (typeof ISSUE.EVENT_TIME_AM_PM_OPTIONS)[number],
    };
  }

  const amPm: (typeof ISSUE.EVENT_TIME_AM_PM_OPTIONS)[number] =
    h >= 12 ? "PM" : "AM";
  const hour24 = h % 12 || 12;
  return {
    hour: hour24.toString().padStart(2, "0"),
    minute: m.toString().padStart(2, "0"),
    amPm,
  };
}

function to24h(
  hour12: string,
  amPm: (typeof ISSUE.EVENT_TIME_AM_PM_OPTIONS)[number],
) {
  let h = Number(hour12);
  if (Number.isNaN(h)) {
    h = 0;
  }
  if (amPm === "PM" && h < 12) {
    h += 12;
  }
  if (amPm === "AM" && h === 12) {
    h = 0;
  }
  return h.toString().padStart(2, "0");
}

function toAmPmValue(
  value: string,
): (typeof ISSUE.EVENT_TIME_AM_PM_OPTIONS)[number] {
  return value === "AM" ? "AM" : "PM";
}

function parseEventDateTime(dateValue?: string, timeValue?: string) {
  if (!dateValue || !timeValue) {
    return null;
  }

  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);
  if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }

  const parsed = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

interface IssueDialogFormValues {
  id?: string;
  status: (typeof ISSUE.ISSUE_STATUS)[number];
  name: string;
  description: string;
  links: string[];
  date: Date;
  priority: (typeof ISSUE.PRIORITY)[number];
  team: string;
  parent?: string;
  isEvent: boolean;
  event?: ISSUE.UUID | null;
  eventData?: ISSUE.EventFormValues;
  teamVisibilityIds?: string[];
  assigneeIds?: string[];
  roles: string[];
}
type CreateEditDialogComponentProps = Omit<
  ISSUE.CreateEditDialogProps,
  "open"
> & {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
};

const defaultEventForm = (): ISSUE.EventFormValues => {
  return {
    discordId: "",
    googleId: "",
    name: "",
    tag: EVENTS.EVENT_TAGS[0],
    description: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    location: "",
    roles: [],
    dues_paying: false,
    isOperationsCalendar: false,
    discordChannelId: "",
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
    event: null,
    eventData: undefined,
    roles: [],
  };
};

export function CreateEditDialog(props: CreateEditDialogComponentProps) {
  const {
    open,
    onOpenChange,
    intent = "create",
    initialValues,
    onClose,
    onDelete,
    onSubmit,
    children,
  } = props;
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const rolesQuery = api.roles.getAllLinks.useQuery();
  const hackathonsQuery = api.hackathon.getHackathons.useQuery();
  const rolesData = rolesQuery.data;
  const hackathons = hackathonsQuery.data;
  const isRolesLoading = rolesQuery.isLoading;
  const isHackathonsLoading = hackathonsQuery.isLoading;
  const rolesError = rolesQuery.error;
  const hackathonsError = hackathonsQuery.error;
  const [portalElement, setPortalElement] = React.useState<Element | null>(
    null,
  );
  const buildInitialFormValues = React.useCallback(() => {
    const defaults = defaultForm();
    const initial = (initialValues ?? {}) as Partial<IssueDialogFormValues>;
    const resolvedEventData = initial.eventData;
    const resolvedRoles =
      initial.roles ?? initial.teamVisibilityIds ?? defaults.roles;
    if (initial.isEvent) {
      return {
        ...defaults,
        ...initial,
        isEvent: true,
        event: initial.event ?? defaults.event,
        eventData: resolvedEventData ?? defaultEventForm(),
        links: initial.links ?? defaults.links,
        date: normalizeTaskDueDate(initial.date ?? defaults.date),
        roles: resolvedRoles,
      };
    }
    return {
      ...defaults,
      ...initial,
      isEvent: false,
      event: initial.event ?? defaults.event,
      eventData: undefined,
      date: normalizeTaskDueDate(initial.date ?? defaults.date),
      links: initial.links ?? defaults.links,
      roles: resolvedRoles,
    };
  }, [initialValues]);
  const [formValues, setFormValues] = React.useState<IssueDialogFormValues>(
    buildInitialFormValues,
  );

  const handleClose = React.useCallback(() => {
    if (isControlled) {
      if (onOpenChange) {
        onOpenChange(false);
      }
    } else {
      setInternalOpen(false);
    }
    onClose?.();
  }, [isControlled, onClose, onOpenChange]);

  const trigger = React.useMemo(() => {
    if (!children || !React.isValidElement(children)) {
      return null;
    }

    const child = children as React.ReactElement<{
      onClick?: (event: React.MouseEvent) => void;
    }>;

    return React.cloneElement(child, {
      onClick: (event: React.MouseEvent) => {
        child.props.onClick?.(event);
        if (isControlled) {
          if (onOpenChange) {
            onOpenChange(true);
          }
        } else {
          setInternalOpen(true);
        }
      },
    });
  }, [children, isControlled, onOpenChange]);

  const updateForm = <K extends keyof IssueDialogFormValues>(
    key: K,
    value: IssueDialogFormValues[K],
  ) => {
    setFormValues((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const baseId = React.useId();
  const startDateTime = parseEventDateTime(
    formValues.eventData?.startDate,
    formValues.eventData?.startTime,
  );
  const endDateTime = parseEventDateTime(
    formValues.eventData?.endDate,
    formValues.eventData?.endTime,
  );
  const nowTimestamp = Date.now();
  const isNameValid = formValues.name.trim().length > 0;
  const isTeamValid = formValues.team.trim().length > 0;
  const isDescriptionValid = formValues.description.trim().length > 0;
  const isRolesValid = !rolesError;
  const isTaskDateValid = !Number.isNaN(formValues.date.getTime());

  const hasEventData = !!formValues.eventData;
  const hasEventLocation = !!formValues.eventData?.location.trim();
  const hasEventDescription = !!formValues.eventData?.description.trim();
  const hasEventStartTime = !!startDateTime;
  const hasEventEndTime = !!endDateTime;
  const isInternalEvent = formValues.eventData?.isOperationsCalendar ?? false;
  const hasDiscordChannelId =
    !isInternalEvent || !!(formValues.eventData?.discordChannelId ?? "").trim();
  const isEventTimingValid =
    hasEventStartTime && hasEventEndTime && endDateTime > startDateTime;
  const isEventStartInFuture =
    hasEventStartTime && startDateTime.getTime() > nowTimestamp;

  const hasRequiredBaseFields =
    isNameValid && isTeamValid && isDescriptionValid && isRolesValid;
  const isTaskValid = isTaskDateValid;
  const isEventValid =
    hasEventData &&
    hasEventLocation &&
    hasEventDescription &&
    hasEventStartTime &&
    hasEventEndTime &&
    hasDiscordChannelId &&
    isEventTimingValid &&
    isEventStartInFuture;

  const isSubmitDisabled =
    !hasRequiredBaseFields ||
    (formValues.isEvent ? !isEventValid : !isTaskValid);
  const roleIdSet = React.useMemo(
    () => new Set((rolesData ?? []).map((role) => role.id)),
    [rolesData],
  );
  const safeVisibilityIds = React.useMemo(
    () => formValues.roles.filter((roleId) => roleIdSet.has(roleId)),
    [formValues.roles, roleIdSet],
  );
  const safeEventVisibilityIds = React.useMemo(
    () =>
      (formValues.eventData?.roles ?? []).filter((roleId) =>
        roleIdSet.has(roleId),
      ),
    [formValues.eventData?.roles, roleIdSet],
  );

  // Helper for event form
  const updateEventData = <K extends keyof ISSUE.EventFormValues>(
    key: K,
    value: ISSUE.EventFormValues[K],
  ) => {
    setFormValues((previous) => ({
      ...previous,
      eventData: {
        ...(previous.eventData ?? defaultEventForm()),
        [key]: value,
      },
    }));
  };

  const updateEventTimePart = (
    which: "start" | "end",
    part: "hour" | "minute" | "amPm",
    value: string,
  ) => {
    const key = which === "start" ? "startTime" : "endTime";
    const parsed = parseTimeTo12h(formValues.eventData?.[key]);
    const next: {
      hour: string;
      minute: string;
      amPm: (typeof ISSUE.EVENT_TIME_AM_PM_OPTIONS)[number];
    } = {
      hour: part === "hour" ? value : parsed.hour,
      minute: part === "minute" ? value : parsed.minute,
      amPm: part === "amPm" ? toAmPmValue(value) : parsed.amPm,
    };

    // Keep time editable when only one selector is changed by filling missing
    // pieces with the first available option instead of clearing the field.
    if (!next.hour) {
      next.hour = ISSUE.EVENT_TIME_HOURS[0] ?? "01";
    }
    if (!next.minute) {
      next.minute = ISSUE.EVENT_TIME_MINUTES[0] ?? "00";
    }

    updateEventData(key, `${to24h(next.hour, next.amPm)}:${next.minute}`);
  };

  React.useEffect(() => {
    setPortalElement(document.body);
  }, []);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFormValues(buildInitialFormValues());
  }, [buildInitialFormValues, isOpen]);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeydown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [handleClose, isOpen]);

  React.useEffect(() => {
    if (!isOpen || formValues.team || !rolesData?.length) {
      return;
    }

    const firstRole = rolesData[0];
    if (!firstRole) {
      return;
    }

    updateForm("team", firstRole.id);
  }, [formValues.team, isOpen, rolesData]);

  const handleOverlayPointerDown = (
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitDisabled) {
      return;
    }

    const toSubmitValues = (
      date: Date,
      eventDataValue?: ISSUE.EventFormValues,
    ): ISSUE.IssueSubmitValues => ({
      id: formValues.id,
      status: formValues.status,
      name: formValues.name,
      description: formValues.description.trim(),
      links: formValues.links,
      date,
      priority: formValues.priority,
      team: formValues.team,
      parent: formValues.parent,
      isEvent: formValues.isEvent,
      event: formValues.event ?? null,
      eventData: eventDataValue,
      teamVisibilityIds:
        safeVisibilityIds.length > 0 ? safeVisibilityIds : undefined,
      assigneeIds: formValues.assigneeIds,
    });

    // If not event, clear event field
    if (!formValues.isEvent) {
      onSubmit?.(
        toSubmitValues(normalizeTaskDueDate(formValues.date), undefined),
      );
      if (!isControlled) {
        setInternalOpen(false);
      }
    } else {
      const startDate = formValues.eventData?.startDate;
      const startTime = formValues.eventData?.startTime;
      const linkedIssueDate = parseEventDateTime(startDate, startTime);

      if (
        !linkedIssueDate ||
        !isEventTimingValid ||
        linkedIssueDate.getTime() <= Date.now()
      ) {
        return;
      }

      onSubmit?.(
        toSubmitValues(linkedIssueDate, {
          ...(formValues.eventData ?? defaultEventForm()),
          name: formValues.name.trim(),
          description: (formValues.eventData?.description ?? "").trim(),
          roles: safeEventVisibilityIds,
        }),
      );
      if (!isControlled) {
        setInternalOpen(false);
      }
    }
  };

  const handleDelete = () => {
    if (intent === "edit") {
      onDelete?.({
        id: formValues.id,
        status: formValues.status,
        name: formValues.name,
        description: formValues.description,
        links: formValues.links,
        date: formValues.date,
        priority: formValues.priority,
        team: formValues.team,
        parent: formValues.parent,
        isEvent: formValues.isEvent,
        event: formValues.event ?? null,
        eventData: formValues.eventData,
        teamVisibilityIds:
          safeVisibilityIds.length > 0 ? safeVisibilityIds : undefined,
        assigneeIds: formValues.assigneeIds,
      });
    }
  };

  if (!portalElement) {
    return trigger;
  }

  return (
    <>
      {trigger}
      {isOpen &&
        createPortal(
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
                onClick={handleClose}
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
                      value={formValues.name}
                      onChange={(event) =>
                        updateForm("name", event.target.value)
                      }
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Is Event?</Label>
                    <div className="col-span-3 flex items-center space-x-2">
                      <Checkbox
                        checked={formValues.isEvent}
                        onCheckedChange={(checked) => {
                          const nextIsEvent = checked === true;
                          if (nextIsEvent) {
                            setFormValues((previous) => ({
                              ...previous,
                              isEvent: true,
                              eventData:
                                previous.eventData ?? defaultEventForm(),
                            }));
                            return;
                          }

                          setFormValues((previous) => ({
                            ...previous,
                            isEvent: false,
                            eventData: undefined,
                          }));
                        }}
                      />
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
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {ISSUE.ISSUE_STATUS.map((status) => (
                          <SelectItem key={status} value={status}>
                            <div className="flex items-center">
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
                    <>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Tag</Label>
                        <Select
                          value={
                            formValues.eventData?.tag ?? EVENTS.EVENT_TAGS[0]
                          }
                          onValueChange={(value) =>
                            updateEventData("tag", value)
                          }
                        >
                          <SelectTrigger
                            className={cn(baseField, "col-span-3")}
                            aria-label="Event tag"
                          >
                            <SelectValue placeholder="Select a tag" />
                          </SelectTrigger>
                          <SelectContent>
                            {EVENTS.EVENT_TAGS.map((tagOption) => (
                              <SelectItem key={tagOption} value={tagOption}>
                                {tagOption}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Hackathon</Label>
                        <Select
                          value={formValues.eventData?.hackathonId ?? "none"}
                          onValueChange={(value) =>
                            updateEventData(
                              "hackathonId",
                              value === "none" ? undefined : value,
                            )
                          }
                        >
                          <SelectTrigger
                            className={cn(baseField, "col-span-3")}
                            aria-label="Hackathon"
                          >
                            <SelectValue placeholder="Select a hackathon" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {isHackathonsLoading && (
                              <SelectItem value="loading" disabled>
                                Loading hackathons...
                              </SelectItem>
                            )}
                            {hackathonsError && (
                              <SelectItem value="error" disabled>
                                Failed to load hackathons
                              </SelectItem>
                            )}
                            {hackathons?.map((h) => (
                              <SelectItem key={h.id} value={h.id}>
                                {h.displayName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label
                          htmlFor={`${baseId}-event-start-date`}
                          className="text-right"
                        >
                          Start Date
                        </Label>
                        <Input
                          id={`${baseId}-event-start-date`}
                          type="date"
                          className={cn(baseField, "col-span-3")}
                          value={formValues.eventData?.startDate ?? ""}
                          onChange={(e) =>
                            updateEventData("startDate", e.target.value)
                          }
                        />
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Start Time</Label>
                        <div className="col-span-3 flex items-center space-x-2">
                          <Select
                            value={
                              parseTimeTo12h(formValues.eventData?.startTime)
                                .hour
                            }
                            onValueChange={(value) =>
                              updateEventTimePart("start", "hour", value)
                            }
                          >
                            <SelectTrigger className="w-[80px]">
                              <SelectValue placeholder="HH" />
                            </SelectTrigger>
                            <SelectContent>
                              {ISSUE.EVENT_TIME_HOURS.map((h) => (
                                <SelectItem key={h} value={h}>
                                  {h}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <span>:</span>

                          <Select
                            value={
                              parseTimeTo12h(formValues.eventData?.startTime)
                                .minute
                            }
                            onValueChange={(value) =>
                              updateEventTimePart("start", "minute", value)
                            }
                          >
                            <SelectTrigger className="w-[80px]">
                              <SelectValue placeholder="MM" />
                            </SelectTrigger>
                            <SelectContent>
                              {ISSUE.EVENT_TIME_MINUTES.map((m) => (
                                <SelectItem key={m} value={m}>
                                  {m}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select
                            value={
                              parseTimeTo12h(formValues.eventData?.startTime)
                                .amPm
                            }
                            onValueChange={(value) =>
                              updateEventTimePart("start", "amPm", value)
                            }
                          >
                            <SelectTrigger className="w-[80px]">
                              <SelectValue placeholder="AM/PM" />
                            </SelectTrigger>
                            <SelectContent>
                              {ISSUE.EVENT_TIME_AM_PM_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label
                          htmlFor={`${baseId}-event-end-date`}
                          className="text-right"
                        >
                          End Date
                        </Label>
                        <Input
                          id={`${baseId}-event-end-date`}
                          type="date"
                          className={cn(baseField, "col-span-3")}
                          value={formValues.eventData?.endDate ?? ""}
                          onChange={(e) =>
                            updateEventData("endDate", e.target.value)
                          }
                        />
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">End Time</Label>
                        <div className="col-span-3 flex items-center space-x-2">
                          <Select
                            value={
                              parseTimeTo12h(formValues.eventData?.endTime).hour
                            }
                            onValueChange={(value) =>
                              updateEventTimePart("end", "hour", value)
                            }
                          >
                            <SelectTrigger className="w-[80px]">
                              <SelectValue placeholder="HH" />
                            </SelectTrigger>
                            <SelectContent>
                              {ISSUE.EVENT_TIME_HOURS.map((h) => (
                                <SelectItem key={h} value={h}>
                                  {h}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <span>:</span>

                          <Select
                            value={
                              parseTimeTo12h(formValues.eventData?.endTime)
                                .minute
                            }
                            onValueChange={(value) =>
                              updateEventTimePart("end", "minute", value)
                            }
                          >
                            <SelectTrigger className="w-[80px]">
                              <SelectValue placeholder="MM" />
                            </SelectTrigger>
                            <SelectContent>
                              {ISSUE.EVENT_TIME_MINUTES.map((m) => (
                                <SelectItem key={m} value={m}>
                                  {m}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select
                            value={
                              parseTimeTo12h(formValues.eventData?.endTime).amPm
                            }
                            onValueChange={(value) =>
                              updateEventTimePart("end", "amPm", value)
                            }
                          >
                            <SelectTrigger className="w-[80px]">
                              <SelectValue placeholder="AM/PM" />
                            </SelectTrigger>
                            <SelectContent>
                              {ISSUE.EVENT_TIME_AM_PM_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label
                          htmlFor={`${baseId}-event-location`}
                          className="text-right"
                        >
                          Room
                        </Label>
                        <Input
                          id={`${baseId}-event-location`}
                          className={cn(baseField, "col-span-3")}
                          placeholder="Enter room"
                          value={formValues.eventData?.location ?? ""}
                          onChange={(e) =>
                            updateEventData("location", e.target.value)
                          }
                        />
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Internal Event?</Label>
                        <div className="col-span-3 flex items-center">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={
                                formValues.eventData?.isOperationsCalendar ??
                                false
                              }
                              onCheckedChange={(checked) =>
                                updateEventData(
                                  "isOperationsCalendar",
                                  checked === true,
                                )
                              }
                            />
                            <span className="text-sm font-normal text-gray-400">
                              Use Operations Calendar (Hide from public events)
                            </span>
                          </div>
                        </div>
                      </div>

                      {(formValues.eventData?.isOperationsCalendar ??
                        false) && (
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right">
                            Discord Channel ID
                          </Label>
                          <Input
                            className={cn(baseField, "col-span-3")}
                            placeholder="Paste Discord voice channel ID"
                            value={formValues.eventData?.discordChannelId ?? ""}
                            onChange={(event) =>
                              updateEventData(
                                "discordChannelId",
                                event.target.value,
                              )
                            }
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Dues Paying?</Label>
                        <div className="col-span-3 flex items-center">
                          <Checkbox
                            checked={formValues.eventData?.dues_paying ?? false}
                            onCheckedChange={(checked) =>
                              updateEventData("dues_paying", checked === true)
                            }
                          />
                        </div>
                      </div>
                    </>
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
                            updateForm(
                              "date",
                              normalizeTaskDueDate(e.target.value),
                            )
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
                          value={ISSUE.TASK_DUE_TIME}
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
                        {isRolesLoading && (
                          <SelectItem value="loading" disabled>
                            Loading teams...
                          </SelectItem>
                        )}
                        {rolesError && (
                          <SelectItem value="error" disabled>
                            Failed to load teams
                          </SelectItem>
                        )}
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
                      htmlFor={`${baseId}-internal-description`}
                      className="pt-2 text-right"
                    >
                      {formValues.isEvent
                        ? "Internal Description"
                        : "Description"}
                    </Label>
                    <Textarea
                      id={`${baseId}-internal-description`}
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

                  {formValues.isEvent && (
                    <div className="grid grid-cols-4 items-start gap-4">
                      <Label
                        htmlFor={`${baseId}-external-description`}
                        className="pt-2 text-right"
                      >
                        External Description
                      </Label>
                      <Textarea
                        id={`${baseId}-external-description`}
                        className={cn(
                          baseField,
                          "col-span-3 min-h-[140px] resize-none",
                        )}
                        placeholder="Public-facing event description..."
                        value={formValues.eventData?.description ?? ""}
                        onChange={(event) =>
                          updateEventData("description", event.target.value)
                        }
                      />
                    </div>
                  )}

                  {/* Issue Visible To Roles */}
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label className="mt-1 text-right">
                      Issue Visible To Roles
                    </Label>
                    <div className="col-span-3 mt-1 grid grid-cols-2 gap-x-2 gap-y-3">
                      {rolesData?.map((role) => (
                        <div
                          key={role.id}
                          className="flex flex-row items-start space-x-3 space-y-0"
                        >
                          <Checkbox
                            checked={formValues.roles.includes(role.id)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? updateForm(
                                    "roles",
                                    Array.from(
                                      new Set([...formValues.roles, role.id]),
                                    ),
                                  )
                                : updateForm(
                                    "roles",
                                    formValues.roles.filter(
                                      (value) => value !== role.id,
                                    ),
                                  );
                            }}
                          />
                          <Label className="cursor-pointer font-normal">
                            {role.name}
                          </Label>
                        </div>
                      ))}
                      <p className="col-span-2 text-sm font-normal text-gray-400">
                        Teams who can see and manage the issue
                      </p>
                    </div>
                  </div>

                  {formValues.isEvent && (
                    <div className="grid grid-cols-4 items-start gap-4">
                      <Label className="mt-1 text-right">
                        Event Visible To Roles
                      </Label>
                      <div className="col-span-3 mt-1 grid grid-cols-2 gap-x-2 gap-y-3">
                        {rolesData?.map((role) => (
                          <div
                            key={`event-role-${role.id}`}
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <Checkbox
                              checked={
                                formValues.eventData?.roles?.includes(
                                  role.id,
                                ) ?? false
                              }
                              onCheckedChange={(checked) => {
                                const currentRoles =
                                  formValues.eventData?.roles ?? [];
                                return checked
                                  ? updateEventData(
                                      "roles",
                                      Array.from(
                                        new Set([...currentRoles, role.id]),
                                      ),
                                    )
                                  : updateEventData(
                                      "roles",
                                      currentRoles.filter(
                                        (value) => value !== role.id,
                                      ),
                                    );
                              }}
                            />
                            <Label className="cursor-pointer font-normal">
                              {role.name}
                            </Label>
                          </div>
                        ))}
                        <p className="col-span-2 text-sm font-normal text-gray-400">
                          Teams who can see and join the event
                        </p>
                      </div>
                    </div>
                  )}
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
                      onClick={handleClose}
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
        )}
    </>
  );
}
