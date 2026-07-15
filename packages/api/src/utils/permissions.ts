import { PERMISSIONS } from "@forge/consts";

export type PermissionMap = Record<PERMISSIONS.PermissionKey, boolean>;

export function createEmptyPermissionMap(): PermissionMap {
  return Object.fromEntries(
    Object.keys(PERMISSIONS.PERMISSION_DATA).map((key) => [key, false]),
  );
}

export function mergePermissionBitstrings(
  bitstrings: readonly string[],
): PermissionMap {
  const result = createEmptyPermissionMap();

  const permissionKeys = Object.keys(PERMISSIONS.PERMISSION_DATA);
  for (const key of permissionKeys) {
    const permission = PERMISSIONS.PERMISSION_DATA[key];
    if (!permission) throw new Error(`Unknown permission: ${key}`);
    result[key] = bitstrings.some(
      (bitstring) => bitstring.at(permission.idx) === "1",
    );
  }

  return result;
}
