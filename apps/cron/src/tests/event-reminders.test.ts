import { afterEach, describe, expect, it, vi } from "vitest";

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
    expect(send).toHaveBeenNthCalledWith(1, {
      content:
        "# Event Reminders\nGood morning, <@&1264770451578552401>!\nToday is Monday, June 29, 2026, and here are some reminders about upcoming events!",
    });
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
    expect(sent).toContain("Monday");
    expect(sent).toContain("Wednesday");
    expect(sent).toContain("Current Workshop");
    expect(sent).toContain("Wednesday GBM");
    expect(sent).toContain("6/28 - 7/4");
    expect(send).toHaveBeenNthCalledWith(1, {
      content:
        "# Events this Week (6/28 - 7/4)\nWe hope you've had an amazing weekend so far, @everyone :D\nHere are some of the events planned for this week!",
    });
    expect(sent.match(/@everyone/g)).toHaveLength(1);
    expect(sent).not.toContain("<@&1264770451578552401>");
    const embeds = send.mock.calls.flatMap(([payload]) =>
      typeof payload === "object" && "embeds" in payload ? payload.embeds : [],
    );
    expect(embeds.map((embed) => embed.title)).toEqual([
      "Monday, June 29, 2026",
      "Wednesday, July 1, 2026",
    ]);
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
        { ...nextWeek, name: "Operations Meeting", tag: "OPS" },
        {
          ...nextWeek,
          name: "Project Launch Lab Hours",
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

describe("club reminder presentation", () => {
  it("TC-001 groups compact linked rows and preserves the original footer", async () => {
    const send =
      vi.fn<Parameters<typeof createClubReminderExecutor>[0]["send"]>();
    const execute = createClubReminderExecutor({
      getCandidates: () =>
        Promise.resolve([
          currentWorkshop,
          {
            ...currentWorkshop,
            name: "Evening GBM",
            discordId: "222222222222222222",
          },
        ]),
      now: () => new Date("2026-06-29T09:00:00-04:00"),
      send,
    });

    await execute();

    const embeds = send.mock.calls.flatMap(([payload]) =>
      typeof payload === "object" && "embeds" in payload ? payload.embeds : [],
    );
    expect(embeds).toHaveLength(1);
    expect(embeds[0]).toEqual({
      color: 0xcca4f4,
      title: "Today · Monday, June 29, 2026",
      description:
        "**[Current Workshop](https://discord.com/events/486628710443778071/111111111111111111)**\n6:00 PM–8:00 PM · ENG2 102 · Workshop\n\n" +
        "**[Evening GBM](https://discord.com/events/486628710443778071/222222222222222222)**\n6:00 PM–8:00 PM · ENG2 102 · Workshop",
    });
    expect(send).toHaveBeenCalledTimes(3);
    const sent = JSON.stringify(send.mock.calls);
    expect(sent.match(/<@&1264770451578552401>/g)).toHaveLength(1);
    expect(sent).not.toContain("@everyone");
    expect(sent).not.toContain(currentWorkshop.description);
    expect(send).toHaveBeenLastCalledWith({
      content:
        'We hope to see you all there! Let us know you\'re attending an event by clicking its title and pressing "Interested"!\nIf you are interested in opting in to daily event reminders, please assign yourself the Event Reminders role in <id:customize>!\nAlso, please make sure to sign up to [Blade](https://blade.knighthacks.org) for membership management and check-in to events!',
    });
  });

  it.each([false, true])(
    "TC-002/003 keeps 60 events within row and character limits (long labels: %s)",
    async (longLabels) => {
      const candidates = Array.from({ length: 60 }, (_, index) => ({
        ...currentWorkshop,
        discordId: String(111111111111111111n + BigInt(index)),
        name: longLabels ? "🛠".repeat(150) : `Workshop ${index}`,
        location: longLabels ? "*".repeat(200) : "ENG2 102",
        tag: longLabels ? "_".repeat(100) : "Workshop",
      }));
      const send =
        vi.fn<Parameters<typeof createClubReminderExecutor>[0]["send"]>();
      await createClubReminderExecutor({
        getCandidates: () => Promise.resolve(candidates),
        now: () => new Date("2026-06-29T09:00:00-04:00"),
        send,
      })();

      const embeds = send.mock.calls.flatMap(([payload]) =>
        typeof payload === "object" && "embeds" in payload
          ? payload.embeds
          : [],
      );
      expect(embeds.length).toBeGreaterThan(1);
      const links: string[] = [];
      for (const [index, embed] of embeds.entries()) {
        const description = embed.description ?? "";
        const eventIds = [
          ...description.matchAll(
            /https:\/\/discord.com\/events\/486628710443778071\/(\d+)/g,
          ),
        ].map((match) => match[1]);
        expect(eventIds.length).toBeGreaterThan(0);
        expect(eventIds.length).toBeLessThanOrEqual(8);
        expect(description.length).toBeLessThanOrEqual(4096);
        expect(
          description.length + (embed.title?.length ?? 0),
        ).toBeLessThanOrEqual(6000);
        expect(embed.title).toContain("Today · Monday, June 29, 2026");
        if (index > 0) expect(embed.title).toContain("continued");
        links.push(...eventIds.filter((id) => id !== undefined));
      }
      expect(links).toEqual(candidates.map((event) => event.discordId));
      expect(send).toHaveBeenCalledTimes(embeds.length + 2);
      if (longLabels) {
        expect(embeds.length).toBeGreaterThan(Math.ceil(60 / 8));
        expect(embeds[0]?.description).toContain("🛠…");
        expect(embeds[0]?.description).toContain("\\*");
      }
    },
  );

  it("TC-003 keeps Markdown and line breaks inside event labels", async () => {
    const send =
      vi.fn<Parameters<typeof createClubReminderExecutor>[0]["send"]>();
    await createClubReminderExecutor({
      getCandidates: () =>
        Promise.resolve([
          {
            ...currentWorkshop,
            name: "  [Build](https://example.com)\n **together**  ",
            location: "ENG2\n102",
            tag: "Project_Launch",
          },
        ]),
      now: () => new Date("2026-06-29T09:00:00-04:00"),
      send,
    })();

    const embeds = send.mock.calls.flatMap(([payload]) =>
      typeof payload === "object" && "embeds" in payload ? payload.embeds : [],
    );
    const description = embeds[0]?.description ?? "";
    expect(description).toContain(
      "\\[Build\\]\\(https://example.com\\) \\*\\*together\\*\\*",
    );
    expect(description).toContain("ENG2 102 · Project\\_Launch");
    expect(description.split("\n")).toHaveLength(2);
  });
});
