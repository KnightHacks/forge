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
const hackerId = randomUUID();
const profileId = randomUUID();
const profileRevisionId = randomUUID();
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
        startDate: new Date("2026-10-09T16:00:00Z"),
        endDate: new Date("2026-10-11T20:00:00Z"),
        timezone: "America/New_York",
      })),
    );
    const profile = {
      firstName: "Map",
      lastName: "Hacker",
      discordUser: "map-hacker",
      country: "United States of America",
      gender: "Prefer not to answer",
      email: "map@example.test",
      phoneNumber: "4075550100",
      school: "University of Central Florida",
      levelOfStudy: "Undergraduate University (3+ year)",
      major: "Computer Science",
      raceOrEthnicity: "Prefer not to answer",
      shirtSize: "M",
      dob: "2005-02-14",
      gradDate: "2028-05-01",
    } as const;
    await db.insert(schemas.Hacker).values({
      ...profile,
      id: hackerId,
      userId,
      age: 21,
      survey1: "",
      survey2: "",
    });
    await db
      .insert(schemas.HackerProfile)
      .values({ ...profile, id: profileId, userId });
    await db
      .insert(schemas.HackerProfileRevision)
      .values({ ...profile, id: profileRevisionId, profileId, revision: 1 });
    await db.insert(schemas.HackerAttendee).values(
      [hackathonId, otherId].map((id) => ({
        hackerId,
        profileId,
        profileRevisionId,
        hackathonId: id,
        status: "confirmed" as const,
      })),
    );
    caller = await createCaller();
  }, 120_000);
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-09T04:00:00Z"));
    await db
      .update(schemas.HackerAttendee)
      .set({ status: "confirmed" })
      .where(eq(schemas.HackerAttendee.hackathonId, hackathonId));
  });
  afterAll(async () => {
    vi.useRealTimers();
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
    const migration = (await readMigrations()).find(
      (file) => file.name === "0059_needy_menace.sql",
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

  it("saves normalized rooms independently of activation and scopes eligible participant reads", async () => {
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

  it.each([
    "pending",
    "accepted",
    "waitlisted",
    "denied",
    "withdrawn",
  ] as const)("rejects %s participants even after opening", async (status) => {
    await db
      .update(schemas.HackerAttendee)
      .set({ status })
      .where(eq(schemas.HackerAttendee.hackathonId, hackathonId));
    await expect(
      (await participant(hackathonId)).getMapConfiguration(),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects a missing application", async () => {
    await db
      .delete(schemas.HackerAttendee)
      .where(eq(schemas.HackerAttendee.hackathonId, otherId));
    await expect(
      (await participant(otherId)).getMapConfiguration(),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it.each(["confirmed", "checkedin"] as const)(
    "enforces the Friday boundary for %s using server time",
    async (status) => {
      await db
        .update(schemas.HackerAttendee)
        .set({ status })
        .where(eq(schemas.HackerAttendee.hackathonId, hackathonId));
      const hacker = await participant(hackathonId);
      vi.setSystemTime(new Date("2026-10-09T03:59:59.999Z"));
      await expect(hacker.getMapConfiguration()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      vi.setSystemTime(new Date("2026-10-09T04:00:00Z"));
      await expect(hacker.getMapConfiguration()).resolves.toHaveProperty(
        "rooms",
      );
    },
  );

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
