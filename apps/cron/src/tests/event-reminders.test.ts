import { ComponentType, MessageFlags } from "discord-api-types/v10";
import { afterEach, describe, expect, it, vi } from "vitest";

import { logger } from "@forge/utils";

import { createClubReminderExecutor } from "../crons/reminder-logic";

const currentWorkshop = {
  description: "Build a typed API client.",
  discordId: "111111111111111111",
  endDateTime: "2026-06-29T20:00:00-04:00",
  id: "00000000-0000-4000-8000-000000000901",
  location: "ENG2 102",
  name: "Current Workshop",
  startDateTime: "2026-06-29T18:00:00-04:00",
  tag: "Workshop",
};

type ReminderPayload = Parameters<
  Parameters<typeof createClubReminderExecutor>[0]["send"]
>[0];

function messageText(payload: ReminderPayload): string[] {
  if (payload.embeds) {
    return [
      payload.content ?? "",
      ...payload.embeds.flatMap((embed) => [
        embed.title ?? "",
        embed.description ?? "",
        embed.url ?? "",
        ...(embed.fields ?? []).flatMap((field) => [field.name, field.value]),
      ]),
    ];
  }
  return (payload.components ?? []).flatMap((component) => {
    if (component.type === ComponentType.TextDisplay)
      return [component.content];
    if (component.type === ComponentType.Container) {
      return component.components.flatMap((child) =>
        child.type === ComponentType.TextDisplay ? [child.content] : [],
      );
    }
    return [];
  });
}

