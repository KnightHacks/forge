import { PassThrough } from "node:stream";
import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "~/app/api/admin/hackathon-resume-bundle/route";

const HACKATHON_ID = "11111111-1111-4111-8111-111111111111";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  createHackathonResumeBundle: vi.fn(),
  getPermissions: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("@forge/api/resume-bundle.server", () => ({
  createHackathonResumeBundle: mocks.createHackathonResumeBundle,
}));
vi.mock("@forge/utils", () => ({
  logger: { error: mocks.loggerError },
}));
vi.mock("~/server/auth", () => ({ auth: mocks.auth }));
vi.mock("~/trpc/server", () => ({
  api: { roles: { getPermissions: mocks.getPermissions } },
}));

const session = { user: { id: "user-1", name: "Officer" } };
const base =
  `http://localhost/api/admin/hackathon-resume-bundle?hackathonId=${HACKATHON_ID}` +
  "&policyAcknowledged=true&policyVersion=resume-sensitive-index-v1" +
  "&partNumber=1&planFingerprint=plan-fingerprint-123";

describe("GET /api/admin/hackathon-resume-bundle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue(session);
    mocks.getPermissions.mockResolvedValue({ IS_OFFICER: true });
  });

  it("uses the shared pool/status rules", async () => {
    expect(
      (await GET(new Request(`${base}&pool=custom_current_statuses`))).status,
    ).toBe(400);
    expect(
      (
        await GET(
          new Request(
            `${base}&pool=custom_current_statuses&status=not-a-status`,
          ),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await GET(
          new Request(`${base}&pool=current_confirmed&status=confirmed`),
        )
      ).status,
    ).toBe(400);
    expect(mocks.createHackathonResumeBundle).not.toHaveBeenCalled();
  });

  it("deduplicates valid custom statuses before preparing the staged part", async () => {
    const stream = new PassThrough();
    stream.end(Buffer.from("zip-content"));
    mocks.createHackathonResumeBundle.mockResolvedValue({
      fileName: "hackathon-resume-bundle.zip",
      stream,
    });

    const response = await GET(
      new Request(
        `${base}&pool=custom_current_statuses&status=confirmed&status=confirmed&status=checkedin`,
      ),
    );

    expect(response.status).toBe(200);
    expect(mocks.createHackathonResumeBundle).toHaveBeenCalledWith({
      actor: session.user,
      currentStatuses: ["confirmed", "checkedin"],
      hackathonId: HACKATHON_ID,
      partNumber: 1,
      planFingerprint: "plan-fingerprint-123",
      policyAcknowledged: true,
      policyVersion: "resume-sensitive-index-v1",
      pool: "custom_current_statuses",
    });
  });

  it("returns not found when the explicitly selected hackathon is absent", async () => {
    mocks.createHackathonResumeBundle.mockRejectedValue(
      new TRPCError({ code: "NOT_FOUND", message: "Hackathon not found." }),
    );

    const response = await GET(new Request(`${base}&pool=current_confirmed`));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Hackathon not found.",
    });
  });
});
