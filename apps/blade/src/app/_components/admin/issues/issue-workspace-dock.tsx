"use client";

import type { useRouter } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronDown,
  Columns3,
  Filter,
  LayoutTemplate,
  List,
  Plus,
} from "lucide-react";

import { cn } from "@forge/ui";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Label } from "@forge/ui/label";

import type {
  IssueWorkspaceOverlay,
  IssueWorkspaceView,
} from "./issue-workspace";
import type { IssueSearchInput } from "./params";
import { RouteTransitionLink as Link } from "~/app/_components/shared/route-transition-link";
import { issueSearchHref, issueViewHref } from "./issue-view-href";
import { parseIssueSearchParams } from "./params";

/**
 * The dock is the bar that sits above the work surface: view tabs and overlay
 * buttons on top, then whichever context strip the current view needs.
 *
 * Each piece below returns exactly one element, in the position it already
 * occupied. The context strips draw their own `border-t`, so an extra wrapper
 * would not lose a divider here — but the toolbar's `gap-2` and the tab
 * `nav`'s `gap-1` are both drawn between direct children, and those would.
 */
function IssueViewToolbar({
  access,
  input,
  overlay,
  setOverlay,
  view,
}: {
  access: { canEdit: boolean };
  input: IssueSearchInput;
  overlay: IssueWorkspaceOverlay;
  setOverlay: (overlay: IssueWorkspaceOverlay) => void;
  view: IssueWorkspaceView;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 bg-background/25 p-2 lg:flex-row lg:items-center lg:justify-between">
      <nav className="grid grid-cols-3 gap-1" aria-label="Issue views">
        {(
          [
            { icon: CalendarDays, id: "calendar", label: "Calendar" },
            { icon: Columns3, id: "kanban", label: "Kanban" },
            { icon: List, id: "list", label: "List" },
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.id}
              variant={view === item.id ? "secondary" : "ghost"}
              className="h-11"
              asChild
            >
              <Link
                href={issueViewHref(item.id, input)}
                aria-current={view === item.id ? "page" : undefined}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            </Button>
          );
        })}
      </nav>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Button
          className="h-11 flex-1 sm:flex-none"
          variant={overlay === "filters" ? "secondary" : "outline"}
          onClick={() => setOverlay("filters")}
        >
          <Filter className="h-4 w-4" />
          Filters
          {input.statuses.length + input.teamIds.length > 0 && (
            <Badge className="ml-1">
              {input.statuses.length + input.teamIds.length}
            </Badge>
          )}
        </Button>
        <Button
          className="h-11"
          variant="outline"
          onClick={() => setOverlay("templates")}
        >
          <LayoutTemplate className="h-4 w-4" />
          Templates
        </Button>
        <Button className="h-11" variant="outline" asChild>
          <Link href={issueViewHref("archive", input)}>
            <Archive className="h-4 w-4" />
            Archive
          </Link>
        </Button>
        <Button
          className="h-11"
          disabled={!access.canEdit}
          onClick={() => setOverlay("create")}
        >
          <Plus className="h-4 w-4" />
          Create
        </Button>
      </div>
    </div>
  );
}

