"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Check,
  ChevronDown,
  CircleDot,
  Loader2,
} from "lucide-react";

import { ISSUE } from "@forge/consts";
import { cn } from "@forge/ui";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@forge/ui/dropdown-menu";
import { toast } from "@forge/ui/toast";

import type { IssueWorkspaceItem } from "./types";
import { clubDateKey, formatClubDayTime, formatUtcFullDate } from "~/lib/dates";
import { api } from "~/trpc/react";

const STATUS_TONE: Record<(typeof ISSUE.ISSUE_STATUS)[number], string> = {
  Backlog: "bg-slate-400",
  Planning: "bg-amber-400",
  "In Progress": "bg-emerald-400",
  Finished: "bg-rose-400",
};

const PRIORITY_TONE: Record<(typeof ISSUE.PRIORITY)[number], string> = {
  Highest: "border-destructive/35 bg-destructive/10 text-destructive",
  High: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  Medium: "border-primary/25 bg-primary/10 text-primary",
  Low: "border-sky-400/25 bg-sky-400/10 text-sky-200",
  Lowest: "border-white/10 bg-background/70 text-muted-foreground",
};

function dueLabel(date: Date | null) {
  return formatClubDayTime(date, "No due date");
}

function IssueSignal({
  compact = false,
  issue,
}: {
  compact?: boolean;
  issue: IssueWorkspaceItem;
}) {
  return (
    <span
      className={cn(
        "block truncate font-medium",
        compact && "text-[13px] leading-4",
      )}
    >
      {issue.name}
    </span>
  );
}

function useIssueStatus(items: IssueWorkspaceItem[]) {
  const router = useRouter();
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, IssueWorkspaceItem["status"]>
  >({});
  const update = api.issues.update.useMutation();
  const issues = items.map((issue) => ({
    ...issue,
    status: statusOverrides[issue.id] ?? issue.status,
  }));

  async function changeStatus(
    issue: IssueWorkspaceItem,
    status: IssueWorkspaceItem["status"],
  ) {
    if (!issue.canEdit || issue.status === status || update.isPending) return;
    const before = statusOverrides[issue.id];
    setStatusOverrides((current) => ({ ...current, [issue.id]: status }));
    try {
      await update.mutateAsync({
        expectedRevision: issue.revision,
        id: issue.id,
        status,
      });
      toast.success(`Moved to ${status}.`);
      router.refresh();
    } catch (cause) {
      setStatusOverrides((current) => {
        const restored = { ...current };
        if (before) restored[issue.id] = before;
        else delete restored[issue.id];
        return restored;
      });
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Status could not be changed. The previous status was restored.",
      );
    }
  }

  return { changeStatus, issues, pending: update.isPending };
}

