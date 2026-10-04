import type { VenueBuildingId } from "./venue-map";
import { VENUE_FLOOR_PLANS } from "./venue-floor-plans.generated";
import { CAMPUS_BUILDINGS } from "./venue-map";

export type IndoorBuildingId = VenueBuildingId | "student-union" | "ucf-91";

export const INDOOR_BUILDING_IDS = [
  "ba1",
  "ba2",
  "eng1",
  "ucf-91",
  "student-union",
  "hec",
] as const satisfies readonly IndoorBuildingId[];

export function parseMapLocation(
  location: string,
): { buildingId: IndoorBuildingId; room: string | null } | null {
  // UCF labels Student Union as STUN; accept the familiar SU abbreviation too.
  const normalized = location
    .trim()
    .toUpperCase()
    .replace(/^SU(?=$|[\s\d-])/, "STUN");

  for (const buildingId of INDOOR_BUILDING_IDS) {
    const abbreviation = CAMPUS_BUILDINGS.find(
      (building) => building.id === buildingId,
    )?.abbreviation;
    if (!abbreviation || !normalized.startsWith(abbreviation)) continue;

    const remainder = normalized.slice(abbreviation.length);
    if (!remainder) return { buildingId, room: null };

    const room = /^(?:\s*-\s*|\s*)(\d{3}[A-Z]?)$/.exec(remainder)?.[1];
    return room ? { buildingId, room } : null;
  }

  return null;
}

export interface VenueFloorRoom {
  id: string;
  kind?: "bathroom";
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
  "116E",
  "116F",
  "117A",
  "117B",
  "117C",
  "117D",
  "190",
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
    .filter((floor) => buildingId !== "ucf-91" || floor <= 2)
    .sort((left, right) => left - right);
}

/** Search actual geometry; room numbers are not a reliable floor index. */
export function findVenueRoom(
  buildingId: IndoorBuildingId,
  roomNumber: string,
) {
  const normalized = roomNumber.trim().toUpperCase();
  for (const floor of getVenueFloors(buildingId)) {
    const room = getVenueFloorPlan(buildingId, floor)?.rooms.find((candidate) =>
      candidate.roomIds.includes(normalized),
    );
    if (room) return { floor, room };
  }
}
