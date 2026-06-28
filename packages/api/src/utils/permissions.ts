import { PERMISSIONS } from "@forge/consts";

export type PermissionMap = Record<PERMISSIONS.PermissionKey, boolean>;

export function createEmptyPermissionMap(): PermissionMap {
  return Object.fromEntries(
    Object.keys(PERMISSIONS.PERMISSION_DATA).map((key) => [key, false]),
  ) as PermissionMap;
}

export function mergePermissionBitstrings(
  bitstrings: readonly string[],
): PermissionMap {
  const result = createEmptyPermissionMap();

  for (const [key, permission] of Object.entries(PERMISSIONS.PERMISSION_DATA)) {
    result[key] = bitstrings.some(
      (bitstring) => bitstring.at(permission.idx) === "1",
    );
  }

  return result;
}