describe("club event reminders", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("TC-028 consumes the shared selector and keeps corrected event time", async () => {
    const now = new Date("2026-06-29T09:00:00-04:00");
    const getCandidates = vi.fn().mockResolvedValue([currentWorkshop]);
    const send = vi.fn().mockResolvedValue(undefined);
    const execute = createClubReminderExecutor({
      getCandidates,
      now: () => now,
      send,
    });

    await execute();

    expect(getCandidates).toHaveBeenCalledOnce();
    expect(getCandidates).toHaveBeenCalledWith({ now });
    expect(send).toHaveBeenCalledOnce();
    const sent = JSON.stringify(send.mock.calls);
    expect(sent).toContain("Event Reminders");
    expect(sent).toContain("Current Workshop");
    expect(sent).toContain("Monday, June 29, 2026");
    expect(sent).toContain("6:00 PM");
    expect(sent).not.toContain("Tuesday, June 30, 2026");
  });

  it("TC-028 preserves Sunday weekday grouping", async () => {
    const now = new Date("2026-06-28T09:00:00-04:00");
    const send =
      vi.fn<Parameters<typeof createClubReminderExecutor>[0]["send"]>();
    const execute = createClubReminderExecutor({
      getCandidates: vi.fn().mockResolvedValue([
        currentWorkshop,
        {
          ...currentWorkshop,
          endDateTime: "2026-07-01T20:00:00-04:00",
          id: "00000000-0000-4000-8000-000000000902",
          name: "Wednesday GBM",
          startDateTime: "2026-07-01T18:00:00-04:00",
          tag: "GBM",
        },
      ]),
      now: () => now,
      send,
    });

    await execute();

    const sent = JSON.stringify(send.mock.calls);
    expect(sent).toContain("Events this Week");
    expect(sent).toContain("MONDAY");
    expect(sent).toContain("WEDNESDAY");
    expect(sent).toContain("Current Workshop");
    expect(sent).toContain("Wednesday GBM");
    expect(sent).toContain("6/28 - 7/4");
    expect(send).toHaveBeenCalledOnce();
    expect(sent.match(/@everyone/g)).toHaveLength(1);
    expect(sent).not.toContain("<@&1264770451578552401>");
    const payload = send.mock.calls[0]?.[0];
    if (!payload) throw new Error("Expected a weekly announcement.");
    expect(messageText(payload).join("\n")).toContain("### MONDAY · 6/29");
    expect(messageText(payload).join("\n")).toContain("### WEDNESDAY · 7/1");
  });

  it("TC-028 emits nothing when the selector returns no eligible events", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const execute = createClubReminderExecutor({
      getCandidates: vi.fn().mockResolvedValue([]),
      now: () => new Date("2026-06-29T09:00:00-04:00"),
      send,
    });

    await execute();

    expect(send).not.toHaveBeenCalled();
  });

  it("TC-028 ignores dates outside the legacy reminder windows", async () => {
    const now = new Date("2026-06-29T09:00:00-04:00");
    const send = vi.fn().mockResolvedValue(undefined);
    const execute = createClubReminderExecutor({
      getCandidates: vi.fn().mockResolvedValue([
        {
          ...currentWorkshop,
          endDateTime: "2026-07-03T20:00:00-04:00",
          name: "Too Soon for Next Week",
          startDateTime: "2026-07-03T18:00:00-04:00",
        },
        {
          ...currentWorkshop,
          endDateTime: "2026-07-13T20:00:00-04:00",
          name: "Too Far Away",
          startDateTime: "2026-07-13T18:00:00-04:00",
        },
      ]),
      now: () => now,
      send,
    });

    await execute();

    expect(send).not.toHaveBeenCalled();
  });

  it("TC-028 suppresses operations and Project Launch lab reminders one week out", async () => {
    const now = new Date("2026-06-29T09:00:00-04:00");
    const send = vi.fn().mockResolvedValue(undefined);
    const nextWeek = {
      ...currentWorkshop,
      endDateTime: "2026-07-06T20:00:00-04:00",
      startDateTime: "2026-07-06T18:00:00-04:00",
    };
    const execute = createClubReminderExecutor({
      getCandidates: vi.fn().mockResolvedValue([
        {
          ...nextWeek,
          name: "Operations Meeting",
          tag: "OPS",
          skipNextWeek: true,
        },
        {
          ...nextWeek,
          name: "Project Launch Lab Hours",
          skipNextWeek: true,
          tag: "Project Launch",
        },
        { ...nextWeek, name: "Next Workshop", tag: "Workshop" },
      ]),
      now: () => now,
      send,
    });

    await execute();

    const sent = JSON.stringify(send.mock.calls);
    expect(sent).toContain("Next Workshop");
    expect(sent).not.toContain("Operations Meeting");
    expect(sent).not.toContain("Project Launch Lab Hours");
  });

  it("TC-028 keeps the full Sunday window across the fall-back transition", async () => {
    const now = new Date("2026-11-01T00:30:00-04:00");
    const send = vi.fn().mockResolvedValue(undefined);
    const execute = createClubReminderExecutor({
      getCandidates: vi.fn().mockResolvedValue([
        {
          ...currentWorkshop,
          endDateTime: "2026-11-07T20:00:00-05:00",
          name: "Fall Saturday Workshop",
          startDateTime: "2026-11-07T18:00:00-05:00",
        },
      ]),
      now: () => now,
      send,
    });

    await execute();

    const sent = JSON.stringify(send.mock.calls);
    expect(sent).toContain("Saturday");
    expect(sent).toContain("Fall Saturday Workshop");
  });

  it("TC-028 keeps the Sunday window calendar-bounded across spring-forward", async () => {
    const now = new Date("2027-03-14T00:30:00-05:00");
    const send = vi.fn().mockResolvedValue(undefined);
    const execute = createClubReminderExecutor({
      getCandidates: vi.fn().mockResolvedValue([
        {
          ...currentWorkshop,
          endDateTime: "2027-03-20T20:00:00-04:00",
          name: "Spring Saturday Workshop",
          startDateTime: "2027-03-20T18:00:00-04:00",
        },
        {
          ...currentWorkshop,
          endDateTime: "2027-03-21T20:00:00-04:00",
          name: "Outside Spring Window",
          startDateTime: "2027-03-21T18:00:00-04:00",
        },
      ]),
      now: () => now,
      send,
    });

    await execute();

    const sent = JSON.stringify(send.mock.calls);
    expect(sent).toContain("Spring Saturday Workshop");
    expect(sent).not.toContain("Outside Spring Window");
  });
});

