import { describe, expect, it, vi } from "vitest";

import type { SelectHackerProfile } from "@forge/db/schemas/knight-hacks";
import { HACKER_PARTICIPANT_V1_PROCEDURES } from "@forge/hacker-sdk/contracts";
import { hackerProfileDtoSchema } from "@forge/validators";

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
  const profile = {
    country: "United States of America",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    discordUser: "participant",
    dob: "2005-02-14",
    email: "participant@example.test",
    firstName: "Portal",
    foodAllergies: null,
    gender: "Prefer not to answer",
    githubProfileUrl: "https://github.com/knighthacks",
    gradDate: "2028-05-01",
    id: "00000000-0000-4000-8000-000000000001",
    lastName: "Participant",
    levelOfStudy: "Undergraduate University (3+ year)",
    linkedinProfileUrl: "https://www.linkedin.com/in/knighthacks",
    major: "Computer Science",
    phoneNumber: "4075550100",
    raceOrEthnicity: "Prefer not to answer",
    resumeUrl: null,
    revision: 1,
    school: "University of Central Florida",
    shirtSize: "M",
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    userId: "00000000-0000-4000-8000-000000000002",
    websiteUrl: "https://knighthacks.org",
  } satisfies SelectHackerProfile;

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

  it("omits malformed optional legacy profile links from portal responses", async () => {
    const { profileDto } = await import("../../hacker-portal/data");
    const dto = profileDto({
      ...profile,
      githubProfileUrl: "not a valid GitHub profile",
      linkedinProfileUrl: "https://example.com/not-linkedin",
      websiteUrl: "not a URL",
    });

    expect(dto).toMatchObject({
      githubProfileUrl: null,
      linkedinProfileUrl: null,
      websiteUrl: null,
    });
    expect(hackerProfileDtoSchema.safeParse(dto).success).toBe(true);
  });

  it("preserves valid optional profile links in portal responses", async () => {
    const { profileDto } = await import("../../hacker-portal/data");

    expect(profileDto(profile)).toMatchObject({
      githubProfileUrl: "https://github.com/knighthacks",
      linkedinProfileUrl: "https://www.linkedin.com/in/knighthacks",
      websiteUrl: "https://knighthacks.org",
    });
  });
});
