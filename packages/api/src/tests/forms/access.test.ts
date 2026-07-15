import { describe, expect, it } from "vitest";

import type { PermissionMap } from "../../utils/permissions";
import {
  evaluateFormSectionAccess,
  requireFormCapability,
  requireFormMoveAccess,
} from "../../utils/forms/access";
import { createEmptyPermissionMap } from "../../utils/permissions";

const VIEWER_ROLE = "00000000-0000-4000-8000-000000000101";
const EDITOR_ROLE = "00000000-0000-4000-8000-000000000102";
const OTHER_ROLE = "00000000-0000-4000-8000-000000000103";

function permissions(...keys: (keyof PermissionMap)[]): PermissionMap {
  const result = createEmptyPermissionMap();
  for (const key of keys) result[key] = true;
  return result;
}

function actor(
  permissionKeys: (keyof PermissionMap)[],
  roleIds: string[] = [],
) {
  return { permissions: permissions(...permissionKeys), roleIds };
}

const section = {
  editorRoleIds: [EDITOR_ROLE],
  id: "10000000-0000-4000-8000-000000000001",
  viewerRoleIds: [VIEWER_ROLE],
};

describe("form administration access policy", () => {
  it("[TC-002] layers global form permissions before section roles", () => {
    expect(
      evaluateFormSectionAccess(actor([], [VIEWER_ROLE]), section),
    ).toMatchObject({
      canEdit: false,
      canRead: false,
      canReadResponses: false,
    });

    expect(
      evaluateFormSectionAccess(actor(["READ_FORMS"], [VIEWER_ROLE]), section),
    ).toMatchObject({ canEdit: false, canRead: true });

    expect(
      evaluateFormSectionAccess(actor(["EDIT_FORMS"], [EDITOR_ROLE]), section),
    ).toMatchObject({ canEdit: true, canRead: true });

    expect(
      evaluateFormSectionAccess(
        actor(["READ_FORM_RESPONSES"], [OTHER_ROLE]),
        section,
      ),
    ).toMatchObject({ canReadResponses: false });
  });

  it("[TC-003] lets officers bypass every global and section gate", () => {
    const access = evaluateFormSectionAccess(actor(["IS_OFFICER"]), section);

    expect(access).toEqual({
      canDeleteResponse: true,
      canEdit: true,
      canManageSections: true,
      canRead: true,
      canReadResponses: true,
      isOfficer: true,
    });
  });

  it("[TC-004, TC-025, TC-028] keeps section provisioning and response deletion narrowly scoped", () => {
    const responseReader = evaluateFormSectionAccess(
      actor(["READ_FORM_RESPONSES"], [VIEWER_ROLE]),
      section,
    );
    expect(responseReader.canReadResponses).toBe(true);
    expect(responseReader.canDeleteResponse).toBe(false);
    expect(() =>
      requireFormCapability(responseReader, "delete_response"),
    ).toThrowError(/permission/i);

    const destructiveEditor = evaluateFormSectionAccess(
      actor(["READ_FORM_RESPONSES", "EDIT_FORMS"], [EDITOR_ROLE]),
      section,
    );
    expect(destructiveEditor.canDeleteResponse).toBe(true);
    expect(destructiveEditor.canManageSections).toBe(false);
    expect(() =>
      requireFormCapability(destructiveEditor, "manage_sections"),
    ).toThrowError(/officer/i);
  });

  it("[TC-005] requires edit access to both sections when moving a form", () => {
    const editor = actor(["EDIT_FORMS"], [EDITOR_ROLE]);
    const destination = {
      ...section,
      editorRoleIds: [OTHER_ROLE],
      id: "10000000-0000-4000-8000-000000000002",
    };

    expect(() => requireFormMoveAccess(editor, section, section)).not.toThrow();
    expect(() => requireFormMoveAccess(editor, section, destination)).toThrow(
      /destination/i,
    );
    expect(() =>
      requireFormMoveAccess(actor(["IS_OFFICER"]), section, destination),
    ).not.toThrow();
  });

  it("[TC-NEG-006] does not disclose whether a cross-section resource exists", () => {
    const noAccess = evaluateFormSectionAccess(
      actor(["READ_FORMS", "READ_FORM_RESPONSES"], [OTHER_ROLE]),
      section,
    );

    expect(() =>
      requireFormCapability(noAccess, "read_definition"),
    ).toThrowError(/not found/i);
    expect(() =>
      requireFormCapability(noAccess, "read_responses"),
    ).toThrowError(/not found/i);
  });
});
