import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as AuthServerModule from "@forge/auth/server";

import { GET } from "~/app/api/hacker/v1/auth/authorize/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findClient: vi.fn(),
  issueAuthorizationCode: vi.fn(),
}));

vi.mock("@forge/auth/server", async (importOriginal) => {
  const actual = await importOriginal<typeof AuthServerModule>();
  return {
    ...actual,
    databasePortalSessionStore: {
      findClient: mocks.findClient,
      issueAuthorizationCode: mocks.issueAuthorizationCode,
    },
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
      clientKind: "hackathon",
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

describe("Projects redirects", () => {
  it.each([true, false])(
    "validates Projects before side effects (valid=%s)",
    async (valid) => {
      vi.clearAllMocks();
      mocks.findClient.mockResolvedValue({
        clientKind: "projects",
        enabled: true,
        origin: "https://projects.knighthacks.org",
      });
      mocks.auth.mockResolvedValue(null);
      const url = new URL(
        "https://blade.knighthacks.org/api/hacker/v1/auth/authorize",
      );
      url.search = new URLSearchParams({
        client_id: "projects",
        code_challenge: "a".repeat(43),
        code_challenge_method: "S256",
        state: "b".repeat(32),
        redirect_uri: valid
          ? "https://projects.knighthacks.org/api/projects-auth/callback"
          : "https://projects.knighthacks.org/api/hacker-sdk/callback",
      }).toString();
      const response = await GET(new Request(url));
      expect(response.status).toBe(valid ? 307 : 400);
      expect(mocks.auth).toHaveBeenCalledTimes(valid ? 1 : 0);
    },
  );
  it("returns a Projects code and state using only the Blade session identity", async () => {
    vi.clearAllMocks();
    mocks.findClient.mockResolvedValue({
      clientKind: "projects",
      enabled: true,
      origin: "https://projects.knighthacks.org",
    });
    mocks.auth.mockResolvedValue({
      user: { id: "blade-user" },
      session: { id: "blade-session" },
    });
    mocks.issueAuthorizationCode.mockResolvedValue("created");
    const url = new URL(
      "https://blade.knighthacks.org/api/hacker/v1/auth/authorize",
    );
    url.search = new URLSearchParams({
      client_id: "projects",
      code_challenge: "a".repeat(43),
      code_challenge_method: "S256",
      state: "b".repeat(32),
      redirect_uri:
        "https://projects.knighthacks.org/api/projects-auth/callback",
      userId: "attacker",
    }).toString();
    const response = await GET(new Request(url));
    expect(response.status).toBe(307);
    const callback = new URL(response.headers.get("location") ?? "");
    expect(callback.origin + callback.pathname).toBe(
      "https://projects.knighthacks.org/api/projects-auth/callback",
    );
    expect(callback.searchParams.get("code")).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(callback.searchParams.get("state")).toBe("b".repeat(32));
    expect(mocks.issueAuthorizationCode).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "blade-user",
        betterAuthSessionId: "blade-session",
        clientId: "projects",
      }),
    );
  });
});
