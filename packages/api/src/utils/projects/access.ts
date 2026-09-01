import { permissions } from "@forge/utils";

type PermissionContext = Parameters<typeof permissions.controlPerms.or>[1];

export function assertCanViewProjects(ctx: PermissionContext) {
  return permissions.controlPerms.or(["IS_JUDGE"], ctx);
}

export function assertCanManageProjects(ctx: PermissionContext) {
  return permissions.controlPerms.or(["IS_OFFICER"], ctx);
}
