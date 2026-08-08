import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as AuthServerModule from "@forge/auth/server";

import { GET } from "~/app/api/hacker/v1/auth/authorize/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findClient: vi.fn(),
}));

vi.mock("@forge/auth/server", async (importOriginal) => {
  const actual = await importOriginal<typeof AuthServerModule>();
  return {
    ...actual,
    databasePortalSessionStore: { findClient: mocks.findClient },
  };
});

vi.mock("~/server/auth", () => ({ auth: mocks.auth }));

vi.mock("~/env", () => ({
  env: {
    BLADE_URL: "https://blade.knighthacks.org",
    NODE_ENV: "production",
  },
}));

describe("GET /api/hacker/v1/auth/authorize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue(null);
    mocks.findClient.mockResolvedValue({
      enabled: true,
      origin: "https://2026.knighthacks.org",
    });
  });

  it("uses the public Blade origin when the reverse proxy reports localhost", async () => {
    const authorize = new URL(
      "https://localhost:3000/api/hacker/v1/auth/authorize",
    );
    authorize.searchParams.set("client_id", "khix");
    authorize.searchParams.set("code_challenge", "a".repeat(43));
    authorize.searchParams.set("code_challenge_method", "S256");
    authorize.searchParams.set(
      "redirect_uri",
      "https://2026.knighthacks.org/api/hacker-sdk/callback",
    );
    authorize.searchParams.set("state", "b".repeat(32));

    const response = await GET(new Request(authorize));
    const signIn = new URL(response.headers.get("location") ?? "");

    expect(response.status).toBe(307);
    expect(signIn.origin).toBe("https://blade.knighthacks.org");
    expect(signIn.pathname).toBe("/api/auth/signin");
    expect(signIn.searchParams.get("provider")).toBe("discord");
    expect(signIn.searchParams.get("callbackURL")).toBe(
      `${authorize.pathname}${authorize.search}`,
    );
  });
});
