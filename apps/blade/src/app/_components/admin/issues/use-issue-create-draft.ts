"use client";

import { useCallback, useEffect, useState } from "react";

import type { IssueDraft } from "./issue-draft";
import { emptyDraft } from "./issue-draft";
import {
  discardIssueCreateDraft,
  loadIssueCreateDraft,
  saveIssueCreateDraft,
} from "./issue-draft-storage";

/**
 * Owns the "create issue" form and its `localStorage` mirror.
 *
 * Storage is read once, during the first render — which is why the dialog is
 * mounted only while it is open, so the read never happens on the server. A
 * draft found there is *offered* rather than applied: `restore` holds it, the
 * dialog shows the restore prompt instead of the form, and saving is suspended
 * until the offer is answered so an unanswered prompt cannot overwrite the
 * stored draft with an empty one.
 */
export function useIssueCreateDraft({
  defaultTeamId,
  open,
}: {
  defaultTeamId: string | undefined;
  open: boolean;
}) {
  const [initial] = useState(() => {
    const stored = loadIssueCreateDraft(window.localStorage);
    return {
      draft: stored ?? emptyDraft(defaultTeamId),
      restore: stored,
    };
  });
  const [draft, setDraft] = useState<IssueDraft>(initial.draft);
  const [restore, setRestore] = useState<IssueDraft | null>(initial.restore);

  useEffect(() => {
    if (!open || restore) return;
    saveIssueCreateDraft(window.localStorage, draft);
  }, [draft, open, restore]);

  const update = useCallback(
    <K extends keyof IssueDraft>(key: K, value: IssueDraft[K]) => {
      setDraft((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  /** Accepts the offered draft, keeping the creation key it was minted with. */
  const restoreDraft = useCallback(() => {
    if (!restore) return;
    setDraft(restore);
    setRestore(null);
  }, [restore]);

  /** Declines the offered draft and starts an empty one. */
  const discardDraft = useCallback(() => {
    if (!restore) return;
    discardIssueCreateDraft(window.localStorage, restore);
    setDraft(emptyDraft(defaultTeamId));
    setRestore(null);
  }, [defaultTeamId, restore]);

  /** Drops the persisted copy once the issue it describes has been created. */
  const clearStoredDraft = useCallback(() => {
    discardIssueCreateDraft(window.localStorage, draft);
  }, [draft]);

  return {
    clearStoredDraft,
    discardDraft,
    draft,
    restore,
    restoreDraft,
    setDraft,
    update,
  };
}
