import { redirect } from "next/navigation";

import { ISSUE } from "@forge/consts";
import { defaultIssueDueAt, MEMBER_DASHBOARD_PATH } from "@forge/validators";

import type { IssueWorkspaceData } from "./types";
import type { SearchParams } from "~/lib/search-params";
import { canAccessIssues } from "~/lib/admin-access";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";
import { IssueWorkspace } from "./issue-workspace";
import { issueCalendarWindow, parseIssueSearchParams } from "./params";

type WorkspaceView = "archive" | "calendar" | "kanban" | "list";

function listFilters(input: ReturnType<typeof parseIssueSearchParams>) {
  const dueTo = input.dueTo
    ? issueCalendarWindow({ date: input.dueTo, mode: "day" }).calendarEnd
    : undefined;
  return {
    ...input,
    dueAfter: input.dueFrom
      ? defaultIssueDueAt(input.dueFrom, "00:00")
      : undefined,
    dueBefore: dueTo,
    eventLink: input.eventLink,
    sortDirection: input.sortDirection,
    sortField: input.sortField,
  };
}

async function loadKanban(input: ReturnType<typeof parseIssueSearchParams>) {
  const statuses =
    input.statuses.length > 0 ? input.statuses : [...ISSUE.ISSUE_STATUS];
  const columns = await Promise.all(
    statuses.map(async (status) => {
      const rows: IssueWorkspaceData["issues"] = [];
      let counts: IssueWorkspaceData["counts"] = { finished: 0, open: 0 };
      for (let page = 1; ; page += 1) {
        const result = await api.issues.list({
          ...listFilters(input),
          page,
          pageSize: 100,
          statuses: [status],
          view: "kanban",
        });
        rows.push(...result.rows);
        if (page === 1) counts = result.counts;
        if (page >= result.pagination.pageCount) break;
      }
      return { counts, rows };
    }),
  );
  const rows = columns.flatMap((column) => column.rows);
  const counts: IssueWorkspaceData["counts"] = { finished: 0, open: 0 };
  for (const column of columns) {
    counts.finished += column.counts.finished;
    counts.open += column.counts.open;
  }
  return {
    counts,
    pagination: {
      page: 1,
      pageCount: 1,
      pageSize: 100 as const,
      totalCount: rows.length,
    },
    rows,
  };
}

async function loadCalendar(input: ReturnType<typeof parseIssueSearchParams>) {
  const window = issueCalendarWindow({
    date: input.calendarDate,
    mode: input.calendarMode,
  });
  const firstPage = await api.issues.list({
    ...listFilters(input),
    ...window,
    page: 1,
    pageSize: 100,
    view: "calendar",
  });
  const rows: IssueWorkspaceData["issues"] = [...firstPage.rows];
  const remainingPages = await Promise.all(
    Array.from(
      { length: Math.max(0, firstPage.pagination.pageCount - 1) },
      (_, index) =>
        api.issues.list({
          ...listFilters(input),
          ...window,
          page: index + 2,
          pageSize: 100,
          view: "calendar",
        }),
    ),
  );
  rows.push(...remainingPages.flatMap((result) => result.rows));
  return {
    counts: firstPage.counts,
    pagination: {
      page: 1,
      pageCount: 1,
      pageSize: 100 as const,
      totalCount: firstPage.pagination.totalCount,
    },
    rows,
  };
}

export async function renderIssueWorkspace(
  view: WorkspaceView,
  searchParams: Promise<SearchParams>,
) {
  const session = await auth();
  if (!session) redirect("/");
  const permissions = await api.roles.getPermissions();
  if (!canAccessIssues(permissions)) redirect(MEMBER_DASHBOARD_PATH);
  const input = parseIssueSearchParams(await searchParams);
  const listInput = {
    ...listFilters(input),
    archived: view === "archive",
    view: view === "archive" ? ("list" as const) : view,
  };
  const [result, teams, templates] = await Promise.all([
    view === "kanban"
      ? loadKanban(input)
      : view === "calendar"
        ? loadCalendar(input)
        : api.issues.list(listInput),
    api.issues.listTeams(),
    api.issues.listTemplates(),
  ]);
  const data: IssueWorkspaceData = {
    counts: result.counts,
    issues: result.rows,
    pagination: result.pagination,
    teams,
    templates,
  };
  return (
    <IssueWorkspace
      access={{
        canCreateEvent:
          permissions.IS_OFFICER === true ||
          permissions.EDIT_CLUB_EVENT === true,
        canEdit: teams.some((team) => team.canEdit),
        canManageTemplates:
          permissions.IS_OFFICER === true ||
          permissions.EDIT_ISSUE_TEMPLATES === true,
      }}
      data={data}
      input={input}
      view={view}
    />
  );
}
