import { PassThrough } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "~/app/api/admin/resume-bundle/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  createMemberResumeBundle: vi.fn(),
  getPermissions: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("@forge/api/resume-bundle.server", () => ({
  createMemberResumeBundle: mocks.createMemberResumeBundle,
}));

vi.mock("@forge/utils", () => ({
  logger: { error: mocks.loggerError },
}));

vi.mock("~/server/auth", () => ({ auth: mocks.auth }));

vi.mock("~/trpc/server", () => ({
  api: { roles: { getPermissions: mocks.getPermissions } },
}));

const session = {
  user: { id: "user-1", name: "Officer" },
};

describe("GET /api/admin/resume-bundle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires a signed-in analytics reader", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);

    mocks.auth.mockResolvedValue(session);
    mocks.getPermissions.mockResolvedValue({
      IS_OFFICER: false,
      READ_CLUB_DATA: false,
    });
    expect((await GET()).status).toBe(403);
    expect(mocks.createMemberResumeBundle).not.toHaveBeenCalled();
  });

  it("streams a private ZIP for an authorized reader", async () => {
    const stream = new PassThrough();
    stream.end(Buffer.from("zip-content"));
    mocks.auth.mockResolvedValue(session);
    mocks.getPermissions.mockResolvedValue({
      IS_OFFICER: true,
      READ_CLUB_DATA: true,
    });
    mocks.createMemberResumeBundle.mockResolvedValue({
      fileName: "member-resume-bundle-2026-07-26.zip",
      resumeCount: 2,
      stream,
    });

    const response = await GET(
      new Request(
        "http://localhost/api/admin/resume-bundle?downloadToken=resume-download-token-123&policyAcknowledged=true&policyVersion=resume-sensitive-index-v1&partNumber=1&planFingerprint=plan-fingerprint-123",
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/zip");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("content-disposition")).toContain(
      "member-resume-bundle-2026-07-26.zip",
    );
    expect(response.headers.get("set-cookie")).toContain(
      "resume-bundle-download=resume-download-token-123.ready",
    );
    expect(Buffer.from(await response.arrayBuffer()).toString()).toBe(
      "zip-content",
    );
    expect(mocks.createMemberResumeBundle).toHaveBeenCalledWith({
      actor: session.user,
      partNumber: 1,
      planFingerprint: "plan-fingerprint-123",
      policyAcknowledged: true,
      policyVersion: "resume-sensitive-index-v1",
    });
  });

  it("does not expose storage errors", async () => {
    mocks.auth.mockResolvedValue(session);
    mocks.getPermissions.mockResolvedValue({
      IS_OFFICER: true,
      READ_CLUB_DATA: false,
    });
    mocks.createMemberResumeBundle.mockRejectedValue(
      new Error("private object reference"),
    );

    const response = await GET(
      new Request(
        "https://reforge.example/api/admin/resume-bundle?downloadToken=resume-download-token-456&policyAcknowledged=true&policyVersion=resume-sensitive-index-v1&partNumber=1&planFingerprint=plan-fingerprint-123",
      ),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "The member resume bundle could not be prepared.",
    });
    expect(response.headers.get("set-cookie")).toContain(
      "resume-bundle-download=resume-download-token-456.error",
    );
    expect(response.headers.get("set-cookie")).toContain("Secure");
    expect(mocks.loggerError).toHaveBeenCalledOnce();
  });

  it("does not reflect invalid download tokens into cookies", async () => {
    const stream = new PassThrough();
    stream.end(Buffer.from("zip-content"));
    mocks.auth.mockResolvedValue(session);
    mocks.getPermissions.mockResolvedValue({
      IS_OFFICER: true,
      READ_CLUB_DATA: false,
    });
    mocks.createMemberResumeBundle.mockResolvedValue({
      fileName: "member-resume-bundle-2026-07-26.zip",
      resumeCount: 1,
      stream,
    });

    const response = await GET(
      new Request(
        "http://localhost/api/admin/resume-bundle?downloadToken=bad%0Atoken&policyAcknowledged=true&policyVersion=resume-sensitive-index-v1&partNumber=1&planFingerprint=plan-fingerprint-123",
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
