import { permissions } from "@forge/utils";

type PermissionContext = Parameters<typeof permissions.controlPerms.or>[1];

export function assertCanReadCompanies(ctx: PermissionContext) {
  permissions.controlPerms.or(["READ_COMPANIES", "EDIT_COMPANIES"], ctx);
}

export function assertCanEditCompanies(ctx: PermissionContext) {
  permissions.controlPerms.or(["EDIT_COMPANIES"], ctx);
}
