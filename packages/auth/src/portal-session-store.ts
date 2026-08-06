import { and, eq, gt, inArray, isNull, lt, or, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { Session } from "@forge/db/schemas/auth";
import {
  HackathonPortalAuthorizationCode,
  HackathonPortalClient,
  HackathonPortalSession,
  HackathonPortalSessionCredential,
} from "@forge/db/schemas/knight-hacks";

import type { PortalSessionRecord, PortalSessionStore } from "./portal-session";
import { isAllowedPortalCallback } from "./portal-auth";
import { PORTAL_CONCURRENT_REFRESH_GRACE_MS } from "./portal-session";

const sessionColumns = {
  id: HackathonPortalSession.id,
  clientRecordId: HackathonPortalSession.portalClientId,
  hackathonId: HackathonPortalSession.hackathonId,
  userId: HackathonPortalSession.userId,
  betterAuthSessionId: HackathonPortalSession.betterAuthSessionId,
  refreshExpiresAt: HackathonPortalSession.refreshExpiresAt,
} as const;

export const databasePortalSessionStore: PortalSessionStore = {
  async findClient(clientId) {
    const [client] = await db
      .select({
        id: HackathonPortalClient.id,
        clientId: HackathonPortalClient.clientId,
        hackathonId: HackathonPortalClient.hackathonId,
        origin: HackathonPortalClient.productionOrigin,
        enabled: HackathonPortalClient.enabled,
      })
      .from(HackathonPortalClient)
      .where(eq(HackathonPortalClient.clientId, clientId))
      .limit(1);
    return client ?? null;
  },

  async issueAuthorizationCode(input) {
    return db.transaction(async (tx) => {
      const [client] = await tx
        .select({
          enabled: HackathonPortalClient.enabled,
          hackathonId: HackathonPortalClient.hackathonId,
          id: HackathonPortalClient.id,
          origin: HackathonPortalClient.productionOrigin,
        })
        .from(HackathonPortalClient)
        .where(eq(HackathonPortalClient.clientId, input.clientId))
        .for("update")
        .limit(1);
      if (!client?.enabled) return "invalid_client" as const;
      if (
        !isAllowedPortalCallback({
          callbackURL: input.redirectUri,
          environment: input.environment,
          registeredOrigin: client.origin,
        })
      ) {
        return "invalid_callback" as const;
      }
      await tx.insert(HackathonPortalAuthorizationCode).values({
        betterAuthSessionId: input.betterAuthSessionId,
        codeChallenge: input.pkceChallenge,
        codeHash: input.tokenHash,
        expiresAt: input.expiresAt,
        hackathonId: client.hackathonId,
        portalClientId: client.id,
        redirectUri: input.redirectUri,
        userId: input.userId,
      });
      return "created" as const;
    });
  },

  async exchangeAuthorizationCode(input) {
    return db.transaction(async (tx) => {
      const [client] = await tx
        .select({
          enabled: HackathonPortalClient.enabled,
          hackathonId: HackathonPortalClient.hackathonId,
          id: HackathonPortalClient.id,
          origin: HackathonPortalClient.productionOrigin,
        })
        .from(HackathonPortalClient)
        .where(eq(HackathonPortalClient.clientId, input.clientId))
        .for("update")
        .limit(1);
      if (!client?.enabled) return { status: "invalid_client" } as const;
      if (
        !isAllowedPortalCallback({
          callbackURL: input.redirectUri,
          environment: input.environment,
          registeredOrigin: client.origin,
        })
      ) {
        return { status: "invalid_callback" } as const;
      }
      const [authorization] = await tx
        .update(HackathonPortalAuthorizationCode)
        .set({ consumedAt: input.now })
        .where(
          and(
            eq(HackathonPortalAuthorizationCode.codeHash, input.tokenHash),
            eq(HackathonPortalAuthorizationCode.portalClientId, client.id),
            eq(
              HackathonPortalAuthorizationCode.hackathonId,
              client.hackathonId,
            ),
            eq(HackathonPortalAuthorizationCode.redirectUri, input.redirectUri),
            eq(
              HackathonPortalAuthorizationCode.codeChallenge,
              input.pkceChallenge,
            ),
            isNull(HackathonPortalAuthorizationCode.consumedAt),
            gt(HackathonPortalAuthorizationCode.expiresAt, input.now),
          ),
        )
        .returning({
          betterAuthSessionId:
            HackathonPortalAuthorizationCode.betterAuthSessionId,
          userId: HackathonPortalAuthorizationCode.userId,
        });
      if (!authorization) return { status: "invalid_grant" } as const;
      const [session] = await tx
        .insert(HackathonPortalSession)
        .values({
          accessTokenHash: input.accessTokenHash,
          accessExpiresAt: input.accessTokenExpiresAt,
          refreshTokenHash: input.refreshTokenHash,
          refreshExpiresAt: input.refreshTokenExpiresAt,
          betterAuthSessionId: authorization.betterAuthSessionId,
          hackathonId: client.hackathonId,
          portalClientId: client.id,
          userId: authorization.userId,
        })
        .returning(sessionColumns);
      if (!session) throw new Error("Portal session insert returned no row.");
      await tx.insert(HackathonPortalSessionCredential).values([
        {
          expiresAt: input.accessTokenExpiresAt,
          portalSessionId: session.id,
          tokenHash: input.accessTokenHash,
          tokenKind: "access",
        },
        {
          expiresAt: input.refreshTokenExpiresAt,
          portalSessionId: session.id,
          tokenHash: input.refreshTokenHash,
          tokenKind: "refresh",
        },
      ]);
      return {
        session: session as PortalSessionRecord,
        status: "created",
      } as const;
    });
  },

  async findSessionByAccessToken(input) {
    const [session] = await db
      .update(HackathonPortalSession)
      .set({ lastUsedAt: input.now })
      .where(
        and(
          eq(HackathonPortalSession.accessTokenHash, input.accessTokenHash),
          eq(HackathonPortalSession.portalClientId, input.clientRecordId),
          isNull(HackathonPortalSession.revokedAt),
          gt(HackathonPortalSession.accessExpiresAt, input.now),
          gt(HackathonPortalSession.refreshExpiresAt, input.now),
        ),
      )
      .returning(sessionColumns);
    return (session as PortalSessionRecord | undefined) ?? null;
  },

  async rotateRefreshToken(input) {
    return db.transaction(async (tx) => {
      const [credential] = await tx
        .select({
          currentRefreshTokenHash: HackathonPortalSession.refreshTokenHash,
          refreshExpiresAt: HackathonPortalSession.refreshExpiresAt,
          revokedAt: HackathonPortalSession.revokedAt,
          rotatedAt: HackathonPortalSessionCredential.rotatedAt,
          sessionId: HackathonPortalSession.id,
        })
        .from(HackathonPortalSessionCredential)
        .innerJoin(
          HackathonPortalSession,
          eq(
            HackathonPortalSession.id,
            HackathonPortalSessionCredential.portalSessionId,
          ),
        )
        .where(
          and(
            eq(
              HackathonPortalSessionCredential.tokenHash,
              input.refreshTokenHash,
            ),
            eq(HackathonPortalSessionCredential.tokenKind, "refresh"),
            eq(HackathonPortalSession.portalClientId, input.clientRecordId),
          ),
        )
        .for("update", { of: HackathonPortalSession })
        .limit(1);
      if (
        !credential ||
        credential.revokedAt ||
        credential.refreshExpiresAt <= input.now
      ) {
        return { status: "invalid" } as const;
      }
      if (credential.currentRefreshTokenHash !== input.refreshTokenHash) {
        if (
          credential.rotatedAt &&
          input.now.getTime() - credential.rotatedAt.getTime() <=
            PORTAL_CONCURRENT_REFRESH_GRACE_MS
        ) {
          return { status: "concurrent_replay" } as const;
        }
        await tx
          .update(HackathonPortalSession)
          .set({ revokedAt: input.now })
          .where(
            and(
              eq(HackathonPortalSession.id, credential.sessionId),
              isNull(HackathonPortalSession.revokedAt),
            ),
          );
        return { status: "replayed" } as const;
      }

      await tx
        .update(HackathonPortalSessionCredential)
        .set({ rotatedAt: input.now })
        .where(
          and(
            eq(
              HackathonPortalSessionCredential.portalSessionId,
              credential.sessionId,
            ),
            eq(
              HackathonPortalSessionCredential.tokenHash,
              input.refreshTokenHash,
            ),
          ),
        );
      const [session] = await tx
        .update(HackathonPortalSession)
        .set({
          accessTokenHash: input.nextAccessTokenHash,
          accessExpiresAt: input.nextAccessTokenExpiresAt,
          refreshTokenHash: input.nextRefreshTokenHash,
          refreshVersion: sql`${HackathonPortalSession.refreshVersion} + 1`,
          lastUsedAt: input.now,
        })
        .where(
          and(
            eq(HackathonPortalSession.id, credential.sessionId),
            isNull(HackathonPortalSession.revokedAt),
          ),
        )
        .returning(sessionColumns);
      if (!session) return { status: "invalid" } as const;
      await tx.insert(HackathonPortalSessionCredential).values([
        {
          expiresAt: input.nextAccessTokenExpiresAt,
          portalSessionId: session.id,
          tokenHash: input.nextAccessTokenHash,
          tokenKind: "access",
        },
        {
          expiresAt: credential.refreshExpiresAt,
          portalSessionId: session.id,
          tokenHash: input.nextRefreshTokenHash,
          tokenKind: "refresh",
        },
      ]);
      return {
        refreshExpiresAt: session.refreshExpiresAt,
        session: session as PortalSessionRecord,
        status: "rotated",
      } as const;
    });
  },

  async revokeSession(input) {
    const tokenHashes = [input.accessTokenHash, input.refreshTokenHash].filter(
      (value): value is string => Boolean(value),
    );
    if (tokenHashes.length === 0) return;
    const credentials = await db
      .select({ sessionId: HackathonPortalSessionCredential.portalSessionId })
      .from(HackathonPortalSessionCredential)
      .innerJoin(
        HackathonPortalSession,
        eq(
          HackathonPortalSession.id,
          HackathonPortalSessionCredential.portalSessionId,
        ),
      )
      .where(
        and(
          inArray(HackathonPortalSessionCredential.tokenHash, tokenHashes),
          eq(HackathonPortalSession.portalClientId, input.clientRecordId),
        ),
      );
    if (credentials.length === 0) return;
    await db
      .update(HackathonPortalSession)
      .set({ revokedAt: input.now })
      .where(
        and(
          isNull(HackathonPortalSession.revokedAt),
          eq(HackathonPortalSession.portalClientId, input.clientRecordId),
          inArray(
            HackathonPortalSession.id,
            credentials.map((credential) => credential.sessionId),
          ),
        ),
      );
  },

  async isBetterAuthSessionActive(sessionId, now) {
    const [session] = await db
      .select({ id: Session.id })
      .from(Session)
      .where(and(eq(Session.id, sessionId), gt(Session.expires, now)))
      .limit(1);
    return Boolean(session);
  },
};

export async function cleanupPortalCredentials(now = new Date()) {
  const [codes, sessions, credentials] = await db.transaction(async (tx) => {
    const consumedOrExpiredCodes = await tx
      .delete(HackathonPortalAuthorizationCode)
      .where(
        or(
          lt(HackathonPortalAuthorizationCode.expiresAt, now),
          lt(
            HackathonPortalAuthorizationCode.consumedAt,
            new Date(now.getTime() - 24 * 60 * 60 * 1000),
          ),
        ),
      )
      .returning({ id: HackathonPortalAuthorizationCode.id });
    const expiredSessions = await tx
      .delete(HackathonPortalSession)
      .where(lt(HackathonPortalSession.refreshExpiresAt, now))
      .returning({ id: HackathonPortalSession.id });
    const expiredAccessCredentials = await tx
      .delete(HackathonPortalSessionCredential)
      .where(
        and(
          eq(HackathonPortalSessionCredential.tokenKind, "access"),
          lt(HackathonPortalSessionCredential.expiresAt, now),
        ),
      )
      .returning({ id: HackathonPortalSessionCredential.id });
    return [
      consumedOrExpiredCodes.length,
      expiredSessions.length,
      expiredAccessCredentials.length,
    ] as const;
  });
  return { authorizationCodes: codes, credentials, sessions };
}
