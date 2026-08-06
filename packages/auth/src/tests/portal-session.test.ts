import { describe, expect, it } from "vitest";

import type {
  PortalSessionRecord,
  PortalSessionStore,
} from "../portal-session";
import {
  createPortalSessionService,
  PORTAL_CONCURRENT_REFRESH_GRACE_MS,
  PortalAuthError,
} from "../portal-session";

function createStore() {
  let authorization: {
    betterAuthSessionId: string;
    clientRecordId: string;
    tokenHash: string;
    expiresAt: Date;
    consumed: boolean;
    hackathonId: string;
    id: string;
    pkceChallenge: string;
    redirectUri: string;
    userId: string;
  } | null = null;
  let session:
    | (PortalSessionRecord & {
        accessTokenHash: string;
        accessTokenExpiresAt: Date;
        refreshTokenHash: string;
        refreshTokenExpiresAt: Date;
        revokedAt: Date | null;
      })
    | null = null;
  let nextId = 1;
  const accessHistory = new Set<string>();
  const refreshHistory = new Map<string, Date | null>();

  const store: PortalSessionStore = {
    findClient: (clientId) =>
      Promise.resolve(
        clientId === "khix"
          ? {
              id: "client-record",
              clientId,
              hackathonId: "hackathon",
              origin: "https://khix.knighthacks.org",
              enabled: true,
            }
          : null,
      ),
    issueAuthorizationCode: (input) => {
      if (input.clientId !== "khix") {
        return Promise.resolve("invalid_client");
      }
      authorization = {
        id: `authorization-${nextId++}`,
        ...input,
        clientRecordId: "client-record",
        hackathonId: "hackathon",
        consumed: false,
      };
      return Promise.resolve("created");
    },
    exchangeAuthorizationCode: ({
      accessTokenExpiresAt,
      accessTokenHash,
      clientId,
      now,
      pkceChallenge,
      redirectUri,
      refreshTokenExpiresAt,
      refreshTokenHash,
      tokenHash,
    }) => {
      if (
        clientId !== "khix" ||
        !authorization ||
        authorization.consumed ||
        authorization.tokenHash !== tokenHash ||
        authorization.pkceChallenge !== pkceChallenge ||
        authorization.redirectUri !== redirectUri ||
        authorization.expiresAt <= now
      ) {
        return Promise.resolve({ status: "invalid_grant" });
      }
      authorization.consumed = true;
      const createdSession = {
        id: `session-${nextId++}`,
        accessTokenExpiresAt,
        accessTokenHash,
        betterAuthSessionId: authorization.betterAuthSessionId,
        clientRecordId: authorization.clientRecordId,
        hackathonId: authorization.hackathonId,
        refreshTokenExpiresAt,
        refreshTokenHash,
        revokedAt: null,
        userId: authorization.userId,
      };
      session = createdSession;
      accessHistory.add(accessTokenHash);
      refreshHistory.set(refreshTokenHash, null);
      return Promise.resolve({ session: createdSession, status: "created" });
    },
    findSessionByAccessToken: ({ accessTokenHash, clientRecordId, now }) => {
      if (
        !session ||
        session.revokedAt ||
        session.accessTokenHash !== accessTokenHash ||
        session.clientRecordId !== clientRecordId ||
        session.accessTokenExpiresAt <= now
      ) {
        return Promise.resolve(null);
      }
      return Promise.resolve(session);
    },
    rotateRefreshToken: (input) => {
      if (
        !session ||
        session.revokedAt ||
        session.clientRecordId !== input.clientRecordId ||
        session.refreshTokenExpiresAt <= input.now
      ) {
        return Promise.resolve({ status: "invalid" });
      }
      if (session.refreshTokenHash !== input.refreshTokenHash) {
        const rotatedAt = refreshHistory.get(input.refreshTokenHash);
        if (rotatedAt === undefined) {
          return Promise.resolve({ status: "invalid" });
        }
        if (
          rotatedAt &&
          input.now.getTime() - rotatedAt.getTime() <=
            PORTAL_CONCURRENT_REFRESH_GRACE_MS
        ) {
          return Promise.resolve({ status: "concurrent_replay" });
        }
        session.revokedAt = input.now;
        return Promise.resolve({ status: "replayed" });
      }
      refreshHistory.set(input.refreshTokenHash, input.now);
      session = {
        ...session,
        accessTokenHash: input.nextAccessTokenHash,
        accessTokenExpiresAt: input.nextAccessTokenExpiresAt,
        refreshTokenHash: input.nextRefreshTokenHash,
      };
      accessHistory.add(input.nextAccessTokenHash);
      refreshHistory.set(input.nextRefreshTokenHash, null);
      return Promise.resolve({
        refreshExpiresAt: session.refreshTokenExpiresAt,
        session,
        status: "rotated",
      });
    },
    revokeSession: (input) => {
      if (
        session &&
        ((input.accessTokenHash !== undefined &&
          accessHistory.has(input.accessTokenHash)) ||
          (input.refreshTokenHash !== undefined &&
            refreshHistory.has(input.refreshTokenHash))) &&
        input.clientRecordId === session.clientRecordId
      ) {
        session.revokedAt = input.now;
      }
      return Promise.resolve();
    },
    isBetterAuthSessionActive: (sessionId) =>
      Promise.resolve(sessionId === "better-session"),
  };

  return { store };
}

