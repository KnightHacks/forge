import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "~/app/api/hacker/v1/auth/logout/route";

const mocks = vi.hoisted(() => ({
  findClient: vi.fn(),
  signOutSession: vi.fn(),
}));

vi.mock("@forge/auth/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@forge/auth/server")>();
  return {
    ...actual,
    databasePortalSessionStore: { findClient: mocks.findClient },
  };
});

vi.mock("~/server/auth", () => ({
  signOutSession: mocks.signOutSession,
}));

vi.mock("~/env", () => ({
  env: { NODE_ENV: "development" },
}));

describe("GET /api/hacker/v1/auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findClient.mockResolvedValue({
      enabled: true,
      origin: "https://2026.knighthacks.org",
    });
    const headers = new Headers();
    headers.append(
      "set-cookie",
      "better-auth.session_token=; Path=/; HttpOnly; Max-Age=0",
    );
    headers.append(
      "set-cookie",
      "better-auth.session_data=; Path=/; HttpOnly; Max-Age=0",
    );
    headers.append(
      "set-cookie",
      "better-auth.dont_remember=; Path=/; HttpOnly; Max-Age=0",
    );
    mocks.signOutSession.mockResolvedValue(
      new Response(null, { headers, status: 204 }),
    );
  });

  it("clears the Blade session and returns to an allowed localhost portal", async () => {
    const response = await GET(
      new Request(
        "http://localhost:3000/api/hacker/v1/auth/logout?client_id=khix&return_to=http%3A%2F%2Flocalhost%3A3007%2F",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3007/");
    expect(response.headers.getSetCookie()).toHaveLength(3);
    expect(response.headers.get("set-cookie")).toContain(
      "better-auth.session_token=",
    );
    expect(mocks.findClient).toHaveBeenCalledWith("khix");
    expect(mocks.signOutSession).toHaveBeenCalledOnce();
  });

  it("allows an existing disabled client to finish logging out", async () => {
    mocks.findClient.mockResolvedValue({
      enabled: false,
      origin: "https://2026.knighthacks.org",
    });

    const response = await GET(
      new Request(
        "http://localhost:3000/api/hacker/v1/auth/logout?client_id=khix&return_to=http%3A%2F%2Flocalhost%3A3007%2F",
      ),
    );

    expect(response.status).toBe(307);
    expect(mocks.signOutSession).toHaveBeenCalledOnce();
  });

  it("rejects cross-site browser navigation before signing out", async () => {
    const response = await GET(
      new Request(
        "http://localhost:3000/api/hacker/v1/auth/logout?client_id=khix&return_to=http%3A%2F%2Flocalhost%3A3007%2F",
        { headers: { "sec-fetch-site": "cross-site" } },
      ),
    );

    expect(response.status).toBe(400);
    expect(mocks.findClient).not.toHaveBeenCalled();
    expect(mocks.signOutSession).not.toHaveBeenCalled();
  });

  it("rejects an unregistered external return URL before signing out", async () => {
    const response = await GET(
      new Request(
        "http://localhost:3000/api/hacker/v1/auth/logout?client_id=khix&return_to=https%3A%2F%2Fattacker.example%2F",
      ),
    );

    expect(response.status).toBe(400);
    expect(mocks.signOutSession).not.toHaveBeenCalled();
  });
});
