import { ComponentType } from "discord-api-types/v10";
import { describe, expect, it, vi } from "vitest";

import {
  buildIssueReminderPlan,
  deserializeIssueReminderSnapshot,
  issueReminderAllowedMentions,
  issueReminderIdentity,
  sanitizeIssueReminderTitle,
  serializeIssueReminderSnapshot,
  splitIssueReminderMessages,
} from "../../utils/issues/reminders";

vi.mock("@forge/db/client", () => ({ db: {} }));

function containerTextDisplays(
  message: ReturnType<typeof splitIssueReminderMessages>[number],
) {
  const [container] = message.components;
  if (container?.type !== ComponentType.Container) return [];
  return container.components.flatMap((component) =>
    component.type === ComponentType.TextDisplay ? [component.content] : [],
  );
}

const baseIssue = {
  archivedAt: null,
  assigneeDiscordUserIds: ["111111111111111111"],
  assigneeNames: ["Alex"],
  channelId: "222222222222222222",
  dueAt: new Date("2026-08-05T03:00:00.000Z"),
  id: "00000000-0000-4000-8000-000000000001",
  name: "Publish semester plan",
  priority: "High" as const,
  remindersEnabled: true,
  status: "Planning" as const,
  teamColor: "#93ceff",
  teamDiscordRoleId: "333333333333333333",
  teamName: "Development Team",
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

  it("TC-REMINDER-004 keeps pings in cc content and compact issue details in a role-colored container", () => {
    expect(sanitizeIssueReminderTitle("@everyone <@123>\nLaunch")).toBe(
      "@​everyone <@​123> Launch",
    );
    const [assigned] = buildIssueReminderPlan(
      [{ ...baseIssue, name: "@everyone <@123>\nLaunch" }],
      new Date("2026-07-21T13:00:00.000Z"),
    );
    const [unassigned] = buildIssueReminderPlan(
      [
        {
          ...baseIssue,
          assigneeDiscordUserIds: [],
          assigneeNames: [],
          id: "00000000-0000-4000-8000-000000000002",
          name: "Confirm venue",
        },
      ],
      new Date("2026-07-21T13:00:00.000Z"),
    );
    if (!assigned || !unassigned) throw new Error("Expected reminder targets.");

    const [message] = splitIssueReminderMessages(
      [assigned, unassigned],
      "https://blade.test",
    );
    expect(message).toBeDefined();
    if (!message) throw new Error("Expected a reminder message.");
    expect(message.content).toContain("<@111111111111111111>");
    expect(message.content).toContain("<@&333333333333333333>");
    expect(message.content).not.toContain("Launch");
    expect(message.embeds).toHaveLength(0);
    expect(message.components).toHaveLength(1);
    expect(message.components[0]).toMatchObject({
      accent_color: 0x93ceff,
      type: ComponentType.Container,
    });
    const displays = containerTextDisplays(message);
    expect(displays[0]).toBe("## Development Team · Issue reminders");
    expect(displays[1]).toContain("### 🔵 DUE IN 14 DAYS · 2 TASKS");
    expect(displays[1]).toContain("@​everyone <@​123\\> Launch (8/4)]");
    expect(displays[1]).not.toContain("<@123>");
    expect(displays[1]).toContain("**(!!!)");
    expect(displays[1]).toContain("\n-# Alex");
    expect(displays[1]).toContain("\n-# Development Team");
    expect(displays[1]).not.toContain("Open in Blade");
    const [productionMessage] = splitIssueReminderMessages(
      [assigned],
      "https://blade.knighthacks.org",
    );
    expect(
      productionMessage && containerTextDisplays(productionMessage).join("\n"),
    ).toContain(`https://blade.knighthacks.org/admin/issues/${assigned.id}`);
    expect(issueReminderAllowedMentions(message.targets)).toEqual({
      parse: [],
      roles: ["333333333333333333"],
      users: ["111111111111111111"],
    });
  });

  it("TC-REMINDER-005 splits deterministic messages at Discord component limits", () => {
    const targets = Array.from({ length: 80 }, (_, index) => {
      const [target] = buildIssueReminderPlan(
        [
          {
            ...baseIssue,
            assigneeDiscordUserIds: Array.from({ length: 5 }, (_, assignee) =>
              (111111111111111111n + BigInt(index * 5 + assignee)).toString(),
            ),
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
    expect(
      chunks.every((chunk) => {
        const [container] = chunk.components;
        const displays = containerTextDisplays(chunk);
        return (
          chunk.embeds.length === 0 &&
          chunk.components.length === 1 &&
          container?.type === ComponentType.Container &&
          container.components.length <= 10 &&
          1 + container.components.length + 1 <= 40 &&
          displays.every((display) => display.length <= 2_000) &&
          displays.reduce((total, display) => total + display.length, 0) +
            chunk.content.length <=
            6_000 &&
          [...chunk.content.matchAll(/<@(\d{17,20})>/g)].length <= 100 &&
          [...chunk.content.matchAll(/<@&(\d{17,20})>/g)].length <= 100
        );
      }),
    ).toBe(true);
    expect(chunks.flatMap((chunk) => chunk.targets)).toHaveLength(80);
    expect(
      chunks.flatMap((chunk) => chunk.targets.map((target) => target.name)),
    ).toEqual([...targets].map((target) => target.name).sort());

    const [fourteenDay, oneDay, overdue] = targets;
    if (!fourteenDay || !oneDay || !overdue)
      throw new Error("Expected mixed-window reminder targets.");
    const [mixedMessage] = splitIssueReminderMessages(
      [
        fourteenDay,
        { ...oneDay, priority: "Highest", reminderKey: "1d" },
        { ...overdue, reminderKey: "overdue:2026-07-21" },
      ],
      "https://blade.test",
    );
    expect(
      mixedMessage &&
        containerTextDisplays(mixedMessage)
          .filter((display) => display.startsWith("### "))
          .map((display) => display.split("\n")[0]),
    ).toEqual([
      "### 🔴 OVERDUE · 1 TASK",
      "### 🟠 DUE IN 1 DAY · 1 TASK",
      "### 🔵 DUE IN 14 DAYS · 1 TASK",
    ]);
    expect(mixedMessage?.targets.map((target) => target.reminderKey)).toEqual([
      "overdue:2026-07-21",
      "1d",
      "14d",
    ]);
  });

  it("TC-REMINDER-006 snapshots components and reads version-one and legacy snapshots", () => {
    const [target] = buildIssueReminderPlan(
      [baseIssue],
      new Date("2026-07-21T13:00:00.000Z"),
    );
    if (!target) throw new Error("Expected a reminder target.");
    const [message] = splitIssueReminderMessages(
      [target],
      "https://blade.test",
    );
    if (!message) throw new Error("Expected a reminder message.");

    expect(
      deserializeIssueReminderSnapshot(serializeIssueReminderSnapshot(message)),
    ).toEqual({
      components: message.components,
      content: message.content,
      embeds: message.embeds,
    });
    expect(
      deserializeIssueReminderSnapshot(
        JSON.stringify({
          content: "cc: <@111111111111111111>",
          embeds: [{ title: "Legacy embed" }],
          version: 1,
        }),
      ),
    ).toEqual({
      components: [],
      content: "cc: <@111111111111111111>",
      embeds: [{ title: "Legacy embed" }],
    });
    expect(deserializeIssueReminderSnapshot("legacy reminder content")).toEqual(
      {
        components: [],
        content: "legacy reminder content",
        embeds: [],
      },
    );
  });
});
