import { permissions } from "@forge/utils";

import type { McpAccessRule } from "../mcp/access";

type PermissionContext = Parameters<typeof permissions.controlPerms.or>[1];

/**
 * Action-level rule for read-only Club analytics. Procedures that declare
 * `meta.mcp` enforce it in `permProcedure`; the rest call the helper below.
 */
export const clubAnalyticsReadAccess = {
  mode: "any",
  permissions: ["READ_CLUB_DATA"],
} as const satisfies McpAccessRule;

/** Action-level rule for read-only hackathon-wide aggregate analytics. */
export const hackathonAnalyticsReadAccess = {
  mode: "any",
  permissions: ["READ_HACK_DATA"],
} as const satisfies McpAccessRule;

/** Requires read-only access to sensitive Club analytics. */
export function requireClubAnalyticsRead(ctx: PermissionContext) {
  return permissions.controlPerms.or(clubAnalyticsReadAccess.permissions, ctx);
}

/** Requires read-only access to hackathon-wide aggregate analytics. */
export function requireHackathonAnalyticsRead(ctx: PermissionContext) {
  return permissions.controlPerms.or(
    hackathonAnalyticsReadAccess.permissions,
    ctx,
  );
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
