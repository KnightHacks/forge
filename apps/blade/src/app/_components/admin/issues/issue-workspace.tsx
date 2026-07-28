"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronDown,
  Columns3,
  Filter,
  LayoutTemplate,
  Link2,
  List,
  ListTodo,
  Loader2,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";

import type { RouterInputs } from "@forge/api";
import { ISSUE } from "@forge/consts";
import { cn } from "@forge/ui";
import { Alert, AlertDescription, AlertTitle } from "@forge/ui/alert";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Checkbox } from "@forge/ui/checkbox";
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
import { MarkdownContent } from "@forge/ui/markdown-content";
import { Textarea } from "@forge/ui/textarea";
import { toast } from "@forge/ui/toast";
import { defaultIssueDueAt } from "@forge/validators";

import type { EventFormValue } from "../events/event-form-dialog";
import type { IssueSearchInput } from "./params";
import type { IssueWorkspaceData } from "./types";
import {
  ADMIN_PAGE_EYEBROWS,
  adminPageClassName,
  AdminPageHeader,
  adminPageStackClassName,
} from "~/app/_components/shared/admin-page";
import { ISSUE_CREATE_DRAFT_STORAGE_KEY } from "~/consts/browser-storage";
import {
  clubDateKey,
  clubWallClock,
  formatClubDate,
  formatUtcDate,
  formatUtcFullDate,
  formatUtcMonth,
  localNewYorkDateTime,
} from "~/lib/dates";
import { api } from "~/trpc/react";
import { EventFormDialog } from "../events/event-form-dialog";
import {
  IssueCalendarView,
  IssueKanbanView,
  IssueListView,
} from "./issue-views";
import {
  buildIssueSearchParams,
  parseIssueSearchParams,
  shiftIssueCalendarDate,
} from "./params";
import { TemplateCatalogDialog } from "./template-catalog-dialog";

export type IssueWorkspaceView = "archive" | "calendar" | "kanban" | "list";

const ISSUE_WORKSPACE_EYEBROW: Record<IssueWorkspaceView, string> = {
  archive: ADMIN_PAGE_EYEBROWS.issueArchive,
  calendar: ADMIN_PAGE_EYEBROWS.issueCalendar,
  kanban: ADMIN_PAGE_EYEBROWS.issueKanban,
  list: ADMIN_PAGE_EYEBROWS.issueList,
};

interface IssueDraft {
  assigneeIds: string[];
  children: NonNullable<RouterInputs["issues"]["create"]["children"]>;
  creationKey: string;
  description: string;
  dueDate: string;
  dueTime: string;
  eventId: string;
  eventMode: "create" | "link" | "none";
  links: string;
  name: string;
  parentId: string;
  priority: (typeof ISSUE.PRIORITY)[number];
  status: (typeof ISSUE.ISSUE_STATUS)[number];
  team: string;
  teamVisibilityIds: string[];
  templateInput: string;
  templateId: string;
}

function emptyDraft(team = ""): IssueDraft {
  return {
    assigneeIds: [],
    children: [],
    creationKey: crypto.randomUUID(),
    description: "",
    dueDate: "",
    dueTime: ISSUE.TASK_DUE_TIME,
    eventId: "",
    eventMode: "none",
    links: "",
    name: "",
    parentId: "",
    priority: "Medium",
    status: "Backlog",
    team,
    teamVisibilityIds: [],
    templateId: "",
    templateInput: "",
  };
}

interface TemplateBody {
  assigneeIds?: string[];
  children?: TemplateBody[];
  description: string;
  name: string;
  priority: IssueDraft["priority"];
  relativeDueDays?: number;
  status: IssueDraft["status"];
  team: string;
  teamVisibilityIds?: string[];
}

