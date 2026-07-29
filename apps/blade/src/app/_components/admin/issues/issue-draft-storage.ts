import type { IssueDraft } from "./issue-draft";
import { ISSUE_CREATE_DRAFT_STORAGE_KEY } from "~/consts/browser-storage";
import { emptyDraft } from "./issue-draft";

type StorageAdapter = Pick<Storage, "getItem" | "removeItem" | "setItem">;

/**
 * Browser persistence for the unsaved "create issue" draft. The pointer key
 * holds the current `creationKey`; the draft itself is stored under
 * `${key}:${creationKey}` so a restored draft keeps the creation key it was
 * minted with, and the retried mutation still de-duplicates against a creation
 * that already landed.
 */
export function saveIssueCreateDraft(
  storage: StorageAdapter,
  draft: IssueDraft,
) {
  storage.setItem(
    `${ISSUE_CREATE_DRAFT_STORAGE_KEY}:${draft.creationKey}`,
    JSON.stringify(draft),
  );
  storage.setItem(ISSUE_CREATE_DRAFT_STORAGE_KEY, draft.creationKey);
}

/**
 * Returns the stored draft, or `null` when there is nothing to restore.
 * Anything unreadable — no pointer, a missing body, malformed JSON, a value
 * written by an older draft shape — is treated as "no draft" rather than
 * surfaced as an error.
 */
export function loadIssueCreateDraft(storage: StorageAdapter) {
  const key = storage.getItem(ISSUE_CREATE_DRAFT_STORAGE_KEY);
  if (!key) return null;
  try {
    const stored = JSON.parse(
      storage.getItem(`${ISSUE_CREATE_DRAFT_STORAGE_KEY}:${key}`) ?? "null",
    ) as Partial<IssueDraft> | null;
    if (!stored || typeof stored !== "object") return null;
    return {
      ...emptyDraft(),
      ...stored,
      links: typeof stored.links === "string" ? stored.links : "",
    };
  } catch {
    return null;
  }
}

export function discardIssueCreateDraft(
  storage: StorageAdapter,
  draft: IssueDraft,
) {
  storage.removeItem(`${ISSUE_CREATE_DRAFT_STORAGE_KEY}:${draft.creationKey}`);
  storage.removeItem(ISSUE_CREATE_DRAFT_STORAGE_KEY);
}
