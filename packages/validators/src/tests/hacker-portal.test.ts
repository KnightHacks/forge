import { describe, expect, it } from "vitest";

import {
  hackathonAgreementDefinitionCreateSchema,
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

describe("Hacker Portal validators", () => {
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

  it("TC-SDK-001 publishes schemas for every participant v1 procedure", () => {
    const keys = [
      "confirmAttendance",
      "getApplicationContext",
      "getCheckInPass",
      "getDashboard",
      "getLeaderboard",
      "getMyAttendance",
      "getMyPoints",
      "getPublicHackathon",
      "getResume",
      "getSchedule",
      "getSession",
      "removeResume",
      "submitApplication",
      "updateApplication",
      "updateParticipant",
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
