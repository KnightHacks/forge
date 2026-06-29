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
    const sent = JSON.stringify(send.mock.calls);
    expect(sent).toContain("Event Reminders");
    expect(sent).toContain("Current Workshop");
    expect(sent).toContain("Monday, June 29, 2026");
    expect(sent).toContain("6:00 PM");
    expect(sent).not.toContain("Tuesday, June 30, 2026");
  });

  it("TC-028 preserves Sunday weekday grouping", async () => {
    const now = new Date("2026-06-28T09:00:00-04:00");
    const send = vi.fn().mockResolvedValue(undefined);
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
});
