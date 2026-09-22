import { describe, expect, it } from "vitest";

import type { PortalScheduleEvent } from "./event-schedule";
import {
  getEventMapPoint,
  getMapEventCategory,
  getMapEventState,
  parseVenueLocation,
  plotScheduleEvents,
  projectCampusCoordinates,
} from "./venue-map";

function event(
  overrides: Partial<PortalScheduleEvent> = {},
): PortalScheduleEvent {
  return {
    description: "",
    endDateTime: new Date("2026-10-10T15:00:00-04:00"),
    id: "00000000-0000-4000-8000-000000000001",
    location: "ENG1 224",
    name: "Workshop",
    points: 0,
    purpose: "event",
    startDateTime: new Date("2026-10-10T14:00:00-04:00"),
    tag: "",
    ...overrides,
  };
}

describe("KHIX venue location parsing", () => {
  it.each([
    ["ENG1 224", { buildingId: "eng1", floor: 2, room: "224" }],
    ["Engineering I, Room 101", { buildingId: "eng1", floor: 1, room: "101" }],
    ["BA1 239", { buildingId: "ba1", floor: 2, room: "239" }],
    [
      "Business Administration II 101A",
      { buildingId: "ba2", floor: 1, room: "101A" },
    ],
  ])("parses %s", (location, expected) => {
    expect(parseVenueLocation(location)).toEqual(expected);
  });

  it.each(["", "Location TBA", "Student Union", "HEC 101", "Online"])(
    "does not fabricate a venue location for %s",
    (location) => {
      expect(parseVenueLocation(location)).toBeNull();
    },
  );
});

describe("KHIX map event metadata", () => {
  it("categorizes food and help destinations from schedule copy", () => {
    expect(getMapEventCategory(event({ name: "Midnight snack" }))).toBe("food");
    expect(getMapEventCategory(event({ tag: "Mentor office hours" }))).toBe(
      "help",
    );
    expect(getMapEventCategory(event())).toBe("event");
  });

  it("marks events upcoming, live, and ended at their time boundaries", () => {
    const scheduled = event();
    expect(
      getMapEventState(scheduled, new Date("2026-10-10T13:59:59-04:00")),
    ).toBe("upcoming");
    expect(
      getMapEventState(scheduled, new Date("2026-10-10T14:00:00-04:00")),
    ).toBe("live");
    expect(
      getMapEventState(scheduled, new Date("2026-10-10T15:00:00-04:00")),
    ).toBe("ended");
  });

  it("keeps marker placement stable and omits unsupported locations", () => {
    const scheduled = event();
    const location = parseVenueLocation(scheduled.location);
    expect(location).not.toBeNull();
    if (!location) return;

    expect(getEventMapPoint(scheduled.id, location)).toEqual(
      getEventMapPoint(scheduled.id, location),
    );
    expect(
      plotScheduleEvents(
        [scheduled, event({ id: "other", location: "Student Union" })],
        new Date("2026-10-10T14:30:00-04:00"),
      ),
    ).toHaveLength(1);
  });

  it("projects only coordinates inside the supported campus view", () => {
    const point = projectCampusCoordinates(28.6014069, -81.198508);
    expect(point).not.toBeNull();
    expect(typeof point?.x).toBe("number");
    expect(typeof point?.y).toBe("number");
    expect(projectCampusCoordinates(28.5383, -81.3792)).toBeNull();
  });
});
