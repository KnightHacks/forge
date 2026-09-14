import { TRPCError } from "@trpc/server";

import type {
  HackerBulkStatus,
  HackerRosterFilter,
  SkipReason,
} from "@forge/validators";
import { permissions } from "@forge/utils";

type PermissionContext = Parameters<typeof permissions.controlPerms.or>[1];

export function requireHackerRead(
  ctx: PermissionContext,
  filter?: HackerRosterFilter,
) {
  permissions.controlPerms.or(["READ_HACKERS", "EDIT_HACKERS"], ctx);
  // Filtering either true or false would reveal the private blacklist.
  if (
    filter?.blacklisted !== undefined &&
    !ctx.session.permissions.IS_OFFICER
  ) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
}

export function requireHackerEdit(ctx: PermissionContext) {
  return permissions.controlPerms.or(["EDIT_HACKERS"], ctx);
}

export function requireHackerBulkEdit(
  ctx: PermissionContext,
  status: HackerBulkStatus,
) {
  requireHackerEdit(ctx);
  if (status === "checkedin" && ctx.session.permissions.IS_OFFICER !== true) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Officer permission is required to check in hackers.",
    });
  }
}

export function redactHackerBlacklist<
  T extends { blacklistReason: string | null; blacklistedAt: Date | null },
>(row: T, ctx: PermissionContext) {
  const isOfficer = ctx.session.permissions.IS_OFFICER;
  return {
    ...row,
    blacklistReason: isOfficer ? row.blacklistReason : null,
    blacklistedAt: isOfficer ? row.blacklistedAt : null,
    blacklisted: isOfficer ? row.blacklistedAt !== null : null,
  };
}

export function redactHackerSkipReasons<T extends { reason: SkipReason }>(
  rows: T[],
  ctx: PermissionContext,
) {
  return rows.map((row) => ({
    ...row,
    reason:
      row.reason === "blacklisted" && !ctx.session.permissions.IS_OFFICER
        ? null
        : row.reason,
  }));
}
