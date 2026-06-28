import { Readable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getMemberResumeDownloadUrlForUser,
  getResumeDownloadUrlForSession,
  removeUnreferencedResumeObjectsForUser,
} from "../../utils/resume/storage";

const mocks = vi.hoisted(() => ({
  db: {
    query: {
      Hacker: {
        findFirst: vi.fn(),
      },
      Member: {
        findFirst: vi.fn(),
      },
    },
    select: vi.fn(),
  },
  listObjects: vi.fn(),
  presignedGetObject: vi.fn(),
  removeObject: vi.fn(),
}));

vi.mock("@forge/db/client", () => ({
  db: mocks.db,
}));

vi.mock("../../env", () => ({
  env: {
    MINIO_ACCESS_KEY: "access-key",
    MINIO_ENDPOINT: "minio.example.test",
    MINIO_SECRET_KEY: "secret-key",
  },
}));

vi.mock("minio", () => ({
  Client: vi.fn(function MockMinioClient() {
    return {
      bucketExists: vi.fn(),
      listObjects: mocks.listObjects,
      makeBucket: vi.fn(),
      presignedGetObject: mocks.presignedGetObject,
      putObject: vi.fn(),
      removeObject: mocks.removeObject,
    };
  }),
}));

const userId = "00000000-0000-4000-8000-000000000001";
const session = {
  user: {
    id: userId,
  },
} as Parameters<typeof getResumeDownloadUrlForSession>[0];

describe("resume storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db.query.Hacker.findFirst.mockResolvedValue(null);
    mocks.db.query.Member.findFirst.mockResolvedValue(null);
    mocks.db.select.mockReset();
    mocks.listObjects.mockReset();
    mocks.presignedGetObject.mockResolvedValue("https://signed.example.test");
    mocks.removeObject.mockReset();
  });

  it("generates inline PDF preview URLs for saved resumes", async () => {
    const resumeUrl = `${userId}/Resume.pdf`;
    mocks.db.query.Member.findFirst.mockResolvedValue({ resumeUrl });

    const result = await getResumeDownloadUrlForSession(session);

    expect(result).toEqual({ url: "https://signed.example.test" });
    expect(mocks.presignedGetObject).toHaveBeenCalledWith(
      "member-resumes",
      resumeUrl,
      60 * 60,
      {
        "response-content-disposition": 'inline; filename="Resume.pdf"',
        "response-content-type": "application/pdf",
      },
    );
  });

  it("rejects saved resume object names outside the current user's prefix", async () => {
    mocks.db.query.Member.findFirst.mockResolvedValue({
      resumeUrl: "00000000-0000-4000-8000-000000000002/Resume.pdf",
    });

    await expect(getResumeDownloadUrlForSession(session)).rejects.toMatchObject(
      {
        code: "FORBIDDEN",
      },
    );
    expect(mocks.presignedGetObject).not.toHaveBeenCalled();
  });

  it("does not expose a Hacker-only resume through the Member preview helper", async () => {
    mocks.db.query.Hacker.findFirst.mockResolvedValue({
      resumeUrl: `${userId}/hacker-resume.pdf`,
    });

    await expect(getMemberResumeDownloadUrlForUser(userId)).resolves.toEqual({
      url: null,
    });
    expect(mocks.db.query.Hacker.findFirst).not.toHaveBeenCalled();
    expect(mocks.presignedGetObject).not.toHaveBeenCalled();
  });

  it("preserves a resume still referenced by Hacker while removing orphans", async () => {
    const sharedResume = `${userId}/resume-00000000-0000-4000-8000-000000000001.pdf`;
    const orphanedResume = `${userId}/resume-00000000-0000-4000-8000-000000000002.pdf`;
    const where = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ resumeUrl: sharedResume }]);
    mocks.db.select.mockImplementation(() => ({
      from: vi.fn(() => ({ where })),
    }));
    mocks.listObjects.mockReturnValue(
      Readable.from([{ name: sharedResume }, { name: orphanedResume }]),
    );

    await removeUnreferencedResumeObjectsForUser(userId);

    expect(mocks.removeObject).toHaveBeenCalledTimes(1);
    expect(mocks.removeObject).toHaveBeenCalledWith(
      "member-resumes",
      orphanedResume,
    );
  });
});
