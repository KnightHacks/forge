import { describe, expect, it, vi } from "vitest";

import {
  buildIssueReminderPlan,
  issueReminderIdentity,
  sanitizeIssueReminderTitle,
  splitIssueReminderMessages,
} from "../../utils/issues/reminders";

vi.mock("@forge/db/client", () => ({ db: {} }));

const baseIssue = {
  archivedAt: null,
  assigneeDiscordUserIds: ["111111111111111111"],
  channelId: "222222222222222222",
  dueAt: new Date("2026-08-05T03:00:00.000Z"),
  id: "00000000-0000-4000-8000-000000000001",
  name: "Publish semester plan",
  priority: "High" as const,
  remindersEnabled: true,
  status: "Planning" as const,
  teamDiscordRoleId: "333333333333333333",
  updatedAt: new Date("2026-07-20T12:00:00.000Z"),
};

describe("Club Operations Issues reminders", () => {
  it("TC-REMINDER-001 plans 14/7/3/1-day and daily overdue Eastern windows", () => {
    expect(
      buildIssueReminderPlan(
        [baseIssue],
        new Date("2026-07-21T13:00:00.000Z"),
      )[0],
    ).toMatchObject({ reminderKey: "14d" });
    expect(
      buildIssueReminderPlan(
        [{ ...baseIssue, dueAt: new Date("2026-07-29T03:00:00.000Z") }],
        new Date("2026-07-21T13:00:00.000Z"),
      )[0],
    ).toMatchObject({ reminderKey: "7d" });
    expect(
      buildIssueReminderPlan(
        [{ ...baseIssue, dueAt: new Date("2026-07-20T03:00:00.000Z") }],
        new Date("2026-07-21T13:00:00.000Z"),
      )[0],
    ).toMatchObject({ reminderKey: "overdue:2026-07-21" });
  });

  it("TC-REMINDER-002 skips finished, archived, undated, and disabled issues", () => {
    const now = new Date("2026-07-21T13:00:00.000Z");
    expect(
      buildIssueReminderPlan(
        [
          { ...baseIssue, status: "Finished" },
          { ...baseIssue, archivedAt: new Date() },
          { ...baseIssue, dueAt: null },
          { ...baseIssue, remindersEnabled: false },
        ],
        now,
      ),
    ).toEqual([]);
  });

  it("TC-REMINDER-003 keys delivery only by issue, due instant, and window", () => {
    const [plan] = buildIssueReminderPlan(
      [baseIssue],
      new Date("2026-07-21T13:00:00.000Z"),
    );
    expect(plan).toBeDefined();
    if (!plan) throw new Error("Expected a reminder plan.");
    const identity = issueReminderIdentity(plan);
    expect(
      issueReminderIdentity({
        ...plan,
        channelId: "999999999999999999",
        name: "Renamed after planning",
        priority: "Highest",
      }),
    ).toBe(identity);
    expect(
      issueReminderIdentity({
        ...plan,
        dueAt: new Date("2026-08-06T03:00:00.000Z"),
      }),
    ).not.toBe(identity);
  });

  it("TC-REMINDER-004 sanitizes mentions and splits Discord-safe messages", () => {
    expect(sanitizeIssueReminderTitle("@everyone <@123>\nLaunch")).toBe(
      "@​everyone <@​123> Launch",
    );
    const targets = Array.from({ length: 80 }, (_, index) => {
      const [target] = buildIssueReminderPlan(
        [
          {
            ...baseIssue,
            id: `${index}`.padStart(36, "0"),
            name: `Task ${index} ${"x".repeat(80)}`,
          },
        ],
        new Date("2026-07-21T13:00:00.000Z"),
      );
      if (!target) throw new Error("Expected a reminder target.");
      return target;
    });
    const chunks = splitIssueReminderMessages(targets, "https://blade.test");
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.content.length <= 2_000)).toBe(true);
    expect(chunks.flatMap((chunk) => chunk.targets)).toHaveLength(80);
  });
});