describe("club reminder announcements", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("combines 14 events across the entire Sunday week in one card and message", async () => {
    const dates = [
      "2026-06-28",
      "2026-06-29",
      "2026-06-30",
      "2026-07-01",
      "2026-07-02",
      "2026-07-03",
      "2026-07-04",
    ];
    const events = dates.flatMap((date, day) =>
      [0, 1].map((slot) => ({
        ...currentWorkshop,
        name: `Workshop ${day * 2 + slot}`,
        discordId: String(111111111111111111n + BigInt(day * 2 + slot)),
        startDateTime: `${date}T18:00:00-04:00`,
        endDateTime: `${date}T20:00:00-04:00`,
      })),
    );
    const send =
      vi.fn<Parameters<typeof createClubReminderExecutor>[0]["send"]>();
    await createClubReminderExecutor({
      getCandidates: () => Promise.resolve(events),
      now: () => new Date("2026-06-28T09:00:00-04:00"),
      send,
    })();
    expect(send).toHaveBeenCalledOnce();
    const payload = send.mock.calls[0]?.[0];
    if (!payload) throw new Error("Expected a weekly announcement.");
    const text = messageText(payload).join("\n");
    expect(payload.flags).toBe(MessageFlags.IsComponentsV2);
    expect(payload.withComponents).toBe(true);
    expect(
      (payload.components ?? []).filter(
        (component) => component.type === ComponentType.Container,
      ),
    ).toHaveLength(1);
    expect(
      (payload.components ?? []).filter(
        (component) => component.type === ComponentType.TextDisplay,
      ),
    ).toEqual([
      {
        type: ComponentType.TextDisplay,
        content:
          "Want reminders like these? Add the reminder role in <id:customize>\ncc: @everyone",
      },
    ]);
    expect(payload.allowedMentions).toEqual({ parse: ["everyone"], roles: [] });
    expect(text).toContain("## Events this Week (6/28 - 7/4)");
    for (const day of [
      "SUNDAY",
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
    ])
      expect(text).toContain(`### ${day}`);
    for (const event of events)
      expect(text).toContain(
        `**[${event.name}](<https://blade.knighthacks.org/member/events?selected=${event.id}>)**`,
      );
    expect(text).toContain("\n-# 6:00 PM–8:00 PM · ENG2 102");
    const card = payload.components?.find(
      (component) => component.type === ComponentType.Container,
    );
    if (card?.type !== ComponentType.Container)
      throw new Error("Expected a reminder card.");
    expect(JSON.stringify(card)).not.toContain("<id:customize>");
    expect(JSON.stringify(card)).toContain(
      "-# Note: show up with your Blade QR. Don’t have an account? [Sign up](<https://blade.knighthacks.org>)",
    );
    expect(text).not.toContain("RSVP");
    expect(text).not.toContain("Interested");
    expect(text).toContain("<id:customize>");
    expect(text).not.toContain(currentWorkshop.description);
    expect(payload).not.toHaveProperty("embeds");
    expect(payload).not.toHaveProperty("content");
  });

  it("combines Today, Tomorrow, and Next Week inside one daily card", async () => {
    const send =
      vi.fn<Parameters<typeof createClubReminderExecutor>[0]["send"]>();
    await createClubReminderExecutor({
      getCandidates: () =>
        Promise.resolve(
          ["2026-06-29", "2026-06-30", "2026-07-06"].map((date, index) => ({
            ...currentWorkshop,
            discordId: String(111111111111111111n + BigInt(index)),
            id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
            startDateTime: `${date}T18:00:00-04:00`,
            endDateTime: `${date}T20:00:00-04:00`,
          })),
        ),
      now: () => new Date("2026-06-29T09:00:00-04:00"),
      send,
    })();
    expect(send).toHaveBeenCalledOnce();
    const payload = send.mock.calls[0]?.[0];
    if (!payload) throw new Error("Expected a daily announcement.");
    const text = messageText(payload).join("\n");
    expect(text).toContain("### TODAY · 6/29");
    expect(text).toContain("### TOMORROW · 6/30");
    expect(text).toContain("### NEXT WEEK · 7/6");
    expect(payload.allowedMentions).toEqual({
      parse: [],
      roles: ["1264770451578552401"],
    });
    expect(text.match(/<@&1264770451578552401>/g)).toHaveLength(1);
    expect(payload.components?.[0]).toEqual({
      type: ComponentType.TextDisplay,
      content:
        "Want reminders like these? Add the reminder role in <id:customize>\ncc: <@&1264770451578552401>",
    });
    expect(text).not.toContain("@everyone");
  });
});

