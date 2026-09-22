import type { PortalScheduleEvent } from "./event-schedule";
import { UCF_CAMPUS_BUILDINGS } from "./venue-campus.generated";

export type VenueBuildingId = "ba1" | "ba2" | "eng1";
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
    building.kind === "venue",
);

const locationPatterns: {
  buildingId: VenueBuildingId;
  pattern: RegExp;
}[] = [
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

const roomPattern = /(?:\bROOM\s*|\bRM\s*|#\s*)?\b([1-4]\d{2}[A-Z]?)\b/i;

export function parseVenueLocation(
  location: string,
): ParsedVenueLocation | null {
  const normalized = location.replaceAll(/[.,()\-_/]+/g, " ").trim();
  if (!normalized) return null;

  const building = locationPatterns.find(({ pattern }) =>
    pattern.test(normalized),
  );
  if (!building) return null;

  const room = roomPattern.exec(normalized)?.[1]?.toUpperCase() ?? null;
  const floor = room ? Number(room.charAt(0)) : null;

  return {
    buildingId: building.buildingId,
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
