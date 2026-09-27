import { PERMISSIONS } from "@forge/consts";

export interface AssignedIssueRole {
  discordRoleId?: string;
  id: string;
  permissions: string;
}

function roleHasPermission(
  role: AssignedIssueRole,
  key: PERMISSIONS.PermissionKey,
) {
  const permission = PERMISSIONS.PERMISSION_DATA[key];
  return role.permissions.at(permission.idx) === "1";
}

export function roleHasIssueCapability(
  roles: readonly AssignedIssueRole[],
  capability: PERMISSIONS.PermissionKey,
) {
  return roles.some(
    (role) =>
      roleHasPermission(role, "IS_OFFICER") ||
      roleHasPermission(role, capability),
  );
}

export function issueAcceptsEdits(issue: { archivedAt: Date | null }) {
  return issue.archivedAt === null;
}

export function classifyIssueAttachmentAccess(input: {
  draftKey: string | null;
  issueId: string | null;
  referenceCount: number;
}) {
  if (input.referenceCount > 0) return "referenced" as const;
  if (input.issueId) return "issue_upload" as const;
  if (input.draftKey) return "draft_upload" as const;
  return "detached" as const;
}

export function issueAccessForRoles({
  issue,
  roles,
}: {
  issue: { owningTeamId: string; visibleTeamIds: readonly string[] };
  roles: readonly AssignedIssueRole[];
}) {
  const isOfficer = roles.some((role) => roleHasPermission(role, "IS_OFFICER"));
  if (isOfficer) return { canEdit: true, canRead: true, isOfficer: true };

  const owningRole = roles.find((role) => role.id === issue.owningTeamId);
  const canEdit = Boolean(
    owningRole && roleHasPermission(owningRole, "EDIT_ISSUES"),
  );
  const canReadOwned = Boolean(
    owningRole &&
    (roleHasPermission(owningRole, "READ_ISSUES") ||
      roleHasPermission(owningRole, "EDIT_ISSUES")),
  );
  const visibleTeamIds = new Set(issue.visibleTeamIds);
  const canReadShared = roles.some(
    (role) =>
      visibleTeamIds.has(role.id) &&
      (roleHasPermission(role, "READ_ISSUES") ||
        roleHasPermission(role, "EDIT_ISSUES")),
  );

  return { canEdit, canRead: canReadOwned || canReadShared, isOfficer: false };
}