function IssueStatusMenu({
  compact = false,
  issue,
  onChange,
  pending,
}: {
  compact?: boolean;
  issue: IssueWorkspaceItem;
  onChange: (
    issue: IssueWorkspaceItem,
    status: IssueWorkspaceItem["status"],
  ) => void;
  pending: boolean;
}) {
  if (!issue.canEdit) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`Change status for ${issue.name}`}
          className={cn(
            "shrink-0 px-0",
            compact ? "h-7 w-7" : "h-11 w-11 md:h-8 md:w-8",
          )}
          disabled={pending}
          size="icon"
          variant="ghost"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {ISSUE.ISSUE_STATUS.map((status) => (
          <DropdownMenuItem
            className="min-h-11 gap-2"
            key={status}
            onSelect={() => onChange(issue, status)}
          >
            <span
              className={cn("h-2.5 w-2.5 rounded-full", STATUS_TONE[status])}
            />
            {status}
            {issue.status === status && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function IssueCard({
  compact = false,
  issue,
  onStatusChange,
  pending,
}: {
  compact?: boolean;
  issue: IssueWorkspaceItem;
  onStatusChange: (
    issue: IssueWorkspaceItem,
    status: IssueWorkspaceItem["status"],
  ) => void;
  pending: boolean;
}) {
  return (
    <article
      className={cn(
        "group flex min-w-0 items-start rounded-md border border-white/10 bg-background/65 transition-colors hover:border-primary/30 hover:bg-background",
        compact ? "p-0.5" : "p-2",
      )}
    >
      <Link
        href={`/admin/issues/${issue.id}`}
        aria-label={`Open ${issue.name}`}
        className={cn(
          "flex min-w-0 flex-1 items-start gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          compact ? "gap-1.5 px-1 py-1" : "p-1",
        )}
      >
        <span
          className={cn(
            "mt-1 h-2 w-2 shrink-0 rounded-full",
            STATUS_TONE[issue.status],
          )}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <IssueSignal compact={compact} issue={issue} />
          {compact ? (
            <span className="mt-0.5 flex min-w-0 items-center gap-1.5 truncate text-xs leading-4 text-muted-foreground">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-sm"
                style={{ backgroundColor: issue.team.color ?? "#7c3aed" }}
                aria-hidden="true"
              />
              <span className="truncate">{issue.team.name}</span>
            </span>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-sm"
                  style={{ backgroundColor: issue.team.color ?? "#7c3aed" }}
                  aria-hidden="true"
                />
                {issue.team.name}
              </span>
              <span>{dueLabel(issue.dueAt)}</span>
              {issue.assignees.length > 0 && (
                <span>
                  {issue.assignees.map((item) => item.name).join(", ")}
                </span>
              )}
            </div>
          )}
        </div>
      </Link>
      <IssueStatusMenu
        compact={compact}
        issue={issue}
        onChange={onStatusChange}
        pending={pending}
      />
    </article>
  );
}

function calendarDays(month: Date) {
  const first = new Date(
    Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1),
  );
  const start = new Date(first);
  start.setUTCDate(first.getUTCDate() - first.getUTCDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + index);
    return day;
  });
}

export function IssueCalendarView({
  issues,
  mode = "month",
  month,
}: {
  issues: IssueWorkspaceItem[];
  mode?: "day" | "month" | "week";
  month: Date;
}) {
  const statusState = useIssueStatus(issues);
  const byDay = new Map<string, IssueWorkspaceItem[]>();
  for (const issue of statusState.issues) {
    if (!issue.dueAt) continue;
    const key = clubDateKey(issue.dueAt);
    byDay.set(key, [...(byDay.get(key) ?? []), issue]);
  }
  const days = calendarDays(month);
  const agenda = [...byDay.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  );

  if (mode !== "month") {
    const today = clubDateKey(month);
    const current = new Date(`${today}T12:00:00Z`);
    const weekStart = new Date(current);
    weekStart.setUTCDate(current.getUTCDate() - current.getUTCDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 7);
    const visibleAgenda = agenda.filter(([key]) => {
      if (mode === "day") return key === today;
      const date = new Date(`${key}T12:00:00Z`);
      return date >= weekStart && date < weekEnd;
    });
    return (
      <section
        data-issue-calendar={mode}
        className="grid gap-3"
        aria-label={`Issue calendar ${mode}`}
      >
        {visibleAgenda.map(([key, rows]) => (
          <div
            key={key}
            className="overflow-hidden rounded-lg border border-white/10 bg-card/95"
          >
            <header className="flex items-center gap-3 border-b border-white/10 bg-background/55 px-4 py-3">
              <CalendarClock className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">{formatUtcFullDate(key)}</h2>
              <span className="ml-auto font-mono text-xs text-muted-foreground">
                {rows.length}
              </span>
            </header>
            <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((issue) => (
                <IssueCard
                  issue={issue}
                  key={issue.id}
                  onStatusChange={statusState.changeStatus}
                  pending={statusState.pending}
                />
              ))}
            </div>
          </div>
        ))}
        {visibleAgenda.length === 0 && (
          <div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-white/15 bg-card/70 text-center">
            <div>
              <h2 className="font-semibold">No dated issues in this {mode}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Switch the range or create dated work.
              </p>
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="min-w-0" aria-label="Issue calendar">
      <div
        data-issue-calendar="month-grid"
        className="hidden h-[calc(100svh-23.5rem)] min-h-[23rem] flex-col overflow-hidden rounded-lg border border-white/10 bg-card/95 shadow-xl shadow-black/10 md:flex"
      >
        <div className="grid grid-cols-7 border-b border-white/10 bg-background/55">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6">
          {days.map((day) => {
            const key = day.toISOString().slice(0, 10);
            const rows = byDay.get(key) ?? [];
            const inMonth = day.getUTCMonth() === month.getUTCMonth();
            return (
              <div
                key={key}
                className={cn(
                  "min-h-0 overflow-hidden border-b border-r border-white/10 p-1.5 last:border-r-0",
                  !inMonth && "bg-background/35 text-muted-foreground",
                )}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {day.getUTCDate()}
                  </span>
                  {rows.length > 0 && (
                    <span className="font-mono text-xs text-muted-foreground">
                      {rows.length}
                    </span>
                  )}
                </div>
                <div className="grid gap-1">
                  {rows.slice(0, 1).map((issue) => (
                    <IssueCard
                      compact
                      issue={issue}
                      key={issue.id}
                      onStatusChange={statusState.changeStatus}
                      pending={statusState.pending}
                    />
                  ))}
                  {rows.length > 1 && (
                    <span className="px-2 text-xs text-muted-foreground">
                      +{rows.length - 1} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div data-issue-calendar="agenda" className="grid gap-3 md:hidden">
        {agenda.map(([key, rows]) => (
          <section
            key={key}
            className="overflow-hidden rounded-lg border border-white/10 bg-card/95"
          >
            <header className="flex items-center gap-2 border-b border-white/10 bg-background/55 px-3 py-2.5">
              <CalendarClock
                className="h-4 w-4 text-primary"
                aria-hidden="true"
              />
              <h3 className="text-sm font-semibold">
                {formatUtcFullDate(key)}
              </h3>
              <span className="ml-auto font-mono text-xs text-muted-foreground">
                {rows.length}
              </span>
            </header>
            <div className="grid gap-2 p-2">
              {rows.map((issue) => (
                <IssueCard
                  issue={issue}
                  key={issue.id}
                  onStatusChange={statusState.changeStatus}
                  pending={statusState.pending}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

export function IssueKanbanView({ issues }: { issues: IssueWorkspaceItem[] }) {
  const statusState = useIssueStatus(issues);
  const [draggedIssueId, setDraggedIssueId] = useState<string | null>(null);
  const [targetStatus, setTargetStatus] = useState<
    IssueWorkspaceItem["status"] | null
  >(null);
  return (
    <section className="min-w-0" aria-label="Issue kanban board">
      <div className="grid min-w-[64rem] grid-cols-4 gap-3 overflow-x-auto pb-3 lg:min-w-0">
        {ISSUE.ISSUE_STATUS.map((status) => {
          const rows = statusState.issues.filter(
            (issue) => issue.status === status,
          );
          return (
            <section
              key={status}
              className={cn(
                "min-w-0 rounded-lg border border-white/10 bg-card/95 transition-[border-color,background-color,box-shadow] duration-150 motion-reduce:transition-none",
                draggedIssueId && targetStatus === status
                  ? "border-primary/60 bg-primary/5 shadow-lg shadow-primary/5"
                  : "",
              )}
              data-drop-target={
                draggedIssueId && targetStatus === status ? "active" : undefined
              }
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                if (targetStatus !== status) setTargetStatus(status);
              }}
              onDrop={(event) => {
                const issue = statusState.issues.find(
                  (item) =>
                    item.id === event.dataTransfer.getData("text/issue-id"),
                );
                setDraggedIssueId(null);
                setTargetStatus(null);
                if (issue) void statusState.changeStatus(issue, status);
              }}
            >
              <header className="flex items-center gap-2 border-b border-white/10 bg-background/55 px-3 py-3">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    STATUS_TONE[status],
                  )}
                  aria-hidden="true"
                />
                <h2 className="font-semibold">{status}</h2>
                <span className="ml-auto font-mono text-xs text-muted-foreground">
                  {rows.length}
                </span>
              </header>
              <div className="grid max-h-[65svh] gap-2 overflow-y-auto p-2">
                {rows.map((issue) => (
                  <div
                    className={cn(
                      "rounded-md transition-[opacity,transform,box-shadow] duration-150 motion-reduce:transition-none",
                      draggedIssueId === issue.id
                        ? "scale-[1.015] opacity-70 shadow-xl motion-reduce:scale-100"
                        : "",
                    )}
                    draggable={issue.canEdit}
                    key={issue.id}
                    onDragEnd={() => {
                      setDraggedIssueId(null);
                      setTargetStatus(null);
                    }}
                    onDragStart={(event) => {
                      setDraggedIssueId(issue.id);
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/issue-id", issue.id);
                    }}
                  >
                    <IssueCard
                      issue={issue}
                      onStatusChange={statusState.changeStatus}
                      pending={statusState.pending}
                    />
                  </div>
                ))}
                {rows.length === 0 && (
                  <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                    No issues in this lane.
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}

export function IssueListView({ issues }: { issues: IssueWorkspaceItem[] }) {
  const statusState = useIssueStatus(issues);
  return (
    <section
      className="overflow-hidden rounded-lg border border-white/10 bg-card/95"
      aria-label="Issue list"
    >
      <div className="hidden grid-cols-[minmax(16rem,1.8fr)_minmax(10rem,1fr)_9rem_9rem_7rem] gap-3 border-b border-white/10 bg-background/55 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground md:grid">
        <span>Issue</span>
        <span>Owning team</span>
        <span>Status</span>
        <span>Due</span>
        <span>Priority</span>
      </div>
      <div className="divide-y divide-white/10">
        {statusState.issues.map((issue) => (
          <div
            key={issue.id}
            className="group grid min-h-16 min-w-0 gap-2 px-3 py-3 transition-colors hover:bg-background/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:grid-cols-[minmax(16rem,1.8fr)_minmax(10rem,1fr)_9rem_9rem_7rem] md:items-center md:gap-3 md:px-4"
          >
            <div className="flex min-w-0 items-center gap-2">
              <Link
                href={`/admin/issues/${issue.id}`}
                aria-label={`Open ${issue.name}`}
                className="min-w-0 flex-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <IssueSignal issue={issue} />
              </Link>
              <div className="md:hidden">
                <IssueStatusMenu
                  issue={issue}
                  onChange={statusState.changeStatus}
                  pending={statusState.pending}
                />
              </div>
              <p className="mt-1 truncate text-sm text-muted-foreground md:hidden">
                {issue.team.name} · {dueLabel(issue.dueAt)}
              </p>
            </div>
            <span className="hidden truncate text-sm md:block">
              {issue.team.name}
            </span>
            <span className="hidden items-center gap-2 text-sm md:flex">
              <CircleDot className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{issue.status}</span>
              <IssueStatusMenu
                issue={issue}
                onChange={statusState.changeStatus}
                pending={statusState.pending}
              />
            </span>
            <span className="hidden text-sm text-muted-foreground md:block">
              {dueLabel(issue.dueAt)}
            </span>
            <Badge
              variant="outline"
              className={cn("w-fit", PRIORITY_TONE[issue.priority])}
            >
              {issue.priority}
            </Badge>
          </div>
        ))}
        {statusState.issues.length === 0 && (
          <div className="grid min-h-56 place-items-center px-4 text-center">
            <div>
              <h2 className="font-semibold">No issues in this view</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Adjust the filters or create the first issue for your team.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
