import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as HackerPortal from "@forge/api/hacker-portal";

import { POST as printingUpload } from "~/app/api/hacker/v1/printing/[operation]/route";
import { POST as resumeUpload } from "~/app/api/hacker/v1/resume/[operation]/route";

const mocks = vi.hoisted(() => ({
  findClient: vi.fn(),
  authenticate: vi.fn(),
  upload: vi.fn(),
}));
vi.mock("@forge/auth/server", () => ({
  databasePortalSessionStore: { findClient: mocks.findClient },
  createPortalSessionService: () => ({ authenticate: mocks.authenticate }),
  PortalAuthError: class extends Error {},
}));
vi.mock("@forge/api/hacker-portal", async (importOriginal) => {
  const actual = await importOriginal<typeof HackerPortal>();
  return {
    ...actual,
    uploadResume: mocks.upload,
    openResumeDownload: mocks.upload,
    requirePrintUploadAccess: mocks.upload,
    uploadPrintFile: mocks.upload,
  };
});

describe("Projects credentials at participant uploads", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.findClient.mockResolvedValue({
      clientKind: "projects",
      hackathonId: null,
      id: "projects-record",
      clientId: "projects",
      enabled: true,
      origin: "https://projects.knighthacks.org",
    });
  });
  it.each([resumeUpload, printingUpload])(
    "rejects before reading the upload body",
    async (upload) => {
      const request = new Request(
        "https://blade.knighthacks.org/api/hacker/v1/upload",
        {
          method: "POST",
          headers: {
            "x-forge-portal-client": "projects",
            authorization: "Bearer projects-token",
          },
        },
      );
      const body = vi.spyOn(request, "body", "get");
      const response = await upload(request, {
        params: Promise.resolve({ operation: "upload" }),
      });
      expect(response.status).toBe(401);
      expect(body).not.toHaveBeenCalled();
      expect(mocks.authenticate).not.toHaveBeenCalled();
      expect(mocks.upload).not.toHaveBeenCalled();
    },
  );
});
