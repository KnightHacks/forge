import { describe, expect, it } from "vitest";

import { createHackerParticipantClient } from "../client";
import {
  HACKER_PARTICIPANT_V1_PROCEDURES,
  HACKER_PARTICIPANT_V1_SCHEMAS,
} from "../contracts";
import { WITHDRAWAL_ACKNOWLEDGEMENT } from "../lifecycle";

describe("Hacker participant v1 contract", () => {
  it("exposes only the narrow participant procedure manifest", () => {
    expect(HACKER_PARTICIPANT_V1_PROCEDURES).toEqual({
      confirmAttendance: "mutation",
      getApplicationContext: "query",
      getCheckInPass: "mutation",
      getDashboard: "query",
      getLeaderboard: "query",
      getMyAttendance: "query",
      getMyPoints: "query",
      getPublicHackathon: "query",
      getResume: "query",
      getSchedule: "query",
      getSession: "query",
      removeResume: "mutation",
      submitApplication: "mutation",
      updateApplication: "mutation",
      updateParticipant: "mutation",
      updateProfile: "mutation",
      withdrawApplication: "mutation",
    });
  });

  it("TC-SDK-005 rejects internal fields at the DTO boundary", () => {
    expect(() =>
      HACKER_PARTICIPANT_V1_SCHEMAS.output.getDashboard.parse({
        allowedActions: [],
        application: null,
        blacklistReason: "internal",
        mailHealth: "failed",
        operatorId: "private",
        profile: null,
        providerId: "private",
        resume: null,
        storageObjectName: "private",
        isMinorAtHackStart: null,
      }),
    ).toThrow();
  });

  it("TC-SDK-006 rejects withdrawal without the exported acknowledgement", () => {
    expect(() =>
      HACKER_PARTICIPANT_V1_SCHEMAS.input.withdrawApplication.parse({
        acknowledgement: "yes",
        idempotencyKey: "withdraw-1",
      }),
    ).toThrow();
    expect(
      HACKER_PARTICIPANT_V1_SCHEMAS.input.withdrawApplication.parse({
        acknowledgement: WITHDRAWAL_ACKNOWLEDGEMENT,
        idempotencyKey: "withdraw-1",
      }),
    ).toMatchObject({ acknowledgement: WITHDRAWAL_ACKNOWLEDGEMENT });
  });

  it("keeps resume downloads on the portal's authenticated adapter", () => {
    const client = createHackerParticipantClient({
      adapterBasePath: "/api/kh",
      portalKey: "kh-x",
    });

    expect(client.resumeDownloadPath).toBe("/api/kh/resume/download");
  });

  it("requires a stable idempotency key when issuing a check-in pass", () => {
    expect(() =>
      HACKER_PARTICIPANT_V1_SCHEMAS.input.getCheckInPass.parse(undefined),
    ).toThrow();
    expect(
      HACKER_PARTICIPANT_V1_SCHEMAS.input.getCheckInPass.parse({
        idempotencyKey: "issue-pass-1",
      }),
    ).toEqual({ idempotencyKey: "issue-pass-1" });
  });
});
