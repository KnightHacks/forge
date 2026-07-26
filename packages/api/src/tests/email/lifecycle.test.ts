/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, expect, it } from "vitest";

import {
  assertConfirmableEmailPreview,
  buildEmailPreviewVersion,
  canRetryEmailSend,
  planRecipientRetentionCleanup,
  reconcileFrozenRecipients,
} from "../../utils/email/lifecycle";

const NOW = new Date("2026-07-25T18:00:00.000Z");

function validPreview() {
  return {
    audienceHash: "audience-hash",
    confirmedAt: null,
    contentHash: "content-hash",
    expiresAt: new Date("2026-07-25T18:15:00.000Z"),
    recipientCount: 42,
    sendId: "00000000-0000-4000-8000-000000000021",
    status: "draft" as const,
    version: buildEmailPreviewVersion({
      audienceHash: "audience-hash",
      contentHash: "content-hash",
      recipientCount: 42,
      scheduleHash: "schedule-hash",
    }),
  };
}

describe("Email Portal preview and send lifecycle", () => {
  it("TC-016 versions the effective content, audience, count, and schedule", () => {
    const baseline = buildEmailPreviewVersion({
      audienceHash: "audience-a",
      contentHash: "content-a",
      recipientCount: 10,
      scheduleHash: "schedule-a",
    });
    expect(
      buildEmailPreviewVersion({
        audienceHash: "audience-b",
        contentHash: "content-a",
        recipientCount: 10,
        scheduleHash: "schedule-a",
      }),
    ).not.toBe(baseline);
    expect(
      buildEmailPreviewVersion({
        audienceHash: "audience-a",
        contentHash: "content-a",
        recipientCount: 10,
        scheduleHash: "schedule-a",
      }),
    ).toBe(baseline);
  });

  it("TC-021 accepts an exact current preview confirmation", () => {
    expect(() =>
      assertConfirmableEmailPreview({
        actual: validPreview(),
        expectedRecipientCount: 42,
        expectedVersion: validPreview().version,
        now: NOW,
      }),
    ).not.toThrow();
  });

  it.each([
    ["expired", { expiresAt: new Date("2026-07-25T17:59:59.000Z") }],
    ["already confirmed", { confirmedAt: NOW }],
    ["wrong state", { status: "queued" as const }],
    ["superseded", { version: "pv_superseded" }],
  ])("TC-NEG-005 rejects a %s preview", (_name, changes) => {
    expect(() =>
      assertConfirmableEmailPreview({
        actual: { ...validPreview(), ...changes },
        expectedRecipientCount: 42,
        expectedVersion: validPreview().version,
        now: NOW,
      }),
    ).toThrowError(/preview|confirm|expired|state|version/i);
  });

  it("TC-NEG-005 rejects a mismatched displayed recipient count", () => {
    expect(() =>
      assertConfirmableEmailPreview({
        actual: validPreview(),
        expectedRecipientCount: 41,
        expectedVersion: validPreview().version,
        now: NOW,
      }),
    ).toThrowError(/count|recipient/i);
  });

  it("TC-023 freezes confirmed recipients and removes only late suppressions", () => {
    const result = reconcileFrozenRecipients({
      frozen: [
        { email: "a@example.test", suppressed: false },
        { email: "b@example.test", suppressed: false },
      ],
      latestCandidates: [
        { email: "a@example.test", suppressed: false },
        { email: "b@example.test", suppressed: true },
        { email: "c@example.test", suppressed: false },
      ],
    });

    expect(result.eligible.map(({ email }) => email)).toEqual([
      "a@example.test",
    ]);
    expect(result.removedSuppressed).toBe(1);
    expect(JSON.stringify(result)).not.toContain("c@example.test");
  });

  it("TC-028 permits retry only before possible provider start", () => {
    expect(
      canRetryEmailSend({
        providerMayHaveStarted: false,
        status: "failed",
      }),
    ).toEqual({ allowed: true });
    expect(
      canRetryEmailSend({
        providerMayHaveStarted: true,
        status: "failed",
      }),
    ).toEqual(
      expect.objectContaining({
        allowed: false,
        reason: expect.stringMatching(/reconcil|provider|started/i),
      }),
    );
    expect(
      canRetryEmailSend({
        providerMayHaveStarted: false,
        status: "queued",
      }),
    ).toEqual({ allowed: true });
  });

  it.each(["running", "completed", "cancelled"] as const)(
    "TC-NEG-010 rejects retry from %s",
    (status) => {
      expect(
        canRetryEmailSend({
          providerMayHaveStarted: true,
          status,
        }).allowed,
      ).toBe(false);
    },
  );

  it("TC-029 deletes terminal recipient snapshots at the 90-day boundary", () => {
    const boundaryNow = new Date("2026-07-25T00:00:00.000Z");
    const result = planRecipientRetentionCleanup({
      now: boundaryNow,
      sends: [
        {
          id: "89-days",
          status: "completed",
          terminalAt: new Date("2026-04-27T00:00:01.000Z"),
        },
        {
          id: "90-days",
          status: "completed",
          terminalAt: new Date("2026-04-26T00:00:00.000Z"),
        },
        {
          id: "older",
          status: "cancelled",
          terminalAt: new Date("2026-04-01T00:00:00.000Z"),
        },
        {
          id: "nonterminal",
          status: "running",
          terminalAt: null,
        },
      ],
    });

    expect(result.sendIds).toEqual(["90-days", "older"]);
    expect(result.retentionDays).toBe(90);
  });
});
