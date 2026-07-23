import { describe, expect, it } from "vitest";

import {
  canonicalIssueCreationHash,
  eventDeletionIssueHistoryRows,
  issueHistoryChanges,
  legacyEasternWallClock,
} from "../../utils/issues/lifecycle";

describe("Club Operations Issues lifecycle helpers", () => {
  it("TC-LIFE-003 hashes equivalent creation payloads deterministically", () => {
    const first = canonicalIssueCreationHash({
      assigneeIds: ["b", "a"],
      creationKey: "key",
      description: "Plan",
      links: ["https://b.test", "https://a.test"],
      name: "Launch",
      teamVisibilityIds: ["team-b", "team-a"],
    });
    const retry = canonicalIssueCreationHash({
      teamVisibilityIds: ["team-a", "team-b"],
      name: "Launch",
      links: ["https://a.test", "https://b.test"],
      description: "Plan",
      creationKey: "different-client-key-is-not-content",
      assigneeIds: ["a", "b"],
    });
    const changed = canonicalIssueCreationHash({
      assigneeIds: ["a", "b"],
      creationKey: "key",
      description: "Changed",
      links: ["https://a.test", "https://b.test"],
      name: "Launch",
      teamVisibilityIds: ["team-a", "team-b"],
    });

    expect(first).toBe(retry);
    expect(first).not.toBe(changed);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  it("TC-HISTORY-001 emits only changed allowlisted fields", () => {
    const changes = issueHistoryChanges(
      {
        archivedAt: null,
        description: "Before",
        internalSecret: "never",
        name: "Launch",
        revision: 2,
        status: "Planning",
      },
      {
        archivedAt: null,
        description: "After",
        internalSecret: "still never",
        name: "Launch",
        revision: 3,
        status: "In Progress",
      },
    );

    expect(changes).toEqual({
      after: { description: "After", status: "In Progress" },
      before: { description: "Before", status: "Planning" },
      changedFields: ["description", "status"],
    });
  });

  it("TC-MIGRATION-003 dual-writes an Eastern wall-clock legacy date", () => {
    expect(
      legacyEasternWallClock("2026-07-22T03:00:00.000Z").toISOString(),
    ).toBe("2026-07-21T23:00:00.000Z");
    expect(
      legacyEasternWallClock("2026-12-22T04:00:00.000Z").toISOString(),
    ).toBe("2026-12-21T23:00:00.000Z");
  });

  it("TC-EVENT-004 records system unlink history for every linked issue", () => {
    expect(
      eventDeletionIssueHistoryRows({
        eventId: "event-a",
        issueIds: ["issue-a", "issue-b"],
      }),
    ).toEqual([
      expect.objectContaining({
        action: "event_unlinked",
        actorId: null,
        after: { eventId: null },
        before: { eventId: "event-a" },
        changedFields: ["eventId"],
        issueId: "issue-a",
      }),
      expect.objectContaining({ issueId: "issue-b" }),
    ]);
  });
});
