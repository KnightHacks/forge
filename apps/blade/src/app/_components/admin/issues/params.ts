import { ISSUE } from "@forge/consts";
import { defaultIssueDueAt } from "@forge/validators";

export interface IssueSearchInput {
  assigneeIds: string[];
  calendarDate: string;
  calendarMode: "day" | "month" | "week";
  dueFrom: string;
  dueTo: string;
  eventLink: "any" | "linked" | "unlinked";
  page: number;
  pageSize: 25 | 50 | 100;
  priorities: (typeof ISSUE.PRIORITY)[number][];
  rootOnly: boolean;
  search: string;
  sortDirection: "asc" | "desc";
  sortField: "dueAt" | "name" | "priority" | "status" | "updatedAt";
  statuses: (typeof ISSUE.ISSUE_STATUS)[number][];
  teamIds: string[];
}

export type IssueSearchParams = Record<string, string | string[] | undefined>;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function easternDateKey(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "2-digit",
      timeZone: "America/New_York",
      year: "numeric",
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function values(value: string | string[] | undefined) {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

export function parseIssueSearchParams(
  params: IssueSearchParams,
): IssueSearchInput {
  const page = Number(params.page);
  const pageSize = Number(params.pageSize);
  const calendarDate = Array.isArray(params.date)
    ? params.date[0]
    : params.date;
  const calendarMode = Array.isArray(params.mode)
    ? params.mode[0]
    : params.mode;
  const dueFrom = Array.isArray(params.dueFrom)
    ? params.dueFrom[0]
    : params.dueFrom;
  const dueTo = Array.isArray(params.dueTo) ? params.dueTo[0] : params.dueTo;
  const eventLink = Array.isArray(params.event)
    ? params.event[0]
    : params.event;
  const sortField = Array.isArray(params.sort) ? params.sort[0] : params.sort;
  const sortDirection = Array.isArray(params.direction)
    ? params.direction[0]
    : params.direction;
  return {
    assigneeIds: [
      ...new Set(values(params.assignee).filter((id) => uuidPattern.test(id))),
    ],
    calendarDate:
      calendarDate && datePattern.test(calendarDate)
        ? calendarDate
        : easternDateKey(),
    calendarMode:
      calendarMode === "week" || calendarMode === "day"
        ? calendarMode
        : "month",
    dueFrom: dueFrom && datePattern.test(dueFrom) ? dueFrom : "",
    dueTo: dueTo && datePattern.test(dueTo) ? dueTo : "",
    eventLink:
      eventLink === "linked" || eventLink === "unlinked" ? eventLink : "any",
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: pageSize === 50 || pageSize === 100 ? pageSize : (25 as const),
    priorities: [
      ...new Set(
        values(params.priority).filter((value) =>
          ISSUE.PRIORITY.includes(value as (typeof ISSUE.PRIORITY)[number]),
        ) as (typeof ISSUE.PRIORITY)[number][],
      ),
    ],
    rootOnly: params.root === "true",
    search:
      (Array.isArray(params.q) ? params.q[0] : params.q)
        ?.trim()
        .slice(0, 200) ?? "",
    sortDirection: sortDirection === "desc" ? "desc" : "asc",
    sortField:
      sortField === "name" ||
      sortField === "priority" ||
      sortField === "status" ||
      sortField === "updatedAt"
        ? sortField
        : "dueAt",
    statuses: [
      ...new Set(
        values(params.status).filter((value) =>
          ISSUE.ISSUE_STATUS.includes(
            value as (typeof ISSUE.ISSUE_STATUS)[number],
          ),
        ) as (typeof ISSUE.ISSUE_STATUS)[number][],
      ),
    ],
    teamIds: [
      ...new Set(values(params.team).filter((id) => uuidPattern.test(id))),
    ],
  };
}

export function buildIssueSearchParams(input: IssueSearchInput) {
  const params = new URLSearchParams();
  if (input.search) params.set("q", input.search);
  if (input.calendarMode !== "month") params.set("mode", input.calendarMode);
  if (input.calendarDate !== easternDateKey())
    params.set("date", input.calendarDate);
  if (input.dueFrom) params.set("dueFrom", input.dueFrom);
  if (input.dueTo) params.set("dueTo", input.dueTo);
  if (input.eventLink !== "any") params.set("event", input.eventLink);
  if (input.page > 1) params.set("page", String(input.page));
  if (input.pageSize !== 25) params.set("pageSize", String(input.pageSize));
  if (input.rootOnly) params.set("root", "true");
  if (input.sortField !== "dueAt") params.set("sort", input.sortField);
  if (input.sortDirection !== "asc")
    params.set("direction", input.sortDirection);
  for (const id of input.assigneeIds) params.append("assignee", id);
  for (const priority of input.priorities) params.append("priority", priority);
  for (const status of input.statuses) params.append("status", status);
  for (const id of input.teamIds) params.append("team", id);
  return params;
}

function dateAtNoon(date: string) {
  return new Date(`${date}T12:00:00.000Z`);
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function issueCalendarWindow({
  date,
  mode,
}: {
  date: string;
  mode: IssueSearchInput["calendarMode"];
}) {
  const focus = dateAtNoon(date);
  const start = new Date(focus);
  if (mode === "month") {
    start.setUTCDate(1);
    start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  } else if (mode === "week") {
    start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  }
  const end = new Date(start);
  end.setUTCDate(
    end.getUTCDate() + (mode === "month" ? 42 : mode === "week" ? 7 : 1),
  );
  return {
    calendarEnd: defaultIssueDueAt(dateKey(end), "00:00"),
    calendarStart: defaultIssueDueAt(dateKey(start), "00:00"),
  };
}

export function shiftIssueCalendarDate(
  date: string,
  mode: IssueSearchInput["calendarMode"],
  direction: -1 | 1,
) {
  const next = dateAtNoon(date);
  if (mode === "month") next.setUTCMonth(next.getUTCMonth() + direction);
  else
    next.setUTCDate(next.getUTCDate() + direction * (mode === "week" ? 7 : 1));
  return dateKey(next);
}
