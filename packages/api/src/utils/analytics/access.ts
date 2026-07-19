import { permissions } from "@forge/utils";

type PermissionContext = Parameters<typeof permissions.controlPerms.or>[1];

/** Requires read-only access to sensitive Club analytics. */
export function requireClubAnalyticsRead(ctx: PermissionContext) {
  return permissions.controlPerms.or(["READ_CLUB_DATA"], ctx);
}
