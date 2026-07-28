import { permissions } from "@forge/utils";

type PermissionContext = Parameters<typeof permissions.controlPerms.or>[1];

export function assertCanManageAlumni(ctx: PermissionContext) {
  permissions.controlPerms.or(["MANAGE_ALUMNI_DASHBOARD"], ctx);
}
