"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ISSUE } from "@forge/consts";
import { Button } from "@forge/ui/button";
import { Checkbox } from "@forge/ui/checkbox";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";

import { api } from "~/trpc/react";

type StatusFilter = "all" | (typeof ISSUE.ISSUE_STATUS)[number];
type IssueKindFilter = "all" | "task" | "event_linked";

export interface IssueFilters {
  statusFilter: StatusFilter;
  teamFilter: string;
  searchTerm: string;
  dateFrom: string;
  dateTo: string;
  rootOnly: boolean;
  issueKind: IssueKindFilter;
}

export interface IssueFetcherPaneIssue {
  id: string;
  status: (typeof ISSUE.ISSUE_STATUS)[number];
  name: string;
  description: string;
  links: string[] | null;
  event: string | null;
  date: Date | null;
  priority: (typeof ISSUE.PRIORITY)[number];
  team: string;
  parent: string | null;
  creator: string;
  teamVisibility: { teamId: string }[];
  userAssignments: { userId: string }[];
}

export interface IssueFetcherPaneData {
  issues: IssueFetcherPaneIssue[];
  blockedParentIds: Set<string>;
  roleNameById: Map<string, string>;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  filters: IssueFilters;
}

interface IssueFetcherPaneProps {
  actions?: React.ReactNode;
  setIssues?: React.Dispatch<React.SetStateAction<IssueFetcherPaneIssue[]>>;
  onDataChange?: (data: IssueFetcherPaneData) => void;
}

export const DEFAULT_ISSUE_FILTERS: IssueFilters = {
  statusFilter: "all",
  teamFilter: "all",
  searchTerm: "",
  dateFrom: "",
  dateTo: "",
  rootOnly: true,
  issueKind: "all",
};

