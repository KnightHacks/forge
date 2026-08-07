import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { Roles } from "../schemas/auth";
import {
  Issue,
  IssueHistory,
  IssueReminderDelivery,
  Template,
} from "../schemas/knight-hacks";

describe("Club Operations Issues additive storage", () => {
  it("TC-MIGRATION-003 exposes revisions, archive, idempotency, and due instants", () => {
    expect(Object.keys(getTableColumns(Issue))).toEqual(
      expect.arrayContaining([
        "archiveBatchId",
        "archivedAt",
        "archivedBy",
        "creationHash",
        "creationKey",
        "discordThreadId",
        "dueAt",
        "revision",
      ]),
    );
    expect(Object.keys(getTableColumns(Roles))).toContain(
      "issueRemindersEnabled",
    );
  });

  it("TC-MIGRATION-003 retains immutable history, reminder ledger, and repairable templates", () => {
    expect(Object.keys(getTableColumns(IssueHistory))).toEqual(
      expect.arrayContaining([
        "action",
        "actorDisplayName",
        "actorId",
        "after",
        "before",
        "changedFields",
        "issueId",
      ]),
    );
    expect(Object.keys(getTableColumns(IssueReminderDelivery))).toEqual(
      expect.arrayContaining([
        "attemptCount",
        "destinationSnapshot",
        "dueAt",
        "issueId",
        "reminderKey",
        "status",
      ]),
    );
    expect(Object.keys(getTableColumns(Template))).toEqual(
      expect.arrayContaining([
        "disabledAt",
        "disabledReason",
        "normalizedName",
      ]),
    );
  });
});
