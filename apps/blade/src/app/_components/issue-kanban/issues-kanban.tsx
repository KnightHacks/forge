"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SlidersHorizontal, Pencil, Calendar, Users, CircleDot, CheckCircle2 } from "lucide-react";
import { ISSUE } from "@forge/consts";
import { Button } from "@forge/ui/button";
import { toast } from "@forge/ui/toast";

import { CreateEditDialog } from "~/app/_components/issues/create-edit-dialog";
import { IssueFetcherPane } from "~/app/_components/issues/issue-fetcher-pane";
import IssueTemplateDialog from "~/app/_components/issues/issue-template-dialog";
import { api } from "~/trpc/react";

const STATUS_COLORS: Record<string, string> = {
  BACKLOG: "bg-slate-400",
  PLANNING: "bg-amber-400",
  IN_PROGRESS: "bg-emerald-400",
  FINISHED: "bg-rose-400",
};

function formatStatus(status: string) {
  return status.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(value: Date | null) {
  if (!value) return "No due date";
  return new Date(value).toLocaleDateString();
}

export function KanbanBoard() {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [paneData, setPaneData] = useState<ISSUE.IssueFetcherPaneData | null>(null);
  
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, (typeof ISSUE.ISSUE_STATUS)[number]>
  >({});

  const utils = api.useUtils();
  const deleteIssueMutation = api.issues.deleteIssue.useMutation({
    onSuccess: async () => {
      await utils.issues.invalidate();
      paneData?.refresh();
      toast.success("Issue deleted successfully");
    },
  });

  const updateIssueMutation = api.issues.updateIssue.useMutation({
    onSuccess: async () => {
      await utils.issues.invalidate();
      paneData?.refresh();
    },
    onError: () => toast.error("Failed to update issue status"),
  });

  const issues = useMemo(() => {
    if (!paneData?.issues) return [];
    return paneData.issues.map((issue) => ({
      ...issue,
      status: statusOverrides[issue.id] ?? issue.status,
    }));
  }, [paneData?.issues, statusOverrides]);

  const isLoading = paneData?.isLoading ?? true;

  // --- Header Stats Logic ---
  const openCount = useMemo(
    () => issues.filter((issue) => issue.status !== "FINISHED").length,
    [issues],
  );
  const closedCount = issues.length - openCount;

  // --- Active Filters Logic ---
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
    if (filters.rootOnly) tags.push("Root");
    if (filters.dateFrom) tags.push("From " + filters.dateFrom);
    if (filters.dateTo) tags.push("To " + filters.dateTo);
    if (filters.searchTerm.trim())
      tags.push('Search "' + filters.searchTerm.trim() + '"');
    return tags;
  }, [filters]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, issueId: string) => {
    e.dataTransfer.setData("issueId", issueId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, newStatus: typeof ISSUE.ISSUE_STATUS[number]) => {
    e.preventDefault();
    const issueId = e.dataTransfer.getData("issueId");
    if (!issueId) return;

    const issue = issues.find((i) => i.id === issueId);
    if (!issue || issue.status === newStatus) return;

    const previousStatus = issue.status;

    setStatusOverrides((prev) => ({ ...prev, [issueId]: newStatus }));

    updateIssueMutation.mutate(
      { id: issueId, status: newStatus },
      {
        onError: () => {
          setStatusOverrides((prev) => ({ ...prev, [issueId]: previousStatus }));
        },
        onSettled: () => {
          setStatusOverrides((prev) => {
            const copy = { ...prev };
            delete copy[issueId];
            return copy;
          });
        },
      }
    );
  };

  return (
    <section className="mx-auto w-full max-w-7xl space-y-4 py-4">
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

        {/* Action Buttons */}
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

      {/* 2. Active Filter Tags */}
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

      {/* 3. The Board */}
      {isLoading ? (
        <div className="px-4 py-8 text-sm text-muted-foreground">Loading board...</div>
      ) : (
        <div className="flex h-[calc(100vh-14rem)] w-full flex-nowrap gap-4 overflow-x-auto overflow-y-hidden pb-4">
          {ISSUE.ISSUE_STATUS.map((status) => {
            const columnIssues = issues.filter((i) => i.status === status);

            return (
              <div
                key={status}
                className="flex h-full w-[85vw] max-w-[320px] shrink-0 lg:w-auto lg:min-w-[220px] lg:flex-1 flex-col rounded-lg bg-muted/30 p-3 border"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, status)}
              >
                <div className="mb-4 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${STATUS_COLORS[status]}`} />
                    <h3 className="font-semibold text-sm">{formatStatus(status)}</h3>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium rounded-full bg-muted px-2 py-1">
                    {columnIssues.length}
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-3 overflow-y-auto pb-2 pr-1">
                  {columnIssues.map((issue) => (
                    <div
                      key={issue.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, issue.id)}
                      className="group cursor-grab active:cursor-grabbing rounded-lg border bg-card text-card-foreground shadow-sm transition-colors hover:border-primary/50"
                    >
                      <div className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={"/issues/" + issue.id}
                            className="text-sm font-medium leading-tight hover:underline"
                          >
                            {issue.name}
                          </Link>

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
                            <button className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground">
                              <Pencil className="h-3 w-3" />
                            </button>
                          </CreateEditDialog>
                        </div>
                        
                        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                          {issue.date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(issue.date)}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span className="truncate max-w-[100px]">
                              {paneData?.roleNameById.get(issue.team) ?? issue.team}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          
          <div className="w-1 shrink-0 lg:hidden" aria-hidden="true" />
        </div>
      )}

      {/* 4. Issue Fetcher Pane */}
      <IssueFetcherPane
        open={isFiltersOpen}
        onOpenChange={setIsFiltersOpen}
        onDataChange={setPaneData}
      />
    </section>
  );
}