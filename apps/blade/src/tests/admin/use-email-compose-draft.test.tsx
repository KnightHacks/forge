/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EmailComposeDraft } from "~/app/_components/admin/email/email-compose-draft-storage";
import {
  loadEmailComposeDraft,
  saveEmailComposeDraft,
} from "~/app/_components/admin/email/email-compose-draft-storage";
import {
  composeDraftFromState,
  composeStateFromDraft,
  emptyComposeState,
  useEmailComposeDraft,
} from "~/app/_components/admin/email/use-email-compose-draft";

const REVISION_ID = "3f1d0f4a-0b2c-4d3e-8f90-1a2b3c4d5e6f";

const entries = new Map<string, string>();
const failures = { read: false, write: false };

// vitest's jsdom environment does not expose `localStorage`, so the hook's only
// collaborator is supplied here.
const storage = {
  clear: () => entries.clear(),
  getItem: (key: string) => {
    if (failures.read) throw new Error("storage disabled");
    return entries.get(key) ?? null;
  },
  removeItem: (key: string) => entries.delete(key),
  setItem: (key: string, value: string) => {
    if (failures.write) throw new Error("quota exceeded");
    entries.set(key, value);
  },
};

Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: storage,
});

function storedDraft(overrides: Partial<EmailComposeDraft> = {}) {
  return {
    contentMode: "plainText",
    excludedRecipients: ["skip@knighthacks.org"],
    plainText: "Body text",
    scheduleMode: "schedule",
    scheduledFor: "2026-08-01T10:00",
    selectedAudiences: ["alumni", "role:abc"],
    subject: "Kept subject",
    templateRevisionId: REVISION_ID,
    ...overrides,
  } satisfies EmailComposeDraft;
}

beforeEach(() => {
  entries.clear();
  failures.read = false;
  failures.write = false;
});

describe("compose state mapping", () => {
  it("sorts both collections on the way to storage so the payload is stable", () => {
    const state = emptyComposeState(false);
    state.excludedRecipients = new Set(["b@x.org", "a@x.org"]);
    state.selectedAudiences = new Set(["role:b", "alumni", "role:a"]);

    expect(composeDraftFromState(state)).toMatchObject({
      excludedRecipients: ["a@x.org", "b@x.org"],
      selectedAudiences: ["alumni", "role:a", "role:b"],
    });
  });

  it("seeds a normal campaign with current members", () => {
    expect([...emptyComposeState(false).selectedAudiences]).toEqual([
      "current_members",
    ]);
  });

  it("drops audiences a development review campaign may not use", () => {
    const state = composeStateFromDraft(storedDraft(), true);

    // `alumni` is not permitted in review mode; the explicit role survives.
    expect([...state.selectedAudiences]).toEqual(["role:abc"]);
  });

  it("falls back to the default audience when a restore filters everything out", () => {
    const state = composeStateFromDraft(
      storedDraft({ selectedAudiences: ["alumni"] }),
      true,
    );

    expect([...state.selectedAudiences]).toEqual(["team_members"]);
  });

  it("round-trips a draft unchanged apart from ordering", () => {
    const draft = storedDraft();

    expect(composeDraftFromState(composeStateFromDraft(draft, false))).toEqual({
      ...draft,
      selectedAudiences: ["alumni", "role:abc"],
    });
  });
});

describe("useEmailComposeDraft", () => {
  it("restores a stored draft on mount", async () => {
    saveEmailComposeDraft(storage, storedDraft());

    const { result } = renderHook(() => useEmailComposeDraft(false));

    await waitFor(() =>
      expect(result.current.compose.subject).toBe("Kept subject"),
    );
    expect(result.current.compose.contentMode).toBe("plainText");
    expect(result.current.compose.scheduleMode).toBe("schedule");
    expect([...result.current.compose.excludedRecipients]).toEqual([
      "skip@knighthacks.org",
    ]);
  });

  it("never overwrites the stored draft with the empty seed state", async () => {
    saveEmailComposeDraft(storage, storedDraft());
    const setItem = vi.spyOn(storage, "setItem");

    renderHook(() => useEmailComposeDraft(false));

    // Every write that happens must carry the restored subject, so a mount can
    // never cost an admin the campaign they were part-way through writing.
    await waitFor(() => expect(setItem).toHaveBeenCalled());
    for (const [, value] of setItem.mock.calls) {
      expect(value).toContain("Kept subject");
    }
    expect(loadEmailComposeDraft(storage)?.subject).toBe("Kept subject");
  });

  it("persists a field edit", async () => {
    const { result } = renderHook(() => useEmailComposeDraft(false));

    act(() => result.current.update("subject", "Fall kickoff"));

    await waitFor(() =>
      expect(loadEmailComposeDraft(storage)?.subject).toBe("Fall kickoff"),
    );
  });

  it("accepts an updater so collection edits stay based on current state", async () => {
    const { result } = renderHook(() => useEmailComposeDraft(false));

    act(() =>
      result.current.setExcludedRecipients(
        (current) => new Set([...current, "one@x.org"]),
      ),
    );
    act(() =>
      result.current.setExcludedRecipients(
        (current) => new Set([...current, "two@x.org"]),
      ),
    );

    await waitFor(() =>
      expect(loadEmailComposeDraft(storage)?.excludedRecipients).toEqual([
        "one@x.org",
        "two@x.org",
      ]),
    );
  });

  it("keeps the same state object when a field is set to its current value", () => {
    const { result } = renderHook(() => useEmailComposeDraft(false));
    const before = result.current.compose;

    act(() => result.current.update("contentMode", "template"));

    expect(result.current.compose).toBe(before);
  });

  it("discards the stored draft on clear without immediately rewriting it", async () => {
    saveEmailComposeDraft(storage, storedDraft());
    const { result } = renderHook(() => useEmailComposeDraft(false));
    await waitFor(() =>
      expect(result.current.compose.subject).toBe("Kept subject"),
    );

    act(() => result.current.clear());

    expect(result.current.compose.subject).toBe("");
    expect([...result.current.compose.selectedAudiences]).toEqual([
      "current_members",
    ]);
    // The save effect runs for the reset commit and must stay suppressed,
    // otherwise a sent campaign reappears as a draft on the next visit.
    await waitFor(() => expect(loadEmailComposeDraft(storage)).toBeNull());
  });

  it("resumes persisting after the one suppressed save", async () => {
    const { result } = renderHook(() => useEmailComposeDraft(false));
    act(() => result.current.update("subject", "First"));
    await waitFor(() =>
      expect(loadEmailComposeDraft(storage)?.subject).toBe("First"),
    );

    act(() => result.current.clear());
    act(() => result.current.update("subject", "Second"));

    await waitFor(() =>
      expect(loadEmailComposeDraft(storage)?.subject).toBe("Second"),
    );
  });

  it("survives storage that throws on read", async () => {
    failures.read = true;

    const { result } = renderHook(() => useEmailComposeDraft(false));

    await waitFor(() => expect(result.current.compose.subject).toBe(""));
    expect(() =>
      act(() => result.current.update("subject", "Still typing")),
    ).not.toThrow();
    expect(result.current.compose.subject).toBe("Still typing");
  });

  it("survives storage that throws on write", async () => {
    failures.write = true;

    const { result } = renderHook(() => useEmailComposeDraft(false));

    expect(() =>
      act(() => result.current.update("plainText", "Body")),
    ).not.toThrow();
    await waitFor(() => expect(result.current.compose.plainText).toBe("Body"));
  });
});
