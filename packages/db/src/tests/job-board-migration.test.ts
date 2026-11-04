import { createHash, randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { DisposableDatabase } from "../testing";
import * as jobs from "../schemas/job-board";
import * as relations from "../schemas/relations";
import { canRunDatabaseTests, provisionDisposableDatabase } from "../testing";

const migrationUrl = new URL(
  "../../drizzle/0064_career_job_storage.sql",
  import.meta.url,
);

describe("Career job migration scope", () => {
  it("adds exactly seven tables and two false-default member preferences", async () => {
    const migration = await readFile(migrationUrl, "utf8");
    expect(migration.match(/CREATE TABLE/g)).toHaveLength(7);
    expect(migration).not.toMatch(
      /DROP |DELETE FROM|TRUNCATE|UPDATE "knight_hacks_company"/,
    );
    expect(migration).toContain(
      'ADD COLUMN "job_internship_digest_enabled" boolean DEFAULT false NOT NULL',
    );
    expect(migration).toContain(
      'ADD COLUMN "job_new_grad_digest_enabled" boolean DEFAULT false NOT NULL',
    );
  });
});

describe.runIf(canRunDatabaseTests())(
  "Career storage on disposable PostgreSQL",
  () => {
    let database: DisposableDatabase;
    let pool: Pool;
    const memberId = randomUUID();
    const userId = randomUUID();

    beforeAll(async () => {
      database = await provisionDisposableDatabase("forge_job_storage");
      pool = new Pool({ connectionString: database.url });
      await pool.query(
        `INSERT INTO auth_user (id, discord_user_id, name) VALUES ($1, '123456789012345678', 'Job test')`,
        [userId],
      );
      await pool.query(
        `INSERT INTO knight_hacks_member
      (id, user_id, first_name, last_name, discord_user, age, email, school, level_of_study, shirt_size, dob, grad_date)
      VALUES ($1, $2, 'Career', 'Test', 'job-test', 20, 'career@example.test', 'UCF', 'Undergraduate', 'M', '2006-01-01', '2027-05-01')`,
        [memberId, userId],
      );
    }, 120_000);

    afterAll(async () => {
      await pool.end();
      await database.drop();
    });

    async function job() {
      const db = drizzle({ client: pool, casing: "snake_case" });
      const [row] = await db
        .insert(jobs.Job)
        .values({
          identityKey: `test:${randomUUID()}`,
          companyLabel: "Acme",
          companyKey: "acme",
          title: "SWE Intern",
          track: "internship",
          applyUrl: "https://example.test/job",
        })
        .returning();
      if (!row) throw new Error("Job fixture was not inserted");
      return row;
    }

    it("upgrades existing members and companies without changing their data", async () => {
      // Reconstruct the pre-feature shape only inside this disposable database
      // transaction, then replay the additive migration against populated tables.
      const client = database.client;
      await client.query("BEGIN");
      try {
        await client.query(`DROP TABLE knight_hacks_job_application, knight_hacks_job_alert_preference,
          knight_hacks_job_location, knight_hacks_job_observation, knight_hacks_job_digest,
          knight_hacks_job, knight_hacks_job_source;
          DROP TYPE job_track, job_category, job_location_kind, job_work_arrangement,
          job_delivery_state, job_application_stage, job_application_visibility, job_alert_target_kind;
          ALTER TABLE knight_hacks_member DROP COLUMN job_internship_digest_enabled,
          DROP COLUMN job_new_grad_digest_enabled;`);
        const companyId = randomUUID();
        await client.query(
          `INSERT INTO knight_hacks_company (id, display_name, normalized_display_name, review_state)
          VALUES ($1, 'Existing employer', 'existing employer', 'pending')`,
          [companyId],
        );
        const before = await client.query(
          "SELECT to_jsonb(m) AS data FROM knight_hacks_member m WHERE id = $1",
          [memberId],
        );
        const companyBefore = await client.query(
          "SELECT to_jsonb(c) AS data FROM knight_hacks_company c WHERE id = $1",
          [companyId],
        );
        for (const statement of (await readFile(migrationUrl, "utf8")).split(
          "--> statement-breakpoint",
        )) {
          if (statement.trim()) await client.query(statement);
        }
        const after = await client.query(
          `SELECT to_jsonb(m) - 'job_internship_digest_enabled' - 'job_new_grad_digest_enabled' AS data FROM knight_hacks_member m WHERE id = $1`,
          [memberId],
        );
        const companyAfter = await client.query(
          "SELECT to_jsonb(c) AS data FROM knight_hacks_company c WHERE id = $1",
          [companyId],
        );
        expect(after.rows).toEqual(before.rows);
        expect(companyAfter.rows).toEqual(companyBefore.rows);
        const flags = await client.query(
          "SELECT job_internship_digest_enabled, job_new_grad_digest_enabled FROM knight_hacks_member WHERE id = $1",
          [memberId],
        );
        expect(flags.rows).toEqual([
          {
            job_internship_digest_enabled: false,
            job_new_grad_digest_enabled: false,
          },
        ]);
      } finally {
        await client.query("ROLLBACK");
      }
    });

    it("preserves long identifiers and supports typed fingerprint upserts", async () => {
      const db = drizzle({ client: pool, casing: "snake_case" });
      const raw = `${randomBytes(4000).toString("hex")}λ中文\\123\\x1234\n`;
      const hash = createHash("sha256").update(raw).digest("hex");
      const values = {
        identityKey: raw,
        companyLabel: "Acme",
        companyKey: "acme",
        title: "Intern",
        track: "internship" as const,
        applyUrl: "https://example.test/job",
      };
      const [first] = await db.insert(jobs.Job).values(values).returning();
      expect(first).toMatchObject({ identityKey: raw, identityHash: hash });
      const [updated] = await db
        .insert(jobs.Job)
        .values(values)
        .onConflictDoUpdate({
          target: jobs.Job.identityHash,
          set: { title: "Updated" },
        })
        .returning();
      expect(updated).toMatchObject({ id: first?.id, title: "Updated" });
      const [distinct] = await db
        .insert(jobs.Job)
        .values({ ...values, identityKey: `${raw}different` })
        .returning();
      expect(distinct?.id).not.toBe(first?.id);

      const sourceValues = {
        provider: "greenhouse",
        boardKey: raw,
        label: "Acme",
      };
      const [source] = await db
        .insert(jobs.JobSource)
        .values(sourceValues)
        .returning();
      if (!source || !first) throw new Error("Missing identifier fixtures");
      expect(source).toMatchObject({ boardKey: raw, boardKeyHash: hash });
      const [sameSource] = await db
        .insert(jobs.JobSource)
        .values(sourceValues)
        .onConflictDoUpdate({
          target: [jobs.JobSource.provider, jobs.JobSource.boardKeyHash],
          set: { label: "Updated" },
        })
        .returning();
      expect(sameSource?.id).toBe(source.id);
      const observationValues = {
        sourceId: source.id,
        externalId: raw,
        jobId: first.id,
      };
      const [observation] = await db
        .insert(jobs.JobObservation)
        .values(observationValues)
        .returning();
      expect(observation).toMatchObject({
        externalId: raw,
        externalIdHash: hash,
      });
      const [sameObservation] = await db
        .insert(jobs.JobObservation)
        .values(observationValues)
        .onConflictDoUpdate({
          target: [
            jobs.JobObservation.sourceId,
            jobs.JobObservation.externalIdHash,
          ],
          set: { jobId: first.id },
        })
        .returning();
      expect(sameObservation?.id).toBe(observation?.id);
    });

    it("defaults delivery to suppressed and digest opt-ins to false", async () => {
      expect((await job()).deliveryState).toBe("suppressed");
      const { rows } = await pool.query<{
        job_internship_digest_enabled: boolean;
        job_new_grad_digest_enabled: boolean;
      }>(
        "SELECT job_internship_digest_enabled, job_new_grad_digest_enabled FROM knight_hacks_member WHERE id = $1",
        [memberId],
      );
      expect(rows).toEqual([
        {
          job_internship_digest_enabled: false,
          job_new_grad_digest_enabled: false,
        },
      ]);
    });

    it("serializes competing canonical identities and source observations", async () => {
      const identity = `race:${randomUUID()}`;
      const insert = () =>
        pool.query(
          `INSERT INTO knight_hacks_job (identity_key, company_label, company_key, title, track, apply_url)
      VALUES ($1, 'Acme', 'acme', 'Intern', 'internship', 'https://example.test/job') RETURNING id`,
          [identity],
        );
      const attempts = await Promise.allSettled([insert(), insert()]);
      expect(
        attempts.filter((result) => result.status === "fulfilled"),
      ).toHaveLength(1);
      const rejected = attempts.find((result) => result.status === "rejected");
      expect(rejected).toMatchObject({
        status: "rejected",
        reason: { code: "23505" },
      });
      const listing = await job();
      const sourceId = randomUUID();
      await pool.query(
        `INSERT INTO knight_hacks_job_source (id, provider, board_key, label) VALUES ($1::uuid, 'greenhouse', $1::text, 'Acme')`,
        [sourceId],
      );
      const observe = () =>
        pool.query(
          `INSERT INTO knight_hacks_job_observation (job_id, source_id, external_id) VALUES ($1, $2, '123')`,
          [listing.id, sourceId],
        );
      const observations = await Promise.allSettled([observe(), observe()]);
      expect(
        observations.filter((result) => result.status === "fulfilled"),
      ).toHaveLength(1);
      expect(
        observations.find((result) => result.status === "rejected"),
      ).toMatchObject({ reason: { code: "23505" } });
      const secondSourceId = randomUUID();
      await pool.query(
        `INSERT INTO knight_hacks_job_source (id, provider, board_key, label) VALUES ($1::uuid, 'jobright', $1::text, 'Jobright')`,
        [secondSourceId],
      );
      await pool.query(
        `INSERT INTO knight_hacks_job_observation (job_id, source_id, external_id) VALUES ($1, $2, '123')`,
        [listing.id, secondSourceId],
      );
      const db = drizzle({
        client: pool,
        schema: { ...jobs, ...relations },
        casing: "snake_case",
      });
      const found = await db.query.Job.findFirst({
        where: (table, { eq }) => eq(table.id, listing.id),
        with: { observations: true },
      });
      expect(found?.observations).toHaveLength(2);
    });

    it("stores several locations without duplicating a job and rejects contradictory shapes", async () => {
      const listing = await job();
      for (const [kind, city, state, text] of [
        ["city", "12-53000", "FL", "Orlando, FL"],
        ["state", null, "WA", "Washington"],
        ["remote_us", null, null, "Remote - United States"],
        ["unknown", null, null, "Various locations"],
      ]) {
        await pool.query(
          `INSERT INTO knight_hacks_job_location (job_id, kind, city_key, state, source_text) VALUES ($1,$2,$3,$4,$5)`,
          [listing.id, kind, city, state, text],
        );
      }
      const { rows } = await pool.query<{ source_text: string }>(
        "SELECT source_text FROM knight_hacks_job_location WHERE job_id = $1",
        [listing.id],
      );
      expect(rows).toHaveLength(4);
      expect(rows).toContainEqual({ source_text: "Various locations" });
      await expect(
        pool.query(
          `INSERT INTO knight_hacks_job_location (job_id, kind, city_key, state, source_text) VALUES ($1, 'remote_us', '12-53000', 'FL', 'Remote')`,
          [listing.id],
        ),
      ).rejects.toMatchObject({ code: "23514" });
      await expect(
        pool.query(
          `INSERT INTO knight_hacks_job_location (job_id, kind, city_key, state, source_text) VALUES ($1, 'city', 'bad', 'FL', 'Orlando')`,
          [listing.id],
        ),
      ).rejects.toMatchObject({ code: "23514" });
    });

    it("keeps application history and enforces one application and valid rounds", async () => {
      const listing = await job();
      const insert = (stage: string, round: number | null) =>
        pool.query(
          `INSERT INTO knight_hacks_job_application (member_id, job_id, stage, round) VALUES ($1,$2,$3,$4)`,
          [memberId, listing.id, stage, round],
        );
      await expect(insert("applied", 1)).rejects.toMatchObject({
        code: "23514",
      });
      await expect(insert("interviewing", 11)).rejects.toMatchObject({
        code: "23514",
      });
      await insert("interviewing", 2);
      await expect(insert("saved", null)).rejects.toMatchObject({
        code: "23505",
      });
      await pool.query(
        "UPDATE knight_hacks_job SET active = false, inactive_at = now() WHERE id = $1",
        [listing.id],
      );
      await expect(
        pool.query("DELETE FROM knight_hacks_job WHERE id = $1", [listing.id]),
      ).rejects.toMatchObject({
        constraint:
          "knight_hacks_job_application_job_id_knight_hacks_job_id_fk",
      });
      const { rows } = await pool.query<{ round: number }>(
        "SELECT round FROM knight_hacks_job_application WHERE job_id = $1",
        [listing.id],
      );
      expect(rows).toEqual([{ round: 2 }]);
    });

    it("requires coherent job claims, destinations and receipts", async () => {
      const listing = await job();
      await pool.query(
        `UPDATE knight_hacks_job SET discord_channel_id = '123456789012345678', delivery_track = 'internship' WHERE id = $1`,
        [listing.id],
      );
      await expect(
        pool.query(
          "UPDATE knight_hacks_job SET delivery_state = 'sent' WHERE id = $1",
          [listing.id],
        ),
      ).rejects.toMatchObject({ constraint: "knight_hacks_job_receipt_check" });
      await expect(
        pool.query(
          `UPDATE knight_hacks_job SET delivery_state = 'sent', discord_message_id = '223456789012345678' WHERE id = $1`,
          [listing.id],
        ),
      ).rejects.toMatchObject({ constraint: "knight_hacks_job_receipt_check" });
      await expect(
        pool.query(
          "UPDATE knight_hacks_job SET delivery_state = 'sent', delivered_at = now() WHERE id = $1",
          [listing.id],
        ),
      ).rejects.toMatchObject({ constraint: "knight_hacks_job_receipt_check" });
      await expect(
        pool.query(
          "UPDATE knight_hacks_job SET discord_channel_id = 'invalid' WHERE id = $1",
          [listing.id],
        ),
      ).rejects.toMatchObject({ code: "23514" });
      await expect(
        pool.query(
          `UPDATE knight_hacks_job SET delivery_state = 'sending', discord_channel_id = '123456789012345678', delivery_track = 'internship' WHERE id = $1`,
          [listing.id],
        ),
      ).rejects.toMatchObject({ code: "23514" });
      await pool.query(
        `UPDATE knight_hacks_job SET delivery_state = 'sending', discord_channel_id = '123456789012345678', delivery_track = 'internship', delivery_claim_token = $2, delivery_lease_expires_at = now() + interval '1 minute' WHERE id = $1`,
        [listing.id, randomUUID()],
      );
      await pool.query(
        `UPDATE knight_hacks_job SET delivery_state = 'sent', discord_message_id = '223456789012345678', delivered_at = now(), delivery_claim_token = null, delivery_lease_expires_at = null WHERE id = $1`,
        [listing.id],
      );
    });

    it("deduplicates digest schedules across channel changes and checks windows and receipts", async () => {
      const scheduled = new Date("2026-11-03T21:00:00Z");
      const insert = (channel: string) =>
        pool.query(
          `INSERT INTO knight_hacks_job_digest (track, scheduled_at, window_start, window_end, discord_channel_id)
      VALUES ('internship', $1, $1::timestamptz - interval '1 day', $1, $2) RETURNING id`,
          [scheduled, channel],
        );
      await insert("123456789012345678");
      await expect(insert("323456789012345678")).rejects.toMatchObject({
        code: "23505",
      });
      await expect(
        pool.query(
          "UPDATE knight_hacks_job_digest SET window_start = window_end",
        ),
      ).rejects.toMatchObject({ code: "23514" });
      await expect(
        pool.query(
          "UPDATE knight_hacks_job_digest SET window_end = scheduled_at + interval '1 day'",
        ),
      ).rejects.toMatchObject({ code: "23514" });
      await expect(
        pool.query(
          "UPDATE knight_hacks_job_digest SET delivery_state = 'sent'",
        ),
      ).rejects.toMatchObject({ code: "23514" });
    });

    it("deduplicates target preferences and cascades personal records on member deletion", async () => {
      const insert = (track: string) =>
        pool.query(
          `INSERT INTO knight_hacks_job_alert_preference (member_id, track, kind, target_key) VALUES ($1, $2, 'company', 'acme')`,
          [memberId, track],
        );
      await insert("internship");
      await insert("new_grad");
      await expect(insert("internship")).rejects.toMatchObject({
        code: "23505",
      });
      await pool.query("DELETE FROM knight_hacks_member WHERE id = $1", [
        memberId,
      ]);
      const preferences = await pool.query(
        "SELECT id FROM knight_hacks_job_alert_preference WHERE member_id = $1",
        [memberId],
      );
      const applications = await pool.query(
        "SELECT id FROM knight_hacks_job_application WHERE member_id = $1",
        [memberId],
      );
      expect(preferences.rows).toHaveLength(0);
      expect(applications.rows).toHaveLength(0);
    });
  },
);
