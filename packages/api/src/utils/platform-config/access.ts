import { TRPCError } from "@trpc/server";

import type { PermissionMap } from "../permissions";

/**
 * Officer-only, with no new permission key — permissions are positional bits on
 * `auth_roles`, so adding one is a migration-shaped change.
 *
 * Written as an explicit `IS_OFFICER` check rather than
 * `permissions.controlPerms.or([], ctx)`. That call happens to throw `FORBIDDEN`
 * for a non-officer, but only as a side effect of an empty loop, which reads
 * like a bug at every future call site.
 */
export function assertCanManagePlatformConfig(permissions: PermissionMap) {
  if (permissions.IS_OFFICER !== true) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Officer permission is required to manage platform configuration",
    });
  }
}
