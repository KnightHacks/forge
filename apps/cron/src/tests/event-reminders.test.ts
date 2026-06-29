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
