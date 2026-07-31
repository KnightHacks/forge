import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Session } from "@forge/auth/server";
import type { DisposableDatabase } from "@forge/db/testing";
import { eq } from "@forge/db";
import {
  canRunDatabaseTests,
  provisionDisposableDatabase,
} from "@forge/db/testing";

import { permissionBitstring } from "../support/permissions";

type DatabaseClient = typeof import("@forge/db/client").db;
type AuthSchemas = typeof import("@forge/db/schemas/auth");
type KnightHacksSchemas = typeof import("@forge/db/schemas/knight-hacks");

const OFFICER_USER = "10000000-0000-4000-8000-0000000000f1";
const OFFICER_ROLE = "30000000-0000-4000-8000-0000000000f1";
const HACKATHON_ID = "50000000-0000-4000-8000-0000000000f1";
const EMPTY_HACKATHON_ID = "50000000-0000-4000-8000-0000000000f2";
const CLASS_ID = "60000000-0000-4000-8000-0000000000f1";
const EMPTY_CLASS_ID = "60000000-0000-4000-8000-0000000000f2";
const HACKER_ID = "70000000-0000-4000-8000-0000000000f1";

/**
 * The two delete refusals, exercised against real SQL.
 *
 * Both are application-level `count() > 0` checks standing in front of
 * `ON DELETE CASCADE`; nothing below them stops the delete. Mocking the query
 * chain would assert the mock rather than the predicate — and the predicate is
 * exactly what is at risk, since counting by the wrong column returns zero for
 * every hackathon and cascades away every application ever submitted.
 */
describe.skipIf(!canRunDatabaseTests())(
  "hackathon destructive-action guards",
  () => {
    let disposable: DisposableDatabase | undefined;
    let client: DatabaseClient;
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
          session: { id: "hackathon-guards", userAgent: "vitest" },
          user: { id: OFFICER_USER, name: "Officer" },
        } as unknown as Session,
        source: "hackathon-guards-integration",
      });
    }

    beforeAll(async () => {
      disposable = await provisionDisposableDatabase("forge_api");
      // eslint-disable-next-line no-restricted-properties
      process.env.DATABASE_URL = disposable.url;

      ({ db: client } = await import("@forge/db/client"));
      auth = await import("@forge/db/schemas/auth");
      knightHacks = await import("@forge/db/schemas/knight-hacks");

      // Proves the reassignment above actually took effect before asserting
      // anything else. It silently did not: `packages/db/src/env.ts` skipped
      // validation on `NODE_ENV === "test"`, but `pnpm test` runs through
      // `dotenv -e ../../.env`, which sets it to "development" — so `createEnv`
      // ran for real and snapshotted `process.env` at import, and every
      // "disposable" test in the repo was quietly writing to the shared dev
      // database. The `VITEST` flag in `skipValidation` is what fixes it, and
      // this is the only thing standing between removing that line and these
      // tests running `DELETE FROM knight_hacks_hackathon` against real data.
      const { env } = await import("@forge/db/env");
      expect(env.DATABASE_URL).toBe(disposable.url);

      await client
        .insert(auth.User)
        .values({ discordUserId: "discord-officer", id: OFFICER_USER });
      await client.insert(auth.Roles).values({
        discordRoleId: "990000000000000901",
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
        theme: "Guards",
      };
      await client.insert(knightHacks.Hackathon).values([
        {
          ...window,
          displayName: "Occupied",
          id: HACKATHON_ID,
          name: "occupied",
        },
        {
          ...window,
          displayName: "Empty",
          id: EMPTY_HACKATHON_ID,
          name: "empty",
        },
      ]);
      await client.insert(knightHacks.HackathonClass).values([
        {
          color: "#4F46E5",
          discordRoleId: "990000000000000902",
          hackathonId: HACKATHON_ID,
          id: CLASS_ID,
          kind: "class",
          name: "Occupied class",
        },
        {
          color: "#4F46E5",
          discordRoleId: "990000000000000903",
          hackathonId: HACKATHON_ID,
          id: EMPTY_CLASS_ID,
          kind: "class",
          name: "Empty class",
        },
      ]);
      await client.insert(knightHacks.Hacker).values({
        age: 20,
        discordUser: "guard-hacker",
        dob: "2006-01-01",
        email: "guard@example.test",
        firstName: "Guard",
        gradDate: "2028-05-01",
        id: HACKER_ID,
        lastName: "Hacker",
        levelOfStudy:
          "Undergraduate University (2 year - community college or similar)",
        phoneNumber: "0000000000",
        school: "University of Central Florida",
        shirtSize: "M",
        survey1: "",
        survey2: "",
        userId: OFFICER_USER,
      });
      await client.insert(knightHacks.HackerAttendee).values({
        classId: CLASS_ID,
        hackathonId: HACKATHON_ID,
        hackerId: HACKER_ID,
      });

      caller = await officerCaller();
    }, 120_000);

    afterAll(async () => {
      await client.$client.end().catch(() => undefined);
      await disposable?.drop();
    }, 30_000);

    it("TC-NEG-006: refuses to delete a hackathon that has applications", async () => {
      await expect(
        caller.hackathon.remove({ id: HACKATHON_ID }),
      ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });

      // The application survived. Without the guard, `ON DELETE CASCADE` on
      // `HackerAttendee.hackathonId` would have taken it with no trace.
      const survivors = await client
        .select({ id: knightHacks.HackerAttendee.id })
        .from(knightHacks.HackerAttendee)
        .where(eq(knightHacks.HackerAttendee.hackathonId, HACKATHON_ID));
      expect(survivors).toHaveLength(1);
    });

    it("TC-008: deletes a hackathon nobody has applied to", async () => {
      // The positive control. Without it, a guard that refused unconditionally
      // would pass the case above while making deletion impossible.
      await expect(
        caller.hackathon.remove({ id: EMPTY_HACKATHON_ID }),
      ).resolves.toMatchObject({ id: EMPTY_HACKATHON_ID });
    });

    it("TC-NEG-008: refuses to delete a class with hackers assigned", async () => {
      await expect(
        caller.hackathon.removeClass({ id: CLASS_ID }),
      ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    });

    it("counts by class, not by hackathon, when guarding a class delete", async () => {
      // Guards the predicate itself. `EMPTY_CLASS_ID` belongs to a hackathon
      // that *does* have an attendee, so a guard counting by `hackathonId`
      // would refuse this and a guard counting by `classId` allows it.
      await expect(
        caller.hackathon.removeClass({ id: EMPTY_CLASS_ID }),
      ).resolves.toMatchObject({ id: EMPTY_CLASS_ID });
    });
  },
);
