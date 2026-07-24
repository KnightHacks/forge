import { PERMISSIONS } from "@forge/consts";

export type PermissionMap = Record<PERMISSIONS.PermissionKey, boolean>;

export function createEmptyPermissionMap(): PermissionMap {
  const permissionMap = {} as PermissionMap;
  for (const key of PERMISSIONS.PERMISSION_KEYS) {
    permissionMap[key] = false;
  }
  return permissionMap;
}

export function mergePermissionBitstrings(
  bitstrings: readonly string[],
): PermissionMap {
  const result = createEmptyPermissionMap();

  for (const key of PERMISSIONS.PERMISSION_KEYS) {
    const permission = PERMISSIONS.PERMISSION_DATA[key];
    result[key] = bitstrings.some(
      (bitstring) => bitstring.at(permission.idx) === "1",
    );
  }

  return result;
}