function IssueCalendarContextBar({
  calendarPeriodLabel,
  input,
  nextCalendarDate,
  previousCalendarDate,
}: {
  calendarPeriodLabel: string;
  input: IssueSearchInput;
  nextCalendarDate: string;
  previousCalendarDate: string;
}) {
  return (
    <div
      className="flex min-h-[3.75rem] flex-col gap-2 border-t border-white/10 bg-card/30 px-2 py-1.5 sm:h-[3.75rem] sm:flex-row sm:items-center sm:justify-between"
      data-issue-context
    >
      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" asChild>
          <Link
            aria-label={`Previous ${input.calendarMode}`}
            href={issueViewHref("calendar", {
              ...input,
              calendarDate: previousCalendarDate,
            })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link
            href={issueViewHref("calendar", {
              ...input,
              calendarDate: parseIssueSearchParams({}).calendarDate,
            })}
          >
            Today
          </Link>
        </Button>
        <Button size="icon" variant="ghost" asChild>
          <Link
            aria-label={`Next ${input.calendarMode}`}
            href={issueViewHref("calendar", {
              ...input,
              calendarDate: nextCalendarDate,
            })}
          >
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <p className="ml-2 text-sm font-medium">{calendarPeriodLabel}</p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Eastern</p>
        <div className="grid grid-cols-3 gap-1 rounded-md border border-white/10 bg-background/60 p-1">
          {(["month", "week", "day"] as const).map((mode) => (
            <Button
              key={mode}
              size="sm"
              variant={input.calendarMode === mode ? "secondary" : "ghost"}
              className="capitalize"
              asChild
            >
              <Link
                href={issueViewHref("calendar", {
                  ...input,
                  calendarMode: mode,
                  page: 1,
                })}
              >
                {mode}
              </Link>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

function IssueListContextBar({
  input,
  router,
}: {
  input: IssueSearchInput;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <div
      className="flex min-h-[3.75rem] flex-wrap items-center justify-end gap-2 border-t border-white/10 bg-card/30 px-2 py-1.5 sm:h-[3.75rem]"
      data-issue-context
    >
      <Label className="sr-only" htmlFor="issues-sort-field">
        Sort issues
      </Label>
      <select
        id="issues-sort-field"
        aria-label="Sort issues"
        value={input.sortField}
        className="h-11 rounded-md border border-input bg-background px-3 text-sm"
        onChange={(event) =>
          router.push(
            issueSearchHref({
              ...input,
              page: 1,
              sortField: event.target.value as IssueSearchInput["sortField"],
            }),
          )
        }
      >
        <option value="dueAt">Due date</option>
        <option value="updatedAt">Last updated</option>
        <option value="name">Name</option>
        <option value="status">Status</option>
        <option value="priority">Priority</option>
      </select>
      <Button
        className="h-11"
        variant="outline"
        onClick={() =>
          router.push(
            issueSearchHref({
              ...input,
              page: 1,
              sortDirection: input.sortDirection === "asc" ? "desc" : "asc",
            }),
          )
        }
      >
        {input.sortDirection === "asc" ? "Ascending" : "Descending"}
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform",
            input.sortDirection === "asc" && "rotate-180",
          )}
        />
      </Button>
      <Label className="sr-only" htmlFor="issues-page-size">
        Issues per page
      </Label>
      <select
        id="issues-page-size"
        aria-label="Issues per page"
        value={input.pageSize}
        className="h-11 rounded-md border border-input bg-background px-3 text-sm"
        onChange={(event) =>
          router.push(
            issueSearchHref({
              ...input,
              page: 1,
              pageSize: Number(
                event.target.value,
              ) as IssueSearchInput["pageSize"],
            }),
          )
        }
      >
        <option value="25">25 / page</option>
        <option value="50">50 / page</option>
        <option value="100">100 / page</option>
      </select>
    </div>
  );
}

export function IssueWorkspaceDock({
  access,
  calendarPeriodLabel,
  input,
  issueCount,
  nextCalendarDate,
  overlay,
  previousCalendarDate,
  router,
  setOverlay,
  view,
}: {
  access: { canEdit: boolean };
  calendarPeriodLabel: string;
  input: IssueSearchInput;
  issueCount: number;
  nextCalendarDate: string;
  overlay: IssueWorkspaceOverlay;
  previousCalendarDate: string;
  router: ReturnType<typeof useRouter>;
  setOverlay: (overlay: IssueWorkspaceOverlay) => void;
  view: IssueWorkspaceView;
}) {
  return (
    <section
      className="overflow-hidden rounded-lg border border-white/10 bg-card/95 shadow-xl shadow-black/10"
      data-issue-dock
    >
      <IssueViewToolbar
        access={access}
        input={input}
        overlay={overlay}
        setOverlay={setOverlay}
        view={view}
      />

      {view === "calendar" && (
        <IssueCalendarContextBar
          calendarPeriodLabel={calendarPeriodLabel}
          input={input}
          nextCalendarDate={nextCalendarDate}
          previousCalendarDate={previousCalendarDate}
        />
      )}

      {(view === "list" || view === "archive") && (
        <IssueListContextBar input={input} router={router} />
      )}

      {view === "kanban" && (
        <div
          className="flex min-h-[3.75rem] items-center justify-between gap-3 border-t border-white/10 bg-card/30 px-4 py-1.5 sm:h-[3.75rem]"
          data-issue-context
        >
          <p className="text-sm font-medium">{issueCount} issues loaded</p>
          <p className="text-right text-sm text-muted-foreground">
            Drag a card or use its status menu
          </p>
        </div>
      )}
    </section>
  );
}
