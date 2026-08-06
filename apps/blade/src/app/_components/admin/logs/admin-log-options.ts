import type { SearchParams } from "~/lib/search-params";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function auditUuidParam(value: string | null | undefined) {
  return value && UUID_PATTERN.test(value) ? value : null;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function auditIdentityParams(params: SearchParams) {
  return {
    actorUserId: auditUuidParam(first(params.actor)),
    hackerAttendeeId: auditUuidParam(first(params.hacker)),
    memberId: auditUuidParam(first(params.member)),
  };
}

export function mergeAuditOptions<T>(
  initial: readonly T[],
  selected: readonly T[],
  key: (item: T) => string,
) {
  const merged = new Map(initial.map((item) => [key(item), item]));
  for (const item of selected) merged.set(key(item), item);
  return [...merged.values()];
}
