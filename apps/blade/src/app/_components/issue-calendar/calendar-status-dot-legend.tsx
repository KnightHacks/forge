"use client";

import { ISSUE } from "@forge/consts";

const STATUS_LEGEND_LABEL: Record<(typeof ISSUE.ISSUE_STATUS)[number], string> =
  {
    BACKLOG: "Backlog",
    PLANNING: "Planning",
    IN_PROGRESS: "In Progress",
    FINISHED: "Finished",
  };

export function IssueStatusDotLegend() {
  return (
    <div
      className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-muted/15 px-3 py-2 text-[0.7rem] text-muted-foreground sm:gap-x-4 sm:text-xs"
      aria-label="Issue status dot colors"
    >
      {ISSUE.ISSUE_STATUS.map((status) => (
        <span
          key={status}
          className="inline-flex items-center gap-1.5 whitespace-nowrap"
        >
          <span
            className="issue-calendar-status-dot size-2.5 shrink-0 rounded-full ring-1 ring-border/60"
            data-issue-status={status}
            aria-hidden
          />
          <span>{STATUS_LEGEND_LABEL[status]}</span>
        </span>
      ))}
    </div>
  );
}
