import type { HackerMapConfigurationDto as MapConfiguration } from "@forge/hacker-sdk";

import type { IndoorBuildingId, VenueFloorRoom } from "./venue-floor-plans";
import type { PlottedScheduleEvent } from "./venue-map";
import {
  getVenueRoomName,
  isKhixEventRoom,
  normalizeRoomNumber,
  roomMatchesNumber,
} from "./venue-room-directory";

export type RoomState =
  | "bathroom"
  | "circulation"
  | "restricted"
  | "idle"
  | "live"
  | "upcoming";

/** Keep useful navigation labels without advertising unbooked spaces. */
export function isWayfindingLabel(label: string) {
  return /\b(?:STAIRS?|LIFTS?|ELEVATORS?|EXIT|HALL|ATRIUM|CHECK-IN|WC|MEN|WOMEN|BATHROOMS?|RESTROOMS?)\b/i.test(
    label,
  );
}

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
    (room.roomIds.length === 0 && !room.reviewId) ||
    (room.roomIds.length === 0 &&
      /^(?:STAIRS?|LIFTS?|ELEVATORS?)$/i.test(room.label)) ||
    room.roomIds.some(isWayfindingLabel)
  ) {
    return {
      state: "circulation",
      label: room.label === "" ? null : room.label,
      name: null,
    };
  }
  const eventRoomIds = room.roomIds.filter((id) =>
    isKhixEventRoom(buildingId, id),
  );
  const label = room.roomIds.map(normalizeRoomNumber).join(" / ") || null;
  if (!eventRoomIds.length) return { state: "restricted", label, name: null };
  const permittedRooms = configuration.rooms.filter(
    (entry) =>
      entry.buildingId === buildingId &&
      roomMatchesNumber(buildingId, eventRoomIds, entry.roomNumber),
  );
  if (configuration.restrictionsEnabled && !permittedRooms.length)
    return { state: "restricted", label, name: null };
  const activity = events.filter(
    (event) =>
      event.venueLocation.buildingId === buildingId &&
      event.venueLocation.room &&
      roomMatchesNumber(buildingId, eventRoomIds, event.venueLocation.room),
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
    name:
      permittedRooms.find((entry) => entry.name)?.name ??
      (buildingId === "student-union" &&
      room.roomIds.every((id) => /^(218|316)[A-D]$/.test(id))
        ? null
        : (getVenueRoomName(buildingId, room.roomIds) ?? null)),
  };
}
