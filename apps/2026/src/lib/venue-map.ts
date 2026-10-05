import type { BuildingId } from "@forge/consts";
import { VENUE_MAP } from "@forge/consts";

import type { PortalScheduleEvent } from "./event-schedule";
import { UCF_CAMPUS_BUILDINGS } from "./venue-campus.generated";
import { KHIX_EVENT_ROOMS, resolveRoomNumber } from "./venue-room-directory";

export type VenueBuildingId = BuildingId;
export type CampusBuildingId = string;
export type MapEventCategory = "event" | "food" | "help";
export type MapEventState = "ended" | "live" | "upcoming";

export interface MapPoint {
  x: number;
  y: number;
}

export interface CampusBuilding {
  abbreviation: string;
  center: MapPoint;
  id: CampusBuildingId;
  kind: "context" | "landmark" | "parking" | "venue";
  label: string;
  path: string;
}

export interface ParsedVenueLocation {
  buildingId: VenueBuildingId;
  floor: number | null;
  room: string | null;
}

export interface PlottedScheduleEvent extends PortalScheduleEvent {
  category: MapEventCategory;
  point: MapPoint;
  state: MapEventState;
  venueLocation: ParsedVenueLocation;
}

// Exact building footprints from UCF Campus Map's public location data.
export const CAMPUS_BUILDINGS: CampusBuilding[] = UCF_CAMPUS_BUILDINGS;

export const VENUE_BUILDINGS = CAMPUS_BUILDINGS.filter(
  (building): building is CampusBuilding & { id: VenueBuildingId } =>
    VENUE_MAP.BUILDINGS.some((venue) => venue.id === building.id),
);

const locationPatterns: {
  buildingId: VenueBuildingId;
  pattern: RegExp;
}[] = [
  {
    buildingId: "student-union",
    pattern: /\b(?:STUDENT\s+UNION|SU)\b/i,
  },
  {
    buildingId: "ucf-91",
    pattern: /\b(?:ENG(?:INEERING)?\s*2|ENGINEERING\s+II)\b/i,
  },
  {
    buildingId: "hec",
    pattern:
      /\b(?:HEC|(?:L3\s*HARRIS|HARRIS)(?:\s+ENGINEERING(?:\s+CENTER)?)?)\b/i,
  },
  {
    buildingId: "ba2",
    pattern: /\b(?:BA\s*2|BUSINESS\s+ADMIN(?:ISTRATION)?\s*(?:II|2))\b/i,
  },
  {
    buildingId: "ba1",
    pattern: /\b(?:BA\s*1|BUSINESS\s+ADMIN(?:ISTRATION)?\s*(?:I|1))\b/i,
  },
  {
    buildingId: "eng1",
    pattern: /\b(?:ENG(?:INEERING)?\s*1|ENGINEERING\s+I)\b/i,
  },
];

const roomPattern = /(?:\bROOM\s*|\bRM\s*|#\s*)?\b0*([1-4]\d{2}[A-Z]{0,4})\b/i;

export function parseVenueLocation(
  location: string,
): ParsedVenueLocation | null {
  const normalized = location.replaceAll(/[.,()\-_/]+/g, " ").trim();
  if (!normalized) return null;

  const building = locationPatterns.find(({ pattern }) =>
    pattern.test(normalized),
  );
  const namedUnionRoom = resolveRoomNumber("student-union", normalized);
  const unionRoomByName =
    !/^\d/.test(normalized) &&
    KHIX_EVENT_ROOMS.some(
      (entry) =>
        entry.buildingId === "student-union" &&
        entry.roomNumber === namedUnionRoom,
    );
  const buildingId =
    building?.buildingId ?? (unionRoomByName ? "student-union" : null);
  if (!buildingId) return null;

  const number = roomPattern.exec(normalized)?.[1];
  const namedRoom = resolveRoomNumber(
    buildingId,
    building ? normalized.replace(building.pattern, "").trim() : normalized,
  );
  const room = number
    ? resolveRoomNumber(buildingId, number)
    : /^[1-4]\d{2}[A-Z]*$/.test(namedRoom)
      ? namedRoom
      : null;
  const floor = room ? Number(room.charAt(0)) : null;

  return {
    buildingId,
    floor: Number.isFinite(floor) ? floor : null,
    room,
  };
}

export function getMapEventCategory(
  event: Pick<PortalScheduleEvent, "description" | "name" | "tag">,
): MapEventCategory {
  const copy = `${event.name} ${event.description} ${event.tag}`;

  if (
    /\b(?:breakfast|dinner|food|lunch|meal|pizza|snack|supper)\b/i.test(copy)
  ) {
    return "food";
  }

  if (
    /\b(?:help|mentor|mentoring|office hours|support|tech support)\b/i.test(
      copy,
    )
  ) {
    return "help";
  }

  return "event";
}

export function getMapEventState(
  event: Pick<PortalScheduleEvent, "endDateTime" | "startDateTime">,
  now: Date,
): MapEventState {
  if (now < event.startDateTime) return "upcoming";
  if (now >= event.endDateTime) return "ended";
  return "live";
}

function hashString(value: string) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function getEventMapPoint(
  eventId: string,
  location: ParsedVenueLocation,
): MapPoint {
  const building = VENUE_BUILDINGS.find(
    (candidate) => candidate.id === location.buildingId,
  );
  if (!building) return { x: 500, y: 350 };

  const hash = hashString(`${eventId}:${location.room ?? "building"}`);
  const angle = ((hash % 360) * Math.PI) / 180;
  const radius = location.room ? 22 + (hash % 16) : 8;

  return {
    x: Math.round((building.center.x + Math.cos(angle) * radius) * 10) / 10,
    y: Math.round((building.center.y + Math.sin(angle) * radius) * 10) / 10,
  };
}

export function plotScheduleEvents(
  events: PortalScheduleEvent[],
  now: Date,
): PlottedScheduleEvent[] {
  return events.flatMap((event) => {
    const venueLocation = parseVenueLocation(event.location);
    if (!venueLocation) return [];

    return [
      {
        ...event,
        category: getMapEventCategory(event),
        point: getEventMapPoint(event.id, venueLocation),
        state: getMapEventState(event, now),
        venueLocation,
      },
    ];
  });
}

const CAMPUS_BOUNDS = {
  maxLatitude: 28.6055,
  maxLongitude: -81.195,
  minLatitude: 28.5985,
  minLongitude: -81.2035,
};

export function projectCampusCoordinates(
  latitude: number,
  longitude: number,
): MapPoint | null {
  if (
    latitude < CAMPUS_BOUNDS.minLatitude ||
    latitude > CAMPUS_BOUNDS.maxLatitude ||
    longitude < CAMPUS_BOUNDS.minLongitude ||
    longitude > CAMPUS_BOUNDS.maxLongitude
  ) {
    return null;
  }

  return {
    x:
      ((longitude - CAMPUS_BOUNDS.minLongitude) /
        (CAMPUS_BOUNDS.maxLongitude - CAMPUS_BOUNDS.minLongitude)) *
      1000,
    y:
      ((CAMPUS_BOUNDS.maxLatitude - latitude) /
        (CAMPUS_BOUNDS.maxLatitude - CAMPUS_BOUNDS.minLatitude)) *
      700,
  };
}
