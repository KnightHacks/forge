import type { VenueBuildingId } from "./venue-map";
import { VENUE_FLOOR_PLANS } from "./venue-floor-plans.generated";

export type IndoorBuildingId = VenueBuildingId | "student-union" | "ucf-91";

export const INDOOR_BUILDING_IDS = [
  "ba1",
  "ba2",
  "eng1",
  "ucf-91",
  "student-union",
] as const satisfies readonly IndoorBuildingId[];

export interface VenueFloorRoom {
  id: string;
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

export type VenueFloorPlans = Record<
  IndoorBuildingId,
  Record<number, VenueFloorPlan>
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
  const floorPlan = venueFloorPlans[buildingId][floor];

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
  return Object.keys(VENUE_FLOOR_PLANS[buildingId])
    .map(Number)
    .filter((floor) => buildingId !== "ucf-91" || floor <= 2)
    .sort((left, right) => left - right);
}
