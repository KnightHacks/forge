import { describe, expect, it } from "vitest";

import {
  hackathonAgreementDefinitionCreateSchema,
  hackathonIssueReportingSchema,
  productionPortalOriginSchema,
} from "../hackathon-portal-admin";
import {
  calculateAgeOnDate,
  dashboardDtoSchema,
  hackathonEventPublicationSetDesiredStateSchema,
  HACKER_WITHDRAWAL_ACKNOWLEDGEMENT,
  hackerPortalV1InputSchemas,
  hackerPortalV1OutputSchemas,
  hackerSchoolSchema,
  portalLogoutRequestSchema,
  portalRefreshSchema,
} from "../hacker-portal";
import { projectClaimSettingsSchema } from "../project-claims";

describe("Hacker Portal validators", () => {
  it("validates nullable per-hackathon channel and ping role IDs", () => {
    const base = {
      hackathonId: "50000000-0000-4000-8000-000000000001",
      issueReportsChannelId: " 234567890123456789 ",
      issueReportsRoleId: "",
    };
    expect(hackathonIssueReportingSchema.parse(base)).toMatchObject({
      issueReportsChannelId: "234567890123456789",
      issueReportsRoleId: null,
    });
    expect(
      hackathonIssueReportingSchema.safeParse({
        ...base,
        issueReportsRoleId: "<@&345678901234567890>",
      }).success,
    ).toBe(false);
    expect(
      hackathonIssueReportingSchema.safeParse({
        ...base,
        issueReportsChannelId: "https://discord.com/channels/1/2",
      }).success,
    ).toBe(false);
  });
  it("validates report text without accepting a caller-selected destination", () => {
    const schema = hackerPortalV1InputSchemas.reportIssue;
    expect(
      schema.parse({ description: "  Help  ", idempotencyKey: "one" })
        .description,
    ).toBe("Help");
    expect(
      schema.safeParse({ description: "  ", idempotencyKey: "one" }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ description: "x".repeat(2001), idempotencyKey: "one" })
        .success,
    ).toBe(false);
    expect(
      schema.safeParse({
        description: "Help",
        idempotencyKey: "one",
        channelId: "123",
        roleId: "456",
      }).success,
    ).toBe(false);
  });
  it("accepts session responses with an optional profile photo", () => {
    const session = {
      authenticated: true,
      displayName: "Hacker",
      expiresAt: null,
    };
    const schema = hackerPortalV1OutputSchemas.getSession;
    expect(schema.safeParse(session).success).toBe(true);
    expect(schema.safeParse({ ...session, avatarUrl: null }).success).toBe(
      true,
    );
    expect(
      schema.safeParse({
        ...session,
        avatarUrl: "https://cdn.discordapp.com/avatars/123/avatar.png",
      }).success,
    ).toBe(true);
    expect(
      schema.safeParse({ ...session, avatarUrl: "not-a-url" }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ ...session, accessToken: "must-not-be-exposed" })
        .success,
    ).toBe(false);
  });

  it("accepts a trimmed custom school without weakening the school field", () => {
    expect(hackerSchoolSchema.parse("  North Lake Technical Academy  ")).toBe(
      "North Lake Technical Academy",
    );
    expect(hackerSchoolSchema.safeParse("   ").success).toBe(false);
    expect(hackerSchoolSchema.safeParse("x".repeat(256)).success).toBe(false);
  });

  it("TC-SDK-006 requires the irreversible withdrawal acknowledgement", () => {
    expect(
      hackerPortalV1InputSchemas.withdrawApplication.safeParse({
        acknowledgement: "withdraw",
        idempotencyKey: "withdraw-1",
      }).success,
    ).toBe(false);
    expect(
      hackerPortalV1InputSchemas.withdrawApplication.safeParse({
        acknowledgement: HACKER_WITHDRAWAL_ACKNOWLEDGEMENT,
        idempotencyKey: "withdraw-1",
      }).success,
    ).toBe(true);
  });

  it("TC-APP-002 requires a fresh first-time answer on submission", () => {
    const result = hackerPortalV1InputSchemas.submitApplication.safeParse({
      agreements: [],
      idempotencyKey: "apply-1",
      profile: {},
      survey1: "answer",
      survey2: "answer",
    });
    expect(result.success).toBe(false);
  });

  it("does not trust Discord identity supplied by a yearly portal", () => {
    const result = hackerPortalV1InputSchemas.submitApplication.safeParse({
      agreements: [],
      firstTime: true,
      idempotencyKey: "apply-identity-1",
      profile: { discordUser: "forged-identity" },
      survey1: "answer",
      survey2: "answer",
    });

    expect(result.success).toBe(false);
    if (result.success) throw new Error("Expected strict input rejection.");
    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "unrecognized_keys",
          path: ["profile"],
        }),
      ]),
    );
  });

  it("TC-APP-009 derives age without storing it, including leap birthdays", () => {
    expect(calculateAgeOnDate("2008-02-29", "2026-02-28")).toBe(17);
    expect(calculateAgeOnDate("2008-02-29", "2026-03-01")).toBe(18);
    expect(calculateAgeOnDate("2000-08-06", "2026-08-06")).toBe(26);
  });

  it("TC-SDK-005 rejects participant DTO leakage", () => {
    const result = dashboardDtoSchema.safeParse({
      allowedActions: [],
      application: null,
      blacklistReason: "internal",
      profile: null,
      resume: null,
    });
    expect(result.success).toBe(false);
  });

  it("TC-PUB-004 requires the observed remote count when disabling", () => {
    expect(
      hackathonEventPublicationSetDesiredStateSchema.safeParse({
        desiredEnabled: false,
        expectedRevision: 2,
        hackathonId: "11111111-1111-4111-8111-111111111111",
        provider: "discord",
      }).success,
    ).toBe(false);
    expect(
      hackathonEventPublicationSetDesiredStateSchema.safeParse({
        desiredEnabled: false,
        expectedRemoteCount: 42,
        expectedRevision: 2,
        hackathonId: "11111111-1111-4111-8111-111111111111",
        provider: "discord",
      }).success,
    ).toBe(true);
  });

  it("invalid claim-page URLs return validation errors", () => {
    const settings = {
      hackathonId: "11111111-1111-4111-8111-111111111111",
      published: false,
      emergency: false,
    };
    for (const claimUrl of [
      "garbage",
      "javascript:alert(1)",
      "http://example.com",
      "https://example.com?claim=secret",
    ]) {
      expect(
        projectClaimSettingsSchema.safeParse({ ...settings, claimUrl }).success,
      ).toBe(false);
    }
    expect(
      projectClaimSettingsSchema.safeParse({
        ...settings,
        claimUrl: "https://2026.knighthacks.org/dashboard/judging",
      }).success,
    ).toBe(true);
    expect(
      projectClaimSettingsSchema.safeParse({
        ...settings,
        emergency: true,
        claimUrl: "https://2026.knighthacks.org/dashboard/judging",
      }).success,
    ).toBe(false);
  });

  it("TC-SDK-001 publishes schemas for every participant v1 procedure", () => {
    const keys = [
      "cancelPrintJob",
      "changeTeam",
      "claimProject",
      "confirmAttendance",
      "getApplicationContext",
      "getCheckInPass",
      "getDashboard",
      "getJudging",
      "getLeaderboard",
      "getMapConfiguration",
      "getMyAttendance",
      "getMyPoints",
      "getPointStore",
      "getProjectClaim",
      "getPublicHackathon",
      "getResume",
      "getSchedule",
      "getSession",
      "getTeams",
      "inviteProjectMember",
      "listPrintJobs",
      "removeResume",
      "removeStagedPrintFile",
      "reportIssue",
      "searchJudgingProjects",
      "submitApplication",
      "submitPrintJob",
      "updateApplication",
      "updateParticipant",
      "updatePrintJobCategory",
      "updateProfile",
      "withdrawApplication",
    ];
    expect(Object.keys(hackerPortalV1InputSchemas).sort()).toEqual(keys);
    expect(Object.keys(hackerPortalV1OutputSchemas).sort()).toEqual(keys);
  });

  it("TC-AUTH-002 distinguishes production origins from runtime localhost allowances", () => {
    expect(
      productionPortalOriginSchema.safeParse("https://khix.knighthacks.org")
        .success,
    ).toBe(true);
    expect(
      productionPortalOriginSchema.safeParse("https://knighthacks.org").success,
    ).toBe(false);
    expect(
      productionPortalOriginSchema.safeParse(
        "https://khix.knighthacks.org:3000",
      ).success,
    ).toBe(false);
    expect(
      productionPortalOriginSchema.safeParse("http://localhost:3000").success,
    ).toBe(false);
  });

  it("TC-AUTH-008 binds refresh and revoke payloads to a portal client", () => {
    expect(
      portalRefreshSchema.safeParse({ refreshToken: "x".repeat(32) }).success,
    ).toBe(false);
    expect(
      portalRefreshSchema.safeParse({
        clientId: "khix",
        refreshToken: "x".repeat(32),
      }).success,
    ).toBe(true);
  });

  it("binds front-channel logout to a client and absolute return URL", () => {
    expect(
      portalLogoutRequestSchema.safeParse({
        clientId: "khix",
        returnTo: "https://2026.knighthacks.org/",
      }).success,
    ).toBe(true);
    expect(
      portalLogoutRequestSchema.safeParse({
        clientId: "khix",
        returnTo: "/",
      }).success,
    ).toBe(false);
  });

  it("TC-APP-010 requires agreement content without prescribing its renderer", () => {
    const base = {
      active: true,
      hackathonId: "11111111-1111-4111-8111-111111111111",
      key: "kh_terms",
      required: true,
      stage: "application" as const,
      title: "Knight Hacks terms",
      version: "2026-01",
    };
    expect(
      hackathonAgreementDefinitionCreateSchema.safeParse(base).success,
    ).toBe(false);
    expect(
      hackathonAgreementDefinitionCreateSchema.safeParse({
        ...base,
        legalText: "Terms",
      }).success,
    ).toBe(true);
  });
});
