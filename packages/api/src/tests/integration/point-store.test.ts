import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { Session } from "@forge/auth/server";
import type { DisposableDatabase } from "@forge/db/testing";
import { eq } from "@forge/db";
import {
  canRunDatabaseTests,
  provisionDisposableDatabase,
} from "@forge/db/testing";

import { permissionBitstring } from "../support/permissions";

// Exercise validation, transactions, and image lifecycle without uploading
// test assets to the configured external storage service.
const imageObjects = vi.hoisted(() => new Set<string>());
vi.mock("../../utils/profile-picture/storage", () => ({
  ensureProfilePictureBucketExists: () => Promise.resolve(),
  profilePictureStorageClient: {
    putObject: (_bucket: string, key: string) => {
      imageObjects.add(key);
      return Promise.resolve();
    },
    removeObject: (_bucket: string, key: string) => {
      imageObjects.delete(key);
      return Promise.resolve();
    },
    presignedUrl: (_method: string, _bucket: string, key: string) =>
      Promise.resolve(`https://images.example.test/${key}`),
  },
}));

describe.skipIf(!canRunDatabaseTests())("point store", () => {
  let disposable: DisposableDatabase | undefined;
  let db: typeof import("@forge/db/client").db;
  let schema: typeof import("@forge/db/schemas/knight-hacks");
  let auth: typeof import("@forge/db/schemas/auth");
  let reads: typeof import("../../hacker-portal/reads");
  let caller: Awaited<ReturnType<typeof makeCaller>>;
  let user: Session["user"];

  async function makeCaller(session: Session | null) {
    const { createCallerFactory, createTRPCRouter } =
      await import("../../trpc");
    const { pointStoreRouter } = await import("../../routers/point-store");
    return createCallerFactory(createTRPCRouter(pointStoreRouter))({
      session,
      headers: new Headers(),
      source: "point-store-test",
    });
  }
  function sessionFor(person: Session["user"]): Session {
    return {
      user: person,
      session: {
        id: randomUUID(),
        token: randomUUID(),
        userId: person.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
        ipAddress: null,
        userAgent: "vitest",
      },
    };
  }
  async function makeUser(name: string) {
    const id = randomUUID();
    const person = {
      id,
      name,
      email: `${id}@example.test`,
      emailVerified: true,
      image: null,
      discordUserId: id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.insert(auth.User).values(person);
    return person;
  }
  async function grant(
    personId: string,
    key: Parameters<typeof permissionBitstring>[number],
  ) {
    const id = randomUUID();
    await db.insert(auth.Roles).values({
      id,
      name: key,
      discordRoleId: id,
      permissions: permissionBitstring(key),
    });
    await db.insert(auth.Permissions).values({ userId: personId, roleId: id });
  }
  async function fixture(
    options: {
      points?: number;
      stock?: number | null;
      price?: number;
      status?: "checkedin" | "confirmed";
    } = {},
  ) {
    const hackathonId = randomUUID();
    await db.insert(schema.Hackathon).values({
      id: hackathonId,
      name: hackathonId,
      displayName: "Test Hack",
      theme: "Merch",
      startDate: new Date(),
      endDate: new Date(),
    });
    const participant = await makeUser("Ada Hacker");
    const profile = {
      userId: participant.id,
      discordUser: participant.id,
      firstName: "Ada",
      lastName: "Hacker",
      email: participant.email,
      country: "United States of America",
      dob: "2005-02-14",
      gradDate: "2028-05-01",
      phoneNumber: randomUUID(),
      school: "University of Central Florida",
      levelOfStudy: "Undergraduate University (3+ year)",
      major: "Computer Science",
      gender: "Prefer not to answer",
      raceOrEthnicity: "Prefer not to answer",
      shirtSize: "M",
    } as const;
    const profileId = randomUUID(),
      revisionId = randomUUID(),
      hackerId = randomUUID(),
      attendeeId = randomUUID();
    await db.insert(schema.HackerProfile).values({ ...profile, id: profileId });
    await db.insert(schema.HackerProfileRevision).values({
      ...profile,
      id: revisionId,
      profileId,
      revision: 1,
      createdBy: participant.id,
    });
    await db.insert(schema.Hacker).values({
      ...profile,
      id: hackerId,
      age: 21,
      isFirstTime: false,
      survey1: "",
      survey2: "",
    });
    await db.insert(schema.HackerAttendee).values({
      id: attendeeId,
      hackathonId,
      hackerId,
      profileId,
      profileRevisionId: revisionId,
      points: options.points ?? 100,
      status: options.status ?? "checkedin",
    });
    const item = await caller.saveItem({
      hackathonId,
      name: "Shirt M",
      description: "Soft cotton",
      price: options.price ?? 30,
      stock: options.stock === undefined ? 2 : options.stock,
      soldOut: false,
      archived: false,
    });
    const context = {
      client: {
        clientId: `client-${hackathonId}`,
        enabled: true,
        hackathonId,
        id: randomUUID(),
        origin: "http://localhost:3007",
      },
      headers: new Headers(),
      requestId: randomUUID(),
      session: {
        betterAuthSessionId: randomUUID(),
        clientRecordId: randomUUID(),
        hackathonId,
        id: randomUUID(),
        userId: participant.id,
      },
    };
    const purchase = {
      id: randomUUID(),
      hackathonId,
      attendeeId,
      itemId: item.id,
      quantity: 1,
      unitPrice: options.price ?? 30,
    };
    return { hackathonId, attendeeId, item, participant, purchase, context };
  }
  beforeAll(async () => {
    disposable = await provisionDisposableDatabase("forge_point_store");
    vi.stubEnv("DATABASE_URL", disposable.url);
    ({ db } = await import("@forge/db/client"));
    expect((await import("@forge/db/env")).env.DATABASE_URL).toBe(
      disposable.url,
    );
    schema = await import("@forge/db/schemas/knight-hacks");
    auth = await import("@forge/db/schemas/auth");
    reads = await import("../../hacker-portal/reads");
    user = await makeUser("Store Organizer");
    await grant(user.id, "HACKATHON_MERCH_STORE");
    caller = await makeCaller(sessionFor(user));
  }, 120_000);
  afterAll(async () => {
    await db.$client.end();
    await disposable?.drop();
    vi.unstubAllEnvs();
  }, 30_000);

  it("requires Hackathon Merch Store on every organizer entry point", async () => {
    const f = await fixture();
    for (const key of ["READ_HACKERS", "EDIT_HACKERS", "IS_OFFICER"] as const) {
      const person = await makeUser(key);
      await grant(person.id, key);
      const denied = await makeCaller(sessionFor(person));
      const requests = [
        denied.hackathons(),
        denied.workspace({ hackathonId: f.hackathonId }),
        denied.searchHackers({ hackathonId: f.hackathonId, query: "Ada" }),
        denied.balance({
          hackathonId: f.hackathonId,
          attendeeId: f.attendeeId,
        }),
        denied.history({ hackathonId: f.hackathonId }),
        denied.saveSettings({
          hackathonId: f.hackathonId,
          catalogVisible: true,
          open: true,
          location: "Here",
        }),
        denied.saveItem({
          hackathonId: f.hackathonId,
          name: "Denied",
          description: "",
          price: 0,
          stock: null,
          soldOut: false,
          archived: false,
        }),
        denied.setImage({
          hackathonId: f.hackathonId,
          itemId: f.item.id,
          revision: 1,
          fileContent: null,
        }),
        denied.purchase(f.purchase),
        denied.voidPurchase({
          hackathonId: f.hackathonId,
          id: f.purchase.id,
          reason: "No",
          restock: false,
        }),
      ];
      const results = await Promise.allSettled(requests);
      for (const result of results) {
        expect(result.status).toBe("rejected");
        if (result.status === "rejected")
          expect(result.reason).toMatchObject({ code: "FORBIDDEN" });
      }
    }
    await expect((await makeCaller(null)).hackathons()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("searches checked-in hackers by Discord username, school, and major", async () => {
    const f = await fixture();

    for (const query of [
      f.participant.id,
      "Central Florida",
      "Computer Science",
    ]) {
      const matches = await caller.searchHackers({
        hackathonId: f.hackathonId,
        query,
      });
      expect(matches).toEqual([
        {
          discordUser: f.participant.id,
          email: f.participant.email,
          firstName: "Ada",
          id: f.attendeeId,
          lastName: "Hacker",
          major: "Computer Science",
          school: "University of Central Florida",
        },
      ]);
    }
  });

  it("spends separately, retries safely, snapshots history, and voids once", async () => {
    const f = await fixture();
    await Promise.all([
      caller.purchase(f.purchase),
      caller.purchase(f.purchase),
    ]);
    expect(
      await caller.balance({
        hackathonId: f.hackathonId,
        attendeeId: f.attendeeId,
      }),
    ).toEqual({ earned: 100, spent: 30, available: 70 });
    expect((await reads.getMyPoints(f.context)).total).toBe(100);
    expect(
      (await reads.getLeaderboard(f.context, { scope: "overall" })).rows[0]
        ?.points,
    ).toBe(100);
    const current = (await caller.workspace({ hackathonId: f.hackathonId }))
      .items[0];
    expect(current?.stock).toBe(1);
    await expect(
      caller.purchase({ ...f.purchase, quantity: 2 }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      caller.saveItem({
        hackathonId: f.hackathonId,
        id: f.item.id,
        revision: 1,
        name: "Stale",
        description: "",
        price: 30,
        stock: 2,
        soldOut: false,
        archived: false,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await caller.saveItem({
      hackathonId: f.hackathonId,
      id: f.item.id,
      revision: current?.revision,
      name: "Renamed",
      description: "",
      price: 80,
      stock: 1,
      soldOut: false,
      archived: true,
    });
    expect(
      (await caller.history({ hackathonId: f.hackathonId })).rows,
    ).toMatchObject([
      {
        itemName: "Shirt M",
        unitPrice: 30,
        total: 30,
        quantity: 1,
        hackerName: "Ada Hacker",
        actorName: "Store Organizer",
      },
    ]);
    const voidInput = {
      hackathonId: f.hackathonId,
      id: f.purchase.id,
      reason: "Wrong item",
      restock: true,
    };
    await Promise.all([
      caller.voidPurchase(voidInput),
      caller.voidPurchase(voidInput),
    ]);
    expect(
      await caller.balance({
        hackathonId: f.hackathonId,
        attendeeId: f.attendeeId,
      }),
    ).toEqual({ earned: 100, spent: 0, available: 100 });
    expect(
      (await caller.workspace({ hackathonId: f.hackathonId })).items[0]?.stock,
    ).toBe(2);
    expect(
      (await caller.history({ hackathonId: f.hackathonId })).rows[0],
    ).toMatchObject({ restocked: true, voidReason: "Wrong item" });
  });

  it("serializes spending across different items and last-unit sales across hackers", async () => {
    const f = await fixture({ points: 50, stock: null });
    const second = await caller.saveItem({
      hackathonId: f.hackathonId,
      name: "Mug",
      description: "",
      price: 30,
      stock: null,
      soldOut: false,
      archived: false,
    });
    const spending = await Promise.allSettled([
      caller.purchase(f.purchase),
      caller.purchase({ ...f.purchase, id: randomUUID(), itemId: second.id }),
    ]);
    expect(
      spending.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      (
        await caller.balance({
          hackathonId: f.hackathonId,
          attendeeId: f.attendeeId,
        })
      ).available,
    ).toBe(20);
    const last = await fixture({ stock: 1 });
    const other = await fixture();
    await db
      .update(schema.HackerAttendee)
      .set({ hackathonId: last.hackathonId })
      .where(eq(schema.HackerAttendee.id, other.attendeeId));
    const stock = await Promise.allSettled([
      caller.purchase(last.purchase),
      caller.purchase({
        ...last.purchase,
        id: randomUUID(),
        attendeeId: other.attendeeId,
      }),
    ]);
    expect(
      stock.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      (await caller.workspace({ hackathonId: last.hackathonId })).items[0]
        ?.stock,
    ).toBe(0);
  });

  it("enforces status, scope, price, sold-out state, and quantity validation", async () => {
    const f = await fixture({ status: "confirmed" });
    await expect(caller.purchase(f.purchase)).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
    await expect(reads.getPointStore(f.context)).rejects.toMatchObject({
      code: "FORBIDDEN",
      cause: { code: "FORBIDDEN_STATUS" },
    });
    await db
      .update(schema.HackerAttendee)
      .set({ status: "checkedin" })
      .where(eq(schema.HackerAttendee.id, f.attendeeId));
    await expect(
      caller.purchase({ ...f.purchase, quantity: 0 }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.purchase({ ...f.purchase, unitPrice: 1 }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      caller.purchase({ ...f.purchase, hackathonId: randomUUID() }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    const other = await fixture();
    await expect(
      caller.purchase({ ...f.purchase, itemId: other.item.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await db
      .update(schema.PointStoreItem)
      .set({ stock: null, soldOut: true })
      .where(eq(schema.PointStoreItem.id, f.item.id));
    await expect(caller.purchase(f.purchase)).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
    expect(
      (await caller.history({ hackathonId: f.hackathonId })).rows,
    ).toHaveLength(0);
  });

  it("reveals the catalog only when configured, and treats closed as informational", async () => {
    const f = await fixture({ stock: null });
    expect(await reads.getPointStore(f.context)).toMatchObject({
      catalogVisible: false,
      open: false,
      location: "",
      earned: 100,
      items: [],
    });
    await caller.saveSettings({
      hackathonId: f.hackathonId,
      catalogVisible: true,
      open: false,
      location: "Room 221",
    });
    const catalog = await reads.getPointStore(f.context);
    expect(catalog).toMatchObject({
      open: false,
      location: "Room 221",
      items: [{ name: "Shirt M", stock: null, soldOut: false }],
    });
    expect(catalog.items[0]).not.toHaveProperty("imageObjectName");
    expect(catalog.items[0]).not.toHaveProperty("revision");
    await caller.purchase(f.purchase);
    expect(
      (await caller.workspace({ hackathonId: f.hackathonId })).items[0]?.stock,
    ).toBeNull();
    await db
      .update(schema.HackerAttendee)
      .set({ points: 10 })
      .where(eq(schema.HackerAttendee.id, f.attendeeId));
    expect(
      await caller.balance({
        hackathonId: f.hackathonId,
        attendeeId: f.attendeeId,
      }),
    ).toEqual({ earned: 10, spent: 30, available: 0 });
    await expect(
      caller.purchase({ ...f.purchase, id: randomUUID() }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    await expect(
      caller.voidPurchase({
        hackathonId: f.hackathonId,
        id: f.purchase.id,
        reason: "Mistake",
        restock: true,
      }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    await caller.voidPurchase({
      hackathonId: f.hackathonId,
      id: f.purchase.id,
      reason: "Mistake",
      restock: false,
    });
    expect(
      (
        await caller.balance({
          hackathonId: f.hackathonId,
          attendeeId: f.attendeeId,
        })
      ).available,
    ).toBe(10);
  });

  it("uploads, replaces, and removes validated item images", async () => {
    const f = await fixture();
    const fileContent =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jF1sAAAAASUVORK5CYII=";
    await caller.setImage({
      hackathonId: f.hackathonId,
      itemId: f.item.id,
      revision: 1,
      fileContent,
      fileName: "sample.png",
    });
    const first = (await caller.workspace({ hackathonId: f.hackathonId }))
      .items[0];
    expect(first?.imageUrl).toContain(`/point-store/${f.item.id}/`);
    expect(imageObjects.size).toBe(1);
    await caller.setImage({
      hackathonId: f.hackathonId,
      itemId: f.item.id,
      revision: 2,
      fileContent,
      fileName: "replacement.png",
    });
    const second = (await caller.workspace({ hackathonId: f.hackathonId }))
      .items[0];
    expect(second?.imageUrl).not.toBe(first?.imageUrl);
    expect(imageObjects.size).toBe(1);
    await expect(
      caller.setImage({
        hackathonId: f.hackathonId,
        itemId: f.item.id,
        revision: 2,
        fileContent,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(imageObjects.size).toBe(1);
    await caller.setImage({
      hackathonId: f.hackathonId,
      itemId: f.item.id,
      revision: 3,
      fileContent: null,
    });
    expect(
      (await caller.workspace({ hackathonId: f.hackathonId })).items[0]
        ?.imageUrl,
    ).toBeNull();
    expect(imageObjects.size).toBe(0);
  });

  it("rejects invalid image bytes without changing the item", async () => {
    const f = await fixture();
    await expect(
      caller.setImage({
        hackathonId: f.hackathonId,
        itemId: f.item.id,
        revision: 1,
        fileContent: "data:image/png;base64,bm90LWFuLWltYWdl",
        fileName: "fake.png",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(
      (await caller.workspace({ hackathonId: f.hackathonId })).items[0]
        ?.revision,
    ).toBe(1);
  });
});
