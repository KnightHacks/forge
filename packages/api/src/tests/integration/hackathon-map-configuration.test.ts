import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Session } from "@forge/auth/server";
import type { DisposableDatabase } from "@forge/db/testing";
import { eq } from "@forge/db";
import {
  applyMigration,
  canRunDatabaseTests,
  provisionDisposableDatabase,
  readMigrations,
} from "@forge/db/testing";

import { permissionBitstring } from "../support/permissions";

type DatabaseClient = typeof import("@forge/db/client").db;
type Schemas = typeof import("@forge/db/schemas/knight-hacks");
const userId = randomUUID();
const hackathonId = randomUUID();
const otherId = randomUUID();
const instant = new Date("2026-10-01T12:00:00Z");
const session: Session = {
  session: {
    id: "map-test",
    userId,
    createdAt: instant,
    updatedAt: instant,
    expiresAt: new Date("2027-01-01"),
    token: "test",
  },
  user: {
    id: userId,
    name: "Map Officer",
    discordUserId: "map-officer",
    email: "map@example.test",
    emailVerified: true,
    createdAt: instant,
    updatedAt: instant,
  },
};

describe.runIf(canRunDatabaseTests())("hackathon map configuration", () => {
  let disposable: DisposableDatabase;
  let db: DatabaseClient;
  let schemas: Schemas;
  let caller: Awaited<ReturnType<typeof createCaller>>;

  async function createCaller() {
    const { createCallerFactory } = await import("../../trpc");
    const { hackathonRouter } = await import("../../routers/hackathon");
    return createCallerFactory(hackathonRouter)({
      headers: new Headers(),
      session,
      source: "map-integration",
    });
  }
  async function participant(id: string, authenticated = true) {
    const { createHackerPortalRouter, participantProcedure } =
      await import("../../hacker-portal/trpc");
    const { getMapConfiguration } = await import("../../hacker-portal/reads");
    const router = createHackerPortalRouter({
      getMapConfiguration: participantProcedure.query(({ ctx }) =>
        getMapConfiguration(ctx),
      ),
    });
    const clientRecordId = randomUUID();
    return router.createCaller({
      client: {
        clientId: "test-client",
        enabled: true,
        hackathonId: id,
        id: clientRecordId,
        origin: "http://localhost:3007",
      },
      headers: new Headers(),
      requestId: randomUUID(),
      session: authenticated
        ? {
            betterAuthSessionId: "map-test",
            clientRecordId,
            hackathonId: id,
            id: randomUUID(),
            userId,
          }
        : null,
    });
  }
  beforeAll(async () => {
    disposable = await provisionDisposableDatabase("forge_map");
    // eslint-disable-next-line no-restricted-properties -- The loopback-only harness owns this database.
    process.env.DATABASE_URL = disposable.url;
    ({ db } = await import("@forge/db/client"));
    schemas = await import("@forge/db/schemas/knight-hacks");
    const auth = await import("@forge/db/schemas/auth");
    await db.insert(auth.User).values({
      id: userId,
      name: "Map Officer",
      discordUserId: "map-officer",
    });
    const roleId = randomUUID();
    await db.insert(auth.Roles).values({
      id: roleId,
      discordRoleId: "990000000000000581",
      name: "Officer",
      permissions: permissionBitstring("IS_OFFICER"),
    });
    await db.insert(auth.Permissions).values({ roleId, userId });
    await db.insert(schemas.Hackathon).values(
      [hackathonId, otherId].map((id) => ({
        id,
        name: `map-${id}`,
        displayName: "Map test",
        theme: "Test",
        startDate: instant,
        endDate: new Date("2026-10-03"),
      })),
    );
    caller = await createCaller();
  }, 120_000);
  afterAll(async () => {
    await db.$client.end();
    await disposable.drop();
  }, 30_000);

  it("supports defaults on fresh install and additive upgrades with existing hackathons", async () => {
    expect(
      (await caller.get({ id: hackathonId })).mapConfiguration,
    ).toMatchObject({ restrictionsEnabled: false, rooms: [] });
    await disposable.client.query(
      "DROP TABLE knight_hacks_hackathon_map_configuration",
    );
    const migration = (await readMigrations()).find((file) =>
      file.name.startsWith("0055_"),
    );
    if (!migration) throw new Error("Map migration missing");
    await applyMigration(disposable.client, migration);
    await disposable.client.query(
      "INSERT INTO knight_hacks_hackathon_map_configuration (hackathon_id) VALUES ($1)",
      [hackathonId],
    );
    expect(
      (await caller.get({ id: hackathonId })).mapConfiguration,
    ).toMatchObject({ restrictionsEnabled: false, rooms: [] });
    expect((await caller.get({ id: otherId })).hackathon.id).toBe(otherId);
  });

  it("saves normalized rooms independently of activation and scopes participant reads before application", async () => {
    const rooms = [
      { buildingId: "hec" as const, roomNumber: " 101a ", name: " Help desk " },
    ];
    await caller.saveMapConfiguration({
      hackathonId,
      restrictionsEnabled: false,
      rooms,
    });
    const hacker = await participant(hackathonId);
    expect(await hacker.getMapConfiguration()).toEqual({
      restrictionsEnabled: false,
      rooms: [{ buildingId: "hec", roomNumber: "101A", name: "Help desk" }],
    });
    expect(await (await participant(otherId)).getMapConfiguration()).toEqual({
      restrictionsEnabled: false,
      rooms: [],
    });
    await expect(
      (await participant(hackathonId, false)).getMapConfiguration(),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await caller.saveMapConfiguration({
      hackathonId,
      restrictionsEnabled: true,
      rooms,
    });
    expect((await hacker.getMapConfiguration()).restrictionsEnabled).toBe(true);
  });

  it("rolls the entire update back when its transactional audit write fails", async () => {
    await disposable.client.query(
      `CREATE FUNCTION fail_map_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action_key = 'hackathon.map_configuration_updated' THEN RAISE EXCEPTION 'test audit failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER fail_map_audit BEFORE INSERT ON audit_event FOR EACH ROW EXECUTE FUNCTION fail_map_audit()`,
    );
    try {
      await expect(
        caller.saveMapConfiguration({
          hackathonId,
          restrictionsEnabled: false,
          rooms: [],
        }),
      ).rejects.toThrow();
      expect(
        (await (await participant(hackathonId)).getMapConfiguration()).rooms,
      ).toHaveLength(1);
      expect(
        (await (await participant(hackathonId)).getMapConfiguration())
          .restrictionsEnabled,
      ).toBe(true);
    } finally {
      await disposable.client.query(
        "DROP TRIGGER fail_map_audit ON audit_event; DROP FUNCTION fail_map_audit()",
      );
    }
  });

  it("rejects unknown hackathons and removes configuration when its hackathon is deleted", async () => {
    await expect(
      caller.saveMapConfiguration({
        hackathonId: randomUUID(),
        restrictionsEnabled: true,
        rooms: [],
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await caller.saveMapConfiguration({
      hackathonId: otherId,
      restrictionsEnabled: true,
      rooms: [],
    });
    await db.delete(schemas.Hackathon).where(eq(schemas.Hackathon.id, otherId));
    expect(
      await db.query.HackathonMapConfiguration.findFirst({
        where: eq(schemas.HackathonMapConfiguration.hackathonId, otherId),
      }),
    ).toBeUndefined();
  });
});