function relativeTemplateDueAt(days: number | undefined) {
  if (days === undefined) return undefined;
  const date = new Date(`${clubDateKey()}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return defaultIssueDueAt(date.toISOString().slice(0, 10));
}

function easternDueParts(iso: string) {
  const { date, time } = clubWallClock(iso);
  return { date, time };
}

function replaceTemplateTokens(value: string, input: string, parent: string) {
  return value.replaceAll("{INPUT}", input).replaceAll("{PARENT}", parent);
}

function materializeTemplateChildren(
  nodes: TemplateBody[],
  options: { input: string; parentName: string; team: string },
): IssueDraft["children"] {
  return nodes.map((node) => {
    const name = replaceTemplateTokens(
      node.name,
      options.input,
      options.parentName,
    );
    return {
      assigneeIds: node.assigneeIds ?? [],
      children: materializeTemplateChildren(node.children ?? [], {
        ...options,
        parentName: name,
      }),
      description: replaceTemplateTokens(
        node.description,
        options.input,
        options.parentName,
      ),
      dueAt: relativeTemplateDueAt(node.relativeDueDays),
      eventId: undefined,
      links: [],
      name,
      priority: node.priority,
      status: node.status,
      team: options.team,
      teamVisibilityIds: node.teamVisibilityIds ?? [],
    };
  });
}

function saveDraft(draft: IssueDraft) {
  window.localStorage.setItem(
    `${ISSUE_CREATE_DRAFT_STORAGE_KEY}:${draft.creationKey}`,
    JSON.stringify(draft),
  );
  window.localStorage.setItem(
    ISSUE_CREATE_DRAFT_STORAGE_KEY,
    draft.creationKey,
  );
}

function loadDraft() {
  const key = window.localStorage.getItem(ISSUE_CREATE_DRAFT_STORAGE_KEY);
  if (!key) return null;
  try {
    const stored = JSON.parse(
      window.localStorage.getItem(`${ISSUE_CREATE_DRAFT_STORAGE_KEY}:${key}`) ??
        "null",
    ) as Partial<IssueDraft> | null;
    if (!stored || typeof stored !== "object") return null;
    return {
      ...emptyDraft(),
      ...stored,
      links: typeof stored.links === "string" ? stored.links : "",
    };
  } catch {
    return null;
  }
}

function discardDraft(draft: IssueDraft) {
  window.localStorage.removeItem(
    `${ISSUE_CREATE_DRAFT_STORAGE_KEY}:${draft.creationKey}`,
  );
  window.localStorage.removeItem(ISSUE_CREATE_DRAFT_STORAGE_KEY);
}

function viewHref(
  view: Exclude<IssueWorkspaceView, "archive">,
  input: IssueSearchInput,
) {
  const query = buildIssueSearchParams(input).toString();
  return `/admin/issues/${view}${query ? `?${query}` : ""}`;
}

function IssueFilters({
  input,
  teams,
}: {
  input: IssueSearchInput;
  teams: IssueWorkspaceData["teams"];
}) {
  const [selectedTeam, setSelectedTeam] = useState(input.teamIds[0] ?? "");
  const assignees = api.issues.listAssignees.useQuery(
    { teamId: selectedTeam },
    { enabled: Boolean(selectedTeam) },
  );
  return (
    <form
      className="grid max-h-[78svh] gap-4 overflow-y-auto p-4 sm:p-5 lg:grid-cols-2"
      method="get"
    >
      {input.calendarMode !== "month" && (
        <input type="hidden" name="mode" value={input.calendarMode} />
      )}
      <input type="hidden" name="date" value={input.calendarDate} />
      {input.sortField !== "dueAt" && (
        <input type="hidden" name="sort" value={input.sortField} />
      )}
      {input.sortDirection !== "asc" && (
        <input type="hidden" name="direction" value={input.sortDirection} />
      )}
      <div className="grid gap-2">
        <Label htmlFor="issues-filter-search">Search</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="issues-filter-search"
            name="q"
            defaultValue={input.search}
            className="h-11 pl-9"
            placeholder="Title or description"
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="issues-filter-team">Owning team</Label>
        <select
          id="issues-filter-team"
          name="team"
          value={selectedTeam}
          onChange={(event) => setSelectedTeam(event.target.value)}
          className="h-11 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Every visible team</option>
          {teams.map((team) => (
            <option value={team.id} key={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>
      <fieldset className="grid gap-2 lg:col-span-2">
        <legend className="text-sm font-medium">Status</legend>
        <div className="flex flex-wrap gap-2">
          {ISSUE.ISSUE_STATUS.map((status) => (
            <label
              key={status}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-white/10 bg-background/60 px-3 text-sm"
            >
              <Checkbox
                name="status"
                value={status}
                defaultChecked={input.statuses.includes(status)}
              />
              {status}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="grid gap-2 lg:col-span-2">
        <legend className="text-sm font-medium">Priority</legend>
        <div className="flex flex-wrap gap-2">
          {ISSUE.PRIORITY.map((priority) => (
            <label
              key={priority}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-white/10 bg-background/60 px-3 text-sm"
            >
              <Checkbox
                name="priority"
                value={priority}
                defaultChecked={input.priorities.includes(priority)}
              />
              {priority}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-2">
        <Label htmlFor="issues-filter-assignee">Assignee</Label>
        <select
          id="issues-filter-assignee"
          name="assignee"
          defaultValue={input.assigneeIds[0] ?? ""}
          disabled={!selectedTeam}
          className="h-11 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
        >
          <option value="">Anyone on the selected team</option>
          {(assignees.data ?? []).map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="issues-filter-due-from">Due from</Label>
          <Input
            id="issues-filter-due-from"
            name="dueFrom"
            type="date"
            defaultValue={input.dueFrom}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="issues-filter-due-to">Due through</Label>
          <Input
            id="issues-filter-due-to"
            name="dueTo"
            type="date"
            defaultValue={input.dueTo}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="issues-filter-event">Club event</Label>
        <select
          id="issues-filter-event"
          name="event"
          defaultValue={input.eventLink}
          className="h-11 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="any">Linked or unlinked</option>
          <option value="linked">Linked to an event</option>
          <option value="unlinked">No linked event</option>
        </select>
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-white/10 bg-background/60 px-3 text-sm lg:col-span-2">
        <Checkbox name="root" value="true" defaultChecked={input.rootOnly} />
        Root issues only
      </label>
      <DialogFooter className="sticky bottom-0 -mx-4 -mb-4 gap-2 border-t border-white/10 bg-card/95 p-3 sm:-mx-5 sm:-mb-5 lg:col-span-2">
        <Button className="h-11" variant="outline" asChild>
          <Link href="?">Clear all</Link>
        </Button>
        <Button className="h-11" type="submit">
          Apply filters
        </Button>
      </DialogFooter>
    </form>
  );
}

function FormSection({
  children,
  description,
  step,
  title,
}: {
  children: React.ReactNode;
  description: string;
  step: string;
  title: string;
}) {
  return (
    <section className="grid min-w-0 gap-4 border-t border-white/10 py-5 lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-6">
      <header>
        <p className="font-mono text-xs font-semibold text-primary">{step}</p>
        <h3 className="mt-1 font-semibold">{title}</h3>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">
          {description}
        </p>
      </header>
      <div className="grid min-w-0 gap-4">{children}</div>
    </section>
  );
}

function IssueCreateDialog({
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
  const [initialDraft] = useState(() => {
    const stored = loadDraft();
    return {
      draft: stored ?? emptyDraft(editableTeams[0]?.id),
      restore: stored,
    };
  });
  const [draft, setDraft] = useState<IssueDraft>(initialDraft.draft);
  const [restore, setRestore] = useState<IssueDraft | null>(
    initialDraft.restore,
  );
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

  useEffect(() => {
    if (!open || restore) return;
    saveDraft(draft);
  }, [draft, open, restore]);

  function update<K extends keyof IssueDraft>(key: K, value: IssueDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function applyTemplate() {
    const template = data.templates.find(
      (item) => item.id === draft.templateId,
    );
    if (!template) return;
    const body = template.body as TemplateBody;
    const input = draft.templateInput.trim();
    if (!input && JSON.stringify(body).includes("{INPUT}")) {
      toast.error("Enter the template value before applying it.");
      return;
    }
    const team = editableTeams.some((item) => item.id === body.team)
      ? body.team
      : draft.team;
    const rootDueAt = relativeTemplateDueAt(body.relativeDueDays);
    const rootDue = rootDueAt ? easternDueParts(rootDueAt) : null;
    const rootName = replaceTemplateTokens(body.name, input, "");
    setDraft((current) => ({
      ...current,
      assigneeIds: body.assigneeIds ?? current.assigneeIds,
      children: materializeTemplateChildren(body.children ?? [], {
        input,
        parentName: rootName,
        team,
      }),
      description: replaceTemplateTokens(body.description, input, ""),
      dueDate: rootDue?.date ?? current.dueDate,
      dueTime: rootDue?.time ?? current.dueTime,
      name: rootName,
      priority: body.priority,
      status: body.status,
      team,
      teamVisibilityIds: body.teamVisibilityIds ?? current.teamVisibilityIds,
    }));
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
        links: draft.links
          .split(/\r?\n/)
          .map((value) => value.trim())
          .filter(Boolean),
        name: draft.name,
        priority: draft.priority,
        parentId: draft.parentId || undefined,
        status: draft.status,
        team: draft.team,
        teamVisibilityIds: draft.teamVisibilityIds,
      });
      discardDraft(draft);
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
          <DialogHeader className="border-b border-border/70 bg-card/95 px-4 py-4 pr-14 text-left sm:px-6">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-5 w-5 text-primary" />
              Create an issue
            </DialogTitle>
            <DialogDescription>
              Capture the operating context now; status and ownership can evolve
              with the work.
            </DialogDescription>
          </DialogHeader>

          {restore ? (
            <div className="grid min-h-80 place-items-center p-4">
              <div className="w-full max-w-md rounded-lg border border-white/10 bg-card/95 p-5">
                <h3 className="text-lg font-semibold">
                  Restore unfinished issue?
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  This browser has a draft saved with its original creation key.
                </p>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  <Button
                    onClick={() => {
                      setDraft(restore);
                      setRestore(null);
                    }}
                  >
                    Restore draft
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      discardDraft(restore);
                      setDraft(emptyDraft(editableTeams[0]?.id));
                      setRestore(null);
                    }}
                  >
                    Discard draft
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
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
                            draft.templateId === template.id
                              ? "secondary"
                              : "outline"
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
                      <Label htmlFor="issue-template-input">
                        Template value
                      </Label>
                      <Input
                        id="issue-template-input"
                        value={draft.templateInput}
                        placeholder="Fall kickoff"
                        onChange={(event) =>
                          update("templateInput", event.target.value)
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={applyTemplate}
                    >
                      Apply template tree
                    </Button>
                  </div>
                )}

                <FormSection
                  step="01"
                  title="Basics"
                  description="Make the outcome clear enough that another teammate can pick it up."
                >
                  <div className="grid gap-2">
                    <Label htmlFor="issue-name">Title</Label>
                    <Input
                      id="issue-name"
                      value={draft.name}
                      required
                      maxLength={200}
                      onChange={(event) => update("name", event.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="issue-description">Description</Label>
                      <div className="flex rounded-md border border-white/10 bg-card/60 p-0.5">
                        <Button
                          type="button"
                          size="sm"
                          variant={!preview ? "secondary" : "ghost"}
                          onClick={() => setPreview(false)}
                        >
                          Write
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={preview ? "secondary" : "ghost"}
                          onClick={() => setPreview(true)}
                        >
                          Preview
                        </Button>
                      </div>
                    </div>
                    {preview ? (
                      <div className="min-h-40 rounded-md border border-white/10 bg-card/50 p-4">
                        <MarkdownContent>
                          {draft.description || "Nothing to preview yet."}
                        </MarkdownContent>
                      </div>
                    ) : (
                      <Textarea
                        id="issue-description"
                        value={draft.description}
                        required
                        maxLength={20_000}
                        rows={7}
                        onChange={(event) =>
                          update("description", event.target.value)
                        }
                      />
                    )}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="issue-status">Status</Label>
                      <select
                        id="issue-status"
                        value={draft.status}
                        className="h-11 rounded-md border border-input bg-background px-3 text-sm"
                        onChange={(event) =>
                          update(
                            "status",
                            event.target.value as IssueDraft["status"],
                          )
                        }
                      >
                        {ISSUE.ISSUE_STATUS.map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="issue-priority">Priority</Label>
                      <select
                        id="issue-priority"
                        value={draft.priority}
                        className="h-11 rounded-md border border-input bg-background px-3 text-sm"
                        onChange={(event) =>
                          update(
                            "priority",
                            event.target.value as IssueDraft["priority"],
                          )
                        }
                      >
                        {ISSUE.PRIORITY.map((priority) => (
                          <option key={priority}>{priority}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </FormSection>

                <FormSection
                  step="02"
                  title="Ownership & visibility"
                  description="The owning team controls edits. Shared teams receive read-only visibility."
                >
                  <div className="grid gap-2">
                    <Label htmlFor="issue-team">Owning team</Label>
                    <select
                      id="issue-team"
                      value={draft.team}
                      required
                      className="h-11 rounded-md border border-input bg-background px-3 text-sm"
                      onChange={(event) => {
                        update("team", event.target.value);
                        update("assigneeIds", []);
                        update("children", []);
                        update("templateId", "");
                      }}
                    >
                      {editableTeams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Assignees</Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {(assignees.data ?? []).map((person) => (
                        <label
                          key={person.id}
                          className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-white/10 bg-card/50 px-3 text-sm"
                        >
                          <Checkbox
                            checked={draft.assigneeIds.includes(person.id)}
                            onCheckedChange={(checked) =>
                              update(
                                "assigneeIds",
                                checked
                                  ? [...draft.assigneeIds, person.id]
                                  : draft.assigneeIds.filter(
                                      (id) => id !== person.id,
                                    ),
                              )
                            }
                          />
                          {person.name}
                        </label>
                      ))}
                    </div>
                    {assignees.isLoading && (
                      <p className="text-sm text-muted-foreground">
                        Loading eligible teammates…
                      </p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label>Share read-only with</Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {data.teams
                        .filter((team) => team.id !== draft.team)
                        .map((team) => (
                          <label
                            key={team.id}
                            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-white/10 bg-card/50 px-3 text-sm"
                          >
                            <Checkbox
                              checked={draft.teamVisibilityIds.includes(
                                team.id,
                              )}
                              onCheckedChange={(checked) =>
                                update(
                                  "teamVisibilityIds",
                                  checked
                                    ? [...draft.teamVisibilityIds, team.id]
                                    : draft.teamVisibilityIds.filter(
                                        (id) => id !== team.id,
                                      ),
                                )
                              }
                            />
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{
                                backgroundColor: team.color ?? "#64748b",
                              }}
                            />
                            {team.name}
                          </label>
                        ))}
                    </div>
                  </div>
                </FormSection>

                <FormSection
                  step="03"
                  title="Scheduling & event"
                  description="Issue due time is independent. New dated work defaults to 11:00 PM Eastern."
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="issue-due-date">Due date</Label>
                      <Input
                        id="issue-due-date"
                        type="date"
                        value={draft.dueDate}
                        onChange={(event) =>
                          update("dueDate", event.target.value)
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="issue-due-time">Due time · Eastern</Label>
                      <Input
                        id="issue-due-time"
                        type="time"
                        value={draft.dueTime}
                        disabled={!draft.dueDate}
                        onChange={(event) =>
                          update("dueTime", event.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Club event</Label>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {(["none", "link", "create"] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          disabled={mode === "create" && !access.canCreateEvent}
                          onClick={() =>
                            mode === "create"
                              ? setEventStep(true)
                              : update("eventMode", mode)
                          }
                          className={cn(
                            "min-h-11 rounded-md border px-3 text-left text-sm transition-colors disabled:opacity-50",
                            draft.eventMode === mode
                              ? "border-primary/40 bg-primary/10"
                              : "border-white/10 bg-card/50 hover:bg-card",
                          )}
                        >
                          {mode === "none"
                            ? "No event"
                            : mode === "link"
                              ? "Link existing"
                              : "Create new"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {draft.eventMode === "link" && (
                    <div className="grid gap-2">
                      <Label htmlFor="issue-event">Existing event</Label>
                      <select
                        id="issue-event"
                        value={draft.eventId}
                        required
                        className="h-11 rounded-md border border-input bg-background px-3 text-sm"
                        onChange={(event) =>
                          update("eventId", event.target.value)
                        }
                      >
                        <option value="">Search or choose an event</option>
                        {(events.data ?? []).map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} · {formatClubDate(item.start)}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        variant="ghost"
                        className="justify-self-start px-0"
                        onClick={() => {
                          const selected = events.data?.find(
                            (item) => item.id === draft.eventId,
                          );
                          if (selected) {
                            const parts = clubWallClock(selected.start);
                            update("dueDate", parts.date);
                            update("dueTime", parts.time);
                          }
                        }}
                      >
                        Use event start as due time
                      </Button>
                    </div>
                  )}
                </FormSection>

                <FormSection
                  step="04"
                  title="Links & hierarchy"
                  description="Keep discussion in the linked work systems. Child issue creation remains atomic through templates and the API."
                >
                  <div className="grid gap-2">
                    <Label htmlFor="issue-parent">Parent issue</Label>
                    <select
                      id="issue-parent"
                      value={draft.parentId}
                      className="h-11 rounded-md border border-input bg-background px-3 text-sm"
                      onChange={(event) =>
                        update("parentId", event.target.value)
                      }
                    >
                      <option value="">Create as a root issue</option>
                      {(parentIssues.data?.rows ?? []).map((issue) => (
                        <option key={issue.id} value={issue.id}>
                          {issue.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-sm text-muted-foreground">
                      Parents must be active and owned by the same team.
                    </p>
                  </div>
                  {draft.children.length > 0 && (
                    <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
                      <p className="text-sm font-medium">Template hierarchy</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        This creation will atomically add{" "}
                        {draft.children.length} direct child
                        {draft.children.length === 1 ? "" : "ren"} plus any
                        nested descendants.
                      </p>
                    </div>
                  )}
                  <div className="grid gap-2">
                    <Label htmlFor="issue-links">
                      External links · one per line
                    </Label>
                    <Textarea
                      id="issue-links"
                      value={draft.links}
                      rows={4}
                      placeholder="https://linear.app/…&#10;https://docs.google.com/…"
                      onChange={(event) => update("links", event.target.value)}
                    />
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Link2 className="h-4 w-4" />
                      HTTP and HTTPS links only, up to 20.
                    </p>
                  </div>
                </FormSection>
              </div>
              <DialogFooter className="sticky bottom-0 gap-2 border-t border-border/70 bg-card/95 p-3 sm:p-4">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createIssue.isPending || !access.canEdit}
                >
                  {createIssue.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Create issue
                </Button>
              </DialogFooter>
            </form>
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

export function IssueWorkspace({
  access,
  data,
  input,
  view,
}: {
  access: {
    canCreateEvent: boolean;
    canEdit: boolean;
    canManageTemplates: boolean;
  };
  data: IssueWorkspaceData;
  input: IssueSearchInput;
  view: IssueWorkspaceView;
}) {
  const router = useRouter();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const query = buildIssueSearchParams(input).toString();
  const calendarFocus = new Date(`${input.calendarDate}T12:00:00.000Z`);
  const previousCalendarDate = shiftIssueCalendarDate(
    input.calendarDate,
    input.calendarMode,
    -1,
  );
  const nextCalendarDate = shiftIssueCalendarDate(
    input.calendarDate,
    input.calendarMode,
    1,
  );
  const calendarPeriodLabel =
    input.calendarMode === "month"
      ? formatUtcMonth(calendarFocus)
      : input.calendarMode === "week"
        ? `Week of ${formatUtcDate(calendarFocus)}`
        : formatUtcFullDate(calendarFocus);

  return (
    <main
      className={`${adminPageClassName} [&_a:has(>svg)]:gap-2 [&_button:has(>svg)]:gap-2`}
    >
      <div className={adminPageStackClassName}>
        <AdminPageHeader
          actions={
            <dl className="grid grid-cols-3 overflow-hidden rounded-lg border border-white/10 bg-card/90">
              {[
                { label: "Open", value: data.counts.open },
                { label: "Finished", value: data.counts.finished },
                { label: "Visible", value: data.pagination.totalCount },
              ].map((metric) => (
                <div
                  className="min-w-20 border-l border-white/10 px-3 py-2 text-center first:border-l-0 sm:min-w-24"
                  key={metric.label}
                >
                  <dt className="text-xs text-muted-foreground">
                    {metric.label}
                  </dt>
                  <dd className="mt-0.5 font-mono text-base font-semibold">
                    {metric.value}
                  </dd>
                </div>
              ))}
            </dl>
          }
          description="Shared work from planning through completion."
          eyebrow={ISSUE_WORKSPACE_EYEBROW[view]}
          icon={ListTodo}
          title="Issues"
        />

        <section
          className="overflow-hidden rounded-lg border border-white/10 bg-card/95 shadow-xl shadow-black/10"
          data-issue-dock
        >
          <div className="flex min-w-0 flex-col gap-2 bg-background/25 p-2 lg:flex-row lg:items-center lg:justify-between">
            <nav className="grid grid-cols-3 gap-1" aria-label="Issue views">
              {(
                [
                  { icon: CalendarDays, id: "calendar", label: "Calendar" },
                  { icon: Columns3, id: "kanban", label: "Kanban" },
                  { icon: List, id: "list", label: "List" },
                ] as const
              ).map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.id}
                    variant={view === item.id ? "secondary" : "ghost"}
                    className="h-11"
                    asChild
                  >
                    <Link
                      href={viewHref(item.id, input)}
                      aria-current={view === item.id ? "page" : undefined}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </Button>
                );
              })}
            </nav>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Button
                className="h-11 flex-1 sm:flex-none"
                variant={filtersOpen ? "secondary" : "outline"}
                onClick={() => setFiltersOpen(true)}
              >
                <Filter className="h-4 w-4" />
                Filters
                {input.statuses.length + input.teamIds.length > 0 && (
                  <Badge className="ml-1">
                    {input.statuses.length + input.teamIds.length}
                  </Badge>
                )}
              </Button>
              <Button
                className="h-11"
                variant="outline"
                onClick={() => setTemplatesOpen(true)}
              >
                <LayoutTemplate className="h-4 w-4" />
                Templates
              </Button>
              <Button className="h-11" variant="outline" asChild>
                <Link href={`/admin/issues/archive${query ? `?${query}` : ""}`}>
                  <Archive className="h-4 w-4" />
                  Archive
                </Link>
              </Button>
              <Button
                className="h-11"
                disabled={!access.canEdit}
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Create
              </Button>
            </div>
          </div>

          {view === "calendar" && (
            <div
              className="flex min-h-[3.75rem] flex-col gap-2 border-t border-white/10 bg-card/30 px-2 py-1.5 sm:h-[3.75rem] sm:flex-row sm:items-center sm:justify-between"
              data-issue-context
            >
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" asChild>
                  <Link
                    aria-label={`Previous ${input.calendarMode}`}
                    href={viewHref("calendar", {
                      ...input,
                      calendarDate: previousCalendarDate,
                    })}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link
                    href={viewHref("calendar", {
                      ...input,
                      calendarDate: parseIssueSearchParams({}).calendarDate,
                    })}
                  >
                    Today
                  </Link>
                </Button>
                <Button size="icon" variant="ghost" asChild>
                  <Link
                    aria-label={`Next ${input.calendarMode}`}
                    href={viewHref("calendar", {
                      ...input,
                      calendarDate: nextCalendarDate,
                    })}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <p className="ml-2 text-sm font-medium">
                  {calendarPeriodLabel}
                </p>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">Eastern</p>
                <div className="grid grid-cols-3 gap-1 rounded-md border border-white/10 bg-background/60 p-1">
                  {(["month", "week", "day"] as const).map((mode) => (
                    <Button
                      key={mode}
                      size="sm"
                      variant={
                        input.calendarMode === mode ? "secondary" : "ghost"
                      }
                      className="capitalize"
                      asChild
                    >
                      <Link
                        href={viewHref("calendar", {
                          ...input,
                          calendarMode: mode,
                          page: 1,
                        })}
                      >
                        {mode}
                      </Link>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(view === "list" || view === "archive") && (
            <div
              className="flex min-h-[3.75rem] flex-wrap items-center justify-end gap-2 border-t border-white/10 bg-card/30 px-2 py-1.5 sm:h-[3.75rem]"
              data-issue-context
            >
              <Label className="sr-only" htmlFor="issues-sort-field">
                Sort issues
              </Label>
              <select
                id="issues-sort-field"
                aria-label="Sort issues"
                value={input.sortField}
                className="h-11 rounded-md border border-input bg-background px-3 text-sm"
                onChange={(event) =>
                  router.push(
                    `?${buildIssueSearchParams({ ...input, page: 1, sortField: event.target.value as IssueSearchInput["sortField"] }).toString()}`,
                  )
                }
              >
                <option value="dueAt">Due date</option>
                <option value="updatedAt">Last updated</option>
                <option value="name">Name</option>
                <option value="status">Status</option>
                <option value="priority">Priority</option>
              </select>
              <Button
                className="h-11"
                variant="outline"
                onClick={() =>
                  router.push(
                    `?${buildIssueSearchParams({ ...input, page: 1, sortDirection: input.sortDirection === "asc" ? "desc" : "asc" }).toString()}`,
                  )
                }
              >
                {input.sortDirection === "asc" ? "Ascending" : "Descending"}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    input.sortDirection === "asc" && "rotate-180",
                  )}
                />
              </Button>
              <Label className="sr-only" htmlFor="issues-page-size">
                Issues per page
              </Label>
              <select
                id="issues-page-size"
                aria-label="Issues per page"
                value={input.pageSize}
                className="h-11 rounded-md border border-input bg-background px-3 text-sm"
                onChange={(event) =>
                  router.push(
                    `?${buildIssueSearchParams({ ...input, page: 1, pageSize: Number(event.target.value) as IssueSearchInput["pageSize"] }).toString()}`,
                  )
                }
              >
                <option value="25">25 / page</option>
                <option value="50">50 / page</option>
                <option value="100">100 / page</option>
              </select>
            </div>
          )}

          {view === "kanban" && (
            <div
              className="flex min-h-[3.75rem] items-center justify-between gap-3 border-t border-white/10 bg-card/30 px-4 py-1.5 sm:h-[3.75rem]"
              data-issue-context
            >
              <p className="text-sm font-medium">
                {data.issues.length} issues loaded
              </p>
              <p className="text-right text-sm text-muted-foreground">
                Drag a card or use its status menu
              </p>
            </div>
          )}
        </section>

        {view === "calendar" ? (
          <IssueCalendarView
            issues={data.issues}
            mode={input.calendarMode}
            month={calendarFocus}
          />
        ) : view === "kanban" ? (
          <IssueKanbanView issues={data.issues} />
        ) : (
          <IssueListView issues={data.issues} />
        )}

        {(view === "list" || view === "archive") &&
          data.pagination.pageCount > 1 && (
            <nav
              className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-card/95 p-2"
              aria-label="Issue pages"
            >
              <p className="px-2 text-sm text-muted-foreground">
                Page {data.pagination.page} of {data.pagination.pageCount}
              </p>
              <div className="flex gap-2">
                {data.pagination.page > 1 ? (
                  <Button variant="outline" asChild>
                    <Link
                      href={`?${buildIssueSearchParams({ ...input, page: data.pagination.page - 1 }).toString()}`}
                    >
                      Previous
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" disabled>
                    Previous
                  </Button>
                )}
                {data.pagination.page < data.pagination.pageCount ? (
                  <Button variant="outline" asChild>
                    <Link
                      href={`?${buildIssueSearchParams({ ...input, page: data.pagination.page + 1 }).toString()}`}
                    >
                      Next
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" disabled>
                    Next
                  </Button>
                )}
              </div>
            </nav>
          )}

        {view === "archive" && data.issues.length === 0 && (
          <Alert>
            <Archive className="h-4 w-4" />
            <AlertTitle>Archive is empty</AlertTitle>
            <AlertDescription>
              Archived issue trees remain recoverable here.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="max-h-[92svh] max-w-3xl gap-0 overflow-hidden border-white/10 bg-card p-0 [&_a:has(>svg)]:gap-2 [&_button:has(>svg)]:gap-2">
          <DialogHeader className="border-b border-white/10 px-5 py-4 pr-14 text-left">
            <DialogTitle>Filter issues</DialogTitle>
            <DialogDescription>
              Narrow the current workspace without moving the work surface.
            </DialogDescription>
          </DialogHeader>
          <IssueFilters input={input} teams={data.teams} />
        </DialogContent>
      </Dialog>

      {createOpen && (
        <IssueCreateDialog
          access={access}
          data={data}
          onClose={() => setCreateOpen(false)}
          open
        />
      )}
      <TemplateCatalogDialog
        canManage={access.canManageTemplates}
        onClose={() => setTemplatesOpen(false)}
        open={templatesOpen}
        teams={data.teams}
        templates={data.templates}
      />
    </main>
  );
}
