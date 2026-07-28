/** @vitest-environment jsdom */
// A DOM environment earns its keep here: this hook is the only thing standing
// between a half-written issue and a lost afternoon, and every one of its
// guarantees is a `localStorage` side effect that cannot be observed without
// rendering it.
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useIssueCreateDraft } from "~/app/_components/admin/issues/use-issue-create-draft";
import { ISSUE_CREATE_DRAFT_STORAGE_KEY } from "~/consts/browser-storage";

const entries = new Map<string, string>();

// vitest's jsdom environment does not expose `localStorage`, so the hook's only
// collaborator is supplied here.
Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: {
    clear: () => entries.clear(),
    getItem: (key: string) => entries.get(key) ?? null,
    removeItem: (key: string) => entries.delete(key),
    setItem: (key: string, value: string) => entries.set(key, value),
  },
});

function storedDraft() {
  const key = entries.get(ISSUE_CREATE_DRAFT_STORAGE_KEY);
  if (!key) return null;
  return JSON.parse(
    entries.get(`${ISSUE_CREATE_DRAFT_STORAGE_KEY}:${key}`) ?? "null",
  ) as Record<string, unknown> | null;
}

function seedStoredDraft(draft: Record<string, unknown>) {
  entries.set(ISSUE_CREATE_DRAFT_STORAGE_KEY, String(draft.creationKey));
  entries.set(
    `${ISSUE_CREATE_DRAFT_STORAGE_KEY}:${String(draft.creationKey)}`,
    JSON.stringify(draft),
  );
}

const stored = {
  creationKey: "11111111-1111-4111-8111-111111111111",
  description: "Book the room and confirm catering",
  links: "https://example.com/plan",
  name: "Fall kickoff",
  team: "team-a",
};

function render(open = true) {
  return renderHook(() =>
    useIssueCreateDraft({ defaultTeamId: "team-a", open }),
  );
}

beforeEach(() => {
  entries.clear();
});

describe("useIssueCreateDraft", () => {
  it("seeds an empty draft on the default team and persists it while open", () => {
    const { result } = render();

    expect(result.current.restore).toBeNull();
    expect(result.current.draft.team).toBe("team-a");
    expect(result.current.draft.name).toBe("");
    expect(storedDraft()).toMatchObject({
      creationKey: result.current.draft.creationKey,
      team: "team-a",
    });
  });

  it("persists nothing while the dialog is closed", () => {
    const { result } = render(false);

    act(() => result.current.update("name", "Fall kickoff"));

    expect(result.current.draft.name).toBe("Fall kickoff");
    expect(entries.size).toBe(0);
  });

  it("writes one field at a time and leaves the rest alone", () => {
    const { result } = render();
    const { creationKey, priority } = result.current.draft;

    act(() => result.current.update("name", "Fall kickoff"));
    act(() => result.current.update("assigneeIds", ["member-1"]));

    expect(result.current.draft).toMatchObject({
      assigneeIds: ["member-1"],
      creationKey,
      name: "Fall kickoff",
      priority,
    });
    expect(storedDraft()).toMatchObject({
      assigneeIds: ["member-1"],
      name: "Fall kickoff",
    });
  });

  it("offers a stored draft instead of applying it, and suspends saving until answered", () => {
    seedStoredDraft(stored);
    const { result } = render();

    expect(result.current.restore).toMatchObject({ name: "Fall kickoff" });

    act(() => result.current.update("name", "Something else"));

    // The prompt is still up, so the stored draft must survive intact.
    expect(storedDraft()).toMatchObject({ name: "Fall kickoff" });
  });

  it("restores the stored draft with the creation key it was minted with", () => {
    seedStoredDraft(stored);
    const { result } = render();

    act(() => result.current.restoreDraft());

    expect(result.current.restore).toBeNull();
    expect(result.current.draft).toMatchObject({
      creationKey: stored.creationKey,
      description: stored.description,
      links: stored.links,
      name: stored.name,
    });
    // Saving resumes only once the offer has been answered.
    act(() => result.current.update("name", "Fall kickoff 2026"));
    expect(storedDraft()).toMatchObject({
      creationKey: stored.creationKey,
      name: "Fall kickoff 2026",
    });
  });

  it("discards the stored draft and starts a new one under a new creation key", () => {
    seedStoredDraft(stored);
    const { result } = render();

    act(() => result.current.discardDraft());

    expect(result.current.restore).toBeNull();
    expect(result.current.draft.name).toBe("");
    expect(result.current.draft.team).toBe("team-a");
    expect(result.current.draft.creationKey).not.toBe(stored.creationKey);
    expect(
      entries.has(`${ISSUE_CREATE_DRAFT_STORAGE_KEY}:${stored.creationKey}`),
    ).toBe(false);
    // The empty replacement is saved immediately, so a reload does not re-offer
    // the draft that was just declined.
    expect(storedDraft()).toMatchObject({ name: "" });
  });

  it("clears the persisted copy once the issue has been created", () => {
    const { result } = render();
    act(() => result.current.update("name", "Fall kickoff"));
    expect(entries.size).toBe(2);

    act(() => result.current.clearStoredDraft());

    expect(entries.size).toBe(0);
  });
});
