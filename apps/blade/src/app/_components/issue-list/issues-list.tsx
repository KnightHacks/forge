"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, CircleDot, SlidersHorizontal } from "lucide-react";

import type { ISSUE } from "@forge/consts";
import { Button } from "@forge/ui/button";

import { CreateEditDialog } from "~/app/_components/issues/create-edit-dialog";
import { IssueFetcherPane } from "~/app/_components/issues/issue-fetcher-pane";
import IssueTemplateDialog from "~/app/_components/issues/issue-template-dialog";

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value: Date | null) {
  if (!value) return "No due date";
  return new Date(value).toLocaleDateString();
}

export function IssuesList() {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [paneData, setPaneData] = useState<ISSUE.IssueFetcherPaneData | null>(
    null,
  );

  const issues = paneData?.issues ?? [];
  const isLoading = paneData?.isLoading ?? true;
  const error = paneData?.error ?? null;

  const openCount = useMemo(
    () => issues.filter((issue) => issue.status !== "FINISHED").length,
    [issues],
  );
  const closedCount = issues.length - openCount;

  const filters = paneData?.filters;

  const activeFilters = useMemo(() => {
    if (!filters) return [];
    const tags: string[] = [];
    if (filters.statusFilter !== "all")
      tags.push(formatStatus(filters.statusFilter));
    if (filters.teamFilter !== "all") tags.push("Team selected");
    if (filters.issueKind !== "all")
      tags.push(
        filters.issueKind === "task" ? "Tasks only" : "Event-linked only",
      );
    if (filters.rootOnly) tags.push("Root only");
    if (filters.dateFrom) tags.push("From " + filters.dateFrom);
    if (filters.dateTo) tags.push("To " + filters.dateTo);
    if (filters.searchTerm.trim())
      tags.push('Search "' + filters.searchTerm.trim() + '"');
    return tags;
  }, [filters]);

  return (
    <section className="mx-auto w-full max-w-6xl space-y-4 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4 rounded-md border bg-muted/20 px-3 py-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CircleDot className="h-4 w-4 text-emerald-500" />
            <span>{openCount} Open</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            <span>{closedCount} Closed</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CreateEditDialog intent="create">
            <Button>Create issue</Button>
          </CreateEditDialog>
          <IssueTemplateDialog />
          <Button variant="outline" onClick={() => setIsFiltersOpen(true)}>
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((tag) => (
            <span
              key={tag}
              className="rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border">
        <div className="hidden grid-cols-[1fr_auto_auto] gap-3 border-b bg-muted/30 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
          <span>Issue</span>
          <span>Status</span>
          <span>Due</span>
        </div>

        {isLoading && (
          <div className="px-4 py-8 text-sm text-muted-foreground">
            Loading issues...
          </div>
        )}

        {!isLoading && error && (
          <div className="px-4 py-8 text-sm text-destructive">{error}</div>
        )}

        {!isLoading && !error && issues.length === 0 && (
          <div className="px-4 py-8 text-sm text-muted-foreground">
            No issues match your current filters.
          </div>
        )}

        {!isLoading &&
          !error &&
          issues.map((issue) => (
            <Link
              key={issue.id}
              href={"/issues/" + issue.id}
              className="grid gap-2 border-b px-4 py-3 transition-colors hover:bg-muted/30 md:grid-cols-[1fr_auto_auto] md:items-center"
            >
              <div className="space-y-1">
                <div className="font-medium leading-tight">{issue.name}</div>
                <div className="text-xs text-muted-foreground">
                  {issue.id.slice(0, 8)} • Team{" "}
                  {paneData?.roleNameById.get(issue.team) ?? issue.team}
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                {formatStatus(issue.status)}
              </div>

              <div className="text-sm text-muted-foreground">
                {formatDate(issue.date)}
              </div>
            </Link>
          ))}
      </div>

      <IssueFetcherPane
        open={isFiltersOpen}
        onOpenChange={setIsFiltersOpen}
        onDataChange={setPaneData}
      />
    </section>
  );
}
