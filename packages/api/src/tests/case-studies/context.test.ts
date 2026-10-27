import { beforeEach, describe, expect, it, vi } from "vitest";

import { createProjectsContext } from "../../case-studies/trpc";

const mocks = vi.hoisted(() => ({ authenticate: vi.fn() }));
vi.mock("@forge/auth/server", () => ({
  createPortalSessionService: () => ({ authenticate: mocks.authenticate }),
  databasePortalSessionStore: {},
  PortalAuthError: class PortalAuthError extends Error {},
}));

const headers = (
  authorization: string | null,
  clientId = "projects-client",
) => {
  const result = new Headers({ "x-forge-portal-client": clientId });
  if (authorization) result.set("authorization", authorization);
  return result;
};

describe("Projects delegated principal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not authenticate missing or malformed bearer credentials", async () => {
    expect(
      (await createProjectsContext({ headers: headers(null) })).userId,
    ).toBeNull();
    expect(
      (await createProjectsContext({ headers: headers("Basic abc") })).userId,
    ).toBeNull();
    expect(mocks.authenticate).not.toHaveBeenCalled();
  });

  it("accepts only a verified Projects session", async () => {
    mocks.authenticate.mockResolvedValueOnce({
      clientKind: "projects",
      hackathonId: null,
      userId: "trusted",
    });
    expect(
      (await createProjectsContext({ headers: headers("Bearer token") }))
        .userId,
    ).toBe("trusted");
    expect(mocks.authenticate).toHaveBeenCalledWith("token", "projects-client");
  });

  it("rejects event-client scope even when token authentication succeeds", async () => {
    mocks.authenticate.mockResolvedValueOnce({
      clientKind: "hackathon",
      hackathonId: "event",
      userId: "event-user",
    });
    expect(
      (await createProjectsContext({ headers: headers("Bearer token") }))
        .userId,
    ).toBeNull();
  });

  it("rejects caller-supplied identity without a valid token", async () => {
    const request = headers(null);
    request.set("x-user-id", "forged");
    expect(
      (await createProjectsContext({ headers: request })).userId,
    ).toBeNull();
  });
});
