export const EVENT_CREATE_DRAFT_STORAGE_KEY = "blade:event-create-draft";

const DRAFT_VERSION = 1;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type StorageAdapter = Pick<Storage, "getItem" | "removeItem" | "setItem">;

export interface EventCreateDraft {
  creationKey: string;
  values: {
    audience: "dues" | "public" | "roles";
    channelId?: string;
    channelType?: "stage" | "voice";
    description: string;
    end: string;
    endOffset?: "-04:00" | "-05:00";
    internal: boolean;
    location: string;
    name: string;
    pointOverride: number | null;
    roleIds: string[];
    start: string;
    startOffset?: "-04:00" | "-05:00";
    tagId: string;
  };
}

interface StoredDraft {
  draft: EventCreateDraft;
  version: number;
}

function isEventCreateDraft(value: unknown): value is EventCreateDraft {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  const values = candidate.values as Record<string, unknown> | undefined;
  return (
    typeof candidate.creationKey === "string" &&
    UUID_PATTERN.test(candidate.creationKey) &&
    !!values &&
    typeof values === "object" &&
    (values.audience === "public" ||
      values.audience === "dues" ||
      values.audience === "roles") &&
    typeof values.description === "string" &&
    typeof values.end === "string" &&
    typeof values.internal === "boolean" &&
    typeof values.location === "string" &&
    typeof values.name === "string" &&
    (values.pointOverride === null ||
      (typeof values.pointOverride === "number" &&
        Number.isSafeInteger(values.pointOverride) &&
        values.pointOverride >= 0)) &&
    Array.isArray(values.roleIds) &&
    values.roleIds.every((roleId) => typeof roleId === "string") &&
    typeof values.start === "string" &&
    typeof values.tagId === "string" &&
    (values.channelId === undefined || typeof values.channelId === "string") &&
    (values.channelType === undefined ||
      values.channelType === "stage" ||
      values.channelType === "voice") &&
    (values.startOffset === undefined ||
      values.startOffset === "-04:00" ||
      values.startOffset === "-05:00") &&
    (values.endOffset === undefined ||
      values.endOffset === "-04:00" ||
      values.endOffset === "-05:00")
  );
}

export function saveEventCreateDraft(
  storage: StorageAdapter,
  draft: EventCreateDraft,
) {
  storage.setItem(
    EVENT_CREATE_DRAFT_STORAGE_KEY,
    JSON.stringify({ draft, version: DRAFT_VERSION } satisfies StoredDraft),
  );
}

export function loadEventCreateDraft(storage: StorageAdapter) {
  const raw = storage.getItem(EVENT_CREATE_DRAFT_STORAGE_KEY);
  if (!raw) return null;

  try {
    const stored = JSON.parse(raw) as Partial<StoredDraft>;
    return stored.version === DRAFT_VERSION && isEventCreateDraft(stored.draft)
      ? stored.draft
      : null;
  } catch {
    return null;
  }
}

export function discardEventCreateDraft(storage: StorageAdapter) {
  storage.removeItem(EVENT_CREATE_DRAFT_STORAGE_KEY);
}
