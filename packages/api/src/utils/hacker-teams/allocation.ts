/** Keep teammate distribution ahead of total headcount only for separate teams. */
export function selectTeamClass<T extends { id: string }>(
  classes: readonly T[],
  totalCounts: ReadonlyMap<string | null, number>,
  teammateCounts: ReadonlyMap<string | null, number> = new Map(),
  togetherClassId?: string | null,
) {
  if (togetherClassId)
    return classes.find((entry) => entry.id === togetherClassId);
  return [...classes].sort(
    (a, b) =>
      (teammateCounts.get(a.id) ?? 0) - (teammateCounts.get(b.id) ?? 0) ||
      (totalCounts.get(a.id) ?? 0) - (totalCounts.get(b.id) ?? 0) ||
      a.id.localeCompare(b.id),
  )[0];
}
