import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadClubEvents } from "../app/_lib/club-events";

const { query } = vi.hoisted(() => ({
  query:
    vi.fn<
      (
        input: { limit: number },
        options: { signal: AbortSignal },
      ) => Promise<unknown>
    >(),
}));

vi.mock("../app/_lib/blade-trpc", () => ({
  getBladeTrpcClient: () => ({
    event: { getPublicClubEvents: { query } },
  }),
}));

describe("Club public event contract", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-01T12:00:00.000Z"));
    query.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("TC-001 preserves safe tag color and dues state while dropping admin data", async () => {
    query.mockResolvedValue([
      {
        attendanceCount: 42,
        description: "A dues-supported social.",
        discordId: "111111111111111111",
        endDateTime: "2026-08-15T01:00:00.000Z",
        googleId: "private-google-id",
        id: "00000000-0000-4000-8000-000000000801",
        integrationState: "synced",
        location: "UCF Downtown",
        name: "Member Social",
        requiresDues: true,
        roleIds: ["00000000-0000-4000-8000-000000000802"],
        startDateTime: "2026-08-14T23:00:00.000Z",
        tag: "Social",
        tagColor: "#DB2777",
      },
    ]);

    const events = await loadClubEvents({
      bladeUrl: "https://blade.example.test",
      limit: 12,
      signal: new AbortController().signal,
    });

    expect(events).toEqual([
      {
        description: "A dues-supported social.",
        endDateTime: "2026-08-15T01:00:00.000Z",
        id: "00000000-0000-4000-8000-000000000801",
        location: "UCF Downtown",
        name: "Member Social",
        requiresDues: true,
        startDateTime: "2026-08-14T23:00:00.000Z",
        tag: "Social",
        tagColor: "#DB2777",
      },
    ]);
    expect(JSON.stringify(events)).not.toMatch(
      /discordId|googleId|roleIds|attendanceCount|integrationState/,
    );
    expect(query).toHaveBeenCalledOnce();
    const [input, options] = query.mock.calls[0] ?? [];
    expect(input).toEqual({ limit: 12 });
    expect(options?.signal).toBeInstanceOf(AbortSignal);
  });

  it("TC-001 keeps defensive ordering, validation, and bounded output", async () => {
    query.mockResolvedValue([
      {
        description: "Later event",
        endDateTime: "2026-08-20T21:00:00.000Z",
        id: "00000000-0000-4000-8000-000000000811",
        location: "Room B",
        name: "Later",
        requiresDues: false,
        startDateTime: "2026-08-20T20:00:00.000Z",
        tag: "GBM",
        tagColor: "#F59E0B",
      },
      {
        description: "Malformed event",
        endDateTime: "not-a-date",
        id: "00000000-0000-4000-8000-000000000812",
        location: "Room C",
        name: "Malformed",
        requiresDues: false,
        startDateTime: "2026-08-10T20:00:00.000Z",
        tag: "GBM",
        tagColor: "#F59E0B",
      },
      {
        description: "Earlier event",
        endDateTime: "2026-08-10T21:00:00.000Z",
        id: "00000000-0000-4000-8000-000000000813",
        location: "Room A",
        name: "Earlier",
        requiresDues: false,
        startDateTime: "2026-08-10T20:00:00.000Z",
        tag: "Workshop",
        tagColor: "#7C3AED",
      },
    ]);

    const events = await loadClubEvents({
      bladeUrl: "https://blade.example.test",
      limit: 1,
      signal: new AbortController().signal,
    });

    expect(events).toHaveLength(1);
    expect(events[0]?.name).toBe("Earlier");
  });
});
