import { describe, expect, it } from "vitest";

import {
  getVenueRoomName,
  KHIX_EVENT_ROOMS,
  normalizeRoomNumber,
  resolveRoomNumber,
  roomMatchesNumber,
} from "./venue-room-directory";

describe("venue room identities", () => {
  it.each([
    [" 0103 ", "103"],
    ["000218a", "218A"],
    [" 0316abcd ", "316ABCD"],
    ["000", "0"],
    ["0", "0"],
    ["SU-2-U01", "SU-2-U01"],
    ["A0103", "A0103"],
    ["  ", ""],
  ])("normalizes %j without altering embedded digits", (input, expected) => {
    expect(normalizeRoomNumber(input)).toBe(expected);
  });

  it.each([
    ["Key West", "218ABCD"],
    ["keywestballroom", "218ABCD"],
    ["  Key  West Ballroom  ", "218ABCD"],
    ["CapeFlorida", "316ABCD"],
    ["CAPE FLORIDA BALLROOM", "316ABCD"],
    ["Garden Key", "221"],
    ["Sanibel Board Room", "219"],
    ["Sand Key Meeting Room", "220"],
    ["Pensacola", "222"],
    ["Cedar Key", "223"],
    ["Egmont Key", "224"],
    ["Siesta Key Boardroom", "225"],
    ["Food Court - Starbucks", "232"],
    ["Starbucks", "232"],
    ["0218", "218ABCD"],
    ["0316", "316ABCD"],
    ["0218 abcd", "218ABCD"],
  ])("resolves SU alias %j", (input, expected) => {
    expect(resolveRoomNumber("student-union", input)).toBe(expected);
  });

  it("keeps other buildings and unknown names separate", () => {
    expect(resolveRoomNumber("ba1", "0218")).toBe("218");
    expect(resolveRoomNumber("ba1", "Key West")).toBe("KEY WEST");
    expect(resolveRoomNumber("student-union", "Food Court")).toBe("FOOD COURT");
    expect(resolveRoomNumber("eng1", " 0430a ")).toBe("430A");
    expect(resolveRoomNumber("student-union", "0218a")).toBe("218A");
  });

  it("keeps the 46 event identities unique across all six buildings", () => {
    expect(KHIX_EVENT_ROOMS).toHaveLength(46);
    expect(
      new Set(
        KHIX_EVENT_ROOMS.map((room) => `${room.buildingId}:${room.roomNumber}`),
      ).size,
    ).toBe(46);
    expect(
      Object.fromEntries(
        ["student-union", "ba1", "ba2", "eng1", "ucf-91", "hec"].map(
          (building) => [
            building,
            KHIX_EVENT_ROOMS.filter((room) => room.buildingId === building)
              .length,
          ],
        ),
      ),
    ).toEqual({
      "student-union": 10,
      ba1: 17,
      ba2: 3,
      eng1: 3,
      "ucf-91": 6,
      hec: 7,
    });
    expect(
      KHIX_EVENT_ROOMS.filter((room) => room.buildingId === "hec").every(
        (room) => room.floor === 1,
      ),
    ).toBe(true);
  });
});

describe("room matching boundaries", () => {
  it.each(["218", "218ABCD", "Key West", "0218 ABCD"])(
    "matches all Key West sections from whole-ballroom input %j",
    (input) => {
      for (const room of ["218", "218ABCD", "218A", "218B", "218C", "218D"]) {
        expect(roomMatchesNumber("student-union", [room], input)).toBe(true);
      }
      expect(roomMatchesNumber("student-union", ["218E"], input)).toBe(false);
      expect(roomMatchesNumber("student-union", ["316A"], input)).toBe(false);
    },
  );

  it("matches Cape Florida independently from Key West", () => {
    for (const room of ["316", "316ABCD", "316A", "316B", "316C", "316D"]) {
      expect(roomMatchesNumber("student-union", [room], "Cape Florida")).toBe(
        true,
      );
    }
    expect(roomMatchesNumber("student-union", ["218A"], "316ABCD")).toBe(false);
  });

  it("never broadens an individual section to its ballroom or neighbors", () => {
    expect(roomMatchesNumber("student-union", ["218A"], "0218a")).toBe(true);
    for (const room of ["218", "218ABCD", "218B", "218C", "218D", "316A"]) {
      expect(roomMatchesNumber("student-union", [room], "218A")).toBe(false);
    }
    expect(roomMatchesNumber("student-union", ["316B"], "316A")).toBe(false);
    expect(roomMatchesNumber("student-union", ["316"], "316A")).toBe(false);
  });

  it("matches shared geometry by exact room alias without prefix matches", () => {
    expect(roomMatchesNumber("eng1", ["119", "120"], "0120")).toBe(true);
    expect(roomMatchesNumber("ba1", ["218A"], "218")).toBe(false);
    expect(roomMatchesNumber("ba1", ["218"], "218ABCD")).toBe(false);
    expect(roomMatchesNumber("hec", ["110"], "011")).toBe(false);
    expect(roomMatchesNumber("hec", [], "110")).toBe(false);
    expect(roomMatchesNumber("hec", [""], " ")).toBe(false);
  });

  it("provides named SU spaces without leaking names into other buildings", () => {
    expect(getVenueRoomName("student-union", ["218B"])).toBe(
      "Key West Ballroom",
    );
    expect(getVenueRoomName("student-union", ["0316"])).toBe(
      "Cape Florida Ballroom",
    );
    expect(getVenueRoomName("student-union", ["221"])).toBe(
      "Garden Key Meeting Room",
    );
    expect(getVenueRoomName("student-union", ["232"])).toBe(
      "Food Court - Starbucks",
    );
    expect(getVenueRoomName("ba1", ["221"])).toBeUndefined();
    expect(getVenueRoomName("student-union", ["218E"])).toBeUndefined();
    expect(getVenueRoomName("student-union", [])).toBeUndefined();
  });
});
