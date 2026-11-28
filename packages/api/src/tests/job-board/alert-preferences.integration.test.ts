import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { db as DatabaseClient } from "@forge/db/client";
import type { DisposableDatabase } from "@forge/db/testing";
import { sql } from "@forge/db";
import {
  Job,
  JobAlertPreference,
  JobLocation,
} from "@forge/db/schemas/job-board";
import {
  canRunDatabaseTests,
  provisionDisposableDatabase,
} from "@forge/db/testing";
import { alertPreferenceCreateInputSchema } from "@forge/validators";

import { findAlertRecipientsForJob } from "../../utils/job-board/alert-matching";
import {
  addAlertPreference,
  listAlertPreferences,
  removeAlertPreference,
  updateAlertPreference,
} from "../../utils/job-board/alert-preferences";
import { insertJobBoardTestMember } from "./member-fixture";

const google = {
  track: "internship",
  kind: "company",
  target: { kind: "option", value: "google" },
} as const;
const orlando = {
  track: "internship",
  kind: "location",
  target: { kind: "option", value: "12-53000" },
} as const;

describe.runIf(canRunDatabaseTests())(
  "Career alert preferences on disposable PostgreSQL",
  () => {
    let database: DisposableDatabase | undefined;
    let db: typeof DatabaseClient;
    let closePool: (() => Promise<void>) | undefined;
    let owner: string;
    let other: string;

    beforeAll(async () => {
      database = await provisionDisposableDatabase("forge_alert_preferences");
      vi.stubEnv("DATABASE_URL", database.url);
      ({ db } = await import("@forge/db/client"));
      closePool = () => db.$client.end();
      const connected = await db.execute<{ name: string }>(
        sql`select current_database() as name`,
      );
      expect(connected.rows[0]?.name).toBe(
        new URL(database.url).pathname.slice(1),
      );
      owner = await insertJobBoardTestMember(db, "222222222222222222");
      other = await insertJobBoardTestMember(db, "111111111111111111");
    }, 120_000);

    beforeEach(async () => {
      await db.delete(JobAlertPreference);
    });

    afterAll(async () => {
      try {
        await closePool?.();
      } finally {
        try {
          await database?.drop();
        } finally {
          vi.unstubAllEnvs();
        }
      }
    });

    it("lists and edits only the member's preferences and retains custom wording (P1)", async () => {
      const otherPreference = await addAlertPreference(db, other, {
        ...orlando,
        target: { kind: "remote_us" },
      });
      expect(otherPreference.targetKey).toBe("remote_us");
      const added = await addAlertPreference(
        db,
        owner,
        alertPreferenceCreateInputSchema.parse({
          ...google,
          target: { kind: "other", text: "St. John's Labs" },
        }),
      );
      expect(added).toMatchObject({
        kind: "company",
        targetKey: "st johns labs",
        customValue: "St. John's Labs",
      });
      expect(await listAlertPreferences(db, owner)).toEqual([added]);

      const updated = await updateAlertPreference(db, owner, added.id, {
        track: "new_grad",
        kind: "location",
        target: { kind: "other", text: "Greater Bay-Area" },
      });
      expect(updated).toMatchObject({
        id: added.id,
        track: "new_grad",
        kind: "location",
        targetKey: "greater bay area",
        customValue: "Greater Bay-Area",
      });

      await removeAlertPreference(db, owner, added.id);
      expect(await listAlertPreferences(db, owner)).toEqual([]);
      expect(await listAlertPreferences(db, other)).toEqual([otherPreference]);
    });

    it("treats a foreign preference as missing for updates and deletes (P2)", async () => {
      const preference = await addAlertPreference(db, other, google);

      await expect(
        updateAlertPreference(db, owner, preference.id, orlando),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        removeAlertPreference(db, owner, preference.id),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      expect(await listAlertPreferences(db, other)).toEqual([preference]);
    });

    it("rejects duplicate targets on create and update, including custom company aliases (P2)", async () => {
      const direct = await addAlertPreference(db, owner, google);
      const city = await addAlertPreference(db, owner, orlando);
      const duplicate = {
        ...google,
        target: { kind: "other", text: "GOOGLE!" },
      } as const;

      await expect(
        addAlertPreference(db, owner, duplicate),
      ).rejects.toMatchObject({ code: "CONFLICT" });
      await expect(
        updateAlertPreference(db, owner, city.id, duplicate),
      ).rejects.toMatchObject({ code: "CONFLICT" });
      expect(await listAlertPreferences(db, owner)).toEqual(
        expect.arrayContaining([direct, city]),
      );
    });

    it("reports invalid city keys and unusable normalized targets as bad input (P2)", async () => {
      const invalidCity = {
        ...orlando,
        target: { kind: "option", value: "99-99999" },
      } as const;
      const emptyCustomLocation = {
        ...orlando,
        target: { kind: "other", text: "!!!" },
      } as const;
      const longNormalizedCompany = {
        ...google,
        target: { kind: "other", text: "ﬃ".repeat(41) },
      } as const;

      for (const preference of [
        invalidCity,
        emptyCustomLocation,
        longNormalizedCompany,
      ]) {
        await expect(
          addAlertPreference(db, owner, preference),
        ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      }
      expect(await listAlertPreferences(db, owner)).toEqual([]);
    });

    it("returns each valid Discord user ID once in stable order (M3)", async () => {
      const duplicate = await insertJobBoardTestMember(
        db,
        "222222222222222222",
      );
      const invalid = await insertJobBoardTestMember(db, "display-only");
      const wrongTrack = await insertJobBoardTestMember(
        db,
        "333333333333333333",
      );
      const [job] = await db
        .insert(Job)
        .values({
          identityKey: "career-alert-integration-job",
          companyKey: "google",
          companyLabel: "Google",
          title: "Software Engineering Intern",
          track: "internship",
          applyUrl: "https://example.test/job",
        })
        .returning({ id: Job.id });
      if (!job) throw new Error("Could not create the job fixture.");
      await db.insert(JobLocation).values([
        {
          jobId: job.id,
          kind: "city",
          cityKey: "12-53000",
          state: "FL",
          sourceText: "Orlando, FL",
        },
        {
          jobId: job.id,
          kind: "unknown",
          sourceText: "Office in the Greater Bay Area",
        },
      ]);
      expect(await findAlertRecipientsForJob(db, job.id)).toEqual([]);
      await addAlertPreference(db, owner, google);
      await addAlertPreference(db, owner, orlando);
      await addAlertPreference(db, other, {
        ...orlando,
        target: { kind: "other", text: "Bay-Area" },
      });
      await addAlertPreference(db, duplicate, google);
      await addAlertPreference(db, invalid, google);
      await addAlertPreference(db, wrongTrack, {
        ...google,
        track: "new_grad",
      });

      expect(await findAlertRecipientsForJob(db, job.id)).toEqual([
        "111111111111111111",
        "222222222222222222",
      ]);
    });
  },
);
