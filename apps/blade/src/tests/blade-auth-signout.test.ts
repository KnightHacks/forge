import { beforeEach, describe, expect, it, vi } from "vitest";

import { signOutSession } from "~/server/auth";

const mocks = vi.hoisted(() => ({
  deleteSession: vi.fn(),
  where: vi.fn(),
}));

vi.mock("@forge/auth/server", () => ({
  auth: vi.fn(),
  signOutSession: vi.fn(),
}));

vi.mock("@forge/db/client", () => ({
  db: {
    delete: mocks.deleteSession,
    query: { User: { findFirst: vi.fn() } },
  },
}));

vi.mock("~/env", () => ({
  env: { BLADE_E2E_AUTH: "true" },
}));

describe("Blade E2E sign-out", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deleteSession.mockReturnValue({ where: mocks.where });
    mocks.where.mockResolvedValue(undefined);
  });

  it("deletes the synthetic backing session and expires its cookie", async () => {
    const response = await signOutSession(
      new Headers({ cookie: "blade-e2e-user-id=user-123; theme=dark" }),
    );

    expect(mocks.deleteSession).toHaveBeenCalledOnce();
    expect(mocks.where).toHaveBeenCalledOnce();
    expect(response.headers.get("set-cookie")).toContain("blade-e2e-user-id=");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
