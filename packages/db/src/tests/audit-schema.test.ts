import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { AdminAuditEvent, AdminAuditSubject } from "../schemas/audit";
import {
  FormAttachment,
  IssueAttachment,
  IssueAttachmentReference,
} from "../schemas/knight-hacks";

describe("admin audit additive storage", () => {
  it("stores immutable actor, action, outcome, metadata, and change snapshots", () => {
    expect(Object.keys(getTableColumns(AdminAuditEvent))).toEqual(
      expect.arrayContaining([
        "actionKey",
        "actorLabel",
        "actorMemberId",
        "actorRoleColor",
        "actorRoleLabel",
        "actorUserId",
        "changes",
        "domain",
        "metadata",
        "occurredAt",
        "operationId",
        "outcome",
      ]),
    );
  });

  it("stores linked primary, secondary, and per-target result subjects", () => {
    expect(Object.keys(getTableColumns(AdminAuditSubject))).toEqual(
      expect.arrayContaining([
        "eventId",
        "memberId",
        "metadata",
        "position",
        "relation",
        "resultOutcome",
        "targetId",
        "targetLabel",
        "targetType",
      ]),
    );
  });

  it("persists attachment purpose for authoritative hybrid audit behavior", () => {
    expect(Object.keys(getTableColumns(FormAttachment))).toContain("purpose");
  });

  it("[TC-015] stores managed issue image ownership and upload metadata", () => {
    expect(Object.keys(getTableColumns(IssueAttachment))).toEqual(
      expect.arrayContaining([
        "draftKey",
        "issueId",
        "teamId",
        "ownerUserId",
        "objectName",
        "contentType",
        "size",
        "finalizedAt",
      ]),
    );
    expect(Object.keys(getTableColumns(IssueAttachmentReference))).toEqual(
      expect.arrayContaining(["attachmentId", "issueId"]),
    );
  });
});
