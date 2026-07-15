import { TRPCError } from "@trpc/server";

import type { PermissionMap } from "../permissions";

export interface FormAccessActor {
  permissions: PermissionMap;
  roleIds: readonly string[];
}

export interface FormSectionPolicy {
  editorRoleIds: readonly string[];
  id: string;
  viewerRoleIds: readonly string[];
}

export interface FormSectionAccess {
  canDeleteResponse: boolean;
  canEdit: boolean;
  canManageSections: boolean;
  canRead: boolean;
  canReadResponses: boolean;
  isOfficer: boolean;
}

export type FormCapability =
  | "delete_response"
  | "edit_definition"
  | "manage_sections"
  | "read_definition"
  | "read_responses";

function intersects(left: readonly string[], right: readonly string[]) {
  const rightSet = new Set(right);
  return left.some((value) => rightSet.has(value));
}

export function evaluateFormSectionAccess(
  actor: FormAccessActor,
  section: FormSectionPolicy,
): FormSectionAccess {
  const isOfficer = actor.permissions.IS_OFFICER;
  if (isOfficer) {
    return {
      canDeleteResponse: true,
      canEdit: true,
      canManageSections: true,
      canRead: true,
      canReadResponses: true,
      isOfficer: true,
    };
  }

  const hasEditorRole = intersects(actor.roleIds, section.editorRoleIds);
  const hasViewerRole =
    hasEditorRole || intersects(actor.roleIds, section.viewerRoleIds);
  const hasEditPermission = actor.permissions.EDIT_FORMS === true;
  const hasReadPermission = actor.permissions.READ_FORMS === true;
  const hasResponseReadPermission =
    actor.permissions.READ_FORM_RESPONSES === true;
  const canEdit = hasEditPermission && hasEditorRole;
  const canRead =
    (hasReadPermission ? true : hasEditPermission) && hasViewerRole;
  const canReadResponses = hasResponseReadPermission && hasViewerRole;

  return {
    canDeleteResponse: canReadResponses && hasEditPermission && hasEditorRole,
    canEdit,
    canManageSections: false,
    canRead,
    canReadResponses,
    isOfficer: false,
  };
}

export function requireFormCapability(
  access: FormSectionAccess,
  capability: FormCapability,
) {
  const allowed =
    capability === "read_definition"
      ? access.canRead
      : capability === "edit_definition"
        ? access.canEdit
        : capability === "read_responses"
          ? access.canReadResponses
          : capability === "delete_response"
            ? access.canDeleteResponse
            : access.canManageSections;

  if (allowed) return true;

  if (capability === "read_definition" || capability === "read_responses") {
    throw new TRPCError({ code: "NOT_FOUND", message: "Form not found." });
  }
  if (capability === "manage_sections") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only an officer may manage form sections.",
    });
  }
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "You do not have permission to perform this form action.",
  });
}

export function requireFormMoveAccess(
  actor: FormAccessActor,
  source: FormSectionPolicy,
  destination: FormSectionPolicy,
) {
  if (actor.permissions.IS_OFFICER) return true;

  const sourceAccess = evaluateFormSectionAccess(actor, source);
  if (!sourceAccess.canEdit) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Source form not found.",
    });
  }

  const destinationAccess = evaluateFormSectionAccess(actor, destination);
  if (!destinationAccess.canEdit) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have edit access to the destination section.",
    });
  }
  return true;
}
