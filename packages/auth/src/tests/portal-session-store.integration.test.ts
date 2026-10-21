import { randomUUID } from "node:crypto";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

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
import { refreshConcurrently } from "./portal-refresh-concurrency";

type DatabaseClient = typeof databaseClient;
type AuthSchemas = typeof AuthSchemaModule;
type KnightHacksSchemas = typeof KnightHacksSchemaModule;
type PortalStore = typeof databasePortalSessionStore;

const describeClient = describe
  .skipIf(!canRunDatabaseTests())
  .each(["hackathon", "projects"] as const);

describeClient("portal store (%s)", (clientKind) => {
  let disposable: DisposableDatabase | undefined;
  let db: DatabaseClient;
  let auth: AuthSchemas;
  let knightHacks: KnightHacksSchemas;
  let store: PortalStore;
  const userId = "10000000-0000-4000-8000-0000000000a1";
  const hackathonId = "50000000-0000-4000-8000-0000000000a1";
  const betterAuthSessionId = "portal-store-better-auth";
  const clientId =
    clientKind === "projects" ? "projects" : "portal-store-client";
  const origin =
    clientKind === "projects"
      ? "https://projects.knighthacks.org"
      : "https://store-test.knighthacks.org";
  const callback =
    clientKind === "projects"
      ? `${origin}/api/projects-auth/callback`
      : `${origin}/api/hacker-sdk/callback`;

  beforeAll(async () => {
    disposable = await provisionDisposableDatabase("forge_auth");
    // eslint-disable-next-line no-restricted-properties
    process.env.DATABASE_URL = disposable.url;
    vi.resetModules();
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
    if (clientKind === "hackathon")
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
      clientKind,
      hackathonId: clientKind === "projects" ? null : hackathonId,
      name: "Store test portal",
      productionOrigin: origin,
    });
  }, 120_000);

  afterAll(async () => {
    await db.$client.end().catch(() => undefined);
    await disposable?.drop();
  }, 30_000);

  beforeEach(async () => {
    await db
      .update(auth.Session)
      .set({ expires: new Date("2027-01-01T00:00:00Z") })
      .where(eq(auth.Session.id, betterAuthSessionId));
    await db.delete(knightHacks.HackathonPortalAuthorizationCode);
    await db.delete(knightHacks.HackathonPortalSession);
    await db
      .update(knightHacks.HackathonPortalClient)
      .set({
        enabled: true,
        productionOrigin: origin,
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

  it("preserves a family across overlapping refreshes and enforces the grace boundary", async () => {
    let current = new Date("2026-08-06T13:00:00Z");
    const issuedAt = current.getTime();
    const { service, tokens: first } = await authorize(() => current);
    const results = await refreshConcurrently(
      db,
      hashPortalToken(first.refreshToken),
      () => service.refresh(first.refreshToken, clientId),
    );
    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(
      1,
    );
    expect(results.find(({ status }) => status === "rejected")).toMatchObject({
      reason: { code: "REFRESH_RETRY" },
    });
    const winner = results.find((result) => result.status === "fulfilled");
    if (!winner) throw new Error("No refresh winner.");
    await expect(
      service.authenticate(winner.value.accessToken, clientId),
    ).resolves.toMatchObject({ userId });
    const next = await service.refresh(winner.value.refreshToken, clientId);
    current = new Date(issuedAt + PORTAL_CONCURRENT_REFRESH_GRACE_MS);
    await expect(
      service.refresh(first.refreshToken, clientId),
    ).rejects.toMatchObject({ code: "REFRESH_RETRY" });
    await expect(
      service.authenticate(next.accessToken, clientId),
    ).resolves.toMatchObject({ userId });
    current = new Date(current.getTime() + 1);
    await expect(
      service.refresh(first.refreshToken, clientId),
    ).rejects.toMatchObject({ code: "SESSION_EXPIRED" });
    await expect(
      service.authenticate(next.accessToken, clientId),
    ).rejects.toMatchObject({ code: "SESSION_EXPIRED" });
  });

  it.skipIf(clientKind === "projects")(
    "rechecks the callback after a concurrent origin cutover before issuing",
    async () => {
      const service = createPortalSessionService({
        environment: "production",
        now: () => new Date("2026-08-06T14:00:00Z"),
        store,
      });
      let locked!: () => void;
      let release!: () => void;
      const lockedPromise = new Promise<void>((resolve) => (locked = resolve));
      const releasePromise = new Promise<void>(
        (resolve) => (release = resolve),
      );
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
    },
  );

  it.skipIf(clientKind === "projects")(
    "rechecks and atomically rejects exchange across an origin cutover",
    async () => {
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
      const releasePromise = new Promise<void>(
        (resolve) => (release = resolve),
      );
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
    },
  );

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
  it("authenticates only under its registered audience and active parent", async () => {
    const current = new Date("2026-08-06T12:00:00Z");
    const { service, tokens } = await authorize(() => current);
    await expect(
      service.authenticate(tokens.accessToken, clientId),
    ).resolves.toMatchObject({
      clientKind,
      hackathonId: clientKind === "projects" ? null : hackathonId,
      userId,
    });
    await expect(
      service.authenticate(tokens.accessToken, "unknown-client"),
    ).rejects.toMatchObject({ code: "INVALID_CLIENT" });
    await db
      .update(auth.Session)
      .set({ expires: current })
      .where(eq(auth.Session.id, betterAuthSessionId));
    await expect(
      service.authenticate(tokens.accessToken, clientId),
    ).rejects.toMatchObject({ code: "SESSION_EXPIRED" });
    await expect(
      service.refresh(tokens.refreshToken, clientId),
    ).rejects.toMatchObject({ code: "SESSION_EXPIRED" });
  });

  it("rejects wrong verifiers, expired codes, and replay without changing the audience", async () => {
    let current = new Date("2026-08-06T12:00:00Z");
    const service = createPortalSessionService({
      environment: "production",
      now: () => current,
      store,
    });
    const request = {
      clientId,
      redirectUri: callback,
      pkceChallenge: createPkceChallenge("v".repeat(43)),
      userId,
      betterAuthSessionId,
    };
    const { code } = await service.issueAuthorizationCode(request);
    const exchange = {
      clientId,
      code,
      redirectUri: callback,
      pkceVerifier: "v".repeat(43),
    };
    await expect(
      service.exchangeAuthorizationCode({
        ...exchange,
        pkceVerifier: "x".repeat(43),
      }),
    ).rejects.toMatchObject({ code: "INVALID_GRANT" });
    await service.exchangeAuthorizationCode(exchange);
    await expect(
      service.exchangeAuthorizationCode(exchange),
    ).rejects.toMatchObject({ code: "INVALID_GRANT" });
    const expired = await service.issueAuthorizationCode(request);
    current = new Date(current.getTime() + 5 * 60 * 1000);
    await expect(
      service.exchangeAuthorizationCode({ ...exchange, code: expired.code }),
    ).rejects.toMatchObject({ code: "INVALID_GRANT" });
  });

  it.skipIf(clientKind !== "projects")(
    "rejects code exchange after parent expiry",
    async () => {
      const now = new Date("2026-08-06T12:00:00Z");
      const service = createPortalSessionService({
        environment: "production",
        now: () => now,
        store,
      });
      const { code } = await service.issueAuthorizationCode({
        clientId,
        redirectUri: callback,
        pkceChallenge: createPkceChallenge("v".repeat(43)),
        userId,
        betterAuthSessionId,
      });
      await db
        .update(auth.Session)
        .set({ expires: now })
        .where(eq(auth.Session.id, betterAuthSessionId));
      await expect(
        service.exchangeAuthorizationCode({
          clientId,
          code,
          redirectUri: callback,
          pkceVerifier: "v".repeat(43),
        }),
      ).rejects.toMatchObject({ code: "INVALID_GRANT" });
      expect(
        await db.select().from(knightHacks.HackathonPortalSession),
      ).toHaveLength(0);
    },
  );

  it("blocks disabled clients but keeps stale-token revocation available", async () => {
    const now = new Date("2026-08-06T12:00:00Z");
    const { service, tokens } = await authorize(() => now);
    const rotated = await service.refresh(tokens.refreshToken, clientId);
    await db
      .update(knightHacks.HackathonPortalClient)
      .set({ enabled: false })
      .where(eq(knightHacks.HackathonPortalClient.clientId, clientId));
    await expect(
      service.authenticate(rotated.accessToken, clientId),
    ).rejects.toMatchObject({ code: "INVALID_CLIENT" });
    await expect(
      service.refresh(rotated.refreshToken, clientId),
    ).rejects.toMatchObject({ code: "INVALID_CLIENT" });
    await expect(
      service.issueAuthorizationCode({
        clientId,
        redirectUri: callback,
        pkceChallenge: createPkceChallenge("v".repeat(43)),
        userId,
        betterAuthSessionId,
      }),
    ).rejects.toMatchObject({ code: "INVALID_CLIENT" });
    await service.revoke(clientId, { refreshToken: tokens.refreshToken });
    await db
      .update(knightHacks.HackathonPortalClient)
      .set({ enabled: true })
      .where(eq(knightHacks.HackathonPortalClient.clientId, clientId));
    await expect(
      service.authenticate(rotated.accessToken, clientId),
    ).rejects.toMatchObject({ code: "SESSION_EXPIRED" });
  });
});
