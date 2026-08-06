import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  Event,
  EventPublicationWork,
  Hackathon,
  HackathonAgreementDefinition,
  HackathonEventPublication,
  HackathonEventReminderDelivery,
  HackathonPortalAuthorizationCode,
  HackathonPortalClient,
  HackathonPortalSession,
  HackathonPortalSessionCredential,
  HackerAgreementAcceptance,
  HackerAttendee,
  HackerCheckInPass,
  HackerParticipantCommand,
  HackerProfile,
  HackerProfileRevision,
} from "../schemas/knight-hacks";

describe("Hacker SDK additive storage", () => {
  it("TC-APP-001 and TC-APP-005 store one canonical profile and immutable revisions", () => {
    expect(Object.keys(getTableColumns(HackerProfile))).toEqual(
      expect.arrayContaining([
        "dob",
        "gradDate",
        "resumeUrl",
        "revision",
        "userId",
      ]),
    );
    expect(Object.keys(getTableColumns(HackerProfileRevision))).toEqual(
      expect.arrayContaining([
        "createdAt",
        "legacyHackerId",
        "profileId",
        "revision",
      ]),
    );
    expect(Object.keys(getTableColumns(HackerAttendee))).toEqual(
      expect.arrayContaining([
        "profileId",
        "profileRevisionId",
        "survey1",
        "survey2",
      ]),
    );
  });

  it("TC-APP-003 and TC-APP-010 retain idempotency and agreement evidence", () => {
    expect(Object.keys(getTableColumns(HackerParticipantCommand))).toEqual(
      expect.arrayContaining([
        "hackathonId",
        "idempotencyKey",
        "operation",
        "payloadHash",
        "result",
        "state",
        "userId",
      ]),
    );
    expect(Object.keys(getTableColumns(HackathonAgreementDefinition))).toEqual(
      expect.arrayContaining([
        "active",
        "hackathonId",
        "key",
        "required",
        "stage",
        "version",
      ]),
    );
    expect(Object.keys(getTableColumns(HackerAgreementAcceptance))).toEqual(
      expect.arrayContaining([
        "accepted",
        "agreementDefinitionId",
        "attendeeId",
        "provenance",
        "recordedAt",
      ]),
    );
  });

  it("TC-AUTH-001 and TC-QR-001 store only hashes for portal credentials and passes", () => {
    expect(Object.keys(getTableColumns(HackathonPortalClient))).toEqual(
      expect.arrayContaining([
        "clientId",
        "enabled",
        "hackathonId",
        "productionOrigin",
      ]),
    );
    expect(
      Object.keys(getTableColumns(HackathonPortalAuthorizationCode)),
    ).toEqual(
      expect.arrayContaining([
        "betterAuthSessionId",
        "codeChallenge",
        "codeHash",
        "consumedAt",
        "expiresAt",
        "redirectUri",
      ]),
    );
    expect(Object.keys(getTableColumns(HackathonPortalSession))).toEqual(
      expect.arrayContaining([
        "accessTokenHash",
        "refreshTokenHash",
        "revokedAt",
        "betterAuthSessionId",
      ]),
    );
    expect(
      Object.keys(getTableColumns(HackathonPortalSessionCredential)),
    ).toEqual(
      expect.arrayContaining([
        "expiresAt",
        "portalSessionId",
        "rotatedAt",
        "tokenHash",
        "tokenKind",
      ]),
    );
    expect(Object.keys(getTableColumns(HackerCheckInPass))).toEqual(
      expect.arrayContaining([
        "attendeeId",
        "hackathonId",
        "revokedAt",
        "tokenHash",
        "version",
      ]),
    );
    expect(Object.keys(getTableColumns(HackerCheckInPass))).not.toContain(
      "token",
    );
  });

  it("TC-PUB-001 and TC-PUB-006 persist desired state and durable work", () => {
    expect(Object.keys(getTableColumns(HackathonEventPublication))).toEqual(
      expect.arrayContaining([
        "desiredEnabled",
        "hackathonId",
        "provider",
        "revision",
        "requestedAt",
      ]),
    );
    expect(Object.keys(getTableColumns(EventPublicationWork))).toEqual(
      expect.arrayContaining([
        "attemptCount",
        "eventRevision",
        "lastError",
        "leaseExpiresAt",
        "leaseToken",
        "nextAttemptAt",
        "provider",
        "publicationRevision",
        "state",
        "targetEnabled",
      ]),
    );
    expect(Object.keys(getTableColumns(Event))).toContain("discordSyncState");
    expect(
      Object.keys(getTableColumns(HackathonEventReminderDelivery)),
    ).toContain("discordEventIdSnapshot");
  });

  it("TC-LIFE-003 stores configurable confirmation capacity", () => {
    expect(Object.keys(getTableColumns(Hackathon))).toEqual(
      expect.arrayContaining(["confirmationCapacity", "timezone"]),
    );
  });
});
