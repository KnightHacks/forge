import { beforeEach, describe, expect, it, vi } from "vitest";

import { guildRouter } from "../../routers/guild";
import { createCallerFactory, createTRPCRouter } from "../../trpc";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  presignedGetObject: vi.fn(),
}));

vi.mock("@forge/db/client", () => ({
  db: {
    query: {
      Member: {
        findFirst: mocks.findFirst,
      },
    },
  },
}));

vi.mock("../../utils/profile-picture/storage", () => ({
  profilePictureStorageClient: {
    presignedUrl: vi.fn(),
  },
}));

vi.mock("../../utils/resume/storage", () => ({
  resumeStorageClient: {
    presignedGetObject: mocks.presignedGetObject,
  },
}));

const memberId = "00000000-0000-4000-8000-000000000123";
const userId = "00000000-0000-4000-8000-000000000001";
const callerFactory = createCallerFactory(
  createTRPCRouter({
    guild: guildRouter,
  }),
);

function createCaller() {
  return callerFactory({
    headers: new Headers(),
    session: null,
    source: "guild-resume-test",
  });
}

describe("Guild public resume access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findFirst.mockResolvedValue({
      firstName: "Lenny",
      lastName: "Dragonson",
      resumeUrl: `${userId}/resume.pdf`,
      userId,
    });
    mocks.presignedGetObject.mockResolvedValue(
      "https://storage.example.test/signed-resume",
    );
  });

  it.each([
    ["inline", 'inline; filename="Lenny-Dragonson-resume.pdf"'],
    ["attachment", 'attachment; filename="Lenny-Dragonson-resume.pdf"'],
  ] as const)("signs a ten-minute %s URL", async (disposition, header) => {
    await expect(
      createCaller().guild.getResumeUrl({ disposition, memberId }),
    ).resolves.toEqual({
      url: "https://storage.example.test/signed-resume",
    });

    expect(mocks.presignedGetObject).toHaveBeenCalledWith(
      "member-resumes",
      `${userId}/resume.pdf`,
      10 * 60,
      {
        "response-content-disposition": header,
        "response-content-type": "application/pdf",
      },
    );
  });

  it("fails hidden, opted-out, missing, and nonexistent rows closed", async () => {
    mocks.findFirst.mockResolvedValue(null);

    await expect(
      createCaller().guild.getResumeUrl({
        disposition: "inline",
        memberId,
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Guild profile or resume not found.",
    });
    expect(mocks.presignedGetObject).not.toHaveBeenCalled();
  });

  it("does not sign a resume owned by another user", async () => {
    mocks.findFirst.mockResolvedValue({
      firstName: "Lenny",
      lastName: "Dragonson",
      resumeUrl: "00000000-0000-4000-8000-000000000002/private-resume.pdf",
      userId,
    });

    await expect(
      createCaller().guild.getResumeUrl({
        disposition: "inline",
        memberId,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.presignedGetObject).not.toHaveBeenCalled();
  });

  it("returns a safe error when storage signing fails", async () => {
    mocks.presignedGetObject.mockRejectedValue(new Error("secret object path"));

    await expect(
      createCaller().guild.getResumeUrl({
        disposition: "inline",
        memberId,
      }),
    ).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not generate resume URL.",
    });
  });
});
