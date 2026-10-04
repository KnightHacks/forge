import { describe, expect, it } from "vitest";

import type { HackerMapConfigurationDto as MapConfiguration } from "@forge/hacker-sdk";

import {
  findVenueRoom,
  getVenueFloorPlan,
  getVenueFloors,
} from "./venue-floor-plans";
import { parseVenueLocation, plotScheduleEvents } from "./venue-map";
import { getRoomPresentation } from "./venue-room-access";

const now = new Date("2026-10-01T12:00:00Z");
const room = {
  id: "101",
  label: "101",
  roomIds: ["101"],
  x: 10,
  y: 10,
  path: "",
};
const open: MapConfiguration = { restrictionsEnabled: false, rooms: [] };
const restricted: MapConfiguration = { restrictionsEnabled: true, rooms: [] };
const permitted: MapConfiguration = {
  restrictionsEnabled: true,
  rooms: [{ buildingId: "ba1", roomNumber: "101", name: "Help desk" }],
};
function activity(start = now, end = new Date(now.getTime() + 3600_000)) {
  return plotScheduleEvents(
    [
      {
        id: "event",
        location: "BA1 101",
        name: "Workshop",
        description: "",
        tag: "",
        points: 0,
        purpose: "event",
        startDateTime: start,
        endDateTime: end,
      },
    ],
    now,
  );
}

describe("room presentation", () => {
  it("preserves unlabelled structural geometry without inventing room access", () => {
    expect(
      getRoomPresentation(
        { ...room, label: "", roomIds: [] },
        "ba1",
        restricted,
        [],
        now,
      ),
    ).toEqual({ state: "circulation", label: null, name: null });
  });
  it("defaults ordinary rooms to gray and hides unlisted room labels", () => {
    expect(getRoomPresentation(room, "ba1", open, [], now)).toMatchObject({
      state: "idle",
      label: "101",
    });
    expect(
      getRoomPresentation(room, "ba1", restricted, activity(), now),
    ).toEqual({ state: "restricted", label: null, name: null });
    expect(getRoomPresentation(room, "ba1", permitted, [], now)).toMatchObject({
      state: "idle",
      name: "Help desk",
    });
  });
  it("bathroom metadata wins over restriction and activity", () => {
    expect(
      getRoomPresentation(
        { ...room, kind: "bathroom" },
        "ba1",
        restricted,
        activity(),
        now,
      ).state,
    ).toBe("bathroom");
  });
  it("uses the inclusive hour boundary, ignores ended activity, and prioritizes live", () => {
    expect(
      getRoomPresentation(
        room,
        "ba1",
        permitted,
        activity(new Date(now.getTime() + 3600_000)),
        now,
      ).state,
    ).toBe("upcoming");
    expect(
      getRoomPresentation(
        room,
        "ba1",
        permitted,
        activity(new Date(now.getTime() + 3600_001)),
        now,
      ).state,
    ).toBe("idle");
    expect(
      getRoomPresentation(
        room,
        "ba1",
        permitted,
        activity(new Date(now.getTime() - 3600_000), now),
        now,
      ).state,
    ).toBe("idle");
    const events = [
      ...activity(new Date(now.getTime() + 1800_000)),
      ...activity(),
    ];
    expect(getRoomPresentation(room, "ba1", permitted, events, now).state).toBe(
      "live",
    );
    expect(
      getRoomPresentation(room, "ba1", permitted, [...events].reverse(), now)
        .state,
    ).toBe("live");
  });
  it("does not leak unlisted aliases from a combined room shape", () => {
    expect(
      getRoomPresentation(
        { ...room, roomIds: ["102", "101"] },
        "ba1",
        permitted,
        [],
        now,
      ).label,
    ).toBe("101");
  });
  it("keeps stairs and elevators usable with restrictions", () => {
    expect(
      getRoomPresentation(
        { ...room, id: "STAIRS", roomIds: ["STAIRS"] },
        "ba1",
        restricted,
        [],
        now,
      ).state,
    ).toBe("circulation");
  });
});

describe("floor navigation and bathroom evidence", () => {
  it("finds mapped rooms across supported floors without assuming a floor from their number", () => {
    expect(findVenueRoom("ucf-91", " 207 ")).toMatchObject({
      floor: 2,
      room: { id: "207" },
    });
    expect(findVenueRoom("hec", "101")).toBeUndefined();
    expect(getVenueFloors("hec")).toEqual([]);
    expect(getVenueFloorPlan("hec", 1)).toBeUndefined();
  });
  it("classifies only bathrooms supported by existing ENG2 labels", () => {
    expect(
      getVenueFloorPlan("ucf-91", 1)?.rooms.find(
        (candidate) => candidate.id === "108",
      )?.kind,
    ).toBe("bathroom");
    expect(
      getVenueFloorPlan("ucf-91", 2)
        ?.rooms.filter((candidate) => candidate.kind === "bathroom")
        .map((candidate) => candidate.id),
    ).toEqual(["208", "207"]);
    expect(
      getVenueFloorPlan("ucf-91", 1)?.rooms.find(
        (candidate) => candidate.id === "107",
      )?.kind,
    ).toBeUndefined();
  });
  it.each([
    "HEC 101",
    "L3Harris Engineering Center 101",
    "Harris Engineering Center 101",
  ])("recognizes %s", (location) => {
    expect(parseVenueLocation(location)).toEqual({
      buildingId: "hec",
      floor: 1,
      room: "101",
    });
  });
});
