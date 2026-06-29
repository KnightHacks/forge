import type { RouterOutputs } from "@forge/api";

type EffectivePermissions = RouterOutputs["roles"]["getPermissions"];

export function canAccessMemberAdmin(permissions: EffectivePermissions) {
  return (
    permissions.IS_OFFICER === true ||
    permissions.READ_MEMBERS === true ||
    permissions.EDIT_MEMBERS === true
  );
}

export function canAccessRoleAdmin(permissions: EffectivePermissions) {
  return (
    permissions.IS_OFFICER === true ||
    permissions.CONFIGURE_ROLES === true ||
    permissions.ASSIGN_ROLES === true
  );
}

export function getAdminNavigationAccess(permissions: EffectivePermissions) {
  return {
    members: canAccessMemberAdmin(permissions),
    roles: canAccessRoleAdmin(permissions),
  };
}
