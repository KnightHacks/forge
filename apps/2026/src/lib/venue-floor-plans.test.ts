import { describe, expect, it } from "vitest";

import {
  getVenueFloorPlan,
  getVenueFloors,
  INDOOR_BUILDING_IDS,
} from "./venue-floor-plans";

describe("KHIX indoor floor plans", () => {
  it("places ENG2 check-in in the lower atrium between entrances, away from stairs", () => {
    const plan = getVenueFloorPlan("ucf-91", 1);
    const checkIn = plan?.labels?.find((label) =>
      label.text.includes("CHECK-IN"),
    );
    const stairs = plan?.rooms.find((room) => room.id === "STAIRS");
    expect(checkIn).toBeDefined();
    if (!checkIn || !stairs)
      throw new Error("ENG2 wayfinding landmarks are missing");
    expect(checkIn.y).toBeGreaterThan(stairs.y + 150);
    expect(checkIn.y).toBeGreaterThan(729.3);
    expect(checkIn.y).toBeLessThan(922.3);
    expect(checkIn.x).toBeGreaterThan(121.9);
    expect(checkIn.x).toBeLessThan(505.1);
  });
  it.each([
    ["ba1", [1, 2, 3, 4]],
    ["ba2", [1, 2, 3]],
    ["eng1", [1, 2, 3, 4]],
    ["ucf-91", [1, 2]],
    ["student-union", [1, 2, 3]],
  ] as const)("provides every mapped floor for %s", (buildingId, floors) => {
    expect(getVenueFloors(buildingId)).toEqual(floors);
  });

  it("keeps each mapped building backed by independent room geometry", () => {
    for (const buildingId of INDOOR_BUILDING_IDS) {
      for (const floor of getVenueFloors(buildingId)) {
        const plan = getVenueFloorPlan(buildingId, floor);
        expect(plan?.rooms.length).toBeGreaterThan(1);
        expect(new Set(plan?.rooms.map((room) => room.path)).size).toBe(
          plan?.rooms.length,
        );
      }
    }
  });

  it.each([
    ["ba1", 1, "135"],
    ["ba2", 1, "101"],
    ["eng1", 2, "224"],
    ["ucf-91", 1, "101"],
    ["student-union", 1, "140"],
  ] as const)("locates %s floor %i room %s", (buildingId, floor, roomId) => {
    expect(
      getVenueFloorPlan(buildingId, floor)?.rooms.some((room) =>
        room.roomIds.includes(roomId),
      ),
    ).toBe(true);
  });

  it("connects the Engineering II main hall and check-in atrium", () => {
    const floor = getVenueFloorPlan("ucf-91", 1);
    expect(floor?.walkableAreas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "venue-circulation",
        }),
        expect.objectContaining({ id: "north-walkway" }),
        expect.objectContaining({ id: "east-exit-walkway" }),
        expect.objectContaining({ id: "south-walkway" }),
        expect.objectContaining({ id: "west-entrance" }),
        expect.objectContaining({ id: "south-entrance" }),
      ]),
    );
    expect(floor?.labels?.map((label) => label.text)).toEqual(
      expect.arrayContaining(["MAIN HALL", "ENGINEERING ATRIUM · CHECK-IN"]),
    );
  });

  it("omits the unused Engineering II southeast room cluster", () => {
    const floor = getVenueFloorPlan("ucf-91", 1);
    const removedRoomIds = [
      "116",
      "116A",
      "116B",
      "116C",
      "116E",
      "116F",
      "117A",
      "117B",
      "117C",
      "117D",
      "190",
      "194",
    ];

    expect(
      floor?.rooms.some((room) =>
        room.roomIds.some((roomId) => removedRoomIds.includes(roomId)),
      ),
    ).toBe(false);
  });

  it("renders the Engineering II north labs as one connected room block", () => {
    const northLabs = ["180", "181", "182", "183"].map((roomId) =>
      getVenueFloorPlan("ucf-91", 1)?.rooms.find((room) => room.id === roomId),
    );

    expect(northLabs.every(Boolean)).toBe(true);
    expect(northLabs.map((room) => room?.path)).toEqual([
      "M255.1 50.0L423.5 50.0L423.5 156.0L255.1 156.0Z",
      "M423.5 50.0L535.0 50.0L535.0 156.0L423.5 156.0Z",
      "M535.0 50.0L646.4 50.0L646.4 156.0L535.0 156.0Z",
      "M646.4 50.0L820.3 50.0L820.3 156.0L646.4 156.0Z",
    ]);
  });

  it("uses connected room edges for the Engineering II west service suite", () => {
    const floor = getVenueFloorPlan("ucf-91", 1);
    const roomPaths = new Map(
      floor?.rooms.map((room) => [room.id, room.path] as const),
    );

    expect(
      floor?.walkableAreas?.some((area) => area.id === "west-hall-wall"),
    ).toBe(false);
    expect(
      ["108", "107", "106", "104", "ELEVATORS"].map((roomId) =>
        roomPaths.get(roomId),
      ),
    ).toEqual([
      "M320.3 180.4L336.6 172.3L352.9 172.3L363.8 180.4L363.8 229.3L295.8 229.3Z",
      "M295.8 229.3L355.6 229.3L363.8 237.5L363.8 259.2L355.6 267.4L276.8 267.4Z",
      "M276.8 267.4L309.4 267.4L309.4 316.3L264.8 316.3Z",
      "M309.4 267.4L363.8 267.4L363.8 346.2L320.3 346.2L320.3 354.3L255.1 354.3L264.8 316.3L309.4 316.3Z",
      "M255.1 354.3L320.3 354.3L320.3 414.1L255.1 414.1Z",
    ]);
  });

  it("keeps room 105's corridor edge thin and connected to room 103", () => {
    const floor = getVenueFloorPlan("ucf-91", 1);
    const roomPaths = new Map(
      floor?.rooms.map((room) => [room.id, room.path] as const),
    );

    expect(roomPaths.get("105")).toBe(
      "M146.4 196.7L255.1 218.5L238.8 321.7L121.9 305.4Z",
    );
    expect(roomPaths.get("103")).toBe(
      "M121.9 305.4L238.8 321.7L222.5 430.4L214.3 463.0L102.9 430.4Z",
    );
  });

  it("joins the northwest stairs to the building and extends its exit", () => {
    const floor = getVenueFloorPlan("ucf-91", 1);
    const stairs = floor?.walkableAreas?.find(
      (area) => area.id === "north-stairs-landing",
    );
    const circulation = floor?.walkableAreas?.find(
      (area) => area.id === "venue-circulation",
    );

    expect(stairs).toMatchObject({
      label: "← EXIT",
      path: "M73.0 112.5L130.1 112.5L130.1 104.3L140.9 74.5L173.5 58.2L214.3 60.9L244.2 90.8L255.1 126.1L255.1 156.0L146.4 196.7L132.8 142.4L73.0 142.4Z",
    });
    expect(circulation?.path).toMatch(/^M255\.1 156\.0.*L146\.4 196\.7Z$/);
  });

  it("builds Engineering II floor 2 from connected manual geometry", () => {
    const floor = getVenueFloorPlan("ucf-91", 2);
    const roomPaths = new Map(
      floor?.rooms.map((room) => [room.id, room.path] as const),
    );

    expect(floor?.rooms).toHaveLength(75);
    expect(
      floor?.rooms.some(
        (room) => room.id.includes("fallback") || room.label.includes(" / "),
      ),
    ).toBe(false);
    expect(
      ["211F", "211G", "211D", "211C", "201", "ELEVATORS"].map((roomId) =>
        roomPaths.get(roomId),
      ),
    ).toEqual([
      "M312.7 65.9L356.6 65.9L356.6 109.8L312.7 109.8Z",
      "M356.6 65.9L404.4 65.9L404.4 109.8L356.6 109.8Z",
      "M312.7 109.8L360.5 109.8L360.5 165.6L312.7 165.6Z",
      "M360.5 109.8L424.3 109.8L424.3 165.6L360.5 165.6Z",
      "M364.5 277.1L599.6 277.1L599.6 416.6L364.5 416.6Z",
      "M268.9 340.9L332.6 340.9L332.6 412.6L268.9 412.6Z",
    ]);
    expect(floor?.walkableAreas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "main-hall", label: "MAIN HALL" }),
        expect.objectContaining({
          id: "northwest-stairs-exit",
          label: "← EXIT",
        }),
        expect.objectContaining({ id: "east-stairs", label: "STAIRS" }),
        expect.objectContaining({ id: "east-exit", label: "EXIT →" }),
        expect.objectContaining({
          id: "atrium-overlook",
          label: "ATRIUM OVERLOOK",
        }),
        expect.objectContaining({
          id: "atrium-bridge",
          label: "BRIDGE · ATRIUM STAIRS",
        }),
      ]),
    );
  });

  it("keeps the Engineering II atrium stair core fixed across floors", () => {
    const stairPaths = getVenueFloors("ucf-91").map(
      (floor) =>
        getVenueFloorPlan("ucf-91", floor)?.rooms.find(
          (room) => room.id === "STAIRS",
        )?.path,
    );
    expect(stairPaths.every(Boolean)).toBe(true);
    expect(new Set(stairPaths).size).toBe(1);
  });
});
