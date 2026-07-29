import { beforeEach, describe, expect, it } from "vitest";

import { emptyDraft } from "~/app/_components/admin/issues/issue-draft";
import {
  discardIssueCreateDraft,
  loadIssueCreateDraft,
  saveIssueCreateDraft,
} from "~/app/_components/admin/issues/issue-draft-storage";
import { ISSUE_CREATE_DRAFT_STORAGE_KEY } from "~/consts/browser-storage";

class MemoryStorage implements Pick<
  Storage,
  "getItem" | "removeItem" | "setItem"
> {
  readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
});

describe("Issue draft persistence", () => {
  it("stores the draft under its creation key and points at it", () => {
    const draft = { ...emptyDraft("team-a"), name: "Fall kickoff" };

    saveIssueCreateDraft(storage, draft);

    expect(storage.getItem(ISSUE_CREATE_DRAFT_STORAGE_KEY)).toBe(
      draft.creationKey,
    );
    expect(
      storage.getItem(`${ISSUE_CREATE_DRAFT_STORAGE_KEY}:${draft.creationKey}`),
    ).toBe(JSON.stringify(draft));
  });

  it("restores a saved draft with its original creation key", () => {
    const draft = { ...emptyDraft("team-a"), name: "Fall kickoff" };
    saveIssueCreateDraft(storage, draft);

    expect(loadIssueCreateDraft(storage)).toMatchObject({
      creationKey: draft.creationKey,
      name: "Fall kickoff",
      team: "team-a",
    });
  });

  it("returns nothing when no draft was ever saved", () => {
    expect(loadIssueCreateDraft(storage)).toBeNull();
  });

  it("returns nothing when the pointer outlives the draft body", () => {
    storage.setItem(ISSUE_CREATE_DRAFT_STORAGE_KEY, "orphaned-key");

    expect(loadIssueCreateDraft(storage)).toBeNull();
  });

  it("returns nothing rather than throwing on malformed JSON", () => {
    storage.setItem(ISSUE_CREATE_DRAFT_STORAGE_KEY, "key");
    storage.setItem(`${ISSUE_CREATE_DRAFT_STORAGE_KEY}:key`, "{not json");

    expect(loadIssueCreateDraft(storage)).toBeNull();
  });

  it("returns nothing when the stored value is not an object", () => {
    storage.setItem(ISSUE_CREATE_DRAFT_STORAGE_KEY, "key");
    storage.setItem(`${ISSUE_CREATE_DRAFT_STORAGE_KEY}:key`, '"a string"');

    expect(loadIssueCreateDraft(storage)).toBeNull();
  });

  it("fills fields an older draft shape never wrote", () => {
    storage.setItem(ISSUE_CREATE_DRAFT_STORAGE_KEY, "key");
    storage.setItem(
      `${ISSUE_CREATE_DRAFT_STORAGE_KEY}:key`,
      JSON.stringify({ creationKey: "key", name: "Half a draft" }),
    );

    expect(loadIssueCreateDraft(storage)).toMatchObject({
      dueTime: "23:00",
      links: "",
      name: "Half a draft",
      priority: "Medium",
      status: "Backlog",
      teamVisibilityIds: [],
    });
  });

  it("repairs a links field that is not a string", () => {
    storage.setItem(ISSUE_CREATE_DRAFT_STORAGE_KEY, "key");
    storage.setItem(
      `${ISSUE_CREATE_DRAFT_STORAGE_KEY}:key`,
      JSON.stringify({ creationKey: "key", links: ["https://one.test"] }),
    );

    expect(loadIssueCreateDraft(storage)?.links).toBe("");
  });

  it("clears both the body and the pointer when a draft is discarded", () => {
    const draft = emptyDraft("team-a");
    saveIssueCreateDraft(storage, draft);

    discardIssueCreateDraft(storage, draft);

    expect(storage.values.size).toBe(0);
    expect(loadIssueCreateDraft(storage)).toBeNull();
  });
});
