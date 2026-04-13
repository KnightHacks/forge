"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";

import type { ISSUE } from "@forge/consts";
import { Button } from "@forge/ui/button";
import { toast } from "@forge/ui/toast";

import { CreateEditDialog } from "~/app/_components/issues/create-edit-dialog";
import { IssueFetcherPane } from "~/app/_components/issues/issue-fetcher-pane";
import { StatusSelect } from "~/app/_components/issues/issue-form-fields";
import {
  getActiveIssueFilterTags,
  IssueViewControlBar,
} from "~/app/_components/issues/issue-view-control-bar";
import { api } from "~/trpc/react";

function formatDate(value: Date | null) {
  if (!value) return "No due date";
  return new Date(value).toLocaleDateString();
}

function formatUpdatedAt(value: Date | string | null | undefined) {
  const parsed =
    value instanceof Date
      ? value
      : typeof value === "string"
        ? new Date(value)
        : null;
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return "Unable to load last updated";
  }
  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTeamLabel(roleName: string) {
  const trimmed = roleName.replace(/\s+team$/i, "").trim();
  return trimmed || roleName;
}

function isOverdueIssue(issue: ISSUE.IssueFetcherPaneIssue) {
  if (issue.status === "FINISHED" || !issue.date) return false;
  const dueDate = new Date(issue.date);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return dueDate < todayStart;
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
    return getActiveIssueFilterTags(filters);
  }, [filters]);

  return (
    <section className="mx-auto w-full max-w-6xl space-y-4 py-4">
      <IssueViewControlBar
        openCount={openCount}
        closedCount={closedCount}
        activeFilters={activeFilters}
        onOpenFilters={() => setIsFiltersOpen(true)}
      />

      <div className="overflow-hidden rounded-lg border">
        <div className="hidden grid-cols-[minmax(0,1fr)_190px_88px_36px] gap-2 border-b bg-muted/30 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
          <span>Issue</span>
          <span className="justify-self-start">Status</span>
          <span className="justify-self-start">Due</span>
          <span className="justify-self-center">Edit</span>
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
              className="grid gap-2 border-b px-4 py-3 transition-colors hover:bg-muted/30 md:grid-cols-[minmax(0,1fr)_190px_88px_36px] md:items-center md:gap-2"
            >
              <div className="min-w-0 space-y-1">
                <Link
                  href={"/issues/" + issue.id}
                  className="inline font-medium leading-tight text-foreground hover:underline"
                >
                  {issue.name}
                </Link>
                <div className="text-xs text-muted-foreground">
                  {formatUpdatedAt(issue.updatedAt)} •{" "}
                  {formatTeamLabel(
                    paneData?.roleNameById.get(issue.team) ?? issue.team,
                  )}
                </div>
              </div>

              <div className="text-sm text-muted-foreground md:justify-self-start">
                <span className="mr-2 text-xs font-medium uppercase tracking-wide text-muted-foreground md:hidden">
                  Status
                </span>
                <StatusSelect
                  value={statusOverrides[issue.id] ?? issue.status}
                  className="h-8 min-w-[160px]"
                  onValueChange={(nextStatus) => {
                    const previousStatus =
                      statusOverrides[issue.id] ?? issue.status;
                    if (nextStatus === previousStatus) return;

                    setStatusOverrides((prev) => ({
                      ...prev,
                      [issue.id]: nextStatus,
                    }));
                    updateIssueMutation.mutate(
                      {
                        id: issue.id,
                        status: nextStatus,
                      },
                      {
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
                      },
                    );
                  }}
                />
              </div>

              <div className="text-sm text-muted-foreground md:justify-self-start">
                <span className="mr-2 text-xs font-medium uppercase tracking-wide text-muted-foreground md:hidden">
                  Due
                </span>
                <span
                  className={
                    isOverdueIssue(issue)
                      ? "font-medium text-red-900 dark:text-red-500"
                      : undefined
                  }
                >
                  {formatDate(issue.date)}
                </span>
              </div>

              <div className="flex items-center justify-start gap-2 md:justify-center">
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
