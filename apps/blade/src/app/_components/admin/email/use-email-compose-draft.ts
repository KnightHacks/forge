"use client";

import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { EmailComposeDraft } from "./email-compose-draft-storage";
import {
  defaultAudienceKey,
  restoreDraftAudiences,
} from "./email-audience-selection";
import {
  discardEmailComposeDraft,
  loadEmailComposeDraft,
  saveEmailComposeDraft,
} from "./email-compose-draft-storage";

/**
 * The compose form in memory. Same fields the persisted draft carries, except
 * the two multi-selects stay `Set`s here and are sorted into arrays only on the
 * way to storage.
 */
export interface EmailComposeState {
  contentMode: "plainText" | "template";
  excludedRecipients: Set<string>;
  plainText: string;
  scheduleMode: "now" | "schedule";
  scheduledFor: string;
  selectedAudiences: Set<string>;
  subject: string;
  templateRevisionId: string;
}

export function emptyComposeState(
  developmentReviewCampaign: boolean,
): EmailComposeState {
  return {
    contentMode: "template",
    excludedRecipients: new Set<string>(),
    plainText: "",
    scheduleMode: "now",
    scheduledFor: "",
    selectedAudiences: new Set([defaultAudienceKey(developmentReviewCampaign)]),
    subject: "",
    templateRevisionId: "",
  };
}

export function composeStateFromDraft(
  draft: EmailComposeDraft,
  developmentReviewCampaign: boolean,
): EmailComposeState {
  return {
    contentMode: draft.contentMode,
    excludedRecipients: new Set(draft.excludedRecipients),
    plainText: draft.plainText,
    scheduleMode: draft.scheduleMode,
    scheduledFor: draft.scheduledFor,
    selectedAudiences: new Set(
      restoreDraftAudiences(draft.selectedAudiences, developmentReviewCampaign),
    ),
    subject: draft.subject,
    templateRevisionId: draft.templateRevisionId,
  };
}

export function composeDraftFromState(
  state: EmailComposeState,
): EmailComposeDraft {
  return {
    contentMode: state.contentMode,
    excludedRecipients: [...state.excludedRecipients].sort(),
    plainText: state.plainText,
    scheduleMode: state.scheduleMode,
    scheduledFor: state.scheduledFor,
    selectedAudiences: [...state.selectedAudiences].sort(),
    subject: state.subject,
    templateRevisionId: state.templateRevisionId,
  };
}

/**
 * Owns the compose form and its `localStorage` mirror.
 *
 * The draft is read once on mount and never re-read, so an in-progress edit is
 * never clobbered by a later render. Saves are suppressed until that read
 * finishes, and again for exactly one commit after {@link clear}, so discarding
 * a sent draft is not immediately undone by the save effect.
 */
export function useEmailComposeDraft(developmentReviewCampaign: boolean) {
  const [compose, setCompose] = useState<EmailComposeState>(() =>
    emptyComposeState(developmentReviewCampaign),
  );
  const [restored, setRestored] = useState(false);
  const skipNextSave = useRef(false);

  useEffect(() => {
    try {
      const draft = loadEmailComposeDraft(window.localStorage);
      if (draft) {
        setCompose(composeStateFromDraft(draft, developmentReviewCampaign));
      }
    } catch {
      // Storage may be unavailable in hardened browser contexts.
    } finally {
      setRestored(true);
    }
  }, [developmentReviewCampaign]);

  useEffect(() => {
    if (!restored) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    try {
      saveEmailComposeDraft(
        window.localStorage,
        composeDraftFromState(compose),
      );
    } catch {
      // Browsers may deny storage or exhaust their local quota.
    }
  }, [compose, restored]);

  /**
   * Writes one field. Accepts an updater like `useState` does — no field type
   * is a function, so the discrimination is unambiguous — and keeps React's
   * bail-out by returning the previous object when the value is unchanged.
   */
  const update = useCallback(
    <K extends keyof EmailComposeState>(
      key: K,
      value: SetStateAction<EmailComposeState[K]>,
    ) => {
      setCompose((current) => {
        const next =
          typeof value === "function" ? value(current[key]) : (value as never);
        return next === current[key] ? current : { ...current, [key]: next };
      });
    },
    [],
  );

  /**
   * Audience resolution prunes manual exclusions to the resolved pool, so that
   * one field needs a stable dispatcher it can list as an effect dependency.
   */
  const setExcludedRecipients = useCallback<
    Dispatch<SetStateAction<Set<string>>>
  >((value) => update("excludedRecipients", value), [update]);

  const clear = useCallback(() => {
    skipNextSave.current = true;
    try {
      discardEmailComposeDraft(window.localStorage);
    } catch {
      // Storage may be unavailable even though the send succeeded.
    }
    setCompose(emptyComposeState(developmentReviewCampaign));
  }, [developmentReviewCampaign]);

  return { clear, compose, setExcludedRecipients, update };
}