describe("club reminder limits and delivery", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([false, true])(
    "preserves all 60 links within component limits (long labels: %s)",
    async (longLabels) => {
      const events = Array.from({ length: 60 }, (_, index) => ({
        ...currentWorkshop,
        discordId: String(111111111111111111n + BigInt(index)),
        id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
        name: longLabels ? "🛠".repeat(150) : `Workshop ${index}`,
        location: longLabels ? "*".repeat(200) : "ENG2 102",
        tag: longLabels ? "_".repeat(100) : "Workshop",
      }));
      const send =
        vi.fn<Parameters<typeof createClubReminderExecutor>[0]["send"]>();
      await createClubReminderExecutor({
        getCandidates: () => Promise.resolve(events),
        now: () => new Date("2026-06-28T09:00:00-04:00"),
        send,
      })();
      expect(send.mock.calls.length).toBeGreaterThan(1);
      const links: string[] = [];
      for (const [index, [payload]] of send.mock.calls.entries()) {
        const text = messageText(payload);
        expect(text.every((part) => part.length <= 2000)).toBe(true);
        expect(
          text.reduce((length, part) => length + part.length, 0),
        ).toBeLessThanOrEqual(6000);
        const card = payload.components?.find(
          (component) => component.type === ComponentType.Container,
        );
        if (card?.type !== ComponentType.Container)
          throw new Error("Expected one container.");
        expect(card.components.length).toBeLessThanOrEqual(10);
        expect(
          card.components.length + (payload.components?.length ?? 0),
        ).toBeLessThanOrEqual(40);
        if (index > 0) {
          expect(text[0]).toContain("continued");
          expect(payload.allowedMentions).toEqual({ parse: [], roles: [] });
          expect(text.join("\n")).not.toContain("cc:");
          expect(text.join("\n")).not.toContain("<id:customize>");
        }
        links.push(
          ...[
            ...text
              .join("\n")
              .matchAll(
                /https:\/\/blade.knighthacks.org\/member\/events\?selected=([\da-f-]+)/g,
              ),
          ].map((match) => match[1] ?? ""),
        );
      }
      expect(links).toEqual(events.map((event) => event.id));
      if (longLabels) expect(JSON.stringify(send.mock.calls)).toContain("🛠…");
    },
  );

  it("escapes Markdown and neutralizes mentions in component event labels", async () => {
    const send =
      vi.fn<Parameters<typeof createClubReminderExecutor>[0]["send"]>();
    await createClubReminderExecutor({
      getCandidates: () =>
        Promise.resolve([
          {
            ...currentWorkshop,
            name: "[Build](https://example.com)\n**together** @everyone <@123>",
            location: "ENG2\n102",
            tag: "Project_Launch",
          },
          {
            ...currentWorkshop,
            startDateTime: "2026-06-30T18:00:00-04:00",
            endDateTime: "2026-06-30T20:00:00-04:00",
          },
        ]),
      now: () => new Date("2026-06-29T09:00:00-04:00"),
      send,
    })();
    const payload = send.mock.calls[0]?.[0];
    if (!payload) throw new Error("Expected an announcement.");
    const text = messageText(payload).join("\n");
    expect(text).toContain(
      "\\[Build\\]\\(https://example.com\\) \\*\\*together\\*\\*",
    );
    expect(text).toContain("ENG2 102");
    expect(text).not.toContain("Project\\_Launch");
    expect(text).not.toContain("@everyone");
    expect(text).not.toContain("<@123>");
  });

  it.each([false, true])(
    "continues after a failed card (Sunday: %s)",
    async (sunday) => {
      const error = new Error("Discord rejected the card");
      const log = vi.spyOn(logger, "error").mockImplementation(() => undefined);
      const send = vi
        .fn<Parameters<typeof createClubReminderExecutor>[0]["send"]>()
        .mockRejectedValueOnce(error)
        .mockResolvedValue(undefined);
      await createClubReminderExecutor({
        getCandidates: () =>
          Promise.resolve(
            Array.from({ length: 60 }, (_, index) => ({
              ...currentWorkshop,
              name: `Workshop ${index}`,
            })),
          ),
        now: () =>
          new Date(
            sunday ? "2026-06-28T09:00:00-04:00" : "2026-06-29T09:00:00-04:00",
          ),
        send,
      })();
      expect(send.mock.calls.length).toBeGreaterThan(1);
      const last = send.mock.lastCall?.[0];
      if (!last) throw new Error("Expected a continuation.");
      expect(messageText(last).join("\n")).toContain("Workshop 59");
      expect(messageText(last).join("\n")).toContain(
        "show up with your Blade QR",
      );
      expect(last.allowedMentions).toEqual({ parse: [], roles: [] });
      expect(log).toHaveBeenCalledExactlyOnceWith(
        sunday
          ? 'Failed to send Club reminder card "Events this Week (6/28 - 7/4)" (part 1, channel default):'
          : 'Failed to send Club reminder card "Event Reminders\n-# Monday, June 29, 2026" (part 1, channel default):',
        error,
      );
    },
  );
});
