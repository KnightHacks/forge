import { beforeEach, describe, expect, it } from "vitest";

import {
  discardEventCreateDraft,
  EVENT_CREATE_DRAFT_STORAGE_KEY,
  loadEventCreateDraft,
  saveEventCreateDraft,
} from "~/app/_components/admin/events/event-draft-storage";

class MemoryStorage implements Pick<
  Storage,
  "getItem" | "removeItem" | "setItem"
> {
  private readonly values = new Map<string, string>();

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

const draft = {
  creationKey: "00000000-0000-4000-8000-000000000301",
  values: {
    audience: "public" as const,
    description: "A practical TypeScript workshop.",
    end: "2026-08-12T20:00:00-04:00",
    internal: false,
    location: "ENG2 102",
    name: "TypeScript Workshop",
    pointOverride: null,
    roleIds: [],
    start: "2026-08-12T18:00:00-04:00",
    tagId: "00000000-0000-4000-8000-000000000302",
  },
};

describe("event create draft storage", () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it("TC-008 restores unfinished fields and the stable creation key", () => {
    saveEventCreateDraft(storage, draft);

    expect(loadEventCreateDraft(storage)).toEqual(draft);
    expect(storage.getItem(EVENT_CREATE_DRAFT_STORAGE_KEY)).not.toBeNull();
  });

  it("TC-008 discards a saved browser-local draft", () => {
    saveEventCreateDraft(storage, draft);
    discardEventCreateDraft(storage);

    expect(loadEventCreateDraft(storage)).toBeNull();
    expect(storage.getItem(EVENT_CREATE_DRAFT_STORAGE_KEY)).toBeNull();
  });

  it("TC-008 ignores malformed or unsupported stored values safely", () => {
    storage.setItem(EVENT_CREATE_DRAFT_STORAGE_KEY, "not-json");
    expect(loadEventCreateDraft(storage)).toBeNull();

    storage.setItem(
      EVENT_CREATE_DRAFT_STORAGE_KEY,
      JSON.stringify({ version: 999, draft }),
    );
    expect(loadEventCreateDraft(storage)).toBeNull();
  });
});
