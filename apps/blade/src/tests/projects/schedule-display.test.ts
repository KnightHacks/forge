import { describe, expect, it } from "vitest";

import {
  judgingRoomActivity,
  sortJudgingRooms,
} from "~/lib/judging/schedule-display";

const start = new Date("2026-09-07T16:03:00Z");
describe("live room activity", () => {
  const rooms = [
    { id: "general", scheduled: true },
    { id: "sponsor", scheduled: true },
    { id: "empty", scheduled: true },
    { id: "mlh", scheduled: false },
  ];
  const appointments = ["general", "sponsor", "mlh"].map((roomId) => ({
    roomId,
    startsAt: new Date("2026-09-07T16:00:00Z"),
    endsAt: new Date("2026-09-07T16:10:00Z"),
  }));
  it("counts scheduled rooms once and excludes MLH", () => {
    expect(
      judgingRoomActivity(
        rooms,
        [...appointments, ...appointments],
        new Date("2026-09-07T16:00:00Z"),
      ),
    ).toEqual({ occupied: 2, idle: 1, total: 3 });
  });
  it("holds rooms through teardown, then releases them at the exact end", () => {
    expect(
      judgingRoomActivity(
        rooms,
        appointments,
        new Date("2026-09-07T16:09:59Z"),
      ),
    ).toEqual({ occupied: 2, idle: 1, total: 3 });
    expect(
      judgingRoomActivity(
        rooms,
        appointments,
        new Date("2026-09-07T16:10:00Z"),
      ),
    ).toEqual({ occupied: 0, idle: 3, total: 3 });
  });
  it("shows no active slots before judging and handles an empty inventory", () => {
    expect(
      judgingRoomActivity(
        rooms,
        appointments,
        new Date("2026-09-07T15:59:59Z"),
      ),
    ).toEqual({ occupied: 0, idle: 3, total: 3 });
    expect(judgingRoomActivity([], appointments, start)).toEqual({
      occupied: 0,
      idle: 0,
      total: 0,
    });
  });
});

describe("room order", () => {
  it("groups buildings and sorts room numbers naturally without mutating source order", () => {
    const rooms = [
      { id: "hec", buildingName: "HEC", name: "101" },
      { id: "eng10", buildingName: "ENG", name: "10" },
      { id: "unset", buildingName: null, name: "1" },
      { id: "ba", buildingName: "BA", name: "201" },
      { id: "eng2", buildingName: "eng", name: "2" },
    ];
    expect(sortJudgingRooms(rooms).map((room) => room.id)).toEqual([
      "ba",
      "eng2",
      "eng10",
      "hec",
      "unset",
    ]);
    expect(rooms[0]?.id).toBe("hec");
  });
});
