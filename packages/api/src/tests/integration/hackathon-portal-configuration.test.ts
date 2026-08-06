import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Session } from "@forge/auth/server";
import type { DisposableDatabase } from "@forge/db/testing";
import { and, eq, isNull } from "@forge/db";
import {
  canRunDatabaseTests,
  provisionDisposableDatabase,
} from "@forge/db/testing";

import { permissionBitstring } from "../support/permissions";

type DatabaseClient = typeof import("@forge/db/client").db;
type AuditSchemas = typeof import("@forge/db/schemas/audit");
type AuthSchemas = typeof import("@forge/db/schemas/auth");
type KnightHacksSchemas = typeof import("@forge/db/schemas/knight-hacks");

const OFFICER_USER = "10000000-0000-4000-8000-0000000000e1";
const OFFICER_ROLE = "30000000-0000-4000-8000-0000000000e1";
const HACKATHON_ID = "50000000-0000-4000-8000-0000000000e1";
const OTHER_HACKATHON_ID = "50000000-0000-4000-8000-0000000000e2";

describe.skipIf(!canRunDatabaseTests())(
  "hackathon portal configuration",
  () => {
    let disposable: DisposableDatabase | undefined;
    let client: DatabaseClient;
    let audit: AuditSchemas;
    let auth: AuthSchemas;
    let knightHacks: KnightHacksSchemas;
    let caller: Awaited<ReturnType<typeof officerCaller>>;

    async function officerCaller() {
      const trpc = await import("../../trpc");
      const { hackathonRouter } = await import("../../routers/hackathon");
      return trpc.createCallerFactory(
        trpc.createTRPCRouter({ hackathon: hackathonRouter }),
      )({
        headers: new Headers(),
        session: {
          session: { id: "portal-config", userAgent: "vitest" },
          user: { id: OFFICER_USER, name: "Portal Officer" },
        } as unknown as Session,
        source: "hackathon-portal-config-integration",
      });
    }

    beforeAll(async () => {
      disposable = await provisionDisposableDatabase("forge_api");
      // eslint-disable-next-line no-restricted-properties
      process.env.DATABASE_URL = disposable.url;

      ({ db: client } = await import("@forge/db/client"));
      audit = await import("@forge/db/schemas/audit");
      auth = await import("@forge/db/schemas/auth");
      knightHacks = await import("@forge/db/schemas/knight-hacks");

      await client.insert(auth.User).values({
        discordUserId: "portal-officer",
        id: OFFICER_USER,
      });
      await client.insert(auth.Roles).values({
        discordRoleId: "990000000000000801",
        id: OFFICER_ROLE,
        name: "Officers",
        permissions: permissionBitstring("IS_OFFICER"),
      });
      await client
        .insert(auth.Permissions)
        .values({ roleId: OFFICER_ROLE, userId: OFFICER_USER });

      const window = {
        applicationDeadline: new Date("2026-09-01T00:00:00Z"),
        applicationOpen: new Date("2026-08-01T00:00:00Z"),
        confirmationDeadline: new Date("2026-09-15T00:00:00Z"),
        endDate: new Date("2026-10-03T00:00:00Z"),
        startDate: new Date("2026-10-01T00:00:00Z"),
        theme: "Portal",
      };
      await client.insert(knightHacks.Hackathon).values([
        {
          ...window,
          displayName: "Knight Hacks X",
          id: HACKATHON_ID,
          name: "knight-hacks-x",
        },
        {
          ...window,
          displayName: "BloomKnights 2027",
          id: OTHER_HACKATHON_ID,
          name: "bloomknights-2027",
        },
      ]);

      caller = await officerCaller();
    }, 120_000);

    afterAll(async () => {
      await client.$client.end().catch(() => undefined);
      await disposable?.drop();
    }, 30_000);

    it("provisions exactly one client and preserves its generated client ID", async () => {
      const created = await caller.hackathon.upsertPortalClient({
        enabled: true,
        hackathonId: HACKATHON_ID,
        name: "KHX website",
        productionOrigin: "https://x.knighthacks.org",
      });
      expect(created.clientId).toMatch(/^forge_[A-Za-z0-9_-]{32}$/);

      await client.insert(auth.Session).values({
        expires: new Date("2027-01-01T00:00:00Z"),
        id: "portal-origin-change-session",
        sessionToken: "portal-origin-change-token",
        userId: OFFICER_USER,
      });
      await client.insert(knightHacks.HackathonPortalAuthorizationCode).values({
        betterAuthSessionId: "portal-origin-change-session",
        codeChallenge: "c".repeat(43),
        codeHash: "a".repeat(64),
        expiresAt: new Date("2027-01-01T00:00:00Z"),
        hackathonId: HACKATHON_ID,
        portalClientId: created.id,
        redirectUri: "https://x.knighthacks.org/api/hacker-sdk/callback",
        userId: OFFICER_USER,
      });
      await client.insert(knightHacks.HackathonPortalSession).values({
        accessExpiresAt: new Date("2027-01-01T00:00:00Z"),
        accessTokenHash: "b".repeat(64),
        betterAuthSessionId: "portal-origin-change-session",
        hackathonId: HACKATHON_ID,
        portalClientId: created.id,
        refreshExpiresAt: new Date("2027-01-01T00:00:00Z"),
        refreshTokenHash: "c".repeat(64),
        userId: OFFICER_USER,
      });

      const updated = await caller.hackathon.upsertPortalClient({
        enabled: false,
        hackathonId: HACKATHON_ID,
        name: "Knight Hacks X production",
        productionOrigin: "https://khx.knighthacks.org",
      });
      expect(updated).toMatchObject({
        clientId: created.clientId,
        enabled: false,
        id: created.id,
        productionOrigin: "https://khx.knighthacks.org",
      });

      const rows = await client
        .select()
        .from(knightHacks.HackathonPortalClient)
        .where(eq(knightHacks.HackathonPortalClient.hackathonId, HACKATHON_ID));
      expect(rows).toHaveLength(1);
      const [codes, sessions] = await Promise.all([
        client
          .select({ id: knightHacks.HackathonPortalAuthorizationCode.id })
          .from(knightHacks.HackathonPortalAuthorizationCode)
          .where(
            eq(
              knightHacks.HackathonPortalAuthorizationCode.portalClientId,
              created.id,
            ),
          ),
        client
          .select({ revokedAt: knightHacks.HackathonPortalSession.revokedAt })
          .from(knightHacks.HackathonPortalSession)
          .where(
            eq(knightHacks.HackathonPortalSession.portalClientId, created.id),
          ),
      ]);
      expect(codes).toHaveLength(0);
      expect(sessions[0]?.revokedAt).toBeInstanceOf(Date);

      await caller.hackathon.upsertPortalClient({
        enabled: true,
        hackathonId: HACKATHON_ID,
        name: "Knight Hacks X production",
        productionOrigin: "https://khx.knighthacks.org",
      });
      await client.insert(knightHacks.HackathonPortalAuthorizationCode).values({
        betterAuthSessionId: "portal-origin-change-session",
        codeChallenge: "d".repeat(43),
        codeHash: "d".repeat(64),
        expiresAt: new Date("2027-01-01T00:00:00Z"),
        hackathonId: HACKATHON_ID,
        portalClientId: created.id,
        redirectUri: "https://khx.knighthacks.org/api/hacker-sdk/callback",
        userId: OFFICER_USER,
      });
      await client.insert(knightHacks.HackathonPortalSession).values({
        accessExpiresAt: new Date("2027-01-01T00:00:00Z"),
        accessTokenHash: "e".repeat(64),
        betterAuthSessionId: "portal-origin-change-session",
        hackathonId: HACKATHON_ID,
        portalClientId: created.id,
        refreshExpiresAt: new Date("2027-01-01T00:00:00Z"),
        refreshTokenHash: "f".repeat(64),
        userId: OFFICER_USER,
      });
      await caller.hackathon.upsertPortalClient({
        enabled: false,
        hackathonId: HACKATHON_ID,
        name: "Knight Hacks X production",
        productionOrigin: "https://khx.knighthacks.org",
      });
      const [remainingCode] = await client
        .select({ id: knightHacks.HackathonPortalAuthorizationCode.id })
        .from(knightHacks.HackathonPortalAuthorizationCode)
        .where(
          eq(
            knightHacks.HackathonPortalAuthorizationCode.portalClientId,
            created.id,
          ),
        );
      const activeSessions = await client
        .select({ id: knightHacks.HackathonPortalSession.id })
        .from(knightHacks.HackathonPortalSession)
        .where(
          and(
            eq(knightHacks.HackathonPortalSession.portalClientId, created.id),
            isNull(knightHacks.HackathonPortalSession.revokedAt),
          ),
        );
      expect(remainingCode).toBeUndefined();
      expect(activeSessions).toHaveLength(0);

      const detail = await caller.hackathon.get({ id: HACKATHON_ID });
      expect(detail.portalClient).toMatchObject({
        clientId: created.clientId,
        enabled: false,
      });
    });

    it("does not let two hackathons claim the same production origin", async () => {
      await expect(
        caller.hackathon.upsertPortalClient({
          enabled: true,
          hackathonId: OTHER_HACKATHON_ID,
          name: "Bloom production",
          productionOrigin: "https://khx.knighthacks.org",
        }),
      ).rejects.toMatchObject({
        code: "CONFLICT",
        message:
          "That production origin is already registered to another hackathon.",
      });
    });

    it("persists the timezone and confirmation capacity through the officer contract", async () => {
      await caller.hackathon.update({
        applicationDeadline: new Date("2026-09-01T00:00:00Z"),
        applicationOpen: new Date("2026-08-01T00:00:00Z"),
        applicationUrl: "https://x.knighthacks.org/apply",
        confirmationCapacity: 1_200,
        confirmationDeadline: new Date("2026-09-15T00:00:00Z"),
        displayName: "Knight Hacks X",
        endDate: new Date("2026-10-03T00:00:00Z"),
        id: HACKATHON_ID,
        startDate: new Date("2026-10-01T00:00:00Z"),
        theme: "Portal",
        timezone: "America/Los_Angeles",
      });

      const detail = await caller.hackathon.get({ id: HACKATHON_ID });
      expect(detail.hackathon).toMatchObject({
        confirmationCapacity: 1_200,
        timezone: "America/Los_Angeles",
      });

      const [event] = await client
        .select({ changes: audit.AdminAuditEvent.changes })
        .from(audit.AdminAuditEvent)
        .where(eq(audit.AdminAuditEvent.actionKey, "hackathon.updated"));
      expect(event?.changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            after: 1_200,
            before: null,
            field: "confirmationCapacity",
          }),
          expect.objectContaining({
            after: "America/Los_Angeles",
            before: "America/New_York",
            field: "timezone",
          }),
        ]),
      );
    });

    it("keeps historical agreement versions while switching the active one", async () => {
      const first = await caller.hackathon.createAgreement({
        active: true,
        hackathonId: HACKATHON_ID,
        key: "mlh-terms",
        legalText: "MLH terms version one",
        required: true,
        stage: "application",
        title: "MLH terms",
        url: null,
        version: "2026-01",
      });
      const second = await caller.hackathon.createAgreement({
        active: true,
        hackathonId: HACKATHON_ID,
        key: "mlh-terms",
        legalText: "MLH terms version two",
        required: true,
        stage: "application",
        title: "MLH terms",
        url: null,
        version: "2026-08",
      });

      let rows = await client
        .select({
          active: knightHacks.HackathonAgreementDefinition.active,
          id: knightHacks.HackathonAgreementDefinition.id,
        })
        .from(knightHacks.HackathonAgreementDefinition)
        .where(
          and(
            eq(
              knightHacks.HackathonAgreementDefinition.hackathonId,
              HACKATHON_ID,
            ),
            eq(knightHacks.HackathonAgreementDefinition.key, "mlh-terms"),
          ),
        );
      expect(rows).toEqual(
        expect.arrayContaining([
          { active: false, id: first.id },
          { active: true, id: second.id },
        ]),
      );

      await caller.hackathon.activateAgreement({
        active: true,
        definitionId: first.id,
        hackathonId: HACKATHON_ID,
      });
      rows = await client
        .select({
          active: knightHacks.HackathonAgreementDefinition.active,
          id: knightHacks.HackathonAgreementDefinition.id,
        })
        .from(knightHacks.HackathonAgreementDefinition)
        .where(
          eq(
            knightHacks.HackathonAgreementDefinition.hackathonId,
            HACKATHON_ID,
          ),
        );
      expect(rows).toEqual(
        expect.arrayContaining([
          { active: true, id: first.id },
          { active: false, id: second.id },
        ]),
      );
    });

    it("rejects duplicate agreement versions without rewriting the stored row", async () => {
      await expect(
        caller.hackathon.createAgreement({
          active: false,
          hackathonId: HACKATHON_ID,
          key: "mlh-terms",
          legalText: "Different text",
          required: true,
          stage: "application",
          title: "MLH terms",
          url: null,
          version: "2026-01",
        }),
      ).rejects.toMatchObject({ code: "CONFLICT" });

      const [stored] = await client
        .select({
          legalText: knightHacks.HackathonAgreementDefinition.legalText,
        })
        .from(knightHacks.HackathonAgreementDefinition)
        .where(
          and(
            eq(
              knightHacks.HackathonAgreementDefinition.hackathonId,
              HACKATHON_ID,
            ),
            eq(knightHacks.HackathonAgreementDefinition.version, "2026-01"),
          ),
        );
      expect(stored?.legalText).toBe("MLH terms version one");
    });

    it("audits portal and agreement changes without storing legal text", async () => {
      const events = await client
        .select({
          actionKey: audit.AdminAuditEvent.actionKey,
          metadata: audit.AdminAuditEvent.metadata,
        })
        .from(audit.AdminAuditEvent);
      expect(events.map((event) => event.actionKey)).toEqual(
        expect.arrayContaining([
          "hackathon.portal_client_updated",
          "hackathon.agreement_created",
          "hackathon.agreement_activated",
        ]),
      );
      expect(JSON.stringify(events)).not.toContain("MLH terms version");
      expect(
        events.find(
          (event) => event.actionKey === "hackathon.portal_client_updated",
        )?.metadata,
      ).toMatchObject({ enabled: true, originHost: "x.knighthacks.org" });
    });
  },
);
