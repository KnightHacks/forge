import {
  createPkceChallenge,
  createPortalToken,
  hashPortalToken,
  isAllowedPortalCallback,
} from "./portal-auth";

export const PORTAL_AUTHORIZATION_CODE_TTL_MS = 5 * 60 * 1000;
export const PORTAL_ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;
export const PORTAL_REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const PORTAL_CONCURRENT_REFRESH_GRACE_MS = 10 * 1000;

export interface PortalClientRecord {
  id: string;
  clientId: string;
  hackathonId: string;
  origin: string;
  enabled: boolean;
}

export interface PortalSessionRecord {
  id: string;
  clientRecordId: string;
  hackathonId: string;
  userId: string;
  betterAuthSessionId: string;
}

export type PortalRefreshRotationResult =
  | { status: "concurrent_replay" }
  | { status: "invalid" }
  | { status: "replayed" }
  | {
      refreshExpiresAt: Date;
      session: PortalSessionRecord;
      status: "rotated";
    };

export interface PortalSessionStore {
  findClient(clientId: string): Promise<PortalClientRecord | null>;
  issueAuthorizationCode(input: {
    clientId: string;
    environment: PortalAuthEnvironment;
    tokenHash: string;
    userId: string;
    betterAuthSessionId: string;
    redirectUri: string;
    pkceChallenge: string;
    expiresAt: Date;
  }): Promise<"created" | "invalid_callback" | "invalid_client">;
  exchangeAuthorizationCode(input: {
    accessTokenHash: string;
    accessTokenExpiresAt: Date;
    clientId: string;
    environment: PortalAuthEnvironment;
    pkceChallenge: string;
    redirectUri: string;
    refreshTokenHash: string;
    refreshTokenExpiresAt: Date;
    tokenHash: string;
    now: Date;
  }): Promise<
    | { status: "invalid_callback" | "invalid_client" | "invalid_grant" }
    | { session: PortalSessionRecord; status: "created" }
  >;
  findSessionByAccessToken(input: {
    accessTokenHash: string;
    clientRecordId: string;
    now: Date;
  }): Promise<PortalSessionRecord | null>;
  rotateRefreshToken(input: {
    refreshTokenHash: string;
    clientRecordId: string;
    nextAccessTokenHash: string;
    nextAccessTokenExpiresAt: Date;
    nextRefreshTokenHash: string;
    nextRefreshTokenExpiresAt: Date;
    now: Date;
  }): Promise<PortalRefreshRotationResult>;
  revokeSession(input: {
    accessTokenHash?: string;
    clientRecordId: string;
    refreshTokenHash?: string;
    now: Date;
  }): Promise<void>;
  isBetterAuthSessionActive(sessionId: string, now: Date): Promise<boolean>;
}

export type PortalAuthEnvironment = "development" | "production" | "test";

export class PortalAuthError extends Error {
  constructor(
    readonly code:
      | "INVALID_CLIENT"
      | "INVALID_CALLBACK"
      | "INVALID_GRANT"
      | "REFRESH_RETRY"
      | "SESSION_EXPIRED",
  ) {
    super(code);
    this.name = "PortalAuthError";
  }
}

function tokenPair(now: Date) {
  const accessToken = createPortalToken();
  const refreshToken = createPortalToken();
  return {
    accessToken,
    accessTokenExpiresAt: new Date(now.getTime() + PORTAL_ACCESS_TOKEN_TTL_MS),
    refreshToken,
    refreshTokenExpiresAt: new Date(
      now.getTime() + PORTAL_REFRESH_TOKEN_TTL_MS,
    ),
  };
}

