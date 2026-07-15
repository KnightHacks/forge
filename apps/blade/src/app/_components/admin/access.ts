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
    permissions.EDIT_CLUB_EVENT === true
  );
}

export function canAccessEventCheckIn(permissions: EffectivePermissions) {
  return (
    permissions.IS_OFFICER === true || permissions.CHECKIN_CLUB_EVENT === true
  );
}

export function canAccessFormAdmin(permissions: EffectivePermissions) {
  return (
    permissions.IS_OFFICER === true ||
    permissions.READ_FORMS === true ||
    permissions.EDIT_FORMS === true ||
    permissions.READ_FORM_RESPONSES === true
  );
}

export function getAdminNavigationAccess(permissions: EffectivePermissions) {
  return {
    eventCheckIn: canAccessEventCheckIn(permissions),
    events: canAccessEventAdmin(permissions),
    forms: canAccessFormAdmin(permissions),
    members: canAccessMemberAdmin(permissions),
    roles: canAccessRoleAdmin(permissions),
  };
}
