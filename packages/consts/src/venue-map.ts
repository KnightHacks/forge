/** Stable identities shared by Blade room configuration and the KHIX map. */
export const BUILDINGS = [
  { id: "eng1", label: "ENG1" },
  { id: "ba1", label: "BA1" },
  { id: "ba2", label: "BA2" },
  { id: "hec", label: "HEC" },
  { id: "ucf-91", label: "ENG2" },
  { id: "student-union", label: "Student Union" },
] as const;

export type BuildingId = (typeof BUILDINGS)[number]["id"];

export interface PermittedRoom {
  buildingId: BuildingId;
  roomNumber: string;
  name: string | null;
}