export function createPortalSessionService(input: {
  store: PortalSessionStore;
  environment: PortalAuthEnvironment;
  now?: () => Date;
}) {
  const now = input.now ?? (() => new Date());

  async function requireClient(clientId: string) {
    const client = await input.store.findClient(clientId);
    if (!client?.enabled) throw new PortalAuthError("INVALID_CLIENT");
    return client;
  }

  return {
    async issueAuthorizationCode(request: {
      clientId: string;
      redirectUri: string;
      pkceChallenge: string;
      userId: string;
      betterAuthSessionId: string;
    }) {
      const client = await requireClient(request.clientId);
      if (
        !isAllowedPortalCallback({
          callbackURL: request.redirectUri,
          environment: input.environment,
          registeredOrigin: client.origin,
        })
      ) {
        throw new PortalAuthError("INVALID_CALLBACK");
      }

      const issuedAt = now();
      const code = createPortalToken();
      const status = await input.store.issueAuthorizationCode({
        clientId: request.clientId,
        environment: input.environment,
        tokenHash: hashPortalToken(code),
        userId: request.userId,
        betterAuthSessionId: request.betterAuthSessionId,
        redirectUri: request.redirectUri,
        pkceChallenge: request.pkceChallenge,
        expiresAt: new Date(
          issuedAt.getTime() + PORTAL_AUTHORIZATION_CODE_TTL_MS,
        ),
      });
      if (status === "invalid_client") {
        throw new PortalAuthError("INVALID_CLIENT");
      }
      if (status === "invalid_callback") {
        throw new PortalAuthError("INVALID_CALLBACK");
      }
      return { code };
    },

    async exchangeAuthorizationCode(request: {
      clientId: string;
      code: string;
      redirectUri: string;
      pkceVerifier: string;
    }) {
      const client = await requireClient(request.clientId);
      if (
        !isAllowedPortalCallback({
          callbackURL: request.redirectUri,
          environment: input.environment,
          registeredOrigin: client.origin,
        })
      ) {
        throw new PortalAuthError("INVALID_CALLBACK");
      }
      const exchangedAt = now();
      const challenge = createPkceChallenge(request.pkceVerifier);
      const tokens = tokenPair(exchangedAt);
      const exchange = await input.store.exchangeAuthorizationCode({
        accessTokenHash: hashPortalToken(tokens.accessToken),
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
        clientId: request.clientId,
        environment: input.environment,
        pkceChallenge: challenge,
        redirectUri: request.redirectUri,
        refreshTokenHash: hashPortalToken(tokens.refreshToken),
        refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
        tokenHash: hashPortalToken(request.code),
        now: exchangedAt,
      });
      if (exchange.status === "invalid_client") {
        throw new PortalAuthError("INVALID_CLIENT");
      }
      if (exchange.status === "invalid_callback") {
        throw new PortalAuthError("INVALID_CALLBACK");
      }
      if (exchange.status === "invalid_grant") {
        throw new PortalAuthError("INVALID_GRANT");
      }
      return tokens;
    },

    async authenticate(accessToken: string, clientId: string) {
      const authenticatedAt = now();
      const client = await requireClient(clientId);
      const session = await input.store.findSessionByAccessToken({
        accessTokenHash: hashPortalToken(accessToken),
        clientRecordId: client.id,
        now: authenticatedAt,
      });
      if (
        !session ||
        !(await input.store.isBetterAuthSessionActive(
          session.betterAuthSessionId,
          authenticatedAt,
        ))
      ) {
        throw new PortalAuthError("SESSION_EXPIRED");
      }
      return session;
    },

    async refresh(refreshToken: string, clientId: string) {
      const refreshedAt = now();
      const client = await requireClient(clientId);
      const tokens = tokenPair(refreshedAt);
      const rotation = await input.store.rotateRefreshToken({
        refreshTokenHash: hashPortalToken(refreshToken),
        clientRecordId: client.id,
        nextAccessTokenHash: hashPortalToken(tokens.accessToken),
        nextAccessTokenExpiresAt: tokens.accessTokenExpiresAt,
        nextRefreshTokenHash: hashPortalToken(tokens.refreshToken),
        nextRefreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
        now: refreshedAt,
      });
      if (rotation.status === "concurrent_replay") {
        throw new PortalAuthError("REFRESH_RETRY");
      }
      if (rotation.status !== "rotated") {
        throw new PortalAuthError("SESSION_EXPIRED");
      }
      if (
        !(await input.store.isBetterAuthSessionActive(
          rotation.session.betterAuthSessionId,
          refreshedAt,
        ))
      ) {
        await input.store.revokeSession({
          accessTokenHash: hashPortalToken(tokens.accessToken),
          clientRecordId: client.id,
          now: refreshedAt,
        });
        throw new PortalAuthError("SESSION_EXPIRED");
      }
      return {
        ...tokens,
        refreshTokenExpiresAt: rotation.refreshExpiresAt,
      };
    },

    async revoke(
      clientId: string,
      tokens: { accessToken?: string; refreshToken?: string },
    ) {
      const client = await requireClient(clientId);
      await input.store.revokeSession({
        accessTokenHash: tokens.accessToken
          ? hashPortalToken(tokens.accessToken)
          : undefined,
        refreshTokenHash: tokens.refreshToken
          ? hashPortalToken(tokens.refreshToken)
          : undefined,
        clientRecordId: client.id,
        now: now(),
      });
    },
  };
}
