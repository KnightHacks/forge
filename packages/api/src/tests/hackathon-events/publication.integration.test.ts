import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { db } from "@forge/db/client";
import type * as AuthSchemaModule from "@forge/db/schemas/auth";
import type * as KnightHacksSchemaModule from "@forge/db/schemas/knight-hacks";
import type { DisposableDatabase } from "@forge/db/testing";
import { and, eq } from "@forge/db";
import {
  canRunDatabaseTests,
  provisionDisposableDatabase,
} from "@forge/db/testing";

import type {
  claimEventPublicationWork,
  ensureEventPublicationWork,
  executeEventPublicationWork,
  loadEventPublicationHealth,
  lockHackathonEventPublicationScope,
  setEventPublicationDesiredState,
} from "../../utils/hackathon-events/publication";

type AuthSchemas = typeof AuthSchemaModule;
type ClaimWork = typeof claimEventPublicationWork;
type DatabaseClient = typeof db;
type EnsureWork = typeof ensureEventPublicationWork;
type ExecuteWork = typeof executeEventPublicationWork;
type KnightHacksSchemas = typeof KnightHacksSchemaModule;
type LoadHealth = typeof loadEventPublicationHealth;
type LockScope = typeof lockHackathonEventPublicationScope;
type SetDesired = typeof setEventPublicationDesiredState;

const ACTOR_ID = "10000000-0000-4000-8000-000000000701";
const HACKATHON_ID = "20000000-0000-4000-8000-000000000701";
const EVENT_ID = "30000000-0000-4000-8000-000000000701";
const PRIMARY_ID = "30000000-0000-4000-8000-000000000702";
const FUTURE_ID = "30000000-0000-4000-8000-000000000703";
const NOOP_AUDIT = () => Promise.resolve();

