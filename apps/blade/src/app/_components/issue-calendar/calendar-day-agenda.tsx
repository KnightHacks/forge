"use client";

import { useCallback } from "react";
import { AlertCircle, Copy, Pencil, User, Users } from "lucide-react";

import type { ISSUE } from "@forge/consts";
import { cn } from "@forge/ui";
import { Button } from "@forge/ui/button";
import { toast } from "@forge/ui/toast";

import { CreateEditDialog } from "~/app/_components/issues/create-edit-dialog";
import { api } from "~/trpc/react";

type Issue = ISSUE.IssueFetcherPaneIssue;

function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function teamLabels(
  issue: Issue,
  roleNameById: Map<string, string> | undefined,
): string[] {
  const ids = [issue.team, ...issue.teamVisibility.map((t) => t.teamId)];
  const unique = [...new Set(ids)];
  const labels = unique
    .map((id) => roleNameById?.get(id))
    .filter((label): label is string => Boolean(label?.trim()));
  return labels;
}

function formatTeamLabel(roleName: string) {
  const trimmed = roleName.replace(/\s+team$/i, "").trim();
  return trimmed || roleName;
}

function assigneeDisplayNames(issue: Issue): string[] {
  const rows = issue.userAssignments as unknown as {
    user?: { name?: string | null; discordUserId?: string | null };
  }[];
  return rows
    .map((a) => {
      const n = a.user?.name?.trim();
      if (n) return n;
      const d = a.user?.discordUserId?.trim();
      return d ?? "";
    })
    .filter(Boolean);
}

function isOverdueIssue(issue: Issue) {
  if (issue.status === "FINISHED" || !issue.date) return false;
  const dueDate = new Date(issue.date);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return dueDate < todayStart;
}

