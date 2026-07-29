import { PERMISSIONS } from "@forge/consts";

/**
 * A stored `auth_roles.permissions` value granting exactly the named keys.
 *
 * Permissions are positional bits, so a hand-written literal drifts silently
 * the moment a key is added at a lower index. Building it from
 * `PERMISSION_DATA` means a test cannot accidentally assert against the wrong
 * capability.
 */
export function permissionBitstring(...keys: PERMISSIONS.PermissionKey[]) {
  const maxIndex = Math.max(
    ...Object.values(PERMISSIONS.PERMISSION_DATA).map(({ idx }) => idx),
  );
  const bits = Array.from({ length: maxIndex + 1 }, () => "0");
  for (const key of keys) {
    const permission = PERMISSIONS.PERMISSION_DATA[key];
    bits[permission.idx] = "1";
  }
  return bits.join("");
}
