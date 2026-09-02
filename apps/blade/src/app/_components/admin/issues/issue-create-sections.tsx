"use client";

import { Link2 } from "lucide-react";

import { ISSUE } from "@forge/consts";
import { cn } from "@forge/ui";
import { Button } from "@forge/ui/button";
import { Checkbox } from "@forge/ui/checkbox";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { MarkdownContent } from "@forge/ui/markdown-content";
import { Textarea } from "@forge/ui/textarea";

import type { IssueDraft, IssueDraftUpdate } from "./issue-draft";
import type {
  IssueAssigneeChoice,
  IssueEventChoice,
  IssueWorkspaceData,
  IssueWorkspaceItem,
} from "./types";
import { clubWallClock, formatClubDate } from "~/lib/dates";

/**
 * The four numbered steps of the create-issue form.
 *
 * Every component here returns exactly one element, because the form body is a
 * `grid gap-3` and the gap is drawn between *direct children*. Wrapping a step
 * in an extra `<div>` would move it a level down and silently delete the gap
 * above and below it.
 */

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

export function IssueBasicsSection({
  draft,
  preview,
  setPreview,
  update,
}: {
  draft: IssueDraft;
  preview: boolean;
  setPreview: (next: boolean) => void;
  update: IssueDraftUpdate;
}) {
  return (
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
            <MarkdownContent breaks>
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
            onChange={(event) => update("description", event.target.value)}
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
              update("status", event.target.value as IssueDraft["status"])
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
              update("priority", event.target.value as IssueDraft["priority"])
            }
          >
            {ISSUE.PRIORITY.map((priority) => (
              <option key={priority}>{priority}</option>
            ))}
          </select>
        </div>
      </div>
    </FormSection>
  );
}

export function IssueOwnershipSection({
  assignees,
  assigneesLoading,
  draft,
  editableTeams,
  teams,
  update,
}: {
  assignees: IssueAssigneeChoice[];
  assigneesLoading: boolean;
  draft: IssueDraft;
  editableTeams: IssueWorkspaceData["teams"];
  teams: IssueWorkspaceData["teams"];
  update: IssueDraftUpdate;
}) {
  return (
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
          {assignees.map((person) => (
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
                      : draft.assigneeIds.filter((id) => id !== person.id),
                  )
                }
              />
              {person.name}
            </label>
          ))}
        </div>
        {assigneesLoading && (
          <p className="text-sm text-muted-foreground">
            Loading eligible teammates…
          </p>
        )}
      </div>
      <div className="grid gap-2">
        <Label>Share read-only with</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {teams
            .filter((team) => team.id !== draft.team)
            .map((team) => (
              <label
                key={team.id}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-white/10 bg-card/50 px-3 text-sm"
              >
                <Checkbox
                  checked={draft.teamVisibilityIds.includes(team.id)}
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
  );
}

export function IssueSchedulingSection({
  canCreateEvent,
  draft,
  events,
  setEventStep,
  update,
}: {
  canCreateEvent: boolean;
  draft: IssueDraft;
  events: IssueEventChoice[];
  setEventStep: (next: boolean) => void;
  update: IssueDraftUpdate;
}) {
  return (
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
            onChange={(event) => update("dueDate", event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="issue-due-time">Due time · Eastern</Label>
          <Input
            id="issue-due-time"
            type="time"
            value={draft.dueTime}
            disabled={!draft.dueDate}
            onChange={(event) => update("dueTime", event.target.value)}
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
              disabled={mode === "create" && !canCreateEvent}
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
            onChange={(event) => update("eventId", event.target.value)}
          >
            <option value="">Search or choose an event</option>
            {events.map((item) => (
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
              const selected = events.find((item) => item.id === draft.eventId);
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
  );
}

export function IssueLinksSection({
  draft,
  parentIssues,
  update,
}: {
  draft: IssueDraft;
  parentIssues: IssueWorkspaceItem[];
  update: IssueDraftUpdate;
}) {
  return (
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
          onChange={(event) => update("parentId", event.target.value)}
        >
          <option value="">Create as a root issue</option>
          {parentIssues.map((issue) => (
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
            This creation will atomically add {draft.children.length} direct
            child
            {draft.children.length === 1 ? "" : "ren"} plus any nested
            descendants.
          </p>
        </div>
      )}
      <div className="grid gap-2">
        <Label htmlFor="issue-links">External links · one per line</Label>
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
  );
}
