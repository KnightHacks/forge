import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  findVenueRoom,
  getVenueFloorPlan,
  getVenueFloors,
  INDOOR_BUILDING_IDS,
} from "./venue-floor-plans";
import { KHIX_EVENT_ROOMS } from "./venue-room-directory";

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
    ["ucf-91", [1, 2, 3]],
    ["student-union", [1, 2, 3]],
    ["hec", [1]],
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
      "116D",
      "116E",
      "116F",
      "117A",
      "117B",
      "117C",
      "117D",
      "190",
      "191",
      "192",
      "193",
      "194",
    ];

    expect(
      floor?.rooms.some((room) =>
        room.roomIds.some((roomId) => removedRoomIds.includes(roomId)),
      ),
    ).toBe(false);
  });

  it("keeps the rebuilt Engineering north labs adjacent and individually searchable", () => {
    const labs = ["180", "181", "182", "183"].map(
      (id) => findVenueRoom("ucf-91", id)?.room,
    );
    expect(labs.every(Boolean)).toBe(true);
    expect(new Set(labs.map((room) => room?.y)).size).toBe(1);
    for (let i = 1; i < labs.length; i++) {
      expect(labs[i]?.x).toBeGreaterThan(labs[i - 1]?.x ?? Infinity);
    }
    const westSuite = ["108", "107", "106", "104"].map(
      (id) => findVenueRoom("ucf-91", id)?.room,
    );
    expect(westSuite.every(Boolean)).toBe(true);
    expect(new Set(westSuite.map((room) => room?.path)).size).toBe(4);
    const first = findVenueRoom("ucf-91", "105")?.room;
    const second = findVenueRoom("ucf-91", "103")?.room;
    expect(first?.y).toBeLessThan(second?.y ?? -Infinity);
  });

  it("retains the second-floor atrium, exits and individual suite rooms", () => {
    const floor = getVenueFloorPlan("ucf-91", 2);
    for (const id of ["211F", "211G", "211D", "211C", "201", "202Q", "202B"]) {
      expect(findVenueRoom("ucf-91", id)?.floor).toBe(2);
    }
    expect(floor?.walkableAreas?.map((area) => area.id)).toEqual(
      expect.arrayContaining([
        "main-hall",
        "northwest-stairs-exit",
        "east-exit",
        "atrium-overlook",
        "atrium-bridge",
      ]),
    );
  });

  it("imports corrected Engineering suffixes and Student Union ballroom sections", () => {
    for (const id of ["263A", "263B", "270A", "270B", "274A", "274B"]) {
      expect(findVenueRoom("eng1", id)?.floor).toBe(2);
    }
    for (const id of ["140A", "140I", "218A", "218D", "316A", "316D"]) {
      expect(findVenueRoom("student-union", id)).toBeDefined();
    }
    expect(findVenueRoom("ba2", "301-1")?.floor).toBe(3);
    expect(findVenueRoom("ba2", "303M")?.floor).toBe(3);
  });

  it("keeps HEC as one first-floor outline without publishing inferred room numbers", () => {
    const floor = getVenueFloorPlan("hec", 1);
    expect(floor?.outlinePath?.match(/M/g)).toHaveLength(1);
    expect(floor?.rooms).toHaveLength(45);
    for (const id of ["101", "117", "118", "119"]) {
      expect(findVenueRoom("hec", id)?.floor).toBe(1);
    }
    for (const id of ["125", "103", "104", "110", "111", "113", "HEC-1-U01"]) {
      expect(findVenueRoom("hec", id)).toBeUndefined();
    }
    for (const room of floor?.rooms ?? []) {
      if (room.reviewId) expect(room.roomIds).toEqual([]);
    }
  });

  it("uses separate native wall assets and honest markers for open regions", () => {
    for (const building of ["ba1", "ba2", "student-union"] as const) {
      for (const n of getVenueFloors(building)) {
        const floor = getVenueFloorPlan(building, n);
        expect(floor?.structureImage?.href).toMatch(
          /^\/maps\/floors\/[a-z0-9-]+\.svg$/,
        );
        expect(floor?.structureImage?.width).toBeGreaterThan(0);
        expect(floor?.structureImage?.height).toBeGreaterThan(0);
        const asset = floor?.structureImage;
        if (!asset) throw new Error("Missing native wall asset");
        const svg = readFileSync(
          new URL(`../../public${asset.href}`, import.meta.url),
          "utf8",
        );
        expect(svg).toContain("<svg");
        expect(svg).toContain("<path");
        // Labels and access-state colors belong to the app, not the image.
        expect(svg).not.toMatch(/<(?:text|script|image|foreignObject)\b/);
        expect(floor.rooms.every((room) => room.roomIds.length === 1)).toBe(
          true,
        );
      }
    }
  });

  it("gives every room a unique render key, finite anchor and nonempty geometry", () => {
    for (const building of INDOOR_BUILDING_IDS) {
      for (const n of getVenueFloors(building)) {
        const rooms = getVenueFloorPlan(building, n)?.rooms ?? [];
        expect(new Set(rooms.map((room) => room.id)).size).toBe(rooms.length);
        for (const room of rooms) {
          expect(Number.isFinite(room.x) && Number.isFinite(room.y)).toBe(true);
          expect(room.path).not.toBe("");
          expect(room.path).not.toMatch(/NaN|Infinity/);
          expect(room.roomIds.some((id) => id.includes("-U"))).toBe(false);
        }
      }
    }
  });

  it("keeps the Engineering II atrium stair core fixed on its first two floors", () => {
    const stairPaths = [1, 2].map(
      (floor) =>
        getVenueFloorPlan("ucf-91", floor)?.rooms.find(
          (room) => room.id === "STAIRS",
        )?.path,
    );
    expect(stairPaths.every(Boolean)).toBe(true);
    expect(new Set(stairPaths).size).toBe(1);
  });

  it("uses the third-floor source geometry and its verified bathroom labels", () => {
    const floor = getVenueFloorPlan("ucf-91", 3);
    expect(floor?.rooms).toHaveLength(59);
    expect(
      floor?.rooms
        .filter((room) => room.kind === "bathroom")
        .map((room) => room.id)
        .sort(),
    ).toEqual(["306", "307"]);
    expect(findVenueRoom("ucf-91", "302")?.room.path).toContain(
      "M112.20,287.20",
    );
  });
});

