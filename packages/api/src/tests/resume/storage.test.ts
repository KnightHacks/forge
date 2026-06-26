import { beforeEach, describe, expect, it, vi } from "vitest";

import { getResumeDownloadUrlForSession } from "../../utils/resume/storage";

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
  presignedGetObject: vi.fn(),
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
      listObjects: vi.fn(),
      makeBucket: vi.fn(),
      presignedGetObject: mocks.presignedGetObject,
      putObject: vi.fn(),
      removeObject: vi.fn(),
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
    mocks.presignedGetObject.mockResolvedValue("https://signed.example.test");
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
});
