import { describe, expect, it } from "vitest";

import {
  eventRowToDetail,
  eventRowToListItem,
} from "~/app/_components/admin/events/server-adapters";

const dto = {
  attendanceCount: 3,
  audience: "public" as const,
  deletionPending: true,
  description: "Build something useful.",
  discord: { health: "unknown" as const, id: "123456789012345678" },
  discordChannel: null,
  endAt: "2026-07-02T00:00:00.000Z",
  google: { health: "pending" as const, id: null },
  id: "00000000-0000-4000-8000-000000000101",
  internal: false,
  legacy: false,
  location: "ENG2 102",
  name: "TypeScript Workshop",
  points: 25,
  published: true,
  revision: 2,
  roleIds: [],
  startAt: "2026-07-01T22:00:00.000Z",
  tag: "Workshop",
  tagColor: "#7c3aed",
};

describe("event admin server adapters", () => {
  it("consumes the safe DTO health and deletion state", () => {
    expect(eventRowToListItem(dto)).toMatchObject({
      deletionPending: true,
      discordHealth: "unknown",
      googleHealth: "pending",
      id: dto.id,
    });
  });

  it("keeps only the trusted Discord ID needed for an optional admin link", () => {
    const detail = eventRowToDetail({
      attendees: [],
      roles: [],
      row: dto,
    });

    expect(detail.integrations.discord).toEqual({
      health: "unknown",
      url: "https://discord.com/events/486628710443778071/123456789012345678",
    });
    expect(detail.integrations.google).toEqual({
      health: "pending",
      url: null,
    });
  });
});
