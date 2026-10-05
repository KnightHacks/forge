import { describe, expect, it } from "vitest";

import { mapConfigurationSchema } from "../venue-map";

describe("map configuration", () => {
  it("normalizes rooms and optional names", () => {
    expect(
      mapConfigurationSchema.parse({
        restrictionsEnabled: false,
        rooms: [
          { buildingId: "hec", roomNumber: " 101a ", name: "  Help desk  " },
          { buildingId: "eng1", roomNumber: "224", name: " " },
          { buildingId: "ba1", roomNumber: "133" },
        ],
      }).rooms,
    ).toEqual([
      { buildingId: "hec", roomNumber: "101A", name: "Help desk" },
      { buildingId: "eng1", roomNumber: "224", name: null },
      { buildingId: "ba1", roomNumber: "133", name: null },
    ]);
  });

  it("rejects duplicates after normalization but allows the same number in another building", () => {
    const room = { buildingId: "ba1", roomNumber: "101", name: null };
    expect(
      mapConfigurationSchema.safeParse({
        restrictionsEnabled: true,
        rooms: [room, { ...room, roomNumber: " 101 " }],
      }).success,
    ).toBe(false);
    expect(
      mapConfigurationSchema.safeParse({
        restrictionsEnabled: true,
        rooms: [room, { ...room, buildingId: "ba2" }],
      }).success,
    ).toBe(true);
  });

  it("accepts an explicitly enabled empty list", () => {
    expect(
      mapConfigurationSchema.parse({ restrictionsEnabled: true, rooms: [] })
        .restrictionsEnabled,
    ).toBe(true);
  });

  it.each([
    { buildingId: "unknown", roomNumber: "101", name: null },
    { buildingId: "hec", roomNumber: " ", name: null },
    { buildingId: "hec", roomNumber: "101", name: "a".repeat(121) },
  ])("rejects invalid room entries", (room) => {
    expect(
      mapConfigurationSchema.safeParse({
        restrictionsEnabled: false,
        rooms: [room],
      }).success,
    ).toBe(false);
  });
});
