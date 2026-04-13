"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  CircleDot,
  ListTodo,
  SlidersHorizontal,
  SquareKanban,
} from "lucide-react";

import { cn } from "@forge/ui";
import type { ISSUE } from "@forge/consts";
import { Button, buttonVariants } from "@forge/ui/button";

import { CreateEditDialog } from "~/app/_components/issues/create-edit-dialog";
import IssueTemplateDialog from "~/app/_components/issues/issue-template-dialog";

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getActiveIssueFilterTags(
  filters: ISSUE.IssueFilters | null | undefined,
  roleNameById?: Map<string, string> | null,
) {
  if (!filters) return [];

  const tags: string[] = [];
  if (filters.statusFilter !== "all") tags.push(formatStatus(filters.statusFilter));
  if (filters.teamFilter !== "all") {
    const teamName = roleNameById?.get(filters.teamFilter) ?? filters.teamFilter;
    tags.push(`Team Selected: ${teamName}`);
  }
  if (filters.issueKind !== "all") {
    tags.push(
      filters.issueKind === "task" ? "Tasks only" : "Event-linked only",
    );
  }
  if (filters.rootOnly) tags.push("Root only");
  if (filters.dateFrom) tags.push("From " + filters.dateFrom);
  if (filters.dateTo) tags.push("To " + filters.dateTo);
  if (filters.searchTerm.trim()) {
    tags.push('Search "' + filters.searchTerm.trim() + '"');
  }

  return tags;
}

interface IssueViewControlBarProps {
  openCount: number;
  closedCount: number;
  activeFilters: string[];
  onOpenFilters: () => void;
  createInitialValues?: Partial<ISSUE.IssueSubmitValues>;
  onBeforeCreate?: () => void;
  onBeforeOpenFilters?: () => void;
}

const issueViewLinks = [
  {
    href: "/admin/issues/kanban",
    label: "Kanban",
    icon: SquareKanban,
  },
  {
    href: "/admin/issues/list",
    label: "List",
    icon: ListTodo,
  },
  {
    href: "/admin/issues/calendar",
    label: "Calendar",
    icon: CalendarDays,
  },
] as const;

export function IssueViewControlBar({
  openCount,
  closedCount,
  activeFilters,
  onOpenFilters,
  createInitialValues,
  onBeforeCreate,
  onBeforeOpenFilters,
}: IssueViewControlBarProps) {
  const pathname = usePathname();

  return (
    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 md:justify-self-start">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <CircleDot className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>{openCount} Open</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{closedCount} Closed</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 md:justify-self-center">
          {issueViewLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  buttonVariants({
                    variant: isActive ? "primary" : "outline",
                    size: "sm",
                  }),
                  "gap-2",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="h-4 w-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 md:justify-self-end">
          <CreateEditDialog intent="create" initialValues={createInitialValues}>
            <Button
              type="button"
              onClick={() => {
                onBeforeCreate?.();
              }}
            >
              Create issue
            </Button>
          </CreateEditDialog>
          <IssueTemplateDialog />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onBeforeOpenFilters?.();
              onOpenFilters();
            }}
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>
      </div>

      {activeFilters.length > 0 ? (
        <div className="mt-3 flex min-w-0 flex-wrap gap-2 border-t border-border/60 pt-3">
          <span className="sr-only">Active filters</span>
          {activeFilters.map((tag) => (
            <span
              key={tag}
              className="shrink-0 rounded-full border border-border bg-background/80 px-2.5 py-1 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
