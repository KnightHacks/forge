import { describe, expect, it } from "vitest";

import {
  discardEmailComposeDraft,
  loadEmailComposeDraft,
  saveEmailComposeDraft,
} from "~/app/_components/admin/email/email-compose-draft-storage";
import { EMAIL_COMPOSE_DRAFT_STORAGE_KEY } from "~/consts/browser-storage";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

const NOW = new Date("2026-07-26T18:00:00.000Z").getTime();
const draft = {
  contentMode: "template" as const,
  excludedRecipients: ["excluded@example.test"],
  plainText: "",
  scheduleMode: "schedule" as const,
  scheduledFor: "2026-08-01T12:00",
  selectedAudiences: ["team_members"],
  subject: "Team update",
  templateRevisionId: "00000000-0000-4000-8000-000000000123",
};

describe("Email Portal compose draft storage", () => {
  it("round-trips every compose field", () => {
    const storage = memoryStorage();
    saveEmailComposeDraft(storage, draft, NOW);
    expect(loadEmailComposeDraft(storage, NOW + 1_000)).toEqual(draft);
  });

  it("discards expired, malformed, and explicitly completed drafts", () => {
    const storage = memoryStorage();
    saveEmailComposeDraft(storage, draft, NOW);
    expect(
      loadEmailComposeDraft(storage, NOW + 8 * 24 * 60 * 60 * 1_000),
    ).toBeNull();
    expect(storage.getItem(EMAIL_COMPOSE_DRAFT_STORAGE_KEY)).toBeNull();

    storage.setItem(EMAIL_COMPOSE_DRAFT_STORAGE_KEY, "not-json");
    expect(loadEmailComposeDraft(storage, NOW)).toBeNull();

    saveEmailComposeDraft(storage, draft, NOW);
    discardEmailComposeDraft(storage);
    expect(storage.getItem(EMAIL_COMPOSE_DRAFT_STORAGE_KEY)).toBeNull();
  });
});
