import { describe, expect, it } from "vitest";

import {
  createPkceChallenge,
  createPkceVerifier,
  createPortalToken,
  hashPortalToken,
  isAllowedPortalCallback,
  sanitizePortalReturnPath,
} from "../portal-auth";

describe("hacker portal auth primitives", () => {
  it("creates opaque tokens that are stored only by hash", () => {
    const first = createPortalToken();
    const second = createPortalToken();

    expect(first).not.toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(hashPortalToken(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashPortalToken(first)).not.toBe(hashPortalToken(second));
  });

  it("creates an S256 PKCE verifier and challenge", () => {
    const verifier = createPkceVerifier();
    const challenge = createPkceChallenge(verifier);

    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(challenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(createPkceChallenge(verifier)).toBe(challenge);
  });

  it("accepts only the exact registered Knight Hacks origin in production", () => {
    const input = {
      callbackURL: "https://khix.knighthacks.org/api/hacker-sdk/callback",
      environment: "production" as const,
      registeredOrigin: "https://khix.knighthacks.org",
    };

    expect(isAllowedPortalCallback(input)).toBe(true);
    expect(
      isAllowedPortalCallback({
        ...input,
        callbackURL: "https://khix.knighthacks.org.evil.test/callback",
      }),
    ).toBe(false);
    expect(
      isAllowedPortalCallback({
        ...input,
        callbackURL: "https://bloom.knighthacks.org/callback",
      }),
    ).toBe(false);
    expect(
      isAllowedPortalCallback({
        ...input,
        callbackURL: "http://khix.knighthacks.org/callback",
      }),
    ).toBe(false);
    expect(
      isAllowedPortalCallback({
        ...input,
        callbackURL: "http://localhost:8123/callback",
      }),
    ).toBe(false);
  });

  it("accepts localhost and IP loopback ports only in development", () => {
    for (const callbackURL of [
      "http://localhost:3007/api/hacker-sdk/callback",
      "http://127.0.0.1:43129/api/hacker-sdk/callback",
      "http://[::1]:9000/api/hacker-sdk/callback",
    ]) {
      expect(
        isAllowedPortalCallback({
          callbackURL,
          environment: "development",
          registeredOrigin: "https://khix.knighthacks.org",
        }),
      ).toBe(true);
    }

    expect(
      isAllowedPortalCallback({
        callbackURL: "http://192.168.1.20:3007/callback",
        environment: "development",
        registeredOrigin: "https://khix.knighthacks.org",
      }),
    ).toBe(false);
  });

  it("keeps portal return paths relative to the validated origin", () => {
    expect(sanitizePortalReturnPath("/dashboard?tab=points#me")).toBe(
      "/dashboard?tab=points#me",
    );
    expect(sanitizePortalReturnPath("dashboard")).toBe("/");
    expect(sanitizePortalReturnPath("//evil.test/path")).toBe("/");
    expect(sanitizePortalReturnPath("https://evil.test/path")).toBe("/");
    expect(sanitizePortalReturnPath("/\\evil.test")).toBe("/");
  });
});
