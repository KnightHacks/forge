"use client";

import type { FormEvent, MouseEvent, ReactElement, ReactNode } from "react";
import {
  cloneElement,
  isValidElement,
  useCallback,
  useId,
  useMemo,
  useState,
} from "react";
import { LayoutTemplate, Loader2, Plus, Trash2 } from "lucide-react";
import { z } from "zod";

import { EVENTS, ISSUE } from "@forge/consts";
import { cn } from "@forge/ui";
import { Button } from "@forge/ui/button";
import { Checkbox } from "@forge/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@forge/ui/dropdown-menu";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { Textarea } from "@forge/ui/textarea";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";
import {
  defaultEventForm,
  getTaskDueDateInputValue,
  normalizeTaskDueDate,
  parseEventDateTime,
} from "./issue-dialog-utils";
import {
  EventFormFields,
  PrioritySelect,
  RoleCheckboxGroup,
  StatusSelect,
  TeamSelect,
} from "./issue-form-fields";
import {
  addChildToIssueNode,
  IssueNode,
  newIssueNode,
  removeIssueNode,
  updateIssueNode,
  validateIssueNodes,
} from "./issue-node";

const baseField = "w-full";

const issueFormSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().min(1),
    team: z.string().min(1),
    isEvent: z.boolean(),
    date: z.date(),
    eventData: z
      .object({
        location: z.string().min(1),
        description: z.string().min(1),
        startDate: z.string().min(1),
        startTime: z.string().min(1),
        endDate: z.string().min(1),
        endTime: z.string().min(1),
        isOperationsCalendar: z.boolean().optional(),
        discordChannelId: z.string().optional(),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.isEvent) {
      if (Number.isNaN(data.date.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid date",
          path: ["date"],
        });
      }
      return;
    }

    const ed = data.eventData;
    if (!ed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Event data required",
      });
      return;
    }

    const start = parseEventDateTime(ed.startDate, ed.startTime);
    const end = parseEventDateTime(ed.endDate, ed.endTime);

    if (!start || !end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid start or end datetime",
      });
      return;
    }

    if (end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time must be after start time",
      });
    }
  });

type CreateEditDialogComponentProps = Omit<
  ISSUE.CreateEditDialogProps,
  "open"
> & {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
};

const defaultForm = (): ISSUE.IssueEditNode => newIssueNode();

