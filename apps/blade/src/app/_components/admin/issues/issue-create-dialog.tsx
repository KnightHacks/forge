"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutTemplate, Loader2, Sparkles } from "lucide-react";

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
import { Label } from "@forge/ui/label";
import { toast } from "@forge/ui/toast";
import { defaultIssueDueAt } from "@forge/validators";

import type { EventFormValue } from "../events/event-form-dialog";
import type { IssueDraft, IssueDraftUpdate } from "./issue-draft";
import type { TemplateBody } from "./issue-template-application";
import type {
  IssueAssigneeChoice,
  IssueEventChoice,
  IssueWorkspaceData,
  IssueWorkspaceItem,
} from "./types";
import { localNewYorkDateTime } from "~/lib/dates";
import { api } from "~/trpc/react";
import { EventFormDialog } from "../events/event-form-dialog";
import {
  IssueBasicsSection,
  IssueLinksSection,
  IssueOwnershipSection,
  IssueSchedulingSection,
} from "./issue-create-sections";
import { parseDraftLinks } from "./issue-draft";
import {
  applyTemplateToDraft,
  relativeTemplateDueAt,
  templateNeedsInput,
} from "./issue-template-application";
import { useIssueCreateDraft } from "./use-issue-create-draft";

function IssueCreateDialogHeader() {
  return (
    <DialogHeader className="border-b border-border/70 bg-card/95 px-4 py-4 pr-14 text-left sm:px-6">
      <DialogTitle className="flex items-center gap-2 text-xl">
        <Sparkles className="h-5 w-5 text-primary" />
        Create an issue
      </DialogTitle>
      <DialogDescription>
        Capture the operating context now; status and ownership can evolve with
        the work.
      </DialogDescription>
    </DialogHeader>
  );
}

function RestoreDraftPrompt({
  onDiscard,
  onRestore,
}: {
  onDiscard: () => void;
  onRestore: () => void;
}) {
  return (
    <div className="grid min-h-80 place-items-center p-4">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-card/95 p-5">
        <h3 className="text-lg font-semibold">Restore unfinished issue?</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          This browser has a draft saved with its original creation key.
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button onClick={onRestore}>Restore draft</Button>
          <Button variant="outline" onClick={onDiscard}>
            Discard draft
          </Button>
        </div>
      </div>
    </div>
  );
}

function IssueCreateForm({
  access,
  assignees,
  assigneesLoading,
  data,
  draft,
  editableTeams,
  events,
  isPending,
  onApplyTemplate,
  onClose,
  onSubmit,
  parentIssues,
  preview,
  setEventStep,
  setPreview,
  update,
}: {
  access: { canCreateEvent: boolean; canEdit: boolean };
  assignees: IssueAssigneeChoice[];
  assigneesLoading: boolean;
  data: IssueWorkspaceData;
  draft: IssueDraft;
  editableTeams: IssueWorkspaceData["teams"];
  events: IssueEventChoice[];
  isPending: boolean;
  onApplyTemplate: () => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  parentIssues: IssueWorkspaceItem[];
  preview: boolean;
  setEventStep: (next: boolean) => void;
  setPreview: (next: boolean) => void;
  update: IssueDraftUpdate;
}) {
  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
      <div className="grid min-w-0 gap-3 overflow-y-auto p-3 sm:p-5">
        {data.templates.length > 0 && (
          <div className="flex min-w-0 items-center gap-2 overflow-x-auto rounded-md border border-primary/20 bg-primary/5 p-2">
            <span className="flex shrink-0 items-center gap-2 px-2 text-sm font-medium">
              <LayoutTemplate className="h-4 w-4 text-primary" />
              Start from
            </span>
            {data.templates
              .filter((template) => !template.disabledAt)
              .map((template) => (
                <Button
                  key={template.id}
                  type="button"
                  size="sm"
                  variant={
                    draft.templateId === template.id ? "secondary" : "outline"
                  }
                  className="shrink-0"
                  onClick={() => {
                    update("templateId", template.id);
                    update("templateInput", draft.name);
                  }}
                >
                  {template.name}
                </Button>
              ))}
          </div>
        )}
        {draft.templateId && (
          <div className="grid gap-3 rounded-md border border-primary/20 bg-primary/5 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="grid gap-2">
              <Label htmlFor="issue-template-input">Template value</Label>
              <Input
                id="issue-template-input"
                value={draft.templateInput}
                placeholder="Fall kickoff"
                onChange={(event) =>
                  update("templateInput", event.target.value)
                }
              />
            </div>
            <Button type="button" variant="secondary" onClick={onApplyTemplate}>
              Apply template tree
            </Button>
          </div>
        )}

        <IssueBasicsSection
          draft={draft}
          preview={preview}
          setPreview={setPreview}
          update={update}
        />

        <IssueOwnershipSection
          assignees={assignees}
          assigneesLoading={assigneesLoading}
          draft={draft}
          editableTeams={editableTeams}
          teams={data.teams}
          update={update}
        />

        <IssueSchedulingSection
          canCreateEvent={access.canCreateEvent}
          draft={draft}
          events={events}
          setEventStep={setEventStep}
          update={update}
        />

        <IssueLinksSection
          draft={draft}
          parentIssues={parentIssues}
          update={update}
        />
      </div>
      <DialogFooter className="sticky bottom-0 gap-2 border-t border-border/70 bg-card/95 p-3 sm:p-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || !access.canEdit}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Create issue
        </Button>
      </DialogFooter>
    </form>
  );
}

