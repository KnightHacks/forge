"use client";

import * as React from "react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

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

interface IssueFetcherPaneProps {
  actions?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  setIssues?: React.Dispatch<
    React.SetStateAction<ISSUE.IssueFetcherPaneIssue[]>
  >;
  onDataChange?: (data: ISSUE.IssueFetcherPaneData) => void;
  children?: React.ReactNode;
}

function parseLocalDate(value: string, endOfDay: boolean) {
  if (!value) return undefined;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00"}`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function IssueFetcherPane(props: IssueFetcherPaneProps) {
  const {
    actions,
    children,
    onClose,
    onDataChange,
    onOpenChange,
    open,
    setIssues,
  } = props;
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const portalElement = typeof document === "undefined" ? null : document.body;
  const [filters, setFilters] = useState<ISSUE.IssueFilters>(
    ISSUE.DEFAULT_ISSUE_FILTERS,
  );
  const statusSelectId = useId();
  const teamSelectId = useId();
  const typeSelectId = useId();
  const searchInputId = useId();
  const dateFromInputId = useId();
  const dateToInputId = useId();
  const rootOnlyCheckboxId = useId();
  const headerId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  const rolesQuery = api.roles.getAllLinks.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const {
    data: rolesData,
    refetch: rolesRefetch,
    isLoading: rolesIsLoading,
    error: rolesError,
  } = rolesQuery;

  const dateRangeError = useMemo(() => {
    const parsedDateFrom = parseLocalDate(filters.dateFrom, false);
    const parsedDateTo = parseLocalDate(filters.dateTo, true);

    if (parsedDateFrom && parsedDateTo && parsedDateFrom > parsedDateTo) {
      return "Date From must be on or before Date To.";
    }

    return null;
  }, [filters.dateFrom, filters.dateTo]);

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
    const hasInvertedDateRange =
      parsedDateFrom && parsedDateTo && parsedDateFrom > parsedDateTo;

    if (!hasInvertedDateRange) {
      if (parsedDateFrom) input.dateFrom = parsedDateFrom;
      if (parsedDateTo) input.dateTo = parsedDateTo;
    }

    return Object.keys(input).length > 0 ? input : undefined;
  }, [filters]);

  const issuesQuery = api.issues.getAllIssues.useQuery(queryInput, {
    refetchOnWindowFocus: false,
  });
  const {
    data: issuesData,
    refetch: issuesRefetch,
    isLoading: issuesIsLoading,
    error: issuesError,
  } = issuesQuery;
  const combinedIsLoading = rolesIsLoading || issuesIsLoading;
  const combinedError = rolesError ?? issuesError;
  const combinedErrorMessage = dateRangeError ?? combinedError?.message ?? null;
  const isReady = !combinedIsLoading && !combinedError && !dateRangeError;

  const roles = useMemo(() => rolesData ?? [], [rolesData]);
  const roleNameById = useMemo(
    () => new Map(roles.map((role) => [role.id, role.name])),
    [roles],
  );

  const allIssues = useMemo(
    () => (issuesData ?? []) as ISSUE.IssueFetcherPaneIssue[],
    [issuesData],
  );

  const blockedParentIds = useMemo(() => {
    const blockedParents = new Set<string>();

    for (const issue of allIssues) {
      if (issue.parent && issue.status !== "FINISHED") {
        blockedParents.add(issue.parent);
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
    void Promise.all([rolesRefetch(), issuesRefetch()]);
  }, [issuesRefetch, rolesRefetch]);

  const data = useMemo<ISSUE.IssueFetcherPaneData>(
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

  const handleClose = useCallback(() => {
    if (isControlled) {
      onOpenChange?.(false);
    } else {
      setInternalOpen(false);
    }
    onClose?.();
  }, [isControlled, onClose, onOpenChange]);

  const trigger = useMemo(() => {
    if (!children || !React.isValidElement(children)) {
      return null;
    }

    const child = children as React.ReactElement<{
      onClick?: (event: React.MouseEvent) => void;
    }>;

    return React.cloneElement(child, {
      onClick: (event: React.MouseEvent) => {
        child.props.onClick?.(event);
        if (isControlled) {
          onOpenChange?.(true);
        } else {
          setInternalOpen(true);
        }
      },
    });
  }, [children, isControlled, onOpenChange]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    previousActiveElementRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTarget = window.requestAnimationFrame(() => {
      dialogRef.current?.focus();
    });

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeydown);

    return () => {
      window.cancelAnimationFrame(focusTarget);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeydown);
      previousActiveElementRef.current?.focus();
    };
  }, [handleClose, isOpen]);

  const handleOverlayPointerDown = (
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  };

  const content = (
    <section
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={headerId}
      aria-describedby={descriptionId}
      tabIndex={-1}
      className="relative flex max-h-[80vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border bg-background shadow-lg"
    >
      <button
        type="button"
        className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-md border border-input text-muted-foreground transition hover:text-foreground"
        onClick={handleClose}
        aria-label="Close dialog"
      >
        <X className="h-4 w-4" />
      </button>

      <header className="border-b px-6 py-4 pr-12">
        <p className="text-xs font-medium text-muted-foreground">
          Shared Issue Controls
        </p>
        <h2 id={headerId} className="mt-1 text-lg font-semibold">
          Issue Fetcher Pane
        </h2>
        <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">
          Shared filter + fetch controller for issues. Use this as the single
          data source, then hand the filtered result to list, kanban, or
          calendar views from the parent.
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="space-y-4">
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
                    statusFilter: value as ISSUE.StatusFilter,
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
                    issueKind: value as ISSUE.IssueKindFilter,
                  }))
                }
              >
                <SelectTrigger id={typeSelectId}>
                  <SelectValue placeholder="All issue types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All issue types</SelectItem>
                  <SelectItem value="task">Tasks only</SelectItem>
                  <SelectItem value="event_linked">
                    Event-linked only
                  </SelectItem>
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

            {dateRangeError ? (
              <div className="md:col-span-2 lg:col-span-4">
                <p className="text-sm text-destructive" role="alert">
                  {dateRangeError}
                </p>
              </div>
            ) : null}

            <div className="flex items-end gap-2 lg:col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFilters(ISSUE.DEFAULT_ISSUE_FILTERS)}
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
        </div>
      </div>
    </section>
  );

  if (!portalElement) {
    return trigger;
  }

  return (
    <>
      {trigger}
      {isOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-10"
            onMouseDown={handleOverlayPointerDown}
          >
            <div
              className="w-full"
              onMouseDown={(event) => event.stopPropagation()}
            >
              {content}
            </div>
          </div>,
          portalElement,
        )}
    </>
  );
}
