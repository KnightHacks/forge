import { describe, expect, it } from "vitest";

import { createHackerParticipantClient } from "../client";
import {
  HACKER_PARTICIPANT_V1_PROCEDURES,
  HACKER_PARTICIPANT_V1_SCHEMAS,
} from "../contracts";
import { WITHDRAWAL_ACKNOWLEDGEMENT } from "../lifecycle";

describe("Hacker participant v1 contract", () => {
  it("accepts catalog and user-entered schools through the shared profile contract", () => {
    const schoolSchema =
      HACKER_PARTICIPANT_V1_SCHEMAS.input.submitApplication.shape.profile.shape
        .school;

    expect(schoolSchema.parse("University of Central Florida")).toBe(
      "University of Central Florida",
    );
    expect(schoolSchema.parse("  North Lake Technical Academy  ")).toBe(
      "North Lake Technical Academy",
    );
  });

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

  it("returns the validated front-channel destination when signing out", async () => {
    const requestFetch = (input: RequestInfo | URL, init?: RequestInit) => {
      expect(input).toBe("/api/kh/sign-out");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe(JSON.stringify({ returnTo: "/apply" }));
      return Promise.resolve(
        Response.json({
          redirectTo:
            "https://blade.knighthacks.org/api/hacker/v1/auth/logout?client_id=khix",
        }),
      );
    };
    const client = createHackerParticipantClient({
      adapterBasePath: "/api/kh",
      fetch: requestFetch,
      portalKey: "kh-x",
    });

    await expect(client.signOut("/apply")).resolves.toEqual({
      redirectTo:
        "https://blade.knighthacks.org/api/hacker/v1/auth/logout?client_id=khix",
    });
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
