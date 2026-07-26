export const EMAIL_COMPOSE_DRAFT_STORAGE_KEY =
  "blade:email-portal-compose-draft";

const DRAFT_VERSION = 1;
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1_000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type StorageAdapter = Pick<Storage, "getItem" | "removeItem" | "setItem">;

export interface EmailComposeDraft {
  contentMode: "plainText" | "template";
  excludedRecipients: string[];
  plainText: string;
  scheduleMode: "now" | "schedule";
  scheduledFor: string;
  selectedAudiences: string[];
  subject: string;
  templateRevisionId: string;
}

interface StoredDraft {
  draft: EmailComposeDraft;
  savedAt: number;
  version: number;
}

function isStringArray(
  value: unknown,
  options: { itemMax: number; max: number },
): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= options.max &&
    value.every(
      (item) => typeof item === "string" && item.length <= options.itemMax,
    )
  );
}

function isEmailComposeDraft(value: unknown): value is EmailComposeDraft {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const draft = value as Record<string, unknown>;
  return (
    (draft.contentMode === "plainText" || draft.contentMode === "template") &&
    isStringArray(draft.excludedRecipients, { itemMax: 320, max: 50_000 }) &&
    typeof draft.plainText === "string" &&
    draft.plainText.length <= 200_000 &&
    (draft.scheduleMode === "now" || draft.scheduleMode === "schedule") &&
    typeof draft.scheduledFor === "string" &&
    draft.scheduledFor.length <= 40 &&
    isStringArray(draft.selectedAudiences, { itemMax: 160, max: 20 }) &&
    typeof draft.subject === "string" &&
    draft.subject.length <= 200 &&
    typeof draft.templateRevisionId === "string" &&
    (draft.templateRevisionId === "" ||
      UUID_PATTERN.test(draft.templateRevisionId))
  );
}

export function saveEmailComposeDraft(
  storage: StorageAdapter,
  draft: EmailComposeDraft,
  now = Date.now(),
) {
  storage.setItem(
    EMAIL_COMPOSE_DRAFT_STORAGE_KEY,
    JSON.stringify({
      draft,
      savedAt: now,
      version: DRAFT_VERSION,
    } satisfies StoredDraft),
  );
}

export function loadEmailComposeDraft(
  storage: StorageAdapter,
  now = Date.now(),
) {
  const raw = storage.getItem(EMAIL_COMPOSE_DRAFT_STORAGE_KEY);
  if (!raw) return null;
  try {
    const stored = JSON.parse(raw) as Partial<StoredDraft>;
    if (
      stored.version !== DRAFT_VERSION ||
      typeof stored.savedAt !== "number" ||
      now - stored.savedAt > DRAFT_TTL_MS ||
      now < stored.savedAt ||
      !isEmailComposeDraft(stored.draft)
    ) {
      storage.removeItem(EMAIL_COMPOSE_DRAFT_STORAGE_KEY);
      return null;
    }
    return stored.draft;
  } catch {
    storage.removeItem(EMAIL_COMPOSE_DRAFT_STORAGE_KEY);
    return null;
  }
}

export function discardEmailComposeDraft(storage: StorageAdapter) {
  storage.removeItem(EMAIL_COMPOSE_DRAFT_STORAGE_KEY);
}
