import { describe, expect, it } from "vitest";

import type { HackerMapConfigurationDto as MapConfiguration } from "@forge/hacker-sdk";

import {
  findVenueRoom,
  getVenueFloorPlan,
  getVenueFloors,
} from "./venue-floor-plans";
import { parseVenueLocation, plotScheduleEvents } from "./venue-map";
import { getRoomPresentation, isWayfindingLabel } from "./venue-room-access";

const now = new Date("2026-10-01T12:00:00Z");
const room = {
  id: "110",
  label: "110",
  roomIds: ["110"],
  x: 10,
  y: 10,
  path: "",
};
const open: MapConfiguration = { restrictionsEnabled: false, rooms: [] };
const restricted: MapConfiguration = { restrictionsEnabled: true, rooms: [] };
const permitted: MapConfiguration = {
  restrictionsEnabled: true,
  rooms: [{ buildingId: "ba1", roomNumber: "110", name: "Help desk" }],
};
function activity(start = now, end = new Date(now.getTime() + 3600_000)) {
  return plotScheduleEvents(
    [
      {
        id: "event",
        location: "BA1 110",
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
  it.each([false, true])(
    "never promotes rooms outside the event roster, with restrictions %s",
    (restrictionsEnabled) => {
      const unbooked = { ...room, roomIds: ["101"], label: "101" };
      const configuration: MapConfiguration = {
        restrictionsEnabled,
        rooms: [{ buildingId: "ba1", roomNumber: "101", name: "Old room" }],
      };
      const events = activity().map((event) => ({
        ...event,
        venueLocation: { ...event.venueLocation, room: "101" },
      }));
      expect(
        getRoomPresentation(unbooked, "ba1", configuration, events, now),
      ).toEqual({
        state: "restricted",
        label: "101",
        name: null,
      });
    },
  );
  it("marks unverified room envelopes unavailable instead of treating them as hallways", () => {
    expect(
      getRoomPresentation(
        { ...room, roomIds: [], reviewId: "HEC-1-U01", label: "Office" },
        "hec",
        open,
        [],
        now,
      ),
    ).toEqual({
      state: "restricted",
      label: null,
      name: null,
    });
  });
  it("retains shared room numbers but ignores activity in unbooked aliases", () => {
    const shared = { ...room, roomIds: ["110", "101"] };
    const events = activity().map((event) => ({
      ...event,
      venueLocation: { ...event.venueLocation, room: "101" },
    }));
    expect(getRoomPresentation(shared, "ba1", open, events, now)).toMatchObject(
      {
        state: "idle",
        label: "110 / 101",
      },
    );
  });
  it("distinguishes wayfinding from room numbers, review IDs and room names", () => {
    for (const label of [
      "MAIN HALL",
      "STAIR",
      "LIFT",
      "MEN",
      "WOMEN",
      "ENGINEERING ATRIUM · CHECK-IN",
    ])
      expect(isWayfindingLabel(label)).toBe(true);
    for (const label of ["381G", "U01*", "Administration", "Ginsburg Lounge"])
      expect(isWayfindingLabel(label)).toBe(false);
  });
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
  it("defaults event rooms to gray and retains numbers when unavailable", () => {
    expect(getRoomPresentation(room, "ba1", open, [], now)).toMatchObject({
      state: "idle",
      label: "110",
    });
    expect(
      getRoomPresentation(room, "ba1", restricted, activity(), now),
    ).toEqual({ state: "restricted", label: "110", name: null });
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
  it("shows both source numbers for shared rooms even with organizer restrictions", () => {
    const sharedRoom = { ...room, label: "119/121", roomIds: ["119", "121"] };
    expect(getRoomPresentation(sharedRoom, "ba1", open, [], now).label).toBe(
      "119 / 121",
    );
    expect(
      getRoomPresentation(
        sharedRoom,
        "ba1",
        {
          restrictionsEnabled: true,
          rooms: [{ buildingId: "ba1", roomNumber: "121", name: "Workshop" }],
        },
        [],
        now,
      ).label,
    ).toBe("119 / 121");
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
  it("preserves all verified numbers on a combined room shape", () => {
    expect(
      getRoomPresentation(
        { ...room, roomIds: ["102", "110"] },
        "ba1",
        permitted,
        [],
        now,
      ).label,
    ).toBe("102 / 110");
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
    expect(findVenueRoom("hec", "101")?.floor).toBe(1);
    expect(getVenueFloors("hec")).toEqual([1]);
    expect(getVenueFloorPlan("hec", 2)).toBeUndefined();
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

describe("event-roster aliases preserve room access", () => {
  it("includes the added ENG2 103 without opening ENG1 103", () => {
    const addedRoom = findVenueRoom("ucf-91", "0103");
    expect(addedRoom?.floor).toBe(1);
    expect(addedRoom).toBeDefined();
    if (!addedRoom) return;
    expect(
      getRoomPresentation(addedRoom.room, "ucf-91", open, [], now),
    ).toMatchObject({ state: "idle", label: "103" });
    expect(
      getRoomPresentation(addedRoom.room, "eng1", open, [], now),
    ).toMatchObject({ state: "restricted", label: "103" });
  });
  it("matches padded organizer room numbers without changing their displayed number", () => {
    const config: MapConfiguration = {
      restrictionsEnabled: true,
      rooms: [{ buildingId: "ba1", roomNumber: "0110", name: null }],
    };
    expect(getRoomPresentation(room, "ba1", config, [], now)).toMatchObject({
      state: "idle",
      label: "110",
    });
  });

  it("allows all ballroom sections only when the whole ballroom was permitted", () => {
    const section = (number: string) => ({
      ...room,
      roomIds: [number],
      label: number,
    });
    const whole: MapConfiguration = {
      restrictionsEnabled: true,
      rooms: [
        { buildingId: "student-union", roomNumber: "218ABCD", name: null },
      ],
    };
    for (const number of ["218", "218A", "218B", "218C", "218D"]) {
      expect(
        getRoomPresentation(section(number), "student-union", whole, [], now),
      ).toMatchObject({ state: "idle", label: number });
    }
    const partial: MapConfiguration = {
      restrictionsEnabled: true,
      rooms: [{ buildingId: "student-union", roomNumber: "218A", name: null }],
    };
    expect(
      getRoomPresentation(section("218A"), "student-union", partial, [], now)
        .state,
    ).toBe("idle");
    for (const number of ["218", "218B", "218C", "218D"]) {
      expect(
        getRoomPresentation(section(number), "student-union", partial, [], now),
      ).toEqual({ state: "restricted", label: number, name: null });
    }
  });

  it("shows official SU names while restrictions still hide unavailable room names", () => {
    const garden = { ...room, roomIds: ["221"], label: "221" };
    expect(
      getRoomPresentation(garden, "student-union", open, [], now).name,
    ).toBe("Garden Key Meeting Room");
    expect(
      getRoomPresentation(garden, "student-union", restricted, [], now).name,
    ).toBeNull();
  });
});
