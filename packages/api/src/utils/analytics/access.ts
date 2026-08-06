import { permissions } from "@forge/utils";

type PermissionContext = Parameters<typeof permissions.controlPerms.or>[1];

/** Requires read-only access to sensitive Club analytics. */
export function requireClubAnalyticsRead(ctx: PermissionContext) {
  return permissions.controlPerms.or(["READ_CLUB_DATA"], ctx);
}

/** Requires read-only access to hackathon-wide aggregate analytics. */
export function requireHackathonAnalyticsRead(ctx: PermissionContext) {
  return permissions.controlPerms.or(["READ_HACK_DATA"], ctx);
}

/**
 * Identified rows and the read-only Hacker profile require both Hack data and
 * Hacker-directory access. Officers continue to satisfy the shared override.
 */
export function requireHackathonAnalyticsIdentifiedRead(
  ctx: PermissionContext,
) {
  return permissions.controlPerms.and(["READ_HACK_DATA", "READ_HACKERS"], ctx);
}

/** Resume preparation is deliberately officer-only, independent of read bits. */
export function requireHackathonResumeBundlePrepare(ctx: PermissionContext) {
  return permissions.controlPerms.or(["IS_OFFICER"], ctx);
}
