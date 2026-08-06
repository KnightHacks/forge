import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { db } from "@forge/db/client";
import type * as AuthSchemaModule from "@forge/db/schemas/auth";
import type * as KnightHacksSchemaModule from "@forge/db/schemas/knight-hacks";
import type { DisposableDatabase } from "@forge/db/testing";
import {
  canRunDatabaseTests,
  provisionDisposableDatabase,
} from "@forge/db/testing";

import type { createDbEventWorkflowState } from "../../utils/events/database-state";

type AuthSchemas = typeof AuthSchemaModule;
type DatabaseClient = typeof db;
type KnightHacksSchemas = typeof KnightHacksSchemaModule;
type StateFactory = typeof createDbEventWorkflowState;

const NOW = new Date("2026-08-05T16:00:00.000Z");
const OPERATOR_ID = "10000000-0000-4000-8000-000000000801";
const HACKATHON_ID = "20000000-0000-4000-8000-000000000801";
const EVENT_ID = "30000000-0000-4000-8000-000000000801";
const HACKER_ID = "40000000-0000-4000-8000-000000000801";
const ATTENDEE_ID = "50000000-0000-4000-8000-000000000801";
const LEASE_TOKEN = "90000000-0000-4000-8000-000000000801";

describe.skipIf(!canRunDatabaseTests())(
  "hackathon event deletion history fence",
  () => {
    let auth: AuthSchemas;
    let client: DatabaseClient;
    let disposable: DisposableDatabase | undefined;
    let knightHacks: KnightHacksSchemas;
    let stateFactory: StateFactory;

    beforeAll(async () => {
      disposable = await provisionDisposableDatabase("forge_hack_delete");
      // eslint-disable-next-line no-restricted-properties
      process.env.DATABASE_URL = disposable.url;
      ({ db: client } = await import("@forge/db/client"));
      auth = await import("@forge/db/schemas/auth");
      knightHacks = await import("@forge/db/schemas/knight-hacks");
      ({ createDbEventWorkflowState: stateFactory } =
        await import("../../utils/events/database-state"));

      await client.insert(auth.User).values({
        discordUserId: "990000000000000801",
        id: OPERATOR_ID,
        name: "Delete Fence Operator",
      });
      await client.insert(knightHacks.Hackathon).values({
        applicationDeadline: new Date("2026-07-01T00:00:00.000Z"),
        applicationOpen: new Date("2026-06-01T00:00:00.000Z"),
        confirmationDeadline: new Date("2026-07-15T00:00:00.000Z"),
        displayName: "Delete Fence Hackathon",
        endDate: new Date("2026-08-10T00:00:00.000Z"),
        id: HACKATHON_ID,
        name: "delete-fence-hackathon",
        startDate: new Date("2026-08-05T00:00:00.000Z"),
        theme: "Deletion",
      });
      await client.insert(knightHacks.Event).values({
        description: "Deletion fence fixture",
        end_datetime: new Date("2026-08-05T18:00:00.000Z"),
        hackathonId: HACKATHON_ID,
        id: EVENT_ID,
        legacy: true,
        location: "Venue",
        name: "Preserved event",
        start_datetime: new Date("2026-08-05T17:00:00.000Z"),
        syncLeaseExpiresAt: new Date("2026-08-05T16:01:00.000Z"),
        syncLeaseRevision: 1,
        syncLeaseToken: LEASE_TOKEN,
        tag: "Hackathon",
      });
      await client.insert(knightHacks.Hacker).values({
        age: 20,
        discordUser: "delete-fence-hacker",
        dob: "2006-01-01",
        email: "delete-fence@example.test",
        firstName: "Delete",
        gradDate: "2030-05-01",
        id: HACKER_ID,
        lastName: "Fence",
        levelOfStudy: "Undergraduate University (3+ year)",
        phoneNumber: "4070000801",
        school: "University of Central Florida",
        shirtSize: "M",
        survey1: "",
        survey2: "",
        userId: OPERATOR_ID,
      });
      await client.insert(knightHacks.HackerAttendee).values({
        hackathonId: HACKATHON_ID,
        hackerId: HACKER_ID,
        id: ATTENDEE_ID,
        status: "checkedin",
      });
      await client.insert(knightHacks.HackerEventAttendee).values({
        checkedInAt: NOW,
        checkedInBy: OPERATOR_ID,
        eventId: EVENT_ID,
        hackerAttId: ATTENDEE_ID,
        hackathonId: HACKATHON_ID,
        isInitialAttendance: true,
        pointsAwarded: 0,
      });
    }, 120_000);

    afterAll(async () => {
      await client.$client.end().catch(() => undefined);
      await disposable?.drop();
    });

    it("refuses deletion when hackathon attendance history would cascade", async () => {
      const state = stateFactory({
        googleCalendars: { internal: "internal", public: "public" },
        hackathonId: HACKATHON_ID,
      });

      await expect(
        state.prepareDeletion({
          at: NOW,
          eventId: EVENT_ID,
          revision: 1,
          token: LEASE_TOKEN,
        }),
      ).resolves.toBe("attendance_exists");
    });
  },
);
