import { describe, expect, it } from "vitest";

import { PERMISSIONS } from "@forge/consts";

import {
  classifyIssueAttachmentAccess,
  issueAcceptsEdits,
  issueAccessForRoles,
  roleHasIssueCapability,
} from "../../utils/issues/access";

const TEAM_A = "00000000-0000-4000-8000-000000000001";
const TEAM_B = "00000000-0000-4000-8000-000000000002";
const TEAM_C = "00000000-0000-4000-8000-000000000003";

function bits(...keys: PERMISSIONS.PermissionKey[]) {
  const value = Array.from(
    { length: Object.keys(PERMISSIONS.PERMISSION_DATA).length },
    () => "0",
  );
  for (const key of keys) {
    const permission = PERMISSIONS.PERMISSION_DATA[key];
    value[permission.idx] = "1";
  }
  return value.join("");
}

describe("Club Operations Issues assigned-role access", () => {
  it("does not expose detached managed images while they await cleanup", () => {
    expect(
      classifyIssueAttachmentAccess({
        draftKey: null,
        issueId: null,
        referenceCount: 0,
      }),
    ).toBe("detached");
    expect(
      classifyIssueAttachmentAccess({
        draftKey: "draft-key",
        issueId: null,
        referenceCount: 0,
      }),
    ).toBe("draft_upload");
    expect(
      classifyIssueAttachmentAccess({
        draftKey: null,
        issueId: "issue-id",
        referenceCount: 0,
      }),
    ).toBe("issue_upload");
    expect(
      classifyIssueAttachmentAccess({
        draftKey: null,
        issueId: null,
        referenceCount: 1,
      }),
    ).toBe("referenced");
  });

  it("rejects edit-only media work once an issue is archived", () => {
    expect(issueAcceptsEdits({ archivedAt: null })).toBe(true);
    expect(issueAcceptsEdits({ archivedAt: new Date() })).toBe(false);
  });

  it("TC-AUTH-002 gives owner readers read and owner editors mutation access", () => {
    const reader = issueAccessForRoles({
      issue: { owningTeamId: TEAM_A, visibleTeamIds: [] },
      roles: [{ id: TEAM_A, permissions: bits("READ_ISSUES") }],
    });
    const editor = issueAccessForRoles({
      issue: { owningTeamId: TEAM_A, visibleTeamIds: [] },
      roles: [{ id: TEAM_A, permissions: bits("EDIT_ISSUES") }],
    });

    expect(reader).toEqual({ canEdit: false, canRead: true, isOfficer: false });
    expect(editor).toEqual({ canEdit: true, canRead: true, isOfficer: false });
  });

  it("TC-AUTH-003 keeps shared visibility read-only across multiple roles", () => {
    const access = issueAccessForRoles({
      issue: { owningTeamId: TEAM_A, visibleTeamIds: [TEAM_B] },
      roles: [
        { id: TEAM_B, permissions: bits("EDIT_ISSUES") },
        { id: TEAM_C, permissions: bits("READ_ISSUES") },
      ],
    });

    expect(access).toEqual({ canEdit: false, canRead: true, isOfficer: false });
  });

  it("TC-AUTH-004 gives officers a complete issue/template bypass", () => {
    const roles = [{ id: TEAM_C, permissions: bits("IS_OFFICER") }];
    expect(
      issueAccessForRoles({
        issue: { owningTeamId: TEAM_A, visibleTeamIds: [TEAM_B] },
        roles,
      }),
    ).toEqual({ canEdit: true, canRead: true, isOfficer: true });
    expect(roleHasIssueCapability(roles, "EDIT_ISSUE_TEMPLATES")).toBe(true);
  });

  it("TC-AUTH-001 leaks no access through unrelated or cosmetic roles", () => {
    const access = issueAccessForRoles({
      issue: { owningTeamId: TEAM_A, visibleTeamIds: [TEAM_B] },
      roles: [
        { id: TEAM_C, permissions: bits("READ_ISSUES") },
        { id: TEAM_B, permissions: bits() },
      ],
    });
    expect(access).toEqual({
      canEdit: false,
      canRead: false,
      isOfficer: false,
    });
  });
});