function parseLocalDate(value: string, endOfDay: boolean) {
  if (!value) return undefined;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00"}`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function IssueFetcherPane(props: IssueFetcherPaneProps) {
  const { actions, onDataChange, setIssues } = props;
  const [filters, setFilters] = useState<IssueFilters>(DEFAULT_ISSUE_FILTERS);
  const statusSelectId = "issue-fetcher-status-select";
  const teamSelectId = "issue-fetcher-team-select";
  const typeSelectId = "issue-fetcher-type-select";
  const searchInputId = "issue-fetcher-search-input";
  const dateFromInputId = "issue-fetcher-date-from-input";
  const dateToInputId = "issue-fetcher-date-to-input";
  const rootOnlyCheckboxId = "issue-fetcher-root-only-checkbox";

  const rolesQuery = api.roles.getAllLinks.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const queryInput = useMemo(() => {
    const input: {
      status?: (typeof ISSUE.ISSUE_STATUS)[number];
      teamId?: string;
      dateFrom?: Date;
      dateTo?: Date;
    } = {};

    if (filters.statusFilter !== "all") input.status = filters.statusFilter;
    if (filters.teamFilter !== "all") input.teamId = filters.teamFilter;

    const parsedDateFrom = parseLocalDate(filters.dateFrom, false);
    const parsedDateTo = parseLocalDate(filters.dateTo, true);
    if (parsedDateFrom) input.dateFrom = parsedDateFrom;
    if (parsedDateTo) input.dateTo = parsedDateTo;

    return Object.keys(input).length > 0 ? input : undefined;
  }, [filters]);

  const issuesQuery = api.issues.getAllIssues.useQuery(queryInput, {
    refetchOnWindowFocus: false,
  });
  const { data: fetchedIssues } = issuesQuery;
  const combinedIsLoading = rolesQuery.isLoading || issuesQuery.isLoading;
  const combinedError = rolesQuery.error ?? issuesQuery.error;
  const combinedErrorMessage = combinedError?.message ?? null;
  const isReady = !combinedIsLoading && !combinedError;

  const roles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);
  const roleNameById = useMemo(
    () => new Map(roles.map((role) => [role.id, role.name])),
    [roles],
  );

  const allIssues = useMemo(
    () => (fetchedIssues ?? []) as IssueFetcherPaneIssue[],
    [fetchedIssues],
  );

  const blockedParentIds = useMemo(() => {
    const childrenByParent = new Map<string, IssueFetcherPaneIssue[]>();

    for (const issue of allIssues) {
      if (!issue.parent) continue;
      const current = childrenByParent.get(issue.parent) ?? [];
      childrenByParent.set(issue.parent, [...current, issue]);
    }

    const blockedParents = new Set<string>();
    for (const [parentId, children] of childrenByParent.entries()) {
      if (children.some((child) => child.status !== "FINISHED")) {
        blockedParents.add(parentId);
      }
    }

    return blockedParents;
  }, [allIssues]);

  const issues = useMemo(() => {
    const term = filters.searchTerm.trim().toLowerCase();

    return allIssues.filter((issue) => {
      const matchesSearch =
        !term ||
        `${issue.name} ${issue.description} ${issue.id}`
          .toLowerCase()
          .includes(term);

      const matchesKind =
        filters.issueKind === "all"
          ? true
          : filters.issueKind === "task"
            ? !issue.event
            : !!issue.event;

      const matchesRoot = !filters.rootOnly || !issue.parent;

      return matchesSearch && matchesKind && matchesRoot;
    });
  }, [allIssues, filters.issueKind, filters.rootOnly, filters.searchTerm]);

  const refresh = useCallback(() => {
    void Promise.all([rolesQuery.refetch(), issuesQuery.refetch()]);
  }, [issuesQuery, rolesQuery]);

  const data = useMemo<IssueFetcherPaneData>(
    () => ({
      issues: isReady ? issues : [],
      blockedParentIds: isReady ? blockedParentIds : new Set<string>(),
      roleNameById: isReady ? roleNameById : new Map<string, string>(),
      isLoading: combinedIsLoading,
      error: combinedErrorMessage,
      refresh,
      filters,
    }),
    [
      blockedParentIds,
      combinedErrorMessage,
      combinedIsLoading,
      filters,
      isReady,
      issues,
      refresh,
      roleNameById,
    ],
  );

  useEffect(() => {
    setIssues?.(isReady ? issues : []);
  }, [isReady, issues, setIssues]);

  useEffect(() => {
    onDataChange?.(data);
  }, [data, onDataChange]);

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Issue Fetcher Pane</h2>
        <p className="text-sm text-muted-foreground">
          Shared filter + fetch controller for issues. Use this as the single
          data source, then hand the filtered result to list, kanban, or
          calendar views from the parent.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <Button type="button" variant="outline" onClick={refresh}>
            Refresh
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          {combinedIsLoading
            ? "Loading issues..."
            : combinedErrorMessage
              ? combinedErrorMessage
              : `${issues.length} issue(s) ready for parent views`}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor={statusSelectId}>Status</Label>
          <Select
            value={filters.statusFilter}
            onValueChange={(value) =>
              setFilters((previous) => ({
                ...previous,
                statusFilter: value as StatusFilter,
              }))
            }
          >
            <SelectTrigger id={statusSelectId}>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {ISSUE.ISSUE_STATUS.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor={teamSelectId}>Team</Label>
          <Select
            value={filters.teamFilter}
            onValueChange={(value) =>
              setFilters((previous) => ({ ...previous, teamFilter: value }))
            }
          >
            <SelectTrigger id={teamSelectId}>
              <SelectValue placeholder="All teams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All teams</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor={typeSelectId}>Type</Label>
          <Select
            value={filters.issueKind}
            onValueChange={(value) =>
              setFilters((previous) => ({
                ...previous,
                issueKind: value as IssueKindFilter,
              }))
            }
          >
            <SelectTrigger id={typeSelectId}>
              <SelectValue placeholder="All issue types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All issue types</SelectItem>
              <SelectItem value="task">Tasks only</SelectItem>
              <SelectItem value="event_linked">Event-linked only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor={searchInputId}>Search</Label>
          <Input
            id={searchInputId}
            placeholder="Search name/description/id..."
            value={filters.searchTerm}
            onChange={(event) =>
              setFilters((previous) => ({
                ...previous,
                searchTerm: event.target.value,
              }))
            }
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor={dateFromInputId}>Date From</Label>
          <Input
            id={dateFromInputId}
            type="date"
            value={filters.dateFrom}
            onChange={(event) =>
              setFilters((previous) => ({
                ...previous,
                dateFrom: event.target.value,
              }))
            }
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor={dateToInputId}>Date To</Label>
          <Input
            id={dateToInputId}
            type="date"
            value={filters.dateTo}
            onChange={(event) =>
              setFilters((previous) => ({
                ...previous,
                dateTo: event.target.value,
              }))
            }
          />
        </div>

        <div className="flex items-end gap-2 lg:col-span-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setFilters(DEFAULT_ISSUE_FILTERS)}
          >
            Clear Filters
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id={rootOnlyCheckboxId}
          checked={filters.rootOnly}
          onCheckedChange={(checked) =>
            setFilters((previous) => ({
              ...previous,
              rootOnly: checked === true,
            }))
          }
        />
        <Label htmlFor={rootOnlyCheckboxId}>
          Show root issues only (hide subtasks)
        </Label>
      </div>
    </section>
  );
}
