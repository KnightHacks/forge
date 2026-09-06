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
      const override = send.mock.calls.find(
        ([, channel]) => channel === routed.announcementChannelId,
      )?.[0];
      if (!generic || !override) throw new Error("Expected both destinations.");
      expect(JSON.stringify(generic)).not.toContain("Project Lab");
      expect(JSON.stringify(override)).not.toContain("Current Workshop");
      expect(JSON.stringify(override)).toContain("🚀 **[Project Lab]");
      expect(JSON.stringify(override)).toContain("Other routed event");
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