export function IssueCreateDialog({
  access,
  data,
  onClose,
  open,
}: {
  access: { canCreateEvent: boolean; canEdit: boolean };
  data: IssueWorkspaceData;
  onClose: () => void;
  open: boolean;
}) {
  const router = useRouter();
  const editableTeams = useMemo(
    () => data.teams.filter((team) => team.canEdit),
    [data.teams],
  );
  const {
    clearStoredDraft,
    discardDraft,
    draft,
    restore,
    restoreDraft,
    setDraft,
    update,
  } = useIssueCreateDraft({ defaultTeamId: editableTeams[0]?.id, open });
  const [preview, setPreview] = useState(false);
  const [eventStep, setEventStep] = useState(false);
  const createIssue = api.issues.create.useMutation();
  const createEvent = api.event.createEvent.useMutation();
  const assignees = api.issues.listAssignees.useQuery(
    { teamId: draft.team },
    { enabled: open && Boolean(draft.team) },
  );
  const events = api.issues.listEvents.useQuery(undefined, { enabled: open });
  const parentIssues = api.issues.list.useQuery(
    {
      pageSize: 100,
      sortDirection: "asc",
      sortField: "name",
      teamIds: draft.team ? [draft.team] : [],
      view: "list",
    },
    { enabled: open && Boolean(draft.team) },
  );
  const eventTags = api.event.listEventTags.useQuery(undefined, {
    enabled: open && access.canCreateEvent,
  });
  const eventRoles = api.event.listAudienceRoles.useQuery(undefined, {
    enabled: open && access.canCreateEvent,
  });
  const eventChannels = api.event.listDiscordChannels.useQuery(undefined, {
    enabled: open && access.canCreateEvent,
  });

  function applyTemplate() {
    const template = data.templates.find(
      (item) => item.id === draft.templateId,
    );
    if (!template) return;
    const body = template.body as TemplateBody;
    const input = draft.templateInput.trim();
    if (!input && templateNeedsInput(body)) {
      toast.error("Enter the template value before applying it.");
      return;
    }
    const team = editableTeams.some((item) => item.id === body.team)
      ? body.team
      : draft.team;
    const rootDueAt = relativeTemplateDueAt(body.relativeDueDays);
    setDraft((current) =>
      applyTemplateToDraft(current, { body, input, rootDueAt, team }),
    );
    toast.success(`Applied ${template.name}.`);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.team) return;
    try {
      const dueAt = draft.dueDate
        ? defaultIssueDueAt(draft.dueDate, draft.dueTime)
        : undefined;
      await createIssue.mutateAsync({
        assigneeIds: draft.assigneeIds,
        children: draft.children,
        creationKey: draft.creationKey,
        description: draft.description,
        dueAt,
        eventId:
          draft.eventMode === "link" && draft.eventId
            ? draft.eventId
            : undefined,
        links: parseDraftLinks(draft.links),
        name: draft.name,
        priority: draft.priority,
        parentId: draft.parentId || undefined,
        status: draft.status,
        team: draft.team,
        teamVisibilityIds: draft.teamVisibilityIds,
      });
      clearStoredDraft();
      toast.success("Issue created.");
      onClose();
      router.refresh();
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "The issue could not be created.",
      );
    }
  }

  async function submitEvent(value: EventFormValue) {
    const values = value.values;
    const result = await createEvent.mutateAsync({
      audience:
        values.audience === "roles"
          ? { roleIds: values.roleIds, type: "roles" }
          : { type: values.audience },
      creationKey: value.creationKey,
      description: values.description,
      end: localNewYorkDateTime(values.end, values.endOffset),
      internalTarget: values.internal
        ? {
            channelId: values.channelId ?? "",
            channelType: values.channelType ?? "voice",
            internal: true,
          }
        : { internal: false },
      location: values.location,
      name: values.name,
      ...(values.pointOverride === null
        ? {}
        : { pointsOverride: values.pointOverride }),
      start: localNewYorkDateTime(values.start, values.startOffset),
      tagId: values.tagId,
    });
    update("eventId", result.eventId);
    update("eventMode", "link");
    setEventStep(false);
    await events.refetch();
    toast.success(
      result.status === "published"
        ? "Event created and linked."
        : "Event saved and linked; a provider needs attention.",
    );
  }

  return (
    <>
      <Dialog
        open={open && !eventStep}
        onOpenChange={(next) => !next && onClose()}
      >
        <DialogContent className="inset-0 left-0 top-0 h-[100svh] max-h-none w-full max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-0 bg-background p-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[92svh] sm:max-w-5xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:border [&_a:has(>svg)]:gap-2 [&_button:has(>svg)]:gap-2">
          <IssueCreateDialogHeader />

          {restore ? (
            <RestoreDraftPrompt
              onDiscard={discardDraft}
              onRestore={restoreDraft}
            />
          ) : (
            <IssueCreateForm
              access={access}
              assignees={assignees.data ?? []}
              assigneesLoading={assignees.isLoading}
              data={data}
              draft={draft}
              editableTeams={editableTeams}
              events={events.data ?? []}
              isPending={createIssue.isPending}
              onApplyTemplate={applyTemplate}
              onClose={onClose}
              onSubmit={submit}
              parentIssues={parentIssues.data?.rows ?? []}
              preview={preview}
              setEventStep={setEventStep}
              setPreview={setPreview}
              update={update}
            />
          )}
        </DialogContent>
      </Dialog>

      <EventFormDialog
        channels={eventChannels.data ?? []}
        onOpenChange={(next) => setEventStep(next)}
        onSubmit={submitEvent}
        open={open && eventStep}
        roles={eventRoles.data ?? []}
        tags={(eventTags.data ?? []).map((tag) => ({
          active: tag.active,
          color: tag.color,
          defaultPoints: tag.defaultPoints,
          id: tag.id,
          name: tag.name,
        }))}
      />
    </>
  );
}
