"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ListTodo } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@forge/ui/alert";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";

import type { IssueSearchInput } from "./params";
import type { IssueWorkspaceData } from "./types";
import {
  adminPageClassName,
  AdminPageHeader,
  adminPageStackClassName,
} from "~/app/_components/shared/admin-page";
import { ADMIN_PAGE_EYEBROWS } from "~/consts/admin-page-eyebrows";
import {
  formatIssueCalendarPeriod,
  issueCalendarFocus,
} from "./issue-calendar-period";
import { IssueCreateDialog } from "./issue-create-dialog";
import { IssueFilters } from "./issue-filters";
import { issueSearchHref } from "./issue-view-href";
import {
  IssueCalendarView,
  IssueKanbanView,
  IssueListView,
} from "./issue-views";
import { IssueWorkspaceDock } from "./issue-workspace-dock";
import { shiftIssueCalendarDate } from "./params";
import { TemplateCatalogDialog } from "./template-catalog-dialog";

export type IssueWorkspaceView = "archive" | "calendar" | "kanban" | "list";

/**
 * The workspace has three overlays and every one of them is modal, so at most
 * one can be open. One value says that; three booleans only implied it.
 */
export type IssueWorkspaceOverlay = "create" | "filters" | "none" | "templates";

const ISSUE_WORKSPACE_EYEBROW: Record<IssueWorkspaceView, string> = {
  archive: ADMIN_PAGE_EYEBROWS.issueArchive,
  calendar: ADMIN_PAGE_EYEBROWS.issueCalendar,
  kanban: ADMIN_PAGE_EYEBROWS.issueKanban,
  list: ADMIN_PAGE_EYEBROWS.issueList,
};

function IssueWorkspacePages({
  input,
  pagination,
}: {
  input: IssueSearchInput;
  pagination: IssueWorkspaceData["pagination"];
}) {
  return (
    <nav
      className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-card/95 p-2"
      aria-label="Issue pages"
    >
      <p className="px-2 text-sm text-muted-foreground">
        Page {pagination.page} of {pagination.pageCount}
      </p>
      <div className="flex gap-2">
        {pagination.page > 1 ? (
          <Button variant="outline" asChild>
            <Link
              href={issueSearchHref({
                ...input,
                page: pagination.page - 1,
              })}
            >
              Previous
            </Link>
          </Button>
        ) : (
          <Button variant="outline" disabled>
            Previous
          </Button>
        )}
        {pagination.page < pagination.pageCount ? (
          <Button variant="outline" asChild>
            <Link
              href={issueSearchHref({
                ...input,
                page: pagination.page + 1,
              })}
            >
              Next
            </Link>
          </Button>
        ) : (
          <Button variant="outline" disabled>
            Next
          </Button>
        )}
      </div>
    </nav>
  );
}

export function IssueWorkspace({
  access,
  data,
  input,
  view,
}: {
  access: {
    canCreateEvent: boolean;
    canEdit: boolean;
    canManageTemplates: boolean;
  };
  data: IssueWorkspaceData;
  input: IssueSearchInput;
  view: IssueWorkspaceView;
}) {
  const router = useRouter();
  const [overlay, setOverlay] = useState<IssueWorkspaceOverlay>("none");
  const calendarFocus = issueCalendarFocus(input.calendarDate);
  const previousCalendarDate = shiftIssueCalendarDate(
    input.calendarDate,
    input.calendarMode,
    -1,
  );
  const nextCalendarDate = shiftIssueCalendarDate(
    input.calendarDate,
    input.calendarMode,
    1,
  );
  const calendarPeriodLabel = formatIssueCalendarPeriod(
    input.calendarMode,
    calendarFocus,
  );

  return (
    <main
      className={`${adminPageClassName} [&_a:has(>svg)]:gap-2 [&_button:has(>svg)]:gap-2`}
    >
      <div className={adminPageStackClassName}>
        <AdminPageHeader
          actions={
            <dl className="grid grid-cols-3 overflow-hidden rounded-lg border border-white/10 bg-card/90">
              {[
                { label: "Open", value: data.counts.open },
                { label: "Finished", value: data.counts.finished },
                { label: "Visible", value: data.pagination.totalCount },
              ].map((metric) => (
                <div
                  className="min-w-20 border-l border-white/10 px-3 py-2 text-center first:border-l-0 sm:min-w-24"
                  key={metric.label}
                >
                  <dt className="text-xs text-muted-foreground">
                    {metric.label}
                  </dt>
                  <dd className="mt-0.5 font-mono text-base font-semibold">
                    {metric.value}
                  </dd>
                </div>
              ))}
            </dl>
          }
          description="Shared work from planning through completion."
          eyebrow={ISSUE_WORKSPACE_EYEBROW[view]}
          icon={ListTodo}
          title="Issues"
        />

        <IssueWorkspaceDock
          access={access}
          calendarPeriodLabel={calendarPeriodLabel}
          input={input}
          issueCount={data.issues.length}
          nextCalendarDate={nextCalendarDate}
          overlay={overlay}
          previousCalendarDate={previousCalendarDate}
          router={router}
          setOverlay={setOverlay}
          view={view}
        />

        {view === "calendar" ? (
          <IssueCalendarView
            issues={data.issues}
            mode={input.calendarMode}
            month={calendarFocus}
          />
        ) : view === "kanban" ? (
          <IssueKanbanView issues={data.issues} />
        ) : (
          <IssueListView issues={data.issues} />
        )}

        {(view === "list" || view === "archive") &&
          data.pagination.pageCount > 1 && (
            <IssueWorkspacePages input={input} pagination={data.pagination} />
          )}

        {view === "archive" && data.issues.length === 0 && (
          <Alert>
            <Archive className="h-4 w-4" />
            <AlertTitle>Archive is empty</AlertTitle>
            <AlertDescription>
              Archived issue trees remain recoverable here.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <Dialog
        open={overlay === "filters"}
        onOpenChange={(next) => setOverlay(next ? "filters" : "none")}
      >
        <DialogContent className="max-h-[92svh] max-w-3xl gap-0 overflow-hidden border-white/10 bg-card p-0 [&_a:has(>svg)]:gap-2 [&_button:has(>svg)]:gap-2">
          <DialogHeader className="border-b border-white/10 px-5 py-4 pr-14 text-left">
            <DialogTitle>Filter issues</DialogTitle>
            <DialogDescription>
              Narrow the current workspace without moving the work surface.
            </DialogDescription>
          </DialogHeader>
          <IssueFilters input={input} teams={data.teams} />
        </DialogContent>
      </Dialog>

      {overlay === "create" && (
        <IssueCreateDialog
          access={access}
          data={data}
          onClose={() => setOverlay("none")}
          open
        />
      )}
      <TemplateCatalogDialog
        canManage={access.canManageTemplates}
        onClose={() => setOverlay("none")}
        open={overlay === "templates"}
        teams={data.teams}
        templates={data.templates}
      />
    </main>
  );
}
