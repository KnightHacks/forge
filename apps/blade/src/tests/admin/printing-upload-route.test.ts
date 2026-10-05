import { beforeEach, describe, expect, it, vi } from "vitest";

import { HEAD, POST } from "../../app/api/hacker/v1/printing/[operation]/route";

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  authorize: vi.fn(),
  parse: vi.fn(),
  upload: vi.fn(),
}));
vi.mock("@forge/api/hacker-portal", () => ({
  requirePrintUploadAccess: mocks.authorize,
  uploadPrintFile: mocks.upload,
}));
vi.mock("../../app/api/hacker/v1/participant-upload", () => ({
  authenticatedContext: mocks.authenticate,
  readBoundedFormData: mocks.parse,
  participantDomainError: () => null,
  errorResponse: (_code: string, _message: string, status: number) =>
    new Response(null, { status }),
}));

const context = { params: Promise.resolve({ operation: "upload" }) };
const request = () =>
  new Request("https://blade.test/api/hacker/v1/printing/upload", {
    method: "POST",
    body: "untrusted",
  });

describe("printing upload authorization", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.authenticate.mockResolvedValue({ requestId: "request" });
    mocks.authorize.mockResolvedValue({ attendeeId: "attendee" });
  });

  it("rejects anonymous HEAD and POST without reading bytes", async () => {
    mocks.authenticate.mockResolvedValue(null);
    expect((await HEAD(request(), context)).status).toBe(401);
    expect((await POST(request(), context)).status).toBe(401);
    expect(mocks.parse).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("requires check-in before parsing a POST body", async () => {
    mocks.authorize.mockRejectedValue(new Error("Not checked in"));
    expect((await HEAD(request(), context)).status).toBe(403);
    expect((await POST(request(), context)).ok).toBe(false);
    expect(mocks.parse).not.toHaveBeenCalled();
  });

  it("authorizes HEAD without a body and accepts a valid checked-in POST", async () => {
    expect((await HEAD(request(), context)).status).toBe(204);
    expect(mocks.parse).not.toHaveBeenCalled();
    const form = new FormData();
    form.set("file", new File(["valid fixture"], "part.stl"));
    mocks.parse.mockResolvedValue(form);
    mocks.upload.mockResolvedValue({ fileId: "file" });
    expect((await POST(request(), context)).status).toBe(200);
    expect(mocks.upload).toHaveBeenCalledOnce();
  });
});
