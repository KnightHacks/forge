import type { SearchParams } from "~/lib/search-params";

function first(value: SearchParams[string]) {
  return Array.isArray(value) ? value[0] : value;
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function parseProjectDirectoryParams(params: SearchParams) {
  const direction =
    first(params.direction) === "desc" ? ("desc" as const) : ("asc" as const);
  const requestedSort = first(params.sort);
  const sort: "participantCount" | "submittedAt" | "title" =
    requestedSort === "submittedAt" || requestedSort === "participantCount"
      ? requestedSort
      : ("title" as const);
  const requestedPageSize = positiveInteger(first(params.pageSize), 25);
  const pageSize = [10, 25, 50, 100].includes(requestedPageSize)
    ? requestedPageSize
    : 25;
  const deletedParam = first(params.deleted);
  const deleted: "active" | "all" | "deleted" =
    deletedParam === "deleted" || deletedParam === "all"
      ? deletedParam
      : "active";

  return {
    challengeIds: (first(params.challenge) ?? "").split(",").filter(Boolean),
    deleted,
    direction,
    maxParticipants: first(params.maxParticipants)
      ? positiveInteger(first(params.maxParticipants), 100)
      : undefined,
    minParticipants: first(params.minParticipants)
      ? positiveInteger(first(params.minParticipants), 1)
      : undefined,
    page: positiveInteger(first(params.page), 1),
    pageSize,
    query: (first(params.query) ?? "").trim().slice(0, 120),
    sort,
  };
}
