import { describe, expect, it } from "vitest";

import {
  AUDIT_ACTION_CATALOG,
  AUDIT_ACTION_KEYS,
  AUDIT_DOMAINS,
  AUDIT_TARGET_TYPES,
  auditListInputSchema,
  auditSubjectInputSchema,
} from "../audit";

describe("admin audit contracts", () => {
  it("keeps stable action keys unique with bounded allowlists", () => {
    expect(new Set(AUDIT_ACTION_KEYS).size).toBe(AUDIT_ACTION_KEYS.length);
    expect(AUDIT_ACTION_KEYS.length).toBeGreaterThanOrEqual(70);

    for (const [actionKey, policy] of Object.entries(AUDIT_ACTION_CATALOG)) {
      expect(actionKey).toMatch(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/);
      expect(new Set(policy.metadataKeys).size).toBe(
        policy.metadataKeys.length,
      );
      expect(new Set(policy.changeFields).size).toBe(
        policy.changeFields.length,
      );
    }
  });

  it("applies the 30-day query surface defaults without inventing filters", () => {
    expect(auditListInputSchema.parse({})).toEqual({ limit: 50 });
  });

  it("exposes email operations as filterable audit actions", () => {
    expect(AUDIT_ACTION_CATALOG["email.template.published"].domain).toBe(
      "email",
    );
    expect(AUDIT_ACTION_CATALOG["email.send.confirmed"].label).toBe(
      "Confirmed email campaign",
    );
    expect(AUDIT_ACTION_CATALOG["email.test.sent"].metadataKeys).not.toContain(
      "recipient",
    );
    expect(AUDIT_ACTION_CATALOG["role.email_audience.updated"].domain).toBe(
      "email",
    );
  });

  it("declares the judge identity metadata used by room removal audits", () => {
    expect(AUDIT_ACTION_CATALOG["judging.guest.revoked"].metadataKeys).toEqual([
      "guestSessionId",
      "judgeDisplayName",
    ]);
    expect(
      AUDIT_ACTION_CATALOG["judging.evaluation.saved"].metadataKeys,
    ).toEqual(
      expect.arrayContaining([
        "evaluationId",
        "judgeId",
        "projectId",
        "revision",
      ]),
    );
    expect(
      AUDIT_ACTION_CATALOG["judging.presence.removed"].metadataKeys,
    ).toEqual(["judgeId", "judgeDisplayName"]);
  });

  it("files hackathon event operations separately from Club events", () => {
    expect(AUDIT_ACTION_CATALOG["hackathon_event.created"].domain).toBe(
      "hackathons",
    );
    expect(AUDIT_ACTION_CATALOG["hackathon_event.updated"]).toMatchObject({
      changeFields: ["name", "startAt", "endAt", "location", "tagId", "points"],
      domain: "hackathons",
    });
    expect(AUDIT_ACTION_CATALOG["hackathon_event.checked_in"]).toMatchObject({
      domain: "attendance",
      label: "Processed hackathon event check-in",
    });
    expect(
      auditListInputSchema.parse({
        checkInOutcomes: ["checked_in", "wrong_class"],
        domains: ["attendance"],
        hackerAttendeeId: "00000000-0000-4000-8000-000000000001",
      }),
    ).toMatchObject({
      checkInOutcomes: ["checked_in", "wrong_class"],
      domains: ["attendance"],
      hackerAttendeeId: "00000000-0000-4000-8000-000000000001",
    });
  });

  it("TC-024 files the console actions by effect and keeps the target type unique", () => {
    expect(AUDIT_ACTION_CATALOG["discord_config.updated"]).toMatchObject({
      // A new domain, because none of the existing ten fits a Discord guild
      // repoint. Filed by effect, the rule that already puts
      // `role.email_audience.updated` under "email".
      domain: "platform",
      metadataKeys: [
        "configKey",
        "configKind",
        "isInert",
        "guildRepointAcknowledged",
      ],
    });
    expect(AUDIT_DOMAINS).toContain("platform");
    expect(
      AUDIT_ACTION_CATALOG["role.club_classification.updated"],
    ).toMatchObject({
      domain: "roles",
      // The slug, never the UUID: a UUID in an audit row is unreadable.
      changeFields: ["kind", "rank", "teamSlug", "rosterLabel", "calloutLabel"],
      metadataKeys: ["created"],
    });
    expect(
      AUDIT_ACTION_CATALOG["role.event_feedback_exclusion.updated"],
    ).toMatchObject({
      // "events", not "roles": the visible consequence is feedback analytics
      // and export, where `event.feedback.exported` already lives.
      domain: "events",
      changeFields: ["excluded"],
      // Matches `role.email_audience.updated`, the sibling toggle. An earlier
      // draft declared an impact count the strict input schema could never
      // have carried.
      metadataKeys: [],
    });
    expect(AUDIT_TARGET_TYPES).toContain("discord_config");
    expect(new Set(AUDIT_TARGET_TYPES).size).toBe(AUDIT_TARGET_TYPES.length);
  });

  it("rejects inverted dates, oversized search, and malformed result subjects", () => {
    expect(() =>
      auditListInputSchema.parse({
        from: new Date("2026-07-26T00:00:00.000Z"),
        to: new Date("2026-07-25T00:00:00.000Z"),
      }),
    ).toThrow(/start date/i);
    expect(() =>
      auditListInputSchema.parse({ search: "x".repeat(101) }),
    ).toThrow();
    expect(() =>
      auditSubjectInputSchema.parse({
        relation: "result",
        targetId: "target",
        targetLabel: "Target",
        targetType: "member",
      }),
    ).toThrow(/result outcome/i);
  });
});