describe("portal session service", () => {
  const callback = "https://khix.knighthacks.org/api/hacker-sdk/callback";

  it("issues, consumes, and authenticates a PKCE-bound session", async () => {
    const { store } = createStore();
    const service = createPortalSessionService({
      store,
      environment: "production",
      now: () => new Date("2026-08-06T12:00:00Z"),
    });
    const retryVerifier = "v".repeat(43);
    const { code } = await service.issueAuthorizationCode({
      clientId: "khix",
      redirectUri: callback,
      pkceChallenge: "7w_YNF9DSfIdPf_pRjSq646_kPr-2-o9NAl16JGghdM",
      userId: "user",
      betterAuthSessionId: "better-session",
    });
    const tokens = await service.exchangeAuthorizationCode({
      clientId: "khix",
      code,
      redirectUri: callback,
      pkceVerifier: retryVerifier,
    });

    await expect(
      service.authenticate(tokens.accessToken, "khix"),
    ).resolves.toMatchObject({ hackathonId: "hackathon", userId: "user" });
    await expect(
      service.exchangeAuthorizationCode({
        clientId: "khix",
        code,
        redirectUri: callback,
        pkceVerifier: retryVerifier,
      }),
    ).rejects.toMatchObject({ code: "INVALID_GRANT" });

    const verifier = "v".repeat(43);
    const retryable = await service.issueAuthorizationCode({
      clientId: "khix",
      redirectUri: callback,
      pkceChallenge: "7w_YNF9DSfIdPf_pRjSq646_kPr-2-o9NAl16JGghdM",
      userId: "user",
      betterAuthSessionId: "better-session",
    });
    await expect(
      service.exchangeAuthorizationCode({
        clientId: "khix",
        code: retryable.code,
        redirectUri: callback,
        pkceVerifier: "wrong-verifier",
      }),
    ).rejects.toMatchObject({ code: "INVALID_GRANT" });
    const retriedTokens = await service.exchangeAuthorizationCode({
      clientId: "khix",
      code: retryable.code,
      redirectUri: callback,
      pkceVerifier: verifier,
    });
    expect(retriedTokens.accessToken).toEqual(expect.any(String));
    expect(retriedTokens.refreshToken).toEqual(expect.any(String));
  });

  it("rejects callback substitution and a mismatched verifier", async () => {
    const { store } = createStore();
    const service = createPortalSessionService({
      store,
      environment: "production",
    });

    await expect(
      service.issueAuthorizationCode({
        clientId: "khix",
        redirectUri: "https://evil.test/callback",
        pkceChallenge: "challenge",
        userId: "user",
        betterAuthSessionId: "better-session",
      }),
    ).rejects.toEqual(new PortalAuthError("INVALID_CALLBACK"));

    const { code } = await service.issueAuthorizationCode({
      clientId: "khix",
      redirectUri: callback,
      pkceChallenge: "challenge",
      userId: "user",
      betterAuthSessionId: "better-session",
    });
    await expect(
      service.exchangeAuthorizationCode({
        clientId: "khix",
        code,
        redirectUri: callback,
        pkceVerifier: "wrong-verifier",
      }),
    ).rejects.toMatchObject({ code: "INVALID_GRANT" });
  });

  it("rotates refresh tokens, tolerates a concurrent retry, and revokes later replay", async () => {
    const { store } = createStore();
    let now = new Date("2026-08-06T12:00:00Z");
    const service = createPortalSessionService({
      store,
      environment: "production",
      now: () => now,
    });
    const verifier = "v".repeat(43);
    const { code } = await service.issueAuthorizationCode({
      clientId: "khix",
      redirectUri: callback,
      pkceChallenge: "7w_YNF9DSfIdPf_pRjSq646_kPr-2-o9NAl16JGghdM",
      userId: "user",
      betterAuthSessionId: "better-session",
    });
    const first = await service.exchangeAuthorizationCode({
      clientId: "khix",
      code,
      redirectUri: callback,
      pkceVerifier: verifier,
    });
    const second = await service.refresh(first.refreshToken, "khix");

    expect(second.refreshToken).not.toBe(first.refreshToken);
    await expect(
      service.refresh(first.refreshToken, "khix"),
    ).rejects.toMatchObject({
      code: "REFRESH_RETRY",
    });
    now = new Date(now.getTime() + PORTAL_CONCURRENT_REFRESH_GRACE_MS + 1);
    await expect(
      service.refresh(first.refreshToken, "khix"),
    ).rejects.toMatchObject({ code: "SESSION_EXPIRED" });
    await expect(
      service.authenticate(second.accessToken, "khix"),
    ).rejects.toMatchObject({ code: "SESSION_EXPIRED" });
  });

  it("does not extend the refresh-family lifetime when tokens rotate", async () => {
    let now = new Date("2026-08-06T12:00:00Z");
    const service = createPortalSessionService({
      store: createStore().store,
      environment: "production",
      now: () => now,
    });
    const verifier = "v".repeat(43);
    const { code } = await service.issueAuthorizationCode({
      clientId: "khix",
      redirectUri: callback,
      pkceChallenge: "7w_YNF9DSfIdPf_pRjSq646_kPr-2-o9NAl16JGghdM",
      userId: "user",
      betterAuthSessionId: "better-session",
    });
    const first = await service.exchangeAuthorizationCode({
      clientId: "khix",
      code,
      redirectUri: callback,
      pkceVerifier: verifier,
    });
    now = new Date(now.getTime() + 24 * 60 * 60 * 1_000);
    const rotated = await service.refresh(first.refreshToken, "khix");
    expect(rotated.refreshTokenExpiresAt).toEqual(first.refreshTokenExpiresAt);

    now = first.refreshTokenExpiresAt;
    await expect(
      service.refresh(rotated.refreshToken, "khix"),
    ).rejects.toMatchObject({ code: "SESSION_EXPIRED" });
  });

  it("revokes a rotated session family using stale logout credentials", async () => {
    const { store } = createStore();
    let now = new Date("2026-08-06T12:00:00Z");
    const service = createPortalSessionService({
      store,
      environment: "production",
      now: () => now,
    });
    const verifier = "v".repeat(43);
    const { code } = await service.issueAuthorizationCode({
      clientId: "khix",
      redirectUri: callback,
      pkceChallenge: "7w_YNF9DSfIdPf_pRjSq646_kPr-2-o9NAl16JGghdM",
      userId: "user",
      betterAuthSessionId: "better-session",
    });
    const first = await service.exchangeAuthorizationCode({
      clientId: "khix",
      code,
      redirectUri: callback,
      pkceVerifier: verifier,
    });
    now = new Date(now.getTime() + 1_000);
    const second = await service.refresh(first.refreshToken, "khix");
    now = new Date(now.getTime() + 1_000);
    const third = await service.refresh(second.refreshToken, "khix");

    await service.revoke("khix", {
      accessToken: first.accessToken,
      refreshToken: first.refreshToken,
    });

    await expect(
      service.authenticate(third.accessToken, "khix"),
    ).rejects.toMatchObject({ code: "SESSION_EXPIRED" });
  });
});
