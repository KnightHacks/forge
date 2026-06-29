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

export function canAccessEventAdmin(permissions: EffectivePermissions) {
  return (
    permissions.IS_OFFICER === true ||
    permissions.READ_CLUB_EVENT === true ||
    permissions.EDIT_CLUB_EVENT === true ||
    permissions.CHECKIN_CLUB_EVENT === true
  );
}

export function getAdminNavigationAccess(permissions: EffectivePermissions) {
  return {
    events: canAccessEventAdmin(permissions),
    members: canAccessMemberAdmin(permissions),
    roles: canAccessRoleAdmin(permissions),
  };
}
