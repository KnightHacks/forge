import { permissions } from "@forge/utils";

type PermissionContext = Parameters<typeof permissions.controlPerms.or>[1];

export function requireEmailPortal(ctx: PermissionContext) {
  return permissions.controlPerms.or(["EMAIL_PORTAL"], ctx);
}

export function requireEmailRecipientHistory(ctx: PermissionContext) {
  return requireEmailPortal(ctx);
}

export function requireTeamAudienceConfiguration(ctx: PermissionContext) {
  return permissions.controlPerms.or(["CONFIGURE_ROLES"], ctx);
}
