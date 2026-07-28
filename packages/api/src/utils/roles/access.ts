import { TRPCError } from "@trpc/server";

import { permissions } from "@forge/utils";

type PermissionContext = Parameters<typeof permissions.controlPerms.or>[1];

export function requireRoleRead(ctx: PermissionContext) {
  permissions.controlPerms.or(["CONFIGURE_ROLES", "ASSIGN_ROLES"], ctx);
}

export function requireConfigure(ctx: PermissionContext) {
  permissions.controlPerms.or(["CONFIGURE_ROLES"], ctx);
}

export function requireAssign(ctx: PermissionContext) {
  permissions.controlPerms.or(["ASSIGN_ROLES"], ctx);
}

export function canConfigureRole(ctx: PermissionContext) {
  return (
    ctx.session.permissions.IS_OFFICER === true ||
    ctx.session.permissions.CONFIGURE_ROLES === true
  );
}

export function requireOfficerForOfficerEscalation(ctx: PermissionContext) {
  if (ctx.session.permissions.IS_OFFICER !== true) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only an existing officer may grant or remove officer access.",
    });
  }
}
