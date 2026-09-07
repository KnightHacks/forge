import { MessageFlags } from "discord-api-types/v10";
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

describe("tag announcement configuration", () => {
  afterEach(() => vi.restoreAllMocks());

  it.each(["2026-06-28", "2026-06-29"])(
    "routes tag overrides separately from generic reminders on %s",
    async (date) => {
      const send =
        vi.fn<Parameters<typeof createClubReminderExecutor>[0]["send"]>();
      const routed = {
        ...currentWorkshop,
        name: "Project Lab",
        announcementChannelId: "990000000000000950",
        emoji: "🚀",
        requiresDues: true,
      };
      await createClubReminderExecutor({
        now: () => new Date(`${date}T09:00:00-04:00`),
        getCandidates: () =>
          Promise.resolve([
            currentWorkshop,
            routed,
            { ...routed, tag: "Another tag", name: "Other routed event" },
          ]),
        send,
      })();
      expect(send).toHaveBeenCalledTimes(2);
      const generic = send.mock.calls.find(
        ([, channel]) => channel === null,
      )?.[0];
      const overrides = send.mock.calls
        .filter(([, channel]) => channel === routed.announcementChannelId)
        .map(([payload]) => payload);
      const override = overrides[0];
      if (!generic || !override) throw new Error("Expected both destinations.");
      expect(JSON.stringify(generic)).not.toContain("Project Lab");
      expect(JSON.stringify(override)).not.toContain("Current Workshop");
      expect(JSON.stringify(override)).toContain("🚀 **[Project Lab]");
      expect(generic.allowedMentions.parse).toEqual(
        date === "2026-06-28" ? ["everyone"] : [],
      );
      expect(override.allowedMentions.parse).toEqual([]);
      expect(JSON.stringify(overrides)).toContain("Other routed event");
      expect(JSON.stringify(override)).toContain("**DUES REQUIRED**");
      expect(JSON.stringify(override)).not.toContain("Another tag");
    },
  );

  it("uses the saved Next Week setting instead of tag names or event title heuristics", async () => {
    const send =
      vi.fn<Parameters<typeof createClubReminderExecutor>[0]["send"]>();
    const week = {
      ...currentWorkshop,
      startDateTime: "2026-07-06T18:00:00-04:00",
      endDateTime: "2026-07-06T20:00:00-04:00",
    };
    await createClubReminderExecutor({
      now: () => new Date("2026-06-29T09:00:00-04:00"),
      getCandidates: () =>
        Promise.resolve([
          { ...currentWorkshop, name: "Today remains", skipNextWeek: true },
          {
            ...week,
            name: "Renamed tag skipped",
            tag: "Completely new name",
            skipNextWeek: true,
          },
          { ...week, name: "OPS opted in", tag: "OPS", skipNextWeek: false },
          {
            ...week,
            name: "Project Launch Lab opted in",
            tag: "Project Launch",
            skipNextWeek: false,
          },
        ]),
      send,
    })();
    const text = JSON.stringify(send.mock.calls);
    expect(text).toContain("Today remains");
    expect(text).not.toContain("Renamed tag skipped");
    expect(text).toContain("OPS opted in");
    expect(text).toContain("Project Launch Lab opted in");
  });

  it("chooses the layout from each destination's eligible event count", async () => {
    const send =
      vi.fn<Parameters<typeof createClubReminderExecutor>[0]["send"]>();
    const channel = "990000000000000950";
    await createClubReminderExecutor({
      now: () => new Date("2026-06-29T09:00:00-04:00"),
      getCandidates: () =>
        Promise.resolve([
          currentWorkshop,
          {
            ...currentWorkshop,
            name: "Tomorrow",
            startDateTime: "2026-06-30T18:00:00-04:00",
            endDateTime: "2026-06-30T20:00:00-04:00",
          },
          {
            ...currentWorkshop,
            name: "One routed event",
            announcementChannelId: channel,
          },
          {
            ...currentWorkshop,
            name: "Skipped next week",
            announcementChannelId: channel,
            skipNextWeek: true,
            startDateTime: "2026-07-06T18:00:00-04:00",
            endDateTime: "2026-07-06T20:00:00-04:00",
          },
        ]),
      send,
    })();
    const generic = send.mock.calls.filter(
      ([, destination]) => destination === null,
    );
    const routed = send.mock.calls.filter(
      ([, destination]) => destination === channel,
    );
    expect(generic).toHaveLength(1);
    expect(generic[0]?.[0].components).toBeDefined();
    expect(generic[0]?.[0].embeds).toBeUndefined();
    expect(routed).toHaveLength(1);
    expect(
      routed.every(
        ([payload]) =>
          payload.embeds?.[0]?.description === currentWorkshop.description,
      ),
    ).toBe(true);
    expect(JSON.stringify(send.mock.calls)).not.toContain("Skipped next week");
  });

  it("logs an override failure without putting its events in the generic channel", async () => {
    const log = vi.spyOn(logger, "error").mockImplementation(() => undefined);
    const send = vi
      .fn<Parameters<typeof createClubReminderExecutor>[0]["send"]>()
      .mockRejectedValueOnce(new Error("Forbidden"))
      .mockResolvedValue(undefined);
    await createClubReminderExecutor({
      now: () => new Date("2026-06-29T09:00:00-04:00"),
      getCandidates: () =>
        Promise.resolve([
          {
            ...currentWorkshop,
            name: "Routed",
            announcementChannelId: "990000000000000950",
          },
          currentWorkshop,
        ]),
      send,
    })();
    expect(log).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1]?.[1]).toBeNull();
    expect(JSON.stringify(send.mock.calls[1]?.[0])).not.toContain("Routed");
  });
});

