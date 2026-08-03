import type { RouterOutputs } from "@forge/api";

type EffectivePermissions = RouterOutputs["roles"]["getPermissions"];

export function canAccessAnalytics(permissions: EffectivePermissions) {
  return permissions.IS_OFFICER === true || permissions.READ_CLUB_DATA === true;
}

export function canAccessDiscordArchive(permissions: EffectivePermissions) {
  return permissions.IS_OFFICER === true;
}

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

export function canAccessIssues(permissions: EffectivePermissions) {
  return (
    permissions.IS_OFFICER === true ||
    permissions.READ_ISSUES === true ||
    permissions.EDIT_ISSUES === true
  );
}

export function canAccessAdminLogs(permissions: EffectivePermissions) {
  return permissions.IS_OFFICER === true;
}

export function canAccessAlumniAdmin(permissions: EffectivePermissions) {
  return (
    permissions.IS_OFFICER === true ||
    permissions.MANAGE_ALUMNI_DASHBOARD === true
  );
}

/**
 * Officer-only, deliberately. `READ_HACK_DATA` and `READ_HACKERS` exist and are
 * *not* accepted: this screen writes the mail every applicant receives, which
 * is not a read-tier action.
 */
export function canAccessHackathonAdmin(permissions: EffectivePermissions) {
  return permissions.IS_OFFICER === true;
}

export function canAccessEmailPortal(permissions: EffectivePermissions) {
  return permissions.IS_OFFICER === true || permissions.EMAIL_PORTAL === true;
}

export function getAdminNavigationAccess(permissions: EffectivePermissions) {
  return {
    alumni: canAccessAlumniAdmin(permissions),
    analytics: canAccessAnalytics(permissions),
    discordArchive: canAccessDiscordArchive(permissions),
    email: canAccessEmailPortal(permissions),
    eventCheckIn: canAccessEventCheckIn(permissions),
    events: canAccessEventAdmin(permissions),
    forms: canAccessFormAdmin(permissions),
    hackathon: canAccessHackathonAdmin(permissions),
    // Same tier: both screens are officer-only and one links to the other.
    hackers: canAccessHackathonAdmin(permissions),
    issues: canAccessIssues(permissions),
    logs: canAccessAdminLogs(permissions),
    members: canAccessMemberAdmin(permissions),
    roles: canAccessRoleAdmin(permissions),
  };
}
