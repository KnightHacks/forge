import type { SearchParams } from "~/lib/search-params";

function first(value: SearchParams[string]) {
  return Array.isArray(value) ? value[0] : value;
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function participantBound(value: string | undefined) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 100
    ? parsed
    : undefined;
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseUuidParam(value: SearchParams[string]) {
  const parsed = first(value);
  return parsed && uuidPattern.test(parsed) ? parsed : undefined;
}

export function parseProjectDirectoryParams(params: SearchParams) {
  const direction =
    first(params.direction) === "desc" ? ("desc" as const) : ("asc" as const);
  const requestedSort = first(params.sort);
  const sort:
    | "challengeRating"
    | "participantCount"
    | "rating"
    | "submittedAt"
    | "title" =
    requestedSort === "submittedAt" ||
    requestedSort === "participantCount" ||
    requestedSort === "challengeRating" ||
    requestedSort === "rating"
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
  const minParticipants = participantBound(first(params.minParticipants));
  const requestedMax = participantBound(first(params.maxParticipants));
  const maxParticipants =
    minParticipants !== undefined &&
    requestedMax !== undefined &&
    minParticipants > requestedMax
      ? undefined
      : requestedMax;

  return {
    challengeIds: (first(params.challenge) ?? "")
      .split(",")
      .filter((challengeId) => uuidPattern.test(challengeId))
      .slice(0, 25),
    deleted,
    direction,
    includeJudged: first(params.includeJudged) === "1",
    maxParticipants,
    minParticipants,
    page: positiveInteger(first(params.page), 1),
    pageSize,
    query: (first(params.query) ?? "").trim().slice(0, 120),
    sort,
  };
}
