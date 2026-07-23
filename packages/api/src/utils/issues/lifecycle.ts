import { createHash } from "node:crypto";

const HISTORY_FIELDS = [
  "archiveBatchId",
  "archivedAt",
  "assigneeIds",
  "description",
  "dueAt",
  "eventId",
  "links",
  "name",
  "parentId",
  "priority",
  "status",
  "team",
  "teamVisibilityIds",
] as const;

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map(canonicalValue)
      .sort((left, right) =>
        JSON.stringify(left).localeCompare(JSON.stringify(right)),
      );
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key, item]) => key !== "creationKey" && item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalValue(item)]),
    );
  }
  return value;
}

export function canonicalIssueCreationHash(input: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalValue(input)))
    .digest("hex");
}

function comparable(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  return value;
}

export function issueHistoryChanges(
  beforeSource: Record<string, unknown>,
  afterSource: Record<string, unknown>,
) {
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};
  const changedFields: string[] = [];

  for (const field of HISTORY_FIELDS) {
    const oldValue = comparable(beforeSource[field]);
    const newValue = comparable(afterSource[field]);
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) continue;
    changedFields.push(field);
    before[field] = oldValue ?? null;
    after[field] = newValue ?? null;
  }

  return { after, before, changedFields };
}

export function eventDeletionIssueHistoryRows({
  eventId,
  issueIds,
}: {
  eventId: string;
  issueIds: readonly string[];
}) {
  return issueIds.map((issueId) => ({
    action: "event_unlinked",
    actorDisplayName: "Reforge system",
    actorId: null,
    after: { eventId: null },
    before: { eventId },
    changedFields: ["eventId"],
    issueId,
  }));
}

export function legacyEasternWallClock(dueAt: string | Date) {
  const instant = dueAt instanceof Date ? dueAt : new Date(dueAt);
  if (Number.isNaN(instant.getTime())) throw new Error("Invalid due instant.");
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone: "America/New_York",
    year: "numeric",
  }).formatToParts(instant);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return new Date(
    Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour) % 24,
      Number(values.minute),
      Number(values.second),
    ),
  );
}
