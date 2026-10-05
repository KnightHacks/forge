import type { VenueBuildingId } from "./venue-map";
import { VENUE_FLOOR_PLANS } from "./venue-floor-plans.generated";
import { resolveRoomNumber, roomMatchesNumber } from "./venue-room-directory";

export type IndoorBuildingId = VenueBuildingId | "student-union" | "ucf-91";

export const INDOOR_BUILDING_IDS = [
  "ba1",
  "ba2",
  "eng1",
  "ucf-91",
  "student-union",
  "hec",
] as const satisfies readonly IndoorBuildingId[];

export interface VenueFloorRoom {
  id: string;
  /** Open/ambiguous native regions use a point, never an invented envelope. */
  geometry?: "marker";
  /** Authoring reference only; never an official room lookup alias. */
  reviewId?: string;
  kind?: "bathroom" | "circulation";
  label: string;
  path: string;
  roomIds: string[];
  x: number;
  y: number;
}

export interface VenueFloorLabel {
  text: string;
  x: number;
  y: number;
}

export interface VenueWalkableArea {
  id: string;
  label: string;
  path: string;
  x: number;
  y: number;
}

export interface VenueFloorPlan {
  outlinePath?: string;
  structureImage?: {
    href: string;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  labels?: VenueFloorLabel[];
  rooms: VenueFloorRoom[];
  structurePaths?: string[];
  walkableAreas?: VenueWalkableArea[];
}

export type VenueFloorPlans = Partial<
  Record<IndoorBuildingId, Record<number, VenueFloorPlan>>
>;

const venueFloorPlans: VenueFloorPlans = VENUE_FLOOR_PLANS;

const HIDDEN_ENG2_FIRST_FLOOR_ROOM_IDS = new Set([
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
]);

export function getVenueFloorPlan(buildingId: IndoorBuildingId, floor: number) {
  const floorPlan = venueFloorPlans[buildingId]?.[floor];

  if (buildingId !== "ucf-91" || floor !== 1 || !floorPlan) {
    return floorPlan;
  }

  return {
    ...floorPlan,
    rooms: floorPlan.rooms.filter(
      (room) =>
        !room.roomIds.some((roomId) =>
          HIDDEN_ENG2_FIRST_FLOOR_ROOM_IDS.has(roomId),
        ),
    ),
  };
}

export function getVenueFloors(buildingId: IndoorBuildingId) {
  return Object.keys(venueFloorPlans[buildingId] ?? {})
    .map(Number)
    .filter((floor) => buildingId !== "ucf-91" || floor <= 3)
    .sort((left, right) => left - right);
}

/** Search actual geometry; room numbers are not a reliable floor index. */
export function findVenueRoom(
  buildingId: IndoorBuildingId,
  roomNumber: string,
) {
  const normalized = resolveRoomNumber(buildingId, roomNumber);
  for (const floor of getVenueFloors(buildingId)) {
    const matches = getVenueFloorPlan(buildingId, floor)?.rooms.filter(
      (candidate) =>
        roomMatchesNumber(buildingId, candidate.roomIds, normalized),
    );
    // A combined ballroom uses its whole-room anchor, not an arbitrary section.
    const room =
      matches?.find((candidate) =>
        candidate.roomIds.includes(normalized.replace(/ABCD$/, "")),
      ) ?? matches?.[0];
    if (room) return { floor, room };
  }
}
