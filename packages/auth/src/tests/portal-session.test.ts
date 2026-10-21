import { describe, expect, it, vi } from "vitest";

import type {
  PortalScope,
  PortalSessionRecord,
  PortalSessionStore,
} from "../portal-session";
import {
  createPortalSessionService,
  PORTAL_CONCURRENT_REFRESH_GRACE_MS,
  PortalAuthError,
} from "../portal-session";

function createStore(clientKind: "hackathon" | "projects") {
  const scope: PortalScope =
    clientKind === "projects"
      ? { clientKind, hackathonId: null }
      : { clientKind, hackathonId: "hackathon" };
  const registeredId = clientKind === "projects" ? "projects" : "khix";
  const origin =
    clientKind === "projects"
      ? "https://projects.knighthacks.org"
      : "https://khix.knighthacks.org";
  let authorization: {
    betterAuthSessionId: string;
    clientRecordId: string;
    tokenHash: string;
    expiresAt: Date;
    consumed: boolean;
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
        clientId === registeredId
          ? {
              id: "client-record",
              clientId,
              ...scope,
              origin,
              enabled: true,
            }
          : null,
      ),
    issueAuthorizationCode: (input) => {
      if (input.clientId !== registeredId) {
        return Promise.resolve("invalid_client");
      }
      authorization = {
        id: `authorization-${nextId++}`,
        ...input,
        clientRecordId: "client-record",
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
        clientId !== registeredId ||
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
        ...scope,
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

const describeClient = describe.each(["hackathon", "projects"] as const);

describeClient("portal service (%s)", (clientKind) => {
  const clientId = clientKind === "projects" ? "projects" : "khix";
  const callback =
    clientKind === "projects"
      ? "https://projects.knighthacks.org/api/projects-auth/callback"
      : "https://khix.knighthacks.org/api/hacker-sdk/callback";

  it("allows a disabled client to revoke existing credentials", async () => {
    const { store } = createStore(clientKind);
    const revokeSession = vi.fn(() => Promise.resolve());
    store.revokeSession = revokeSession;
    const client = await store.findClient(clientId);
    store.findClient = () =>
      Promise.resolve(client ? { ...client, enabled: false } : null);
    const service = createPortalSessionService({
      store,
      environment: "production",
    });

    await expect(
      service.revoke(clientId, { accessToken: "stale-access" }),
    ).resolves.toBeUndefined();
    expect(revokeSession).toHaveBeenCalledOnce();
  });

  it("issues, consumes, and authenticates a PKCE-bound session", async () => {
    const { store } = createStore(clientKind);
    const service = createPortalSessionService({
      store,
      environment: "production",
      now: () => new Date("2026-08-06T12:00:00Z"),
    });
    const retryVerifier = "v".repeat(43);
    const { code } = await service.issueAuthorizationCode({
      clientId,
      redirectUri: callback,
      pkceChallenge: "7w_YNF9DSfIdPf_pRjSq646_kPr-2-o9NAl16JGghdM",
      userId: "user",
      betterAuthSessionId: "better-session",
    });
    const tokens = await service.exchangeAuthorizationCode({
      clientId,
      code,
      redirectUri: callback,
      pkceVerifier: retryVerifier,
    });

    await expect(
      service.authenticate(tokens.accessToken, clientId),
    ).resolves.toMatchObject({
      clientKind,
      hackathonId: clientKind === "projects" ? null : "hackathon",
      userId: "user",
    });
    await expect(
      service.exchangeAuthorizationCode({
        clientId,
        code,
        redirectUri: callback,
        pkceVerifier: retryVerifier,
      }),
    ).rejects.toMatchObject({ code: "INVALID_GRANT" });

    const verifier = "v".repeat(43);
    const retryable = await service.issueAuthorizationCode({
      clientId,
      redirectUri: callback,
      pkceChallenge: "7w_YNF9DSfIdPf_pRjSq646_kPr-2-o9NAl16JGghdM",
      userId: "user",
      betterAuthSessionId: "better-session",
    });
    await expect(
      service.exchangeAuthorizationCode({
        clientId,
        code: retryable.code,
        redirectUri: callback,
        pkceVerifier: "wrong-verifier",
      }),
    ).rejects.toMatchObject({ code: "INVALID_GRANT" });
    const retriedTokens = await service.exchangeAuthorizationCode({
      clientId,
      code: retryable.code,
      redirectUri: callback,
      pkceVerifier: verifier,
    });
    expect(retriedTokens.accessToken).toEqual(expect.any(String));
    expect(retriedTokens.refreshToken).toEqual(expect.any(String));
  });

  it("rejects callback substitution and a mismatched verifier", async () => {
    const { store } = createStore(clientKind);
    const service = createPortalSessionService({
      store,
      environment: "production",
    });

    await expect(
      service.issueAuthorizationCode({
        clientId,
        redirectUri: "https://evil.test/callback",
        pkceChallenge: "challenge",
        userId: "user",
        betterAuthSessionId: "better-session",
      }),
    ).rejects.toEqual(new PortalAuthError("INVALID_CALLBACK"));

    const { code } = await service.issueAuthorizationCode({
      clientId,
      redirectUri: callback,
      pkceChallenge: "challenge",
      userId: "user",
      betterAuthSessionId: "better-session",
    });
    await expect(
      service.exchangeAuthorizationCode({
        clientId,
        code,
        redirectUri: callback,
        pkceVerifier: "wrong-verifier",
      }),
    ).rejects.toMatchObject({ code: "INVALID_GRANT" });
  });

  it("rotates refresh tokens, tolerates a concurrent retry, and revokes later replay", async () => {
    const { store } = createStore(clientKind);
    let now = new Date("2026-08-06T12:00:00Z");
    const service = createPortalSessionService({
      store,
      environment: "production",
      now: () => now,
    });
    const verifier = "v".repeat(43);
    const { code } = await service.issueAuthorizationCode({
      clientId,
      redirectUri: callback,
      pkceChallenge: "7w_YNF9DSfIdPf_pRjSq646_kPr-2-o9NAl16JGghdM",
      userId: "user",
      betterAuthSessionId: "better-session",
    });
    const first = await service.exchangeAuthorizationCode({
      clientId,
      code,
      redirectUri: callback,
      pkceVerifier: verifier,
    });
    const second = await service.refresh(first.refreshToken, clientId);

    expect(second.refreshToken).not.toBe(first.refreshToken);
    await expect(
      service.refresh(first.refreshToken, clientId),
    ).rejects.toMatchObject({
      code: "REFRESH_RETRY",
    });
    now = new Date(now.getTime() + PORTAL_CONCURRENT_REFRESH_GRACE_MS + 1);
    await expect(
      service.refresh(first.refreshToken, clientId),
    ).rejects.toMatchObject({ code: "SESSION_EXPIRED" });
    await expect(
      service.authenticate(second.accessToken, clientId),
    ).rejects.toMatchObject({ code: "SESSION_EXPIRED" });
  });

  it("does not extend the refresh-family lifetime when tokens rotate", async () => {
    let now = new Date("2026-08-06T12:00:00Z");
    const service = createPortalSessionService({
      store: createStore(clientKind).store,
      environment: "production",
      now: () => now,
    });
    const verifier = "v".repeat(43);
    const { code } = await service.issueAuthorizationCode({
      clientId,
      redirectUri: callback,
      pkceChallenge: "7w_YNF9DSfIdPf_pRjSq646_kPr-2-o9NAl16JGghdM",
      userId: "user",
      betterAuthSessionId: "better-session",
    });
    const first = await service.exchangeAuthorizationCode({
      clientId,
      code,
      redirectUri: callback,
      pkceVerifier: verifier,
    });
    now = new Date(now.getTime() + 24 * 60 * 60 * 1_000);
    const rotated = await service.refresh(first.refreshToken, clientId);
    expect(rotated.refreshTokenExpiresAt).toEqual(first.refreshTokenExpiresAt);

    now = first.refreshTokenExpiresAt;
    await expect(
      service.refresh(rotated.refreshToken, clientId),
    ).rejects.toMatchObject({ code: "SESSION_EXPIRED" });
  });

  it("revokes a rotated session family using stale logout credentials", async () => {
    const { store } = createStore(clientKind);
    let now = new Date("2026-08-06T12:00:00Z");
    const service = createPortalSessionService({
      store,
      environment: "production",
      now: () => now,
    });
    const verifier = "v".repeat(43);
    const { code } = await service.issueAuthorizationCode({
      clientId,
      redirectUri: callback,
      pkceChallenge: "7w_YNF9DSfIdPf_pRjSq646_kPr-2-o9NAl16JGghdM",
      userId: "user",
      betterAuthSessionId: "better-session",
    });
    const first = await service.exchangeAuthorizationCode({
      clientId,
      code,
      redirectUri: callback,
      pkceVerifier: verifier,
    });
    now = new Date(now.getTime() + 1_000);
    const second = await service.refresh(first.refreshToken, clientId);
    now = new Date(now.getTime() + 1_000);
    const third = await service.refresh(second.refreshToken, clientId);

    await service.revoke(clientId, {
      accessToken: first.accessToken,
      refreshToken: first.refreshToken,
    });

    await expect(
      service.authenticate(third.accessToken, clientId),
    ).rejects.toMatchObject({ code: "SESSION_EXPIRED" });
  });
  it("rejects disabled clients before issue, authentication, or refresh", async () => {
    const { store } = createStore(clientKind);
    const registered = await store.findClient(clientId);
    store.findClient = () =>
      Promise.resolve(registered ? { ...registered, enabled: false } : null);
    const service = createPortalSessionService({
      store,
      environment: "production",
    });
    await expect(
      service.issueAuthorizationCode({
        clientId,
        redirectUri: callback,
        pkceChallenge: "challenge",
        userId: "user",
        betterAuthSessionId: "better-session",
      }),
    ).rejects.toMatchObject({ code: "INVALID_CLIENT" });
    await expect(
      service.authenticate("access", clientId),
    ).rejects.toMatchObject({ code: "INVALID_CLIENT" });
    await expect(service.refresh("refresh", clientId)).rejects.toMatchObject({
      code: "INVALID_CLIENT",
    });
  });

  it("rejects another registered audience and an inactive parent session", async () => {
    const { store } = createStore(clientKind);
    const service = createPortalSessionService({
      store,
      environment: "production",
    });
    const { code } = await service.issueAuthorizationCode({
      clientId,
      redirectUri: callback,
      pkceChallenge: "7w_YNF9DSfIdPf_pRjSq646_kPr-2-o9NAl16JGghdM",
      userId: "user",
      betterAuthSessionId: "better-session",
    });
    const tokens = await service.exchangeAuthorizationCode({
      clientId,
      code,
      redirectUri: callback,
      pkceVerifier: "v".repeat(43),
    });
    const registered = await store.findClient(clientId);
    const otherClient =
      clientKind === "projects"
        ? {
            clientKind: "hackathon" as const,
            hackathonId: "other-event",
            clientId: "other-client",
            id: "other-record",
            enabled: true,
            origin: "https://other.knighthacks.org",
          }
        : {
            clientKind: "projects" as const,
            hackathonId: null,
            clientId: "projects",
            id: "projects-record",
            enabled: true,
            origin: "https://projects.knighthacks.org",
          };
    store.findClient = (id) =>
      Promise.resolve(id === clientId ? registered : otherClient);
    await expect(
      service.authenticate(tokens.accessToken, otherClient.clientId),
    ).rejects.toMatchObject({ code: "SESSION_EXPIRED" });
    await expect(
      service.refresh(tokens.refreshToken, otherClient.clientId),
    ).rejects.toMatchObject({ code: "SESSION_EXPIRED" });
    await service.revoke(otherClient.clientId, {
      refreshToken: tokens.refreshToken,
    });
    await expect(
      service.authenticate(tokens.accessToken, clientId),
    ).resolves.toMatchObject({ clientKind });
    store.isBetterAuthSessionActive = () => Promise.resolve(false);
    await expect(
      service.authenticate(tokens.accessToken, clientId),
    ).rejects.toMatchObject({ code: "SESSION_EXPIRED" });
    await expect(
      service.refresh(tokens.refreshToken, clientId),
    ).rejects.toMatchObject({ code: "SESSION_EXPIRED" });
  });
});
