import type { BuildingId } from "@forge/consts";

export interface VenueRoomDirectoryEntry {
  readonly buildingId: BuildingId;
  readonly roomNumber: string;
  readonly name?: string;
  readonly floor: number;
}

/** KHIX's booked rooms. Organizers can further restrict access to this roster. */
export const KHIX_EVENT_ROOMS: readonly VenueRoomDirectoryEntry[] = [
  {
    buildingId: "student-union",
    roomNumber: "218ABCD",
    name: "Key West Ballroom",
    floor: 2,
  },
  {
    buildingId: "student-union",
    roomNumber: "316ABCD",
    name: "Cape Florida Ballroom",
    floor: 3,
  },
  {
    buildingId: "student-union",
    roomNumber: "221",
    name: "Garden Key Meeting Room",
    floor: 2,
  },
  {
    buildingId: "student-union",
    roomNumber: "219",
    name: "Sanibel Board Room",
    floor: 2,
  },
  {
    buildingId: "student-union",
    roomNumber: "220",
    name: "Sand Key Meeting Room",
    floor: 2,
  },
  {
    buildingId: "student-union",
    roomNumber: "222",
    name: "Pensacola Board Room",
    floor: 2,
  },
  {
    buildingId: "student-union",
    roomNumber: "223",
    name: "Cedar Key Meeting Room",
    floor: 2,
  },
  {
    buildingId: "student-union",
    roomNumber: "224",
    name: "Egmont Key Meeting Room",
    floor: 2,
  },
  {
    buildingId: "student-union",
    roomNumber: "225",
    name: "Siesta Key Board Room",
    floor: 2,
  },
  {
    buildingId: "student-union",
    roomNumber: "232",
    name: "Food Court - Starbucks",
    floor: 2,
  },
  { buildingId: "ba1", roomNumber: "110", floor: 1 },
  { buildingId: "ba1", roomNumber: "115", floor: 1 },
  { buildingId: "ba1", roomNumber: "116", floor: 1 },
  { buildingId: "ba1", roomNumber: "119", floor: 1 },
  { buildingId: "ba1", roomNumber: "121", floor: 1 },
  { buildingId: "ba1", roomNumber: "122", floor: 1 },
  { buildingId: "ba1", roomNumber: "126", floor: 1 },
  { buildingId: "ba1", roomNumber: "146", floor: 1 },
  { buildingId: "ba1", roomNumber: "209", floor: 2 },
  { buildingId: "ba1", roomNumber: "212", floor: 2 },
  { buildingId: "ba1", roomNumber: "213", floor: 2 },
  { buildingId: "ba1", roomNumber: "214", floor: 2 },
  { buildingId: "ba1", roomNumber: "218", floor: 2 },
  { buildingId: "ba1", roomNumber: "221", floor: 2 },
  { buildingId: "ba1", roomNumber: "225", floor: 2 },
  { buildingId: "ba2", roomNumber: "207", floor: 2 },
  { buildingId: "ba2", roomNumber: "208", floor: 2 },
  { buildingId: "ba2", roomNumber: "210", floor: 2 },
  { buildingId: "eng1", roomNumber: "224", floor: 2 },
  { buildingId: "eng1", roomNumber: "327", floor: 3 },
  { buildingId: "eng1", roomNumber: "427", floor: 4 },
  { buildingId: "ucf-91", roomNumber: "102", floor: 1 },
  { buildingId: "ucf-91", roomNumber: "103", floor: 1 },
  { buildingId: "ucf-91", roomNumber: "105", floor: 1 },
  { buildingId: "ucf-91", roomNumber: "203", floor: 2 },
  { buildingId: "ucf-91", roomNumber: "205", floor: 2 },
  { buildingId: "ucf-91", roomNumber: "302", floor: 3 },
  { buildingId: "hec", roomNumber: "103", floor: 1 },
  { buildingId: "hec", roomNumber: "110", floor: 1 },
  { buildingId: "hec", roomNumber: "111", floor: 1 },
  { buildingId: "hec", roomNumber: "117", floor: 1 },
  { buildingId: "hec", roomNumber: "119", floor: 1 },
  { buildingId: "hec", roomNumber: "125", floor: 1 },
];

export function normalizeRoomNumber(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/^0+(?=\d)/, "");
}

function roomNameKey(input: string) {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

const STUDENT_UNION_NAME_ALIASES = new Map<string, string>();
for (const room of KHIX_EVENT_ROOMS) {
  if (room.buildingId !== "student-union" || !room.name) continue;
  const fullName = roomNameKey(room.name);
  STUDENT_UNION_NAME_ALIASES.set(fullName, room.roomNumber);
  STUDENT_UNION_NAME_ALIASES.set(
    fullName.replace(/(?:BALLROOM|MEETINGROOM|BOARDROOM)$/, ""),
    room.roomNumber,
  );
}
STUDENT_UNION_NAME_ALIASES.set("STARBUCKS", "232");

export function resolveRoomNumber(
  buildingId: BuildingId,
  input: string,
): string {
  const normalized = normalizeRoomNumber(input);
  const number = normalized.replace(/^(\d+)\s+([A-Z]+)$/, "$1$2");
  if (buildingId !== "student-union") return number;
  if (number === "218" || number === "316") return `${number}ABCD`;
  return STUDENT_UNION_NAME_ALIASES.get(roomNameKey(normalized)) ?? number;
}

/** Whole-ballroom inputs cover sections; a section input covers only itself. */
export function roomMatchesNumber(
  buildingId: BuildingId,
  roomIds: readonly string[],
  input: string,
): boolean {
  const number = resolveRoomNumber(buildingId, input);
  if (!number) return false;
  const wholeBallroom =
    buildingId === "student-union" &&
    (number === "218ABCD" || number === "316ABCD");

  return roomIds.some((roomId) => {
    const candidate = resolveRoomNumber(buildingId, roomId);
    if (candidate === number) return true;
    return (
      wholeBallroom &&
      candidate.length === 4 &&
      candidate.slice(0, 3) === number.slice(0, 3) &&
      /^[A-D]$/.test(candidate.slice(-1))
    );
  });
}

export function getVenueRoomName(
  buildingId: BuildingId,
  roomIds: readonly string[],
): string | undefined {
  if (buildingId !== "student-union") return undefined;
  return KHIX_EVENT_ROOMS.find(
    (room) =>
      room.buildingId === buildingId &&
      roomMatchesNumber(buildingId, roomIds, room.roomNumber),
  )?.name;
}

export function isKhixEventRoom(buildingId: BuildingId, roomNumber: string) {
  return KHIX_EVENT_ROOMS.some(
    (room) =>
      room.buildingId === buildingId &&
      roomMatchesNumber(buildingId, [roomNumber], room.roomNumber),
  );
}