function issueStatusForAria(status: Issue["status"]) {
  return status
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export function IssueDayAgenda(props: {
  day: Date;
  issues: Issue[];
  isLoading: boolean;
  roleNameById: Map<string, string> | undefined;
  onIssueSelect?: (issueId: string) => void;
  onIssuesChanged?: () => void;
}) {
  const {
    day,
    issues,
    isLoading,
    roleNameById,
    onIssueSelect,
    onIssuesChanged,
  } = props;

  const utils = api.useUtils();
  const deleteIssueMutation = api.issues.deleteIssue.useMutation({
    onSuccess: async () => {
      await utils.issues.invalidate();
      await utils.issues.getAllIssues.invalidate();
      onIssuesChanged?.();
      toast.success("Issue deleted");
    },
    onError: () => {
      toast.error("Failed to delete issue");
    },
  });

  const handleSubmitEdit = useCallback(async () => {
    await utils.issues.invalidate();
    await utils.issues.getAllIssues.invalidate();
    onIssuesChanged?.();
  }, [onIssuesChanged, utils.issues]);

  const copyIssueLink = useCallback((issueId: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/issues/${issueId}`;
    void navigator.clipboard.writeText(url).then(
      () => {
        toast.success("Issue link copied");
      },
      () => {
        toast.error("Could not copy link");
      },
    );
  }, []);

  const isToday =
    startOfLocalDay(day).getTime() === startOfLocalDay(new Date()).getTime();
  const weekdayShort = day.toLocaleDateString(undefined, {
    weekday: "short",
  });
  const dayOfMonth = day.getDate();

  const header = (
    <div
      className={cn(
        "issue-agenda-day-header shrink-0 border-b border-border px-4 py-2 text-center text-xs font-medium uppercase tracking-wide",
        isToday
          ? "bg-primary/12 font-bold text-primary"
          : "bg-muted/30 text-muted-foreground",
      )}
    >
      {weekdayShort} {dayOfMonth}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {header}
        <div className="px-4 py-10 text-sm text-muted-foreground">
          Loading issues…
        </div>
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {header}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-10 text-center text-sm text-muted-foreground">
          Nothing due on this day.
        </div>
      </div>
    );
  }

  const sorted = [...issues].sort((a, b) => {
    const ta = a.date ? +new Date(a.date) : 0;
    const tb = b.date ? +new Date(b.date) : 0;
    return ta - tb;
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {header}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
        <ul className="list-none space-y-3">
          {sorted.map((issue) => {
            const overdue = isOverdueIssue(issue);
            const teams = teamLabels(issue, roleNameById).map(formatTeamLabel);
            const teamsText = teams.join(" · ");
            const showTeamsBlock = teamsText.length > 0;
            const assigneeNames = assigneeDisplayNames(issue);
            const assigneesText =
              assigneeNames.length > 0
                ? assigneeNames.join(" · ")
                : "Unassigned";

            return (
              <li
                key={issue.id}
                className="rounded-xl border border-border bg-card/80 px-4 py-3.5 shadow-sm ring-1 ring-border/40"
              >
                <div className="flex min-h-8 items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span
                      className="issue-calendar-status-dot size-2.5 shrink-0 self-center rounded-full ring-1 ring-border/60"
                      data-issue-status={issue.status}
                      aria-hidden
                    />
                    {onIssueSelect ? (
                      <button
                        type="button"
                        className="min-w-0 flex-1 cursor-pointer text-left text-base font-semibold leading-snug tracking-tight text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        title={issueStatusForAria(issue.status)}
                        aria-label={`View details: ${issue.name}`}
                        onClick={() => onIssueSelect(issue.id)}
                      >
                        {issue.name}
                      </button>
                    ) : (
                      <h3
                        className="min-w-0 flex-1 text-base font-semibold leading-snug tracking-tight text-foreground"
                        title={issueStatusForAria(issue.status)}
                      >
                        {issue.name}
                      </h3>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1 self-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-8 shrink-0"
                      aria-label={`Copy link to ${issue.name}`}
                      onClick={() => copyIssueLink(issue.id)}
                    >
                      <Copy className="h-4 w-4" aria-hidden />
                    </Button>
                    <CreateEditDialog
                      intent="edit"
                      initialValues={{
                        id: issue.id,
                        status: issue.status,
                        name: issue.name,
                        description: issue.description,
                        links: issue.links ?? [],
                        date: issue.date ?? undefined,
                        priority: issue.priority,
                        team: issue.team,
                        parent: issue.parent ?? undefined,
                        isEvent: issue.event !== null,
                        event: issue.event,
                      }}
                      onSubmit={handleSubmitEdit}
                      onDelete={(values) => {
                        if (!values.id || deleteIssueMutation.isPending) return;
                        deleteIssueMutation.mutate({ id: values.id });
                      }}
                    >
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-8 shrink-0"
                        aria-label={`Edit ${issue.name}`}
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                      </Button>
                    </CreateEditDialog>
                  </div>
                </div>

                <div className="mt-3 space-y-2 border-t border-border/70 pt-3">
                  {overdue ? (
                    <div
                      className="flex items-center gap-1.5 text-xs font-medium text-red-900 dark:text-red-400"
                      role="status"
                    >
                      <AlertCircle
                        className="size-3.5 shrink-0 opacity-90"
                        aria-hidden
                      />
                      <span>Past due</span>
                    </div>
                  ) : null}

                  {showTeamsBlock ? (
                    <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <Users
                        className="mt-0.5 size-3.5 shrink-0 opacity-80"
                        aria-hidden
                      />
                      <span className="min-w-0 leading-relaxed">
                        {teamsText}
                      </span>
                    </div>
                  ) : null}

                  <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <User
                      className="mt-0.5 size-3.5 shrink-0 opacity-80"
                      aria-hidden
                    />
                    <div className="min-w-0 leading-relaxed">
                      <p className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
                        Assignees
                      </p>
                      <p className="mt-0.5 text-muted-foreground">
                        {assigneesText}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
