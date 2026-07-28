import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminAuditEvent, AdminAuditSubject } from "@forge/db/schemas/audit";

import type { CreateAdminAuditEventInput } from "../../utils/audit/service";
import {
  appendAdminAuditResults,
  createAdminAuditEvent,
  validateActionPayload,
  validateSubjects,
} from "../../utils/audit/service";
import { AUDIT_EVENT_ID, createAuditRecorder } from "../support/audit-recorder";

const mocks = vi.hoisted(() => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
  },
}));

vi.mock("@forge/db/client", () => ({ db: mocks.db }));
vi.mock("../../env", () => ({ isBladeE2E: false }));

const actorUserId = "00000000-0000-4000-8000-000000000001";
const memberId = "11111111-1111-4111-8111-111111111111";
const operationId = "33333333-3333-4333-8333-333333333333";
const bladeE2EEventId = "00000000-0000-4000-8000-000000000000";

const deletionEvent: CreateAdminAuditEventInput = {
  actionKey: "member.profile.deleted",
  actor: {
    id: actorUserId,
    name: "Audit Actor",
    // A supplied snapshot skips the actor lookup, so these tests exercise the
    // write itself rather than snapshot resolution.
    snapshot: { memberId, roleColor: null, roleLabel: null },
  },
  metadata: { deletedObjectCount: 3 },
  operationId,
  subjects: [
    {
      memberId,
      relation: "primary",
      targetId: memberId,
      targetLabel: "Deleted Member",
      targetType: "member",
    },
  ],
};

function recordAuditWrites() {
  const audit = createAuditRecorder();
  mocks.db.insert.mockImplementation(audit.insert);
  mocks.db.select.mockImplementation(audit.select);

  return audit;
}

describe("admin audit payload enforcement", () => {
  it("accepts only metadata and changed fields allowlisted for the action", () => {
    expect(() =>
      validateActionPayload("member.profile.updated", {}, [
        { after: 5, before: 4, field: "points" },
      ]),
    ).not.toThrow();
    expect(() =>
      validateActionPayload("member.profile.updated", { rawAnswers: "no" }, []),
    ).toThrow(/not allowed/i);
    expect(() =>
      validateActionPayload("member.profile.updated", {}, [
        { after: "secret", before: null, field: "password" },
      ]),
    ).toThrow(/not allowed/i);
  });

  it("requires exactly one primary subject", () => {
    expect(() =>
      validateSubjects("member.profile.updated", [
        {
          relation: "primary",
          targetId: "member-1",
          targetLabel: "Member One",
          targetType: "member",
        },
      ]),
    ).not.toThrow();
    expect(() => validateSubjects("member.profile.updated", [])).toThrow(
      /exactly one primary/i,
    );
  });
});

describe("admin audit write path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes the event and its subjects to the audit tables", async () => {
    const recorded = recordAuditWrites();

    await expect(createAdminAuditEvent(deletionEvent)).resolves.toEqual({
      id: AUDIT_EVENT_ID,
    });

    expect(mocks.db.insert).toHaveBeenNthCalledWith(1, AdminAuditEvent);
    expect(mocks.db.insert).toHaveBeenNthCalledWith(2, AdminAuditSubject);
    expect(recorded.events[0]).toMatchObject({
      actionKey: "member.profile.deleted",
      actorLabel: "Audit Actor",
      actorMemberId: memberId,
      actorUserId,
      domain: "members",
      metadata: { deletedObjectCount: 3 },
      operationId,
      outcome: "committed",
    });
    expect(recorded.subjects).toEqual([
      {
        eventId: AUDIT_EVENT_ID,
        memberId,
        metadata: {},
        position: 0,
        relation: "primary",
        resultOutcome: null,
        targetId: memberId,
        targetLabel: "Deleted Member",
        targetType: "member",
      },
    ]);
  });

  it("appends result subjects after the ones the event already carries", async () => {
    const recorded = recordAuditWrites();
    // Appended against a real prior write rather than a stubbed parent row, so
    // the starting position has to be derived from the primary subject.
    await createAdminAuditEvent(deletionEvent);

    await appendAdminAuditResults({
      actionKey: "member.profile.deleted",
      eventId: AUDIT_EVENT_ID,
      results: [
        {
          resultOutcome: "failed_external",
          targetId: `resume-cleanup:${actorUserId}`,
          targetLabel: "Résumé storage cleanup",
          targetType: "provider",
        },
      ],
    });

    expect(recorded.subjects.slice(1)).toEqual([
      {
        eventId: AUDIT_EVENT_ID,
        memberId: null,
        metadata: {},
        position: 1,
        relation: "result",
        resultOutcome: "failed_external",
        targetId: `resume-cleanup:${actorUserId}`,
        targetLabel: "Résumé storage cleanup",
        targetType: "provider",
      },
    ]);
  });
});

describe("blade e2e audit short circuit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates payloads but writes nothing under the E2E harness", async () => {
    vi.resetModules();
    vi.doMock("../../env", () => ({ isBladeE2E: true }));

    try {
      const service = await import("../../utils/audit/service");
      recordAuditWrites();

      await expect(
        service.appendAdminAuditResults({
          actionKey: "member.profile.deleted",
          eventId: AUDIT_EVENT_ID,
          results: [
            // A result subject with no outcome: the payload the harness used to
            // wave through because it returned before validating anything.
            {
              targetId: `resume-cleanup:${actorUserId}`,
              targetLabel: "Résumé storage cleanup",
              targetType: "provider",
            },
          ],
        }),
      ).rejects.toThrow(/result outcome/i);
      await expect(
        service.createAdminAuditEvent(deletionEvent),
      ).resolves.toEqual({ id: bladeE2EEventId });

      expect(mocks.db.insert).not.toHaveBeenCalled();
      expect(mocks.db.select).not.toHaveBeenCalled();
    } finally {
      vi.doMock("../../env", () => ({ isBladeE2E: false }));
      vi.resetModules();
    }
  });
});
