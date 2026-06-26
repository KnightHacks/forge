import { beforeEach, describe, expect, it, vi } from "vitest";

import { memberSchema } from "@forge/validators";

import { createMemberProfile } from "../../utils/member/profile";

const mocks = vi.hoisted(() => ({
  normalizeProfilePictureObjectNameForPersistence: vi.fn(),
  normalizeResumeObjectNameForPersistence: vi.fn(),
}));

vi.mock("../../utils/profile-picture/storage", () => ({
  normalizeProfilePictureObjectNameForPersistence:
    mocks.normalizeProfilePictureObjectNameForPersistence,
}));

vi.mock("../../utils/resume/storage", () => ({
  normalizeResumeObjectNameForPersistence:
    mocks.normalizeResumeObjectNameForPersistence,
}));

const userId = "00000000-0000-4000-8000-000000000001";
const session = {
  user: {
    id: userId,
    name: "discord-user",
  },
} as Parameters<typeof createMemberProfile>[0]["session"];

const validInput = memberSchema.parse({
  about: "I like building things.",
  codeOfConductAccepted: true,
  company: "Knight Hacks",
  dob: "2000-02-03",
  email: "lenny@knighthacks.org",
  firstName: "Lenny",
  gender: "Prefer not to answer",
  githubProfileUrl: "https://github.com/knighthacks",
  gradTerm: "Spring",
  gradYear: 2027,
  guildProfileVisible: true,
  lastName: "Dragonson",
  levelOfStudy: "Undergraduate University (3+ year)",
  linkedinProfileUrl: "",
  major: "Computer Science",
  phoneNumber: "123-456-7890",
  profilePictureUrl:
    "00000000-0000-4000-8000-000000000001/profile-picture-00000000-0000-4000-8000-000000000000.png",
  raceOrEthnicity: "Prefer not to answer",
  resumeUrl: "00000000-0000-4000-8000-000000000001/Resume.pdf",
  school: "University of Central Florida",
  shirtSize: "M",
  tagline: "Builder",
  websiteUrl: "https://knighthacks.org",
});

interface MockDatabaseOptions {
  existingMember?: { id: string } | null;
  insertError?: Error;
  insertResult?: unknown[];
}

function createMockDatabase({
  existingMember = null,
  insertError,
  insertResult = [{ id: "member-id" }],
}: MockDatabaseOptions = {}) {
  const findFirst = vi.fn().mockResolvedValue(existingMember);
  const returning = vi.fn(() => {
    if (insertError) throw insertError;
    return Promise.resolve(insertResult);
  });
  const values = vi.fn(() => ({ returning }));
  const insert = vi.fn(() => ({ values }));
  const database = {
    insert,
    query: {
      Member: {
        findFirst,
      },
    },
  } as unknown as Parameters<typeof createMemberProfile>[0]["database"];

  return {
    database,
    findFirst,
    insert,
    returning,
    values,
  };
}

describe("createMemberProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.normalizeProfilePictureObjectNameForPersistence.mockReturnValue(
      validInput.profilePictureUrl,
    );
    mocks.normalizeResumeObjectNameForPersistence.mockResolvedValue(
      validInput.resumeUrl,
    );
  });

  it("derives auth-owned member fields from the session", async () => {
    const database = createMockDatabase();

    await createMemberProfile({
      database: database.database,
      input: validInput,
      session,
    });

    const valuesMock = database.values as unknown as {
      mock: { calls: [Record<string, unknown>][] };
    };
    const memberValues = valuesMock.mock.calls[0]?.[0];

    expect(typeof memberValues?.age).toBe("number");
    expect(database.values).toHaveBeenCalledWith(
      expect.objectContaining({
        discordUser: "discord-user",
        email: "lenny@knighthacks.org",
        userId,
      }),
    );
    expect(mocks.normalizeResumeObjectNameForPersistence).toHaveBeenCalledWith(
      validInput.resumeUrl,
      userId,
    );
    expect(
      mocks.normalizeProfilePictureObjectNameForPersistence,
    ).toHaveBeenCalledWith(validInput.profilePictureUrl, userId);
  });

  it("rejects duplicate member profiles for the same user", async () => {
    const database = createMockDatabase({
      existingMember: { id: "existing-member-id" },
    });

    await expect(
      createMemberProfile({
        database: database.database,
        input: validInput,
        session,
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: "You already have a Knight Hacks member profile.",
    });
    expect(database.insert).not.toHaveBeenCalled();
  });

  it("translates unique member field violations into safe errors", async () => {
    const database = createMockDatabase({
      insertError: Object.assign(new Error("duplicate key"), {
        code: "23505",
      }),
    });

    await expect(
      createMemberProfile({
        database: database.database,
        input: validInput,
        session,
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message:
        "A member profile with that email or phone number already exists.",
    });
  });

  it("translates wrapped database unique violations into safe errors", async () => {
    const database = createMockDatabase({
      insertError: Object.assign(new Error("failed query"), {
        cause: Object.assign(new Error("duplicate key"), {
          code: "23505",
        }),
      }),
    });

    await expect(
      createMemberProfile({
        database: database.database,
        input: validInput,
        session,
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message:
        "A member profile with that email or phone number already exists.",
    });
  });
});
