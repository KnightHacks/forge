export type EventAdminView = "calendar" | "list" | "tags";
export type EventAdminTiming = "past" | "upcoming";
export type EventAdminSort = "attendance" | "name" | "start" | "tag";
export type EventAdminDirection = "asc" | "desc";
export type EventAudienceFilter = "dues" | "public" | "roles";
export type EventHealthFilter = "error" | "pending" | "synced" | "unknown";
export type EventInternalFilter = "all" | "external" | "internal";

export interface AdminEventInput {
  audiences: EventAudienceFilter[];
  calendarEnd?: string;
  calendarStart?: string;
  direction: EventAdminDirection;
  endDate?: string;
  health: EventHealthFilter[];
  internal: EventInternalFilter;
  page: number;
  pageSize: 25 | 50 | 100 | 250 | 500;
  query: string;
  roleIds: string[];
  sort: EventAdminSort;
  startDate?: string;
  tags: string[];
  timing: EventAdminTiming;
  view: EventAdminView;
}

export type AdminEventSearchParams = Record<
  string,
  string | string[] | undefined
>;

const PAGE_SIZES = [25, 50, 100, 250, 500] as const;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_CALENDAR_RADIUS_MS = 31 * 24 * 60 * 60 * 1_000;
const MAX_CALENDAR_WINDOW_MS = 120 * 24 * 60 * 60 * 1_000;
const MAX_FILTER_VALUES = 100;
const MAX_QUERY_LENGTH = 100;

export function defaultAdminCalendarWindow(now = new Date()) {
  return {
    calendarEnd: new Date(
      now.getTime() + DEFAULT_CALENDAR_RADIUS_MS,
    ).toISOString(),
    calendarStart: new Date(
      now.getTime() - DEFAULT_CALENDAR_RADIUS_MS,
    ).toISOString(),
  };
}

function values(value: string | string[] | undefined) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function enumValues<T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[],
) {
  return [
    ...new Set(
      values(value).filter((item): item is T => allowed.includes(item as T)),
    ),
  ];
}

function oneOf<T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[],
  fallback: T,
) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && allowed.includes(candidate as T)
    ? (candidate as T)
    : fallback;
}

function positiveInteger(
  value: string | string[] | undefined,
  fallback: number,
) {
  const candidate = Number(Array.isArray(value) ? value[0] : value);
  return Number.isSafeInteger(candidate) && candidate > 0
    ? candidate
    : fallback;
}

function validDate(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || !DATE_PATTERN.test(candidate)) return undefined;
  const parsed = new Date(`${candidate}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === candidate
    ? candidate
    : undefined;
}

function validInstant(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate) return undefined;
  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export function parseAdminEventSearchParams(params: AdminEventSearchParams) {
  const requestedPageSize = positiveInteger(params.pageSize, 25);
  const pageSize = PAGE_SIZES.includes(
    requestedPageSize as (typeof PAGE_SIZES)[number],
  )
    ? (requestedPageSize as AdminEventInput["pageSize"])
    : 25;
  const eventCandidate = Array.isArray(params.event)
    ? params.event[0]
    : params.event;
  const timing = oneOf(params.timing, ["past", "upcoming"], "upcoming");
  const health =
    timing === "past"
      ? []
      : enumValues(params.health, ["error", "pending", "synced", "unknown"]);
  const calendarStartCandidate = validInstant(params.calendarStart);
  const calendarEndCandidate = validInstant(params.calendarEnd);
  const hasValidCalendarWindow = Boolean(
    calendarStartCandidate &&
    calendarEndCandidate &&
    Date.parse(calendarEndCandidate) > Date.parse(calendarStartCandidate) &&
    Date.parse(calendarEndCandidate) - Date.parse(calendarStartCandidate) <=
      MAX_CALENDAR_WINDOW_MS,
  );
  const startDateCandidate = validDate(params.start);
  const endDateCandidate = validDate(params.end);
  const hasOrderedDateRange = !(
    startDateCandidate &&
    endDateCandidate &&
    endDateCandidate < startDateCandidate
  );
  const query =
    (Array.isArray(params.q) ? params.q[0] : params.q)?.trim().slice(0, 100) ??
    "";
  const roleIds = [
    ...new Set(
      values(params.role).filter((roleId) => UUID_PATTERN.test(roleId)),
    ),
  ].slice(0, MAX_FILTER_VALUES);
  const tags = [
    ...new Set(
      values(params.tag)
        .map((tag) => tag.trim().slice(0, MAX_QUERY_LENGTH))
        .filter(Boolean),
    ),
  ].slice(0, MAX_FILTER_VALUES);

  return {
    input: {
      audiences: enumValues(params.audience, ["dues", "public", "roles"]),
      calendarEnd: hasValidCalendarWindow ? calendarEndCandidate : undefined,
      calendarStart: hasValidCalendarWindow
        ? calendarStartCandidate
        : undefined,
      direction: oneOf(
        params.direction,
        ["asc", "desc"],
        timing === "past" ? "desc" : "asc",
      ),
      endDate: hasOrderedDateRange ? endDateCandidate : undefined,
      health,
      internal: oneOf(params.internal, ["all", "external", "internal"], "all"),
      page: positiveInteger(params.page, 1),
      pageSize,
      query,
      roleIds,
      sort: oneOf(params.sort, ["attendance", "name", "start", "tag"], "start"),
      startDate: hasOrderedDateRange ? startDateCandidate : undefined,
      tags,
      timing,
      view: oneOf(params.view, ["calendar", "list", "tags"], "list"),
    } satisfies AdminEventInput,
    selectedEventId:
      eventCandidate && UUID_PATTERN.test(eventCandidate)
        ? eventCandidate
        : null,
  };
}

function appendMany(params: URLSearchParams, key: string, values: string[]) {
  for (const value of [...values].sort((a, b) => a.localeCompare(b))) {
    params.append(key, value);
  }
}

export function buildAdminEventSearchParams(
  input: AdminEventInput,
  selectedEventId: string | null,
) {
  const params = new URLSearchParams();
  if (input.view !== "list") params.set("view", input.view);
  if (input.query) params.set("q", input.query);
  if (input.timing !== "upcoming") params.set("timing", input.timing);
  if (input.page !== 1) params.set("page", String(input.page));
  if (input.pageSize !== 25) params.set("pageSize", String(input.pageSize));
  if (input.sort !== "start") params.set("sort", input.sort);
  const defaultDirection = input.timing === "past" ? "desc" : "asc";
  if (input.direction !== defaultDirection) {
    params.set("direction", input.direction);
  }
  if (input.startDate) params.set("start", input.startDate);
  if (input.endDate) params.set("end", input.endDate);
  if (input.calendarStart) params.set("calendarStart", input.calendarStart);
  if (input.calendarEnd) params.set("calendarEnd", input.calendarEnd);
  if (input.internal !== "all") params.set("internal", input.internal);
  appendMany(params, "audience", input.audiences);
  appendMany(params, "health", input.health);
  appendMany(params, "role", input.roleIds);
  appendMany(params, "tag", input.tags);
  if (selectedEventId) params.set("event", selectedEventId);
  return params;
}
