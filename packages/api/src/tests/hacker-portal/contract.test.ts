import { describe, expect, it, vi } from "vitest";

import { HACKER_PARTICIPANT_V1_PROCEDURES } from "@forge/hacker-sdk/contracts";

import { participantPayloadHash } from "../../hacker-portal/commands";

vi.mock("../../utils/resume/storage", () => ({
  ensureResumeBucketExists: vi.fn(),
  resumeStorageClient: {
    getObject: vi.fn(),
    putObject: vi.fn(),
    removeObject: vi.fn(),
    statObject: vi.fn(),
  },
}));

describe("hacker participant v1 API contract", () => {
  it("implements every SDK contract procedure and no extra participant surface", async () => {
    const { hackerParticipantV1Router } =
      await import("../../hacker-portal/router");
    expect(
      Object.keys(hackerParticipantV1Router._def.procedures).sort(),
    ).toEqual(Object.keys(HACKER_PARTICIPANT_V1_PROCEDURES).sort());
    expect(HACKER_PARTICIPANT_V1_PROCEDURES.getCheckInPass).toBe("mutation");
    expect(
      (
        hackerParticipantV1Router._def.procedures.getCheckInPass as unknown as {
          _def: { type: string };
        }
      )._def.type,
    ).toBe("mutation");
  });

  it("hashes semantically identical command objects the same way", () => {
    expect(participantPayloadHash({ a: 1, nested: { b: true, c: null } })).toBe(
      participantPayloadHash({ nested: { c: null, b: true }, a: 1 }),
    );
    expect(participantPayloadHash({ a: 1 })).not.toBe(
      participantPayloadHash({ a: 2 }),
    );
  });

  it("returns a signed-out session DTO without requiring participant auth", async () => {
    const { getPortalSession } = await import("../../hacker-portal/reads");
    await expect(
      getPortalSession({
        client: null,
        headers: new Headers(),
        requestId: "request-1",
        session: null,
      }),
    ).resolves.toEqual({
      authenticated: false,
      displayName: null,
      expiresAt: null,
    });
  });

  it("preserves explicit agreement refusals when replenishing a form", async () => {
    const { agreementAcceptanceDto } = await import("../../hacker-portal/data");
    expect(
      agreementAcceptanceDto({
        accepted: false,
        acceptedAt: null,
        definitionId: "00000000-0000-4000-8000-000000000001",
      }),
    ).toEqual({
      accepted: false,
      acceptedAt: null,
      definitionId: "00000000-0000-4000-8000-000000000001",
    });
  });
});