describe.skipIf(!canRunDatabaseTests())(
  "hackathon event publication desired state",
  () => {
    let auth: AuthSchemas;
    let claim: ClaimWork;
    let client: DatabaseClient;
    let disposable: DisposableDatabase | undefined;
    let ensureWork: EnsureWork;
    let executeWork: ExecuteWork;
    let knightHacks: KnightHacksSchemas;
    let loadHealth: LoadHealth;
    let lockScope: LockScope;
    let setDesired: SetDesired;

    beforeAll(async () => {
      disposable = await provisionDisposableDatabase("forge_hack_publication");
      // eslint-disable-next-line no-restricted-properties
      process.env.DATABASE_URL = disposable.url;
      ({ db: client } = await import("@forge/db/client"));
      auth = await import("@forge/db/schemas/auth");
      knightHacks = await import("@forge/db/schemas/knight-hacks");
      ({
        claimEventPublicationWork: claim,
        ensureEventPublicationWork: ensureWork,
        executeEventPublicationWork: executeWork,
        loadEventPublicationHealth: loadHealth,
        lockHackathonEventPublicationScope: lockScope,
        setEventPublicationDesiredState: setDesired,
      } = await import("../../utils/hackathon-events/publication"));
      await client.insert(auth.User).values({
        discordUserId: "990000000000000701",
        id: ACTOR_ID,
        name: "Publication Operator",
      });
    }, 120_000);

    afterAll(async () => {
      await client.$client.end().catch(() => undefined);
      await disposable?.drop();
    });

    beforeEach(async () => {
      await client.delete(knightHacks.EventPublicationWork);
      await client.delete(knightHacks.HackathonEventPublication);
      await client.delete(knightHacks.Event);
      await client.delete(knightHacks.Hackathon);
      await client.insert(knightHacks.Hackathon).values({
        applicationDeadline: new Date("2026-07-01T00:00:00.000Z"),
        applicationOpen: new Date("2026-06-01T00:00:00.000Z"),
        confirmationDeadline: new Date("2026-07-15T00:00:00.000Z"),
        displayName: "Publication Hackathon",
        endDate: new Date("2026-08-10T00:00:00.000Z"),
        id: HACKATHON_ID,
        name: "publication-hackathon",
        startDate: new Date("2026-08-05T00:00:00.000Z"),
        theme: "Publication",
      });
      await client.insert(knightHacks.Event).values([
        event(EVENT_ID),
        event(PRIMARY_ID, {
          name: "Overall check-in",
          purpose: "primary_check_in",
        }),
      ]);
    });

    function event(
      id: string,
      overrides: Partial<typeof knightHacks.Event.$inferInsert> = {},
    ): typeof knightHacks.Event.$inferInsert {
      return {
        creationKey: id,
        creationPayloadHash: id.replaceAll("-", "").padEnd(64, "0"),
        description: "Publication fixture",
        end_datetime: new Date("2026-08-05T18:00:00.000Z"),
        hackathonId: HACKATHON_ID,
        id,
        legacy: false,
        location: "Venue",
        name: "Workshop",
        points: 10,
        start_datetime: new Date("2026-08-05T17:00:00.000Z"),
        tag: "Hackathon",
        ...overrides,
      };
    }

    it("[TC-PUB-001] initializes both providers as healthy database-only state", async () => {
      const health = await loadHealth(HACKATHON_ID);

      expect(health.providers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            desiredEnabled: false,
            provider: "discord",
            status: "off",
          }),
          expect.objectContaining({
            desiredEnabled: false,
            provider: "google",
            status: "off",
          }),
        ]),
      );
      const events = await client.select().from(knightHacks.Event);
      expect(events).toHaveLength(2);
      expect(events.every((row) => row.discordSyncState === "disabled")).toBe(
        true,
      );
      expect(events.every((row) => row.googleSyncState === "disabled")).toBe(
        true,
      );
    });

    it("[TC-PUB-002] enables one provider and durably covers every event", async () => {
      await loadHealth(HACKATHON_ID);
      const health = await setDesired({
        actorId: ACTOR_ID,
        audit: NOOP_AUDIT,
        desiredEnabled: true,
        expectedRevision: 1,
        hackathonId: HACKATHON_ID,
        provider: "discord",
      });

      expect(
        health.providers.find((provider) => provider.provider === "discord"),
      ).toMatchObject({ desiredEnabled: true, status: "publishing" });
      expect(
        health.providers.find((provider) => provider.provider === "google"),
      ).toMatchObject({ desiredEnabled: false, status: "off" });
      const work = await client.select().from(knightHacks.EventPublicationWork);
      expect(work.filter((row) => row.provider === "discord")).toHaveLength(2);
      expect(
        work
          .filter((row) => row.provider === "discord")
          .every((row) => row.state === "pending" && row.targetEnabled),
      ).toBe(true);
      expect(await claim({ limit: 10 })).toHaveLength(2);
    });

    it("[TC-PUB-003] queues future events only for providers that are on", async () => {
      await loadHealth(HACKATHON_ID);
      await setDesired({
        actorId: ACTOR_ID,
        audit: NOOP_AUDIT,
        desiredEnabled: true,
        expectedRevision: 1,
        hackathonId: HACKATHON_ID,
        provider: "discord",
      });
      await client.insert(knightHacks.Event).values(event(FUTURE_ID));
      await ensureWork({ eventIds: [FUTURE_ID], hackathonId: HACKATHON_ID });

      const work = await client
        .select()
        .from(knightHacks.EventPublicationWork)
        .where(eq(knightHacks.EventPublicationWork.eventId, FUTURE_ID));
      expect(work).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            provider: "discord",
            state: "pending",
            targetEnabled: true,
          }),
          expect.objectContaining({
            provider: "google",
            state: "succeeded",
            targetEnabled: false,
          }),
        ]),
      );
    });

    it("serializes event creation with an enable toggle", async () => {
      await loadHealth(HACKATHON_ID);
      let releaseWriter!: () => void;
      const writerRelease = new Promise<void>((resolve) => {
        releaseWriter = resolve;
      });
      let markWriterReady!: () => void;
      const writerReady = new Promise<void>((resolve) => {
        markWriterReady = resolve;
      });
      const writer = client.transaction(async (tx) => {
        await tx.insert(knightHacks.Event).values(event(FUTURE_ID));
        await ensureWork({
          database: tx,
          eventIds: [FUTURE_ID],
          hackathonId: HACKATHON_ID,
        });
        markWriterReady();
        await writerRelease;
      });
      await writerReady;

      const toggle = setDesired({
        actorId: ACTOR_ID,
        audit: NOOP_AUDIT,
        desiredEnabled: true,
        expectedRevision: 1,
        hackathonId: HACKATHON_ID,
        provider: "discord",
      });
      const outcome = await Promise.race([
        toggle.then(() => "settled" as const),
        new Promise<"blocked">((resolve) =>
          setTimeout(() => resolve("blocked"), 100),
        ),
      ]);
      releaseWriter();
      await writer;
      await toggle;

      expect(outcome).toBe("blocked");
      const [work] = await client
        .select()
        .from(knightHacks.EventPublicationWork)
        .where(
          and(
            eq(knightHacks.EventPublicationWork.eventId, FUTURE_ID),
            eq(knightHacks.EventPublicationWork.provider, "discord"),
          ),
        );
      expect(work).toMatchObject({
        publicationRevision: 2,
        state: "pending",
        targetEnabled: true,
      });
    });

    it("serializes immediate event deletion before an enable toggle snapshots events", async () => {
      await loadHealth(HACKATHON_ID);
      let releaseDelete!: () => void;
      const deleteRelease = new Promise<void>((resolve) => {
        releaseDelete = resolve;
      });
      let markDeleteReady!: () => void;
      const deleteReady = new Promise<void>((resolve) => {
        markDeleteReady = resolve;
      });
      const deletion = client.transaction(async (tx) => {
        await lockScope(tx, HACKATHON_ID);
        markDeleteReady();
        await deleteRelease;
        await tx
          .delete(knightHacks.Event)
          .where(eq(knightHacks.Event.id, EVENT_ID));
      });
      await deleteReady;

      const toggle = setDesired({
        actorId: ACTOR_ID,
        audit: NOOP_AUDIT,
        desiredEnabled: true,
        expectedRevision: 1,
        hackathonId: HACKATHON_ID,
        provider: "discord",
      });
      const outcome = await Promise.race([
        toggle.then(() => "settled" as const),
        new Promise<"blocked">((resolve) =>
          setTimeout(() => resolve("blocked"), 100),
        ),
      ]);
      releaseDelete();
      await deletion;
      await toggle;

      expect(outcome).toBe("blocked");
      const deletedWork = await client
        .select()
        .from(knightHacks.EventPublicationWork)
        .where(eq(knightHacks.EventPublicationWork.eventId, EVENT_ID));
      expect(deletedWork).toHaveLength(0);
      const [remainingWork] = await client
        .select()
        .from(knightHacks.EventPublicationWork)
        .where(
          and(
            eq(knightHacks.EventPublicationWork.eventId, PRIMARY_ID),
            eq(knightHacks.EventPublicationWork.provider, "discord"),
          ),
        );
      expect(remainingWork).toMatchObject({
        publicationRevision: 2,
        state: "pending",
        targetEnabled: true,
      });
    });

    it("preserves an event when publication completion finds check-in history", async () => {
      await loadHealth(HACKATHON_ID);
      await client
        .update(knightHacks.Event)
        .set({ deletionIntentAt: new Date(), syncRevision: 2 })
        .where(eq(knightHacks.Event.id, EVENT_ID));
      await ensureWork({ eventIds: [EVENT_ID], hackathonId: HACKATHON_ID });
      await client.insert(knightHacks.HackerCheckInAttempt).values({
        attemptedAt: new Date(),
        eventId: EVENT_ID,
        eventNameSnapshot: "Workshop",
        eventPurpose: "event",
        expiresAt: new Date(Date.now() + 60_000),
        hackerNameSnapshot: null,
        hackathonId: HACKATHON_ID,
        mode: "scanner",
        operatorId: ACTOR_ID,
        outcome: "invalid_qr",
      });
      await client
        .update(knightHacks.EventPublicationWork)
        .set({ completedAt: null, nextAttemptAt: new Date(), state: "pending" })
        .where(
          and(
            eq(knightHacks.EventPublicationWork.eventId, EVENT_ID),
            eq(knightHacks.EventPublicationWork.provider, "discord"),
          ),
        );

      const [work] = await claim({ limit: 1 });
      if (!work) throw new Error("Publication work was not claimed.");
      await executeWork(work);

      const [event, attempts] = await Promise.all([
        client.query.Event.findFirst({
          where: eq(knightHacks.Event.id, EVENT_ID),
        }),
        client
          .select()
          .from(knightHacks.HackerCheckInAttempt)
          .where(eq(knightHacks.HackerCheckInAttempt.eventId, EVENT_ID)),
      ]);
      expect(event).toMatchObject({ id: EVENT_ID });
      expect(attempts).toHaveLength(1);
    });

    it("rolls desired-state work back when its required audit fails", async () => {
      await loadHealth(HACKATHON_ID);
      await expect(
        setDesired({
          actorId: ACTOR_ID,
          audit: () => Promise.reject(new Error("audit unavailable")),
          desiredEnabled: true,
          expectedRevision: 1,
          hackathonId: HACKATHON_ID,
          provider: "discord",
        }),
      ).rejects.toThrow("audit unavailable");

      const publication =
        await client.query.HackathonEventPublication.findFirst({
          where: and(
            eq(knightHacks.HackathonEventPublication.hackathonId, HACKATHON_ID),
            eq(knightHacks.HackathonEventPublication.provider, "discord"),
          ),
        });
      const work = await client
        .select()
        .from(knightHacks.EventPublicationWork)
        .where(eq(knightHacks.EventPublicationWork.provider, "discord"));
      expect(publication).toMatchObject({
        desiredEnabled: false,
        revision: 1,
      });
      expect(work.every((row) => row.targetEnabled === false)).toBe(true);
    });

    it("rolls retry work back when its required audit fails", async () => {
      await loadHealth(HACKATHON_ID);
      await client
        .update(knightHacks.EventPublicationWork)
        .set({
          lastError: "provider unavailable",
          nextAttemptAt: new Date("2026-08-06T00:00:00.000Z"),
          state: "failed",
        })
        .where(
          and(
            eq(knightHacks.EventPublicationWork.eventId, EVENT_ID),
            eq(knightHacks.EventPublicationWork.provider, "discord"),
          ),
        );

      const { retryEventPublication } =
        await import("../../utils/hackathon-events/publication");
      await expect(
        retryEventPublication({
          audit: () => Promise.reject(new Error("audit unavailable")),
          eventIds: [EVENT_ID],
          hackathonId: HACKATHON_ID,
          provider: "discord",
        }),
      ).rejects.toThrow("audit unavailable");
      const [work] = await client
        .select()
        .from(knightHacks.EventPublicationWork)
        .where(
          and(
            eq(knightHacks.EventPublicationWork.eventId, EVENT_ID),
            eq(knightHacks.EventPublicationWork.provider, "discord"),
          ),
        );
      expect(work).toMatchObject({
        lastError: "provider unavailable",
        state: "failed",
      });
    });

    it("[TC-PUB-004] rejects stale destructive revision and remote-count confirmations", async () => {
      await loadHealth(HACKATHON_ID);
      await setDesired({
        actorId: ACTOR_ID,
        audit: NOOP_AUDIT,
        desiredEnabled: true,
        expectedRevision: 1,
        hackathonId: HACKATHON_ID,
        provider: "discord",
      });

      await expect(
        setDesired({
          actorId: ACTOR_ID,
          audit: NOOP_AUDIT,
          desiredEnabled: false,
          expectedRemoteCount: 0,
          expectedRevision: 1,
          hackathonId: HACKATHON_ID,
          provider: "discord",
        }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
      await expect(
        setDesired({
          actorId: ACTOR_ID,
          audit: NOOP_AUDIT,
          desiredEnabled: false,
          expectedRemoteCount: 1,
          expectedRevision: 2,
          hackathonId: HACKATHON_ID,
          provider: "discord",
        }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
      const publication =
        await client.query.HackathonEventPublication.findFirst({
          where: and(
            eq(knightHacks.HackathonEventPublication.hackathonId, HACKATHON_ID),
            eq(knightHacks.HackathonEventPublication.provider, "discord"),
          ),
        });
      expect(publication?.desiredEnabled).toBe(true);
    });
  },
);
