"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  CircleDot,
  Pencil,
  SlidersHorizontal,
} from "lucide-react";

import type { ISSUE } from "@forge/consts";
import { Button } from "@forge/ui/button";
import { toast } from "@forge/ui/toast";

import { CreateEditDialog } from "~/app/_components/issues/create-edit-dialog";
import { IssueFetcherPane } from "~/app/_components/issues/issue-fetcher-pane";
import { StatusSelect } from "~/app/_components/issues/issue-form-fields";
import IssueTemplateDialog from "~/app/_components/issues/issue-template-dialog";
import { api } from "~/trpc/react";

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
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, (typeof ISSUE.ISSUE_STATUS)[number]>
  >({});
  const [paneData, setPaneData] = useState<ISSUE.IssueFetcherPaneData | null>(
    null,
  );
  const utils = api.useUtils();
  const deleteIssueMutation = api.issues.deleteIssue.useMutation({
    onSuccess: async () => {
      await utils.issues.invalidate();
      paneData?.refresh();
      toast.success("Issue deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete issue");
    },
  });
  const updateIssueMutation = api.issues.updateIssue.useMutation({
    onSuccess: async () => {
      await utils.issues.invalidate();
      paneData?.refresh();
    },
    onError: () => {
      toast.error("Failed to update issue status");
    },
  });

  const issues = useMemo(() => paneData?.issues ?? [], [paneData?.issues]);
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
        <div className="hidden grid-cols-[1fr_auto_auto_auto] gap-3 border-b bg-muted/30 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
          <span>Issue</span>
          <span>Status</span>
          <span>Due</span>
          <span className="text-right">Edit</span>
        </div>

        {isLoading && (
          <div className="px-4 py-8 text-sm text-muted-foreground">
            Loading issues...
          </div>
        )}

        {!isLoading && error && (
          <div className="px-4 py-8 text-sm text-destructive">
            Unable to load issues. Please try again.
          </div>
        )}

        {!isLoading && !error && issues.length === 0 && (
          <div className="px-4 py-8 text-sm text-muted-foreground">
            No issues match your current filters.
          </div>
        )}

        {!isLoading &&
          !error &&
          issues.map((issue) => (
            <div
              key={issue.id}
              className="grid gap-2 border-b px-4 py-3 transition-colors hover:bg-muted/30 md:grid-cols-[1fr_auto_auto_auto] md:items-center"
            >
              <Link href={"/issues/" + issue.id} className="space-y-1">
                <div className="font-medium leading-tight hover:underline">
                  {issue.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {issue.id.slice(0, 8)} • Team{" "}
                  {paneData?.roleNameById.get(issue.team) ?? issue.team}
                </div>
              </Link>

              <div className="text-sm text-muted-foreground">
                <span className="mr-2 text-xs font-medium uppercase tracking-wide text-muted-foreground md:hidden">
                  Status
                </span>
                <StatusSelect
                  value={statusOverrides[issue.id] ?? issue.status}
                  className="h-8 min-w-[160px]"
                  onValueChange={(nextStatus) => {
                    const previousStatus = statusOverrides[issue.id] ?? issue.status;
                    if (nextStatus === previousStatus) return;

                    setStatusOverrides((prev) => ({
                      ...prev,
                      [issue.id]: nextStatus,
                    }));
                    updateIssueMutation.mutate({
                      id: issue.id,
                      status: nextStatus,
                    }, {
                      onError: () => {
                        setStatusOverrides((prev) => ({
                          ...prev,
                          [issue.id]: previousStatus,
                        }));
                      },
                      onSettled: () => {
                        setStatusOverrides((prev) => {
                          const { [issue.id]: _removed, ...rest } = prev;
                          return rest;
                        });
                      },
                    });
                  }}
                />
              </div>

              <div className="text-sm text-muted-foreground">
                <span className="mr-2 text-xs font-medium uppercase tracking-wide text-muted-foreground md:hidden">
                  Due
                </span>
                {formatDate(issue.date)}
              </div>

              <div className="flex items-center justify-start gap-2 md:justify-end">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground md:hidden">
                  Edit
                </span>
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
                    aria-label={`Edit issue ${issue.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </CreateEditDialog>
              </div>
            </div>
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
