import type { HackerMapConfigurationDto as MapConfiguration } from "@forge/hacker-sdk";

import type { IndoorBuildingId, VenueFloorRoom } from "./venue-floor-plans";
import type { PlottedScheduleEvent } from "./venue-map";

export type RoomState =
  | "bathroom"
  | "circulation"
  | "restricted"
  | "idle"
  | "live"
  | "upcoming";

/** Access and bathroom metadata outrank activity, independent of selection. */
export function getRoomPresentation(
  room: VenueFloorRoom,
  buildingId: IndoorBuildingId,
  configuration: MapConfiguration,
  events: PlottedScheduleEvent[],
  now: Date,
): { state: RoomState; label: string | null; name: string | null } {
  if (room.kind === "bathroom")
    return { state: "bathroom", label: "Bathroom", name: null };
  if (
    room.roomIds.length === 0 ||
    room.roomIds.some((id) =>
      /\b(?:STAIRS|ELEVATORS?|EXIT|HALL|ATRIUM)\b/i.test(id),
    )
  ) {
    return {
      state: "circulation",
      label: room.label === "" ? null : room.label,
      name: null,
    };
  }
  const permittedRooms = configuration.rooms.filter(
    (entry) =>
      entry.buildingId === buildingId &&
      room.roomIds.includes(entry.roomNumber),
  );
  if (configuration.restrictionsEnabled && !permittedRooms.length)
    return { state: "restricted", label: null, name: null };
  const label = configuration.restrictionsEnabled
    ? permittedRooms.map((entry) => entry.roomNumber).join(" / ")
    : (room.roomIds.find((id) => /^\d/.test(id)) ?? room.roomIds[0] ?? null);
  const activity = events.filter(
    (event) =>
      event.venueLocation.buildingId === buildingId &&
      event.venueLocation.room &&
      room.roomIds.includes(event.venueLocation.room),
  );
  const state = activity.some((event) => event.state === "live")
    ? "live"
    : activity.some(
          (event) =>
            event.state === "upcoming" &&
            event.startDateTime.getTime() - now.getTime() <= 3600_000,
        )
      ? "upcoming"
      : "idle";
  return {
    state,
    label,
    name: permittedRooms.find((entry) => entry.name)?.name ?? null,
  };
}