function templateToIssueNodes(
  items: ISSUE.IssueTemplate[],
  parentDate: Date,
): ISSUE.IssueEditNode[] {
  return items.map((item) => {
    const date = item.dateMs
      ? new Date(parentDate.getTime() - item.dateMs)
      : undefined;
    return newIssueNode({
      name: item.title,
      description: item.description ?? "",
      team: item.team ?? "",
      date,
      children: templateToIssueNodes(
        item.children ?? [],
        date ?? normalizeTaskDueDate(),
      ),
    });
  });
}

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
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const utils = api.useUtils();
  const rolesQuery = api.roles.getAllLinks.useQuery();
  const hackathonsQuery = api.hackathon.getHackathons.useQuery();
  const createIssueMutation = api.issues.createIssue.useMutation();
  const createEventMutation = api.event.createEvent.useMutation();
  const updateIssueMutation = api.issues.updateIssue.useMutation();
  const isPending =
    createIssueMutation.isPending ||
    createEventMutation.isPending ||
    updateIssueMutation.isPending;
  const rolesData = rolesQuery.data;
  const hackathons = hackathonsQuery.data;
  const isRolesLoading = rolesQuery.isLoading;
  const isHackathonsLoading = hackathonsQuery.isLoading;
  const rolesError = rolesQuery.error;
  const hackathonsError = hackathonsQuery.error;
  const buildInitialFormValues = useCallback(() => {
    const defaults = defaultForm();
    const {
      children: _children,
      ...initial
    }: Partial<ISSUE.IssueSubmitValues> = initialValues ?? {};
    const resolvedEventData = initial.eventData;
    const resolvedRoles = initial.teamVisibilityIds ?? defaults.roles;
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
  const [formValues, setFormValues] = useState<ISSUE.IssueEditNode>(
    buildInitialFormValues,
  );
  const [childIssues, setChildIssues] = useState<ISSUE.IssueEditNode[]>([]);

  const handleClose = useCallback(() => {
    if (isControlled) {
      onOpenChange?.(false);
    } else {
      setInternalOpen(false);
    }
    onClose?.();
    setFormValues(buildInitialFormValues());
    setChildIssues([]);
  }, [buildInitialFormValues, isControlled, onClose, onOpenChange]);

  const trigger = useMemo(() => {
    if (!children || !isValidElement(children)) {
      return null;
    }

    const child = children as ReactElement<{
      onClick?: (event: MouseEvent) => void;
    }>;

    return cloneElement(child, {
      onClick: (event: MouseEvent) => {
        child.props.onClick?.(event);
        if (isControlled) {
          onOpenChange?.(true);
        } else {
          setInternalOpen(true);
        }
      },
    });
  }, [children, isControlled, onOpenChange]);

  const updateForm = <K extends keyof ISSUE.IssueEditNode>(
    key: K,
    value: ISSUE.IssueEditNode[K],
  ) => {
    setFormValues((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const baseId = useId();
  const effectiveTeam = formValues.team || (rolesData?.[0]?.id ?? "");

  const isFormValid = issueFormSchema.safeParse({
    ...formValues,
    team: effectiveTeam,
  }).success;
  const isRolesValid = !rolesError;
  const isEventStartInFuture =
    !formValues.isEvent ||
    Boolean(
      formValues.eventData &&
      (parseEventDateTime(
        formValues.eventData.startDate,
        formValues.eventData.startTime,
      )?.getTime() ?? 0) > Date.now(),
    );

  const isSubmitDisabled =
    !isFormValid ||
    !isRolesValid ||
    !isEventStartInFuture ||
    !validateIssueNodes(childIssues);
  const roleIdSet = useMemo(
    () => new Set((rolesData ?? []).map((role) => role.id)),
    [rolesData],
  );
  const safeVisibilityIds = useMemo(
    () => formValues.roles.filter((roleId) => roleIdSet.has(roleId)),
    [formValues.roles, roleIdSet],
  );
  const safeEventVisibilityIds = useMemo(
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

  const handleUpdateIssue = useCallback(
    (clientId: string, patch: Partial<ISSUE.IssueEditNode>) =>
      setChildIssues((prev) => updateIssueNode(prev, clientId, patch)),
    [],
  );
  const handleRemoveIssue = useCallback(
    (clientId: string) =>
      setChildIssues((prev) => removeIssueNode(prev, clientId)),
    [],
  );
  const handleAddChildIssue = useCallback(
    (parentClientId: string) =>
      setChildIssues((prev) => addChildToIssueNode(prev, parentClientId)),
    [],
  );

  const { data: templates = [], isLoading: isTemplatesLoading } =
    api.issues.getTemplates.useQuery(undefined, { enabled: isOpen });

  const applyTemplate = (template: { name: string; body: unknown }) => {
    const body = template.body as ISSUE.IssueTemplate[];
    const root = Array.isArray(body) ? body[0] : undefined;

    setFormValues((prev) => ({
      ...prev,
      name: root?.title ?? template.name,
      description: root?.description ?? prev.description,
      ...(root?.team ? { team: root.team } : {}),
    }));

    setChildIssues(templateToIssueNodes(root?.children ?? [], formValues.date));
  };

  async function buildIssueNodes(
    nodes: ISSUE.IssueEditNode[],
  ): Promise<ISSUE.IssueSubmitNode[]> {
    const results: ISSUE.IssueSubmitNode[] = [];
    for (const node of nodes) {
      let eventId: string | null = null;

      if (node.isEvent && node.eventData) {
        const ed = node.eventData;
        const startDatetime = parseEventDateTime(ed.startDate, ed.startTime);
        const endDatetime = parseEventDateTime(ed.endDate, ed.endTime);

        if (startDatetime && endDatetime) {
          const createdEvent = await createEventMutation.mutateAsync({
            name: node.name.trim(),
            tag: ed.tag as (typeof EVENTS.EVENT_TAGS)[number],
            description: ed.description.trim(),
            start_datetime: startDatetime,
            end_datetime: endDatetime,
            location: ed.location,
            dues_paying: ed.dues_paying,
            isOperationsCalendar: ed.isOperationsCalendar ?? false,
            discordChannelId: ed.discordChannelId,
            roles: ed.roles ?? [],
            points: ed.points,
            hackathonId: ed.hackathonId ?? undefined,
          });
          eventId = createdEvent.id;
        }
      }

      results.push({
        status: node.status,
        name: node.name,
        description: node.description.trim(),
        links: node.links,
        date: eventId
          ? (parseEventDateTime(
              node.eventData?.startDate,
              node.eventData?.startTime,
            ) ?? normalizeTaskDueDate(node.date))
          : normalizeTaskDueDate(node.date),
        priority: node.priority,
        team: node.team,
        event: eventId,
        teamVisibilityIds: node.roles.length > 0 ? node.roles : undefined,
        assigneeIds: node.assigneeIds,
        children:
          node.children.length > 0
            ? await buildIssueNodes(node.children)
            : undefined,
      });
    }
    return results;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitDisabled || isPending) {
      return;
    }

    const baseIssueFields = {
      status: formValues.status,
      name: formValues.name.trim(),
      description: formValues.description.trim(),
      links: formValues.links,
      priority: formValues.priority,
      team: effectiveTeam,
      teamVisibilityIds:
        safeVisibilityIds.length > 0 ? safeVisibilityIds : undefined,
      assigneeIds: formValues.assigneeIds,
    };

    try {
      if (intent === "create") {
        const submitIssueNodes =
          childIssues.length > 0
            ? await buildIssueNodes(childIssues)
            : undefined;

        if (formValues.isEvent) {
          const ed = formValues.eventData ?? defaultEventForm();
          const startDatetime = parseEventDateTime(ed.startDate, ed.startTime);
          const endDatetime = parseEventDateTime(ed.endDate, ed.endTime);

          if (!startDatetime || !endDatetime) return;

          const createdEvent = await createEventMutation.mutateAsync({
            name: formValues.name.trim(),
            tag: ed.tag as (typeof EVENTS.EVENT_TAGS)[number],
            description: ed.description.trim(),
            start_datetime: startDatetime,
            end_datetime: endDatetime,
            location: ed.location,
            dues_paying: ed.dues_paying,
            isOperationsCalendar: ed.isOperationsCalendar ?? false,
            discordChannelId: ed.discordChannelId,
            roles: safeEventVisibilityIds,
            points: ed.points,
            hackathonId: ed.hackathonId ?? undefined,
          });

          await createIssueMutation.mutateAsync({
            ...baseIssueFields,
            date: startDatetime,
            event: createdEvent.id,
            children: submitIssueNodes,
          });
        } else {
          await createIssueMutation.mutateAsync({
            ...baseIssueFields,
            date: normalizeTaskDueDate(formValues.date),
            event: null,
            children: submitIssueNodes,
          });
        }

        await utils.issues.invalidate();
        toast.success("Issue created successfully");
        onSubmit?.({
          ...baseIssueFields,
          parent: formValues.parent,
          date: formValues.date,
          isEvent: formValues.isEvent,
          event: formValues.event ?? null,
          eventData: formValues.eventData,
        });
      } else if (formValues.id) {
        await updateIssueMutation.mutateAsync({
          id: formValues.id,
          status: formValues.status,
          name: formValues.name.trim(),
          description: formValues.description.trim(),
          priority: formValues.priority,
          team: effectiveTeam,
          parent: formValues.parent ?? null,
          date: formValues.isEvent
            ? undefined
            : normalizeTaskDueDate(formValues.date),
          teamVisibilityIds:
            safeVisibilityIds.length > 0 ? safeVisibilityIds : undefined,
          assigneeIds: formValues.assigneeIds,
        });

        await utils.issues.invalidate();
        toast.success("Issue updated successfully");
        onSubmit?.({
          ...baseIssueFields,
          id: formValues.id,
          parent: formValues.parent,
          date: formValues.date,
          isEvent: formValues.isEvent,
          event: formValues.event ?? null,
          eventData: formValues.eventData,
        });
      }

      handleClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
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
        team: effectiveTeam,
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

  return (
    <>
      {trigger}
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
      >
        <DialogContent className="flex max-h-[70vh] w-full max-w-[800px] flex-col gap-0 overflow-hidden p-0">
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={handleSubmit}
          >
            <DialogHeader className="shrink-0 space-y-0 border-b px-6 py-4 pr-12">
              <p className="text-xs font-medium text-muted-foreground">
                {intent === "edit"
                  ? formValues.isEvent
                    ? "Edit Event"
                    : "Edit Task"
                  : "Create Issue"}
              </p>
              <DialogTitle className="mt-1 text-lg font-semibold">
                {intent === "edit"
                  ? formValues.isEvent
                    ? "Update the event details below"
                    : "Update the task details below"
                  : "Enter the issue details below"}
              </DialogTitle>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-6 px-6 py-6">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Name</Label>
                  <Input
                    className={cn(baseField, "col-span-3")}
                    value={formValues.name}
                    onChange={(event) => updateForm("name", event.target.value)}
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Is Event?</Label>
                  <div className="col-span-3 flex items-center space-x-2">
                    <Checkbox
                      checked={formValues.isEvent}
                      onCheckedChange={(checked) => {
                        const nextIsEvent = checked === true;
                        setFormValues((previous) => ({
                          ...previous,
                          isEvent: nextIsEvent,
                          eventData: nextIsEvent
                            ? (previous.eventData ?? defaultEventForm())
                            : undefined,
                        }));
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Status</Label>
                  <StatusSelect
                    className={cn(baseField, "col-span-3")}
                    value={formValues.status}
                    onValueChange={(v) => updateForm("status", v)}
                  />
                </div>

                {/* Date/Time fields */}
                {formValues.isEvent && formValues.eventData ? (
                  <EventFormFields
                    eventData={formValues.eventData}
                    hackathons={hackathons ?? []}
                    isHackathonsLoading={isHackathonsLoading}
                    hackathonsError={hackathonsError}
                    baseId={baseId}
                    onChange={updateEventData}
                  />
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
                  <PrioritySelect
                    className={cn(baseField, "col-span-3")}
                    value={formValues.priority}
                    onValueChange={(v) => updateForm("priority", v)}
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Team</Label>
                  <TeamSelect
                    className={cn(baseField, "col-span-3")}
                    value={effectiveTeam}
                    onValueChange={(v) => updateForm("team", v)}
                    roles={rolesData ?? []}
                    isLoading={isRolesLoading}
                    error={rolesError}
                  />
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
                <RoleCheckboxGroup
                  label="Issue Visible To Roles"
                  roles={rolesData ?? []}
                  selectedIds={formValues.roles}
                  onChange={(ids) => updateForm("roles", ids)}
                  description="Teams who can see and manage the issue"
                />

                {formValues.isEvent && (
                  <RoleCheckboxGroup
                    label="Event Visible To Roles"
                    roles={rolesData ?? []}
                    selectedIds={formValues.eventData?.roles ?? []}
                    onChange={(ids) => updateEventData("roles", ids)}
                    description="Teams who can see and join the event"
                    keyPrefix="event-role-"
                  />
                )}

                {/* Sub-issues section (create only) */}
                {intent !== "edit" && (
                  <div className="border-t pt-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Sub-issues</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setChildIssues((prev) => [...prev, newIssueNode()])
                        }
                      >
                        <Plus className="mr-2 h-3 w-3" />
                        Add Sub-issue
                      </Button>
                    </div>
                    {childIssues.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No sub-issues yet.
                      </p>
                    )}
                    {childIssues.map((node) => (
                      <IssueNode
                        key={node.clientId}
                        node={node}
                        depth={0}
                        roles={rolesData ?? []}
                        hackathons={hackathons ?? []}
                        onUpdate={handleUpdateIssue}
                        onRemove={handleRemoveIssue}
                        onAddChild={handleAddChildIssue}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="border-t px-6 py-4">
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-3 sm:flex-row">
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto"
                      >
                        <LayoutTemplate className="mr-2 h-4 w-4" />
                        Import Template
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {isTemplatesLoading && (
                        <DropdownMenuItem disabled>Loading…</DropdownMenuItem>
                      )}
                      {!isTemplatesLoading && templates.length === 0 && (
                        <DropdownMenuItem disabled>
                          No templates available
                        </DropdownMenuItem>
                      )}
                      {templates.map((t) => (
                        <DropdownMenuItem
                          key={t.id}
                          onClick={() => applyTemplate(t)}
                        >
                          {t.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
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
                    disabled={isSubmitDisabled || isPending}
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : intent === "edit" ? (
                      formValues.isEvent ? (
                        "Update Event"
                      ) : (
                        "Update Issue"
                      )
                    ) : (
                      "Create Issue"
                    )}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