describe("Club announcement event counts", () => {
  it("keeps the full description when only one event is eligible", async () => {
    const send =
      vi.fn<Parameters<typeof createClubReminderExecutor>[0]["send"]>();
    await createClubReminderExecutor({
      getCandidates: () =>
        Promise.resolve([
          { ...currentWorkshop, emoji: "🛠️", requiresDues: true },
        ]),
      now: () => new Date("2026-06-29T09:00:00-04:00"),
      send,
    })();
    expect(send).toHaveBeenCalledOnce();
    const payload = send.mock.calls[0]?.[0];
    expect(payload?.embeds).toHaveLength(1);
    expect(payload?.embeds?.[0]).toMatchObject({
      title: "🛠️ Current Workshop",
      description: currentWorkshop.description,
      url: `https://blade.knighthacks.org/member/events?selected=${currentWorkshop.id}`,
    });
    expect(payload?.embeds?.[0]?.fields).toEqual(
      expect.arrayContaining([
        { name: "Date", value: "Monday, June 29, 2026", inline: true },
        { name: "Location", value: "ENG2 102", inline: true },
        { name: "Start", value: "6:00 PM", inline: true },
        { name: "End", value: "8:00 PM", inline: true },
      ]),
    );
    expect(JSON.stringify(payload?.embeds)).toContain("**DUES REQUIRED**");
    expect(JSON.stringify(payload?.embeds)).toContain(
      "show up with your Blade QR",
    );
    expect(JSON.stringify(payload?.embeds)).not.toContain("<id:customize>");
    expect(payload?.content).toContain("<id:customize>");
    expect(payload?.allowedMentions.roles).toEqual(["1264770451578552401"]);
    expect(payload).not.toHaveProperty("components");
    expect(payload).not.toHaveProperty("flags");
  });

  it.each([2, 8, 60])("compacts %i events even on one date", async (count) => {
    const send =
      vi.fn<Parameters<typeof createClubReminderExecutor>[0]["send"]>();
    await createClubReminderExecutor({
      getCandidates: () =>
        Promise.resolve(
          Array.from({ length: count }, (_, index) => ({
            ...currentWorkshop,
            id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
            name: `Workshop ${index}`,
            emoji: "🛠️",
            requiresDues: true,
          })),
        ),
      now: () => new Date("2026-06-29T09:00:00-04:00"),
      send,
    })();
    if (count === 2) expect(send).toHaveBeenCalledOnce();
    const text = JSON.stringify(send.mock.calls);
    for (let index = 0; index < count; index++) {
      expect(text).toContain(`🛠️ **[Workshop ${index}]`);
    }
    for (const [index, [payload]] of send.mock.calls.entries()) {
      expect(payload.flags).toBe(MessageFlags.IsComponentsV2);
      expect(payload.embeds).toBeUndefined();
      expect(payload.allowedMentions).toEqual({
        parse: [],
        roles: index === 0 ? ["1264770451578552401"] : [],
      });
    }
    expect(text).toContain("**DUES REQUIRED**");
    expect(text).not.toContain(currentWorkshop.description);
  });

  it.each(["2026-06-30", "2026-07-06"])(
    "uses full cards when only %s is eligible",
    async (date) => {
      const send =
        vi.fn<Parameters<typeof createClubReminderExecutor>[0]["send"]>();
      await createClubReminderExecutor({
        getCandidates: () =>
          Promise.resolve([
            {
              ...currentWorkshop,
              startDateTime: `${date}T18:00:00-04:00`,
              endDateTime: `${date}T20:00:00-04:00`,
            },
          ]),
        now: () => new Date("2026-06-29T09:00:00-04:00"),
        send,
      })();
      expect(send).toHaveBeenCalledOnce();
      expect(send.mock.calls[0]?.[0].embeds?.[0]?.description).toBe(
        currentWorkshop.description,
      );
    },
  );

  it("keeps Sunday compact even when its only date has one event", async () => {
    const send =
      vi.fn<Parameters<typeof createClubReminderExecutor>[0]["send"]>();
    await createClubReminderExecutor({
      getCandidates: () => Promise.resolve([currentWorkshop]),
      now: () => new Date("2026-06-28T09:00:00-04:00"),
      send,
    })();
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0]?.[0].flags).toBe(MessageFlags.IsComponentsV2);
    expect(send.mock.calls[0]?.[0].embeds).toBeUndefined();
  });
});
