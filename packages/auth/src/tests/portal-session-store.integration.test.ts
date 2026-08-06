import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { db as databaseClient } from "@forge/db/client";
import type * as AuthSchemaModule from "@forge/db/schemas/auth";
import type * as KnightHacksSchemaModule from "@forge/db/schemas/knight-hacks";
import type { DisposableDatabase } from "@forge/db/testing";
import { eq } from "@forge/db";
import {
  canRunDatabaseTests,
  provisionDisposableDatabase,
} from "@forge/db/testing";

import type { databasePortalSessionStore } from "../portal-session-store";
import { createPkceChallenge, hashPortalToken } from "../portal-auth";
import {
  createPortalSessionService,
  PORTAL_ACCESS_TOKEN_TTL_MS,
  PORTAL_CONCURRENT_REFRESH_GRACE_MS,
  PORTAL_REFRESH_TOKEN_TTL_MS,
} from "../portal-session";

type DatabaseClient = typeof databaseClient;
type AuthSchemas = typeof AuthSchemaModule;
type KnightHacksSchemas = typeof KnightHacksSchemaModule;
type PortalStore = typeof databasePortalSessionStore;

describe.skipIf(!canRunDatabaseTests())("database portal session store", () => {
  let disposable: DisposableDatabase | undefined;
  let db: DatabaseClient;
  let auth: AuthSchemas;
  let knightHacks: KnightHacksSchemas;
  let store: PortalStore;
  const userId = "10000000-0000-4000-8000-0000000000a1";
  const hackathonId = "50000000-0000-4000-8000-0000000000a1";
  const betterAuthSessionId = "portal-store-better-auth";
  const clientId = "portal-store-client";
  const callback = "https://store-test.knighthacks.org/api/hacker-sdk/callback";

  beforeAll(async () => {
    disposable = await provisionDisposableDatabase("forge_auth");
    // eslint-disable-next-line no-restricted-properties
    process.env.DATABASE_URL = disposable.url;
    ({ db } = await import("@forge/db/client"));
    auth = await import("@forge/db/schemas/auth");
    knightHacks = await import("@forge/db/schemas/knight-hacks");
    ({ databasePortalSessionStore: store } =
      await import("../portal-session-store"));

    await db.insert(auth.User).values({
      discordUserId: "portal-store-user",
      id: userId,
    });
    await db.insert(auth.Session).values({
      expires: new Date("2027-01-01T00:00:00Z"),
      id: betterAuthSessionId,
      sessionToken: randomUUID(),
      userId,
    });
    await db.insert(knightHacks.Hackathon).values({
      applicationDeadline: new Date("2026-09-01T00:00:00Z"),
      applicationOpen: new Date("2026-08-01T00:00:00Z"),
      confirmationDeadline: new Date("2026-09-15T00:00:00Z"),
      displayName: "Store Test",
      endDate: new Date("2026-10-03T00:00:00Z"),
      id: hackathonId,
      name: "store-test",
      startDate: new Date("2026-10-01T00:00:00Z"),
      theme: "Store",
    });
    await db.insert(knightHacks.HackathonPortalClient).values({
      clientId,
      enabled: true,
      hackathonId,
      name: "Store test portal",
      productionOrigin: "https://store-test.knighthacks.org",
    });
  }, 120_000);

  afterAll(async () => {
    await db.$client.end().catch(() => undefined);
    await disposable?.drop();
  }, 30_000);

  beforeEach(async () => {
    await db.delete(knightHacks.HackathonPortalAuthorizationCode);
    await db.delete(knightHacks.HackathonPortalSession);
    await db
      .update(knightHacks.HackathonPortalClient)
      .set({
        enabled: true,
        productionOrigin: "https://store-test.knighthacks.org",
      })
      .where(eq(knightHacks.HackathonPortalClient.clientId, clientId));
  });

  async function authorize(now: () => Date) {
    const service = createPortalSessionService({
      environment: "production",
      now,
      store,
    });
    const verifier = "v".repeat(43);
    const { code } = await service.issueAuthorizationCode({
      betterAuthSessionId,
      clientId,
      pkceChallenge: createPkceChallenge(verifier),
      redirectUri: callback,
      userId,
    });
    const tokens = await service.exchangeAuthorizationCode({
      clientId,
      code,
      pkceVerifier: verifier,
      redirectUri: callback,
    });
    return { service, tokens };
  }

  it("revokes a family through credentials retained across rotations", async () => {
    let current = new Date("2026-08-06T12:00:00Z");
    const { service, tokens: first } = await authorize(() => current);
    current = new Date(current.getTime() + 1_000);
    const second = await service.refresh(first.refreshToken, clientId);
    current = new Date(current.getTime() + 1_000);
    const third = await service.refresh(second.refreshToken, clientId);

    await service.revoke(clientId, {
      accessToken: first.accessToken,
      refreshToken: first.refreshToken,
    });

    await expect(
      service.authenticate(third.accessToken, clientId),
    ).rejects.toMatchObject({ code: "SESSION_EXPIRED" });
  });

  it("returns retryable for concurrent replay and revokes replay after grace", async () => {
    let current = new Date("2026-08-06T13:00:00Z");
    const { service, tokens: first } = await authorize(() => current);
    const second = await service.refresh(first.refreshToken, clientId);
    await expect(
      service.refresh(first.refreshToken, clientId),
    ).rejects.toMatchObject({ code: "REFRESH_RETRY" });

    current = new Date(
      current.getTime() + PORTAL_CONCURRENT_REFRESH_GRACE_MS + 1,
    );
    await expect(
      service.refresh(first.refreshToken, clientId),
    ).rejects.toMatchObject({ code: "SESSION_EXPIRED" });
    await expect(
      service.authenticate(second.accessToken, clientId),
    ).rejects.toMatchObject({ code: "SESSION_EXPIRED" });
  });

  it("rechecks the callback after a concurrent origin cutover before issuing", async () => {
    const service = createPortalSessionService({
      environment: "production",
      now: () => new Date("2026-08-06T14:00:00Z"),
      store,
    });
    let locked!: () => void;
    let release!: () => void;
    const lockedPromise = new Promise<void>((resolve) => (locked = resolve));
    const releasePromise = new Promise<void>((resolve) => (release = resolve));
    const cutover = db.transaction(async (tx) => {
      const [client] = await tx
        .select({ id: knightHacks.HackathonPortalClient.id })
        .from(knightHacks.HackathonPortalClient)
        .where(eq(knightHacks.HackathonPortalClient.clientId, clientId))
        .for("update")
        .limit(1);
      if (!client) throw new Error("Portal client missing.");
      await tx
        .update(knightHacks.HackathonPortalClient)
        .set({ productionOrigin: "https://new-store.knighthacks.org" })
        .where(eq(knightHacks.HackathonPortalClient.id, client.id));
      locked();
      await releasePromise;
      await tx
        .delete(knightHacks.HackathonPortalAuthorizationCode)
        .where(
          eq(
            knightHacks.HackathonPortalAuthorizationCode.portalClientId,
            client.id,
          ),
        );
    });
    await lockedPromise;
    const issuance = service.issueAuthorizationCode({
      betterAuthSessionId,
      clientId,
      pkceChallenge: createPkceChallenge("v".repeat(43)),
      redirectUri: callback,
      userId,
    });
    const issuanceExpectation = expect(issuance).rejects.toMatchObject({
      code: "INVALID_CALLBACK",
    });
    await new Promise<void>((resolve) => setImmediate(resolve));
    release();
    await cutover;

    await issuanceExpectation;
    const codes = await db
      .select({ id: knightHacks.HackathonPortalAuthorizationCode.id })
      .from(knightHacks.HackathonPortalAuthorizationCode);
    expect(codes).toHaveLength(0);
  });

  it("rechecks and atomically rejects exchange across an origin cutover", async () => {
    const now = new Date("2026-08-06T15:00:00Z");
    const service = createPortalSessionService({
      environment: "production",
      now: () => now,
      store,
    });
    const verifier = "v".repeat(43);
    const { code } = await service.issueAuthorizationCode({
      betterAuthSessionId,
      clientId,
      pkceChallenge: createPkceChallenge(verifier),
      redirectUri: callback,
      userId,
    });
    let locked!: () => void;
    let release!: () => void;
    const lockedPromise = new Promise<void>((resolve) => (locked = resolve));
    const releasePromise = new Promise<void>((resolve) => (release = resolve));
    const cutover = db.transaction(async (tx) => {
      const [client] = await tx
        .select({ id: knightHacks.HackathonPortalClient.id })
        .from(knightHacks.HackathonPortalClient)
        .where(eq(knightHacks.HackathonPortalClient.clientId, clientId))
        .for("update")
        .limit(1);
      if (!client) throw new Error("Portal client missing.");
      await tx
        .update(knightHacks.HackathonPortalClient)
        .set({ productionOrigin: "https://new-store.knighthacks.org" })
        .where(eq(knightHacks.HackathonPortalClient.id, client.id));
      locked();
      await releasePromise;
      await tx
        .delete(knightHacks.HackathonPortalAuthorizationCode)
        .where(
          eq(
            knightHacks.HackathonPortalAuthorizationCode.portalClientId,
            client.id,
          ),
        );
      await tx
        .update(knightHacks.HackathonPortalSession)
        .set({ revokedAt: now })
        .where(
          eq(knightHacks.HackathonPortalSession.portalClientId, client.id),
        );
    });
    await lockedPromise;
    const exchange = service.exchangeAuthorizationCode({
      clientId,
      code,
      pkceVerifier: verifier,
      redirectUri: callback,
    });
    const exchangeExpectation = expect(exchange).rejects.toMatchObject({
      code: "INVALID_CALLBACK",
    });
    await new Promise<void>((resolve) => setImmediate(resolve));
    release();
    await cutover;

    await exchangeExpectation;
    const sessions = await db
      .select({ id: knightHacks.HackathonPortalSession.id })
      .from(knightHacks.HackathonPortalSession);
    expect(sessions).toHaveLength(0);
  });

  it("keeps refresh-family expiry absolute and prunes expired access history", async () => {
    let current = new Date("2026-08-06T16:00:00Z");
    const familyExpiresAt = new Date(
      current.getTime() + PORTAL_REFRESH_TOKEN_TTL_MS,
    );
    const { service, tokens: first } = await authorize(() => current);
    current = new Date(current.getTime() + PORTAL_ACCESS_TOKEN_TTL_MS + 1_000);
    const second = await service.refresh(first.refreshToken, clientId);
    expect(second.refreshTokenExpiresAt).toEqual(familyExpiresAt);

    const [session] = await db
      .select({
        id: knightHacks.HackathonPortalSession.id,
        refreshExpiresAt: knightHacks.HackathonPortalSession.refreshExpiresAt,
      })
      .from(knightHacks.HackathonPortalSession)
      .where(
        eq(
          knightHacks.HackathonPortalSession.refreshTokenHash,
          hashPortalToken(second.refreshToken),
        ),
      );
    expect(session?.refreshExpiresAt).toEqual(familyExpiresAt);

    const cleanupAt = new Date(
      current.getTime() + PORTAL_ACCESS_TOKEN_TTL_MS + 1_000,
    );
    const { cleanupPortalCredentials } =
      await import("../portal-session-store");
    const cleaned = await cleanupPortalCredentials(cleanupAt);
    expect(cleaned.credentials).toBeGreaterThanOrEqual(2);
    const credentials = await db
      .select({
        expiresAt: knightHacks.HackathonPortalSessionCredential.expiresAt,
        kind: knightHacks.HackathonPortalSessionCredential.tokenKind,
      })
      .from(knightHacks.HackathonPortalSessionCredential)
      .where(
        eq(
          knightHacks.HackathonPortalSessionCredential.portalSessionId,
          session?.id ?? randomUUID(),
        ),
      );
    expect(
      credentials.some(
        (credential) =>
          credential.kind === "access" && credential.expiresAt < cleanupAt,
      ),
    ).toBe(false);
    expect(credentials.filter(({ kind }) => kind === "refresh")).toHaveLength(
      2,
    );

    current = familyExpiresAt;
    await expect(
      service.refresh(second.refreshToken, clientId),
    ).rejects.toMatchObject({ code: "SESSION_EXPIRED" });
  });
});