// The supplied HEC scan does not establish these four positions. Keep them in
// room suggestions, but never assign an arbitrary room polygon to the number.
const unplacedEventRooms = new Set([
  "hec:103",
  "hec:110",
  "hec:111",
  "hec:125",
]);

describe("requested event-room coverage", () => {
  it.each(
    KHIX_EVENT_ROOMS.filter(
      (room) =>
        !unplacedEventRooms.has(`${room.buildingId}:${room.roomNumber}`),
    ),
  )(
    "maps $buildingId $roomNumber with optional leading zero",
    ({ buildingId, roomNumber, floor, name }) => {
      const match = findVenueRoom(buildingId, roomNumber);
      expect(match?.floor).toBe(floor);
      expect(match?.room.path).toBeTruthy();
      expect(findVenueRoom(buildingId, `0${roomNumber}`)?.room.id).toBe(
        match?.room.id,
      );
      if (name)
        expect(findVenueRoom(buildingId, name)?.room.id).toBe(match?.room.id);
    },
  );

  it("uses whole-ballroom anchors for combined reservations", () => {
    expect(findVenueRoom("student-union", "218ABCD")?.room.roomIds).toEqual([
      "218",
    ]);
    expect(
      findVenueRoom("student-union", "Cape Florida")?.room.roomIds,
    ).toEqual(["316"]);
    expect(findVenueRoom("student-union", "218A")?.room.roomIds).toEqual([
      "218A",
    ]);
  });

  it("places the owner-provided Starbucks number at its existing source anchor", () => {
    expect(findVenueRoom("student-union", "232")).toMatchObject({
      floor: 2,
      room: { geometry: "marker", x: 322.22, y: 337.78 },
    });
  });

  it("accounts for all 47 event locations and reports only the four unplaced HEC rooms", () => {
    expect(KHIX_EVENT_ROOMS).toHaveLength(47);
    expect(
      KHIX_EVENT_ROOMS.filter(
        (room) => !findVenueRoom(room.buildingId, room.roomNumber),
      ).map((room) => `${room.buildingId}:${room.roomNumber}`),
    ).toEqual([...unplacedEventRooms]);
  });
});
