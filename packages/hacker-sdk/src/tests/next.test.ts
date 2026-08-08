import { describe, expect, it, vi } from "vitest";

import {
  createHackerSdkNextHandler,
  getHackerSdkCookieNames,
  getHackerSdkSignInPath,
} from "../next";

const TEST_CLIENT_ID = "kh-x-client";
const TEST_PORTAL_ORIGIN = "https://khx.knighthacks.org";
const TEST_COOKIE_NAMES = getHackerSdkCookieNames(
  TEST_CLIENT_ID,
  TEST_PORTAL_ORIGIN,
);

function readCookie(header: string, name: string) {
  const match = new RegExp(`(?:^|, )${name}=([^;]+)`).exec(header);
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

describe("Hacker SDK Next adapter", () => {
  it("TC-AUTH-001 starts PKCE and completes a host-only HttpOnly callback", async () => {
    const requestFetch = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        Response.json({
          accessToken: "opaque-access",
          accessTokenExpiresIn: 300,
          refreshToken: "opaque-refresh",
        }),
      ),
    );
    const handler = createHackerSdkNextHandler({
      bladeOrigin: "https://blade.knighthacks.org",
      clientId: TEST_CLIENT_ID,
      fetch: requestFetch,
    });

    const signIn = await handler(
      new Request(
        "https://khx.knighthacks.org/api/hacker-sdk/sign-in?returnTo=%2Fdashboard",
      ),
    );
    const authorizeLocation = signIn.headers.get("location");
    const signInCookies = signIn.headers.get("set-cookie");

    expect(authorizeLocation).toBeTruthy();
    expect(signInCookies).toBeTruthy();
    if (!authorizeLocation || !signInCookies)
      throw new Error("Missing auth headers");
    const authorize = new URL(authorizeLocation);

    expect(signIn.status).toBe(302);
    expect(authorize.origin).toBe("https://blade.knighthacks.org");
    expect(authorize.searchParams.get("client_id")).toBe("kh-x-client");
    expect(authorize.searchParams.get("code_challenge_method")).toBe("S256");
    expect(signInCookies).toContain("HttpOnly");
    expect(signInCookies).not.toContain("Domain=");

    const stateCookie = readCookie(signInCookies, TEST_COOKIE_NAMES.state);
    const verifierCookie = readCookie(
      signInCookies,
      TEST_COOKIE_NAMES.verifier,
    );
    const callback = await handler(
      new Request(
        `https://khx.knighthacks.org/api/hacker-sdk/callback?code=one-use&state=${authorize.searchParams.get("state")}`,
        {
          headers: {
            cookie: `${TEST_COOKIE_NAMES.state}=${stateCookie}; ${TEST_COOKIE_NAMES.verifier}=${verifierCookie}`,
          },
        },
      ),
    );

    expect(callback.status).toBe(302);
    expect(callback.headers.get("location")).toBe(
      "https://khx.knighthacks.org/dashboard",
    );
    expect(callback.headers.get("set-cookie")).toContain(
      `${TEST_COOKIE_NAMES.access}=opaque-access`,
    );
    expect(callback.headers.get("set-cookie")).toContain("HttpOnly");
    expect(await callback.text()).not.toContain("opaque-access");
  });

  it("TC-AUTH-006 refreshes an expired session exactly once", async () => {
    const calls: { authorization: string | null; path: string }[] = [];
    const requestFetch = vi.fn<typeof fetch>((input, init) => {
      const url = new URL(
        input instanceof Request ? input.url : input.toString(),
      );
      const headers = new Headers(init?.headers);
      calls.push({
        authorization: headers.get("authorization"),
        path: url.pathname,
      });
      if (url.pathname.endsWith("/auth/refresh")) {
        return Promise.resolve(
          Response.json({
            accessToken: "fresh-access",
            refreshToken: "fresh-refresh",
          }),
        );
      }
      if (
        calls.filter((call) => call.path.endsWith("getDashboard")).length === 1
      ) {
        return Promise.resolve(
          Response.json(
            { error: { code: "SESSION_EXPIRED", retryable: false } },
            { status: 401 },
          ),
        );
      }
      return Promise.resolve(
        Response.json({ result: { data: { status: "confirmed" } } }),
      );
    });
    const handler = createHackerSdkNextHandler({
      bladeOrigin: "https://blade.knighthacks.org",
      clientId: TEST_CLIENT_ID,
      fetch: requestFetch,
    });

    const response = await handler(
      new Request(
        "https://khx.knighthacks.org/api/hacker-sdk/trpc/getDashboard",
        {
          body: "{}",
          headers: {
            "content-type": "application/json",
            cookie: `${TEST_COOKIE_NAMES.access}=expired; ${TEST_COOKIE_NAMES.refresh}=refresh-me`,
            origin: "https://khx.knighthacks.org",
          },
          method: "POST",
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(calls.map((call) => call.path)).toEqual([
      "/api/hacker/v1/trpc/getDashboard",
      "/api/hacker/v1/auth/refresh",
      "/api/hacker/v1/trpc/getDashboard",
    ]);
    expect(calls.at(-1)?.authorization).toBe("Bearer fresh-access");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("coalesces concurrent refreshes so refresh-token rotation cannot race", async () => {
    let refreshCalls = 0;
    const requestFetch = vi.fn<typeof fetch>((input, init) => {
      const url = new URL(
        input instanceof Request ? input.url : input.toString(),
      );
      if (url.pathname.endsWith("/auth/refresh")) {
        refreshCalls += 1;
        return new Promise<Response>((resolve) => {
          setTimeout(
            () =>
              resolve(
                Response.json({
                  accessToken: "shared-access",
                  refreshToken: "shared-refresh",
                }),
              ),
            5,
          );
        });
      }
      const authorization = new Headers(init?.headers).get("authorization");
      return Promise.resolve(
        authorization === "Bearer shared-access"
          ? Response.json({ result: { data: { status: "confirmed" } } })
          : Response.json(
              { error: { code: "SESSION_EXPIRED", retryable: false } },
              { status: 401 },
            ),
      );
    });
    const handler = createHackerSdkNextHandler({
      bladeOrigin: "https://blade.knighthacks.org",
      clientId: TEST_CLIENT_ID,
      fetch: requestFetch,
    });
    const request = () =>
      handler(
        new Request(
          "https://khx.knighthacks.org/api/hacker-sdk/trpc/getDashboard",
          {
            body: "{}",
            headers: {
              "content-type": "application/json",
              cookie: `${TEST_COOKIE_NAMES.access}=expired; ${TEST_COOKIE_NAMES.refresh}=refresh-me`,
              origin: "https://khx.knighthacks.org",
            },
            method: "POST",
          },
        ),
      );

    const responses = await Promise.all([request(), request()]);

    expect(refreshCalls).toBe(1);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    expect(responses[0].headers.get("set-cookie")).toContain(
      `${TEST_COOKIE_NAMES.access}=shared-access`,
    );
    expect(responses[1].headers.get("set-cookie")).toContain(
      `${TEST_COOKIE_NAMES.access}=shared-access`,
    );
  });

  it("does not clear cookies when another adapter instance won the refresh race", async () => {
    const requestFetch = vi.fn<typeof fetch>((input) => {
      const url = new URL(
        input instanceof Request ? input.url : input.toString(),
      );
      if (url.pathname.endsWith("/auth/refresh")) {
        return Promise.resolve(
          Response.json(
            {
              error: {
                code: "REFRESH_RETRY",
                message: "Retry the participant request.",
                retryable: true,
              },
            },
            { status: 409 },
          ),
        );
      }
      return Promise.resolve(
        Response.json(
          { error: { code: "SESSION_EXPIRED", retryable: false } },
          { status: 401 },
        ),
      );
    });
    const handler = createHackerSdkNextHandler({
      bladeOrigin: "https://blade.knighthacks.org",
      clientId: TEST_CLIENT_ID,
      fetch: requestFetch,
    });

    const response = await handler(
      new Request(
        "https://khx.knighthacks.org/api/hacker-sdk/trpc/getDashboard",
        {
          body: "{}",
          headers: {
            "content-type": "application/json",
            cookie: `${TEST_COOKIE_NAMES.access}=expired; ${TEST_COOKIE_NAMES.refresh}=refresh-me`,
            origin: "https://khx.knighthacks.org",
          },
          method: "POST",
        },
      ),
    );

    expect(response.status).toBe(409);
    expect(response.headers.get("set-cookie")).toBeNull();
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "REFRESH_RETRY", retryable: true },
    });
  });

  it("sends the portal client and stale credentials when signing out", async () => {
    const requestFetch = vi.fn<typeof fetch>(() =>
      Promise.resolve(new Response(null, { status: 204 })),
    );
    const handler = createHackerSdkNextHandler({
      bladeOrigin: "https://blade.knighthacks.org",
      clientId: TEST_CLIENT_ID,
      fetch: requestFetch,
    });

    const response = await handler(
      new Request("https://khx.knighthacks.org/api/hacker-sdk/sign-out", {
        body: JSON.stringify({ returnTo: "/goodbye" }),
        headers: {
          "content-type": "application/json",
          cookie: `${TEST_COOKIE_NAMES.access}=stale-access; ${TEST_COOKIE_NAMES.refresh}=stale-refresh`,
          origin: "https://khx.knighthacks.org",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      redirectTo:
        "https://blade.knighthacks.org/api/hacker/v1/auth/logout?client_id=kh-x-client&return_to=https%3A%2F%2Fkhx.knighthacks.org%2Fgoodbye",
    });
    const revokeInit = requestFetch.mock.calls[0]?.[1];
    expect(typeof revokeInit?.body).toBe("string");
    expect(JSON.parse(revokeInit?.body as string)).toEqual({
      clientId: TEST_CLIENT_ID,
      refreshToken: "stale-refresh",
    });
    expect(new Headers(revokeInit?.headers).get("authorization")).toBe(
      "Bearer stale-access",
    );
  });

  it.each([
    {
      name: "transport failure",
      response: () => Promise.reject(new Error("Blade unavailable")),
    },
    {
      name: "non-success response",
      response: () =>
        Promise.resolve(Response.json({ error: "failed" }, { status: 500 })),
    },
  ])(
    "preserves portal credentials when revoke has a $name",
    async ({ response: revoke }) => {
      const handler = createHackerSdkNextHandler({
        bladeOrigin: "https://blade.knighthacks.org",
        clientId: TEST_CLIENT_ID,
        fetch: vi.fn<typeof fetch>(revoke),
      });

      const response = await handler(
        new Request("https://khx.knighthacks.org/api/hacker-sdk/sign-out", {
          body: JSON.stringify({ returnTo: "/" }),
          headers: {
            "content-type": "application/json",
            cookie: `${TEST_COOKIE_NAMES.access}=access; ${TEST_COOKIE_NAMES.refresh}=refresh`,
            origin: "https://khx.knighthacks.org",
          },
          method: "POST",
        }),
      );

      expect(response.status).toBe(502);
      expect(response.headers.get("set-cookie")).toBeNull();
      await expect(response.json()).resolves.toMatchObject({
        error: { code: "NETWORK_ERROR", retryable: true },
      });
    },
  );

  it("normalizes an external front-channel logout return to the portal root", async () => {
    const handler = createHackerSdkNextHandler({
      bladeOrigin: "https://blade.knighthacks.org",
      clientId: TEST_CLIENT_ID,
      fetch: vi.fn<typeof fetch>(),
    });

    const response = await handler(
      new Request("https://khx.knighthacks.org/api/hacker-sdk/sign-out", {
        body: JSON.stringify({ returnTo: "https://attacker.example/steal" }),
        headers: {
          "content-type": "application/json",
          origin: "https://khx.knighthacks.org",
        },
        method: "POST",
      }),
    );

    await expect(response.json()).resolves.toEqual({
      redirectTo:
        "https://blade.knighthacks.org/api/hacker/v1/auth/logout?client_id=kh-x-client&return_to=https%3A%2F%2Fkhx.knighthacks.org%2F",
    });
  });

  it("bounds streamed request bodies even without Content-Length", async () => {
    const requestFetch = vi.fn<typeof fetch>();
    const handler = createHackerSdkNextHandler({
      bladeOrigin: "https://blade.knighthacks.org",
      clientId: TEST_CLIENT_ID,
      fetch: requestFetch,
    });
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(1_048_577));
        controller.close();
      },
    });
    const init: RequestInit & { duplex: "half" } = {
      body: stream,
      duplex: "half",
      headers: {
        "content-type": "application/json",
        origin: "https://khx.knighthacks.org",
      },
      method: "POST",
    };

    const response = await handler(
      new Request(
        "https://khx.knighthacks.org/api/hacker-sdk/trpc/updateProfile",
        init,
      ),
    );

    expect(response.status).toBe(413);
    expect(requestFetch).not.toHaveBeenCalled();
  });

  it("TC-AUTH-009 rejects cross-origin mutations before forwarding credentials", async () => {
    const requestFetch = vi.fn<typeof fetch>();
    const handler = createHackerSdkNextHandler({
      bladeOrigin: "https://blade.knighthacks.org",
      clientId: TEST_CLIENT_ID,
      fetch: requestFetch,
    });

    const response = await handler(
      new Request(
        "https://khx.knighthacks.org/api/hacker-sdk/trpc/updateProfile",
        {
          body: "{}",
          headers: {
            "content-type": "application/json",
            origin: "https://attacker.example",
          },
          method: "POST",
        },
      ),
    );

    expect(response.status).toBe(403);
    expect(requestFetch).not.toHaveBeenCalled();
  });

  it("keeps sign-in return paths relative to the portal", () => {
    expect(getHackerSdkSignInPath("https://attacker.example")).toBe(
      "/api/hacker-sdk/sign-in?returnTo=%2F",
    );
  });

  it("uses the configured public origin behind an internal reverse-proxy URL", async () => {
    const handler = createHackerSdkNextHandler({
      bladeOrigin: "https://blade.knighthacks.org",
      clientId: TEST_CLIENT_ID,
      portalOrigin: "https://2026.knighthacks.org",
    });

    const signIn = await handler(
      new Request(
        "https://localhost:3007/api/hacker-sdk/sign-in?returnTo=%2Fdashboard",
      ),
    );
    const authorize = new URL(signIn.headers.get("location") ?? "");

    expect(authorize.searchParams.get("redirect_uri")).toBe(
      "https://2026.knighthacks.org/api/hacker-sdk/callback",
    );
    expect(signIn.headers.get("set-cookie")).toContain("Secure");
    expect(signIn.headers.get("set-cookie")).toContain(
      `${getHackerSdkCookieNames(TEST_CLIENT_ID, "https://2026.knighthacks.org").state}=`,
    );

    const signOut = await handler(
      new Request("https://localhost:3007/api/hacker-sdk/sign-out", {
        body: JSON.stringify({ returnTo: "/dashboard" }),
        headers: {
          "content-type": "application/json",
          origin: "https://2026.knighthacks.org",
        },
        method: "POST",
      }),
    );
    const logout = new URL(
      ((await signOut.json()) as { redirectTo: string }).redirectTo,
    );

    expect(signOut.status).toBe(200);
    expect(logout.searchParams.get("return_to")).toBe(
      "https://2026.knighthacks.org/dashboard",
    );
  });

  it("namespaces auth cookies for the same client on multiple localhost ports", async () => {
    const first = createHackerSdkNextHandler({
      bladeOrigin: "http://localhost:3000",
      clientId: "shared-local-client",
      fetch: vi.fn<typeof fetch>(),
    });
    const second = createHackerSdkNextHandler({
      bladeOrigin: "http://localhost:3000",
      clientId: "shared-local-client",
      fetch: vi.fn<typeof fetch>(),
    });

    const [firstResponse, secondResponse] = await Promise.all([
      first(new Request("http://localhost:3007/api/hacker-sdk/sign-in")),
      second(new Request("http://localhost:3008/api/hacker-sdk/sign-in")),
    ]);
    const firstCookies = firstResponse.headers.get("set-cookie") ?? "";
    const secondCookies = secondResponse.headers.get("set-cookie") ?? "";
    const firstNames = getHackerSdkCookieNames(
      "shared-local-client",
      "http://localhost:3007",
    );
    const secondNames = getHackerSdkCookieNames(
      "shared-local-client",
      "http://localhost:3008",
    );

    expect(firstNames).not.toEqual(secondNames);
    expect(firstCookies).toContain(`${firstNames.state}=`);
    expect(firstCookies).not.toContain(`${secondNames.state}=`);
    expect(secondCookies).toContain(`${secondNames.state}=`);
    expect(secondCookies).not.toContain(`${firstNames.state}=`);
  });
});
