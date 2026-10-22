import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { describe, expect, it } from "vitest";

import { env } from "../env";
import {
  applyMigration,
  canRunDatabaseTests,
  provisionDisposableDatabase,
  readMigrations,
} from "../testing";

const study = "knight_hacks_case_study_study";
const revision = "knight_hacks_case_study_revision";
const review = "knight_hacks_case_study_review_decision";
const consent = "knight_hacks_case_study_consent_decision";
const event = "knight_hacks_case_study_publication_event";
const hash = "a".repeat(64);

async function user(client: Client) {
  const id = randomUUID();
  await client.query(
    "INSERT INTO auth_user (id, discord_user_id) VALUES ($1, $2)",
    [id, id],
  );
  return id;
}

async function caseStudy(client: Client, owner: string) {
  const id = randomUUID();
  await client.query(
    `INSERT INTO ${study} (id, slug, owner_user_id) VALUES ($1, $2, $3)`,
    [id, `study-${id}`, owner],
  );
  return id;
}

async function submit(client: Client, caseStudyId: string, submitter: string) {
  const id = randomUUID();
  await client.query(
    `INSERT INTO ${revision} (id, case_study_id, revision_no, content, content_hash, private_evidence, author_connection, submitter_user_id) VALUES ($1, $2, 1, '{"title":"Test"}', $3, '["private"]', 'community', $4)`,
    [id, caseStudyId, hash, submitter],
  );
  return id;
}

describe.runIf(canRunDatabaseTests())(
  "case-study persistence on PostgreSQL",
  () => {
    it("applies all migrations to a fresh database and enforces same-study publication pointers", async () => {
      const db = await provisionDisposableDatabase("case_study_fresh");
      try {
        const owner = await user(db.client);
        const first = await caseStudy(db.client, owner);
        const second = await caseStudy(db.client, owner);
        const firstRevision = await submit(db.client, first, owner);
        await expect(
          db.client.query(
            `UPDATE ${study} SET published_revision_id = $1 WHERE id = $2`,
            [firstRevision, second],
          ),
        ).rejects.toThrow();
        await db.client.query(
          `UPDATE ${study} SET published_revision_id = $1 WHERE id = $2`,
          [firstRevision, first],
        );
        await expect(
          db.client.query(
            `UPDATE ${study} SET slug = 'changed' WHERE id = $1`,
            [first],
          ),
        ).rejects.toThrow(/slug is immutable/);
        await expect(
          db.client.query(
            `INSERT INTO ${revision} (case_study_id, revision_no, content, content_hash, author_connection, submitter_user_id) VALUES ($1, 1, '{}', $2, 'community', $3)`,
            [first, hash, owner],
          ),
        ).rejects.toThrow();
      } finally {
        await db.drop();
      }
    });

    it("retains immutable audit decisions while permitting one-way privacy redaction", async () => {
      const db = await provisionDisposableDatabase("case_study_guard");
      try {
        const owner = await user(db.client);
        const id = await caseStudy(db.client, owner);
        const rev = await submit(db.client, id, owner);
        await expect(
          db.client.query(
            `UPDATE ${revision} SET content = '{}' WHERE id = $1`,
            [rev],
          ),
        ).rejects.toThrow();
        await expect(
          db.client.query(`DELETE FROM ${revision} WHERE id = $1`, [rev]),
        ).rejects.toThrow();
        await db.client.query(
          `UPDATE ${revision} SET content = NULL, private_evidence = NULL, redacted_at = now() WHERE id = $1`,
          [rev],
        );
        await expect(
          db.client.query(
            `UPDATE ${revision} SET content = '{}' WHERE id = $1`,
            [rev],
          ),
        ).rejects.toThrow();
        await db.client.query(
          `INSERT INTO ${consent} (case_study_id, subject_user_id, attribution_hash, policy_version, action) VALUES ($1, $2, $3, 1, 'accept')`,
          [id, owner, hash],
        );
        await expect(
          db.client.query(`DELETE FROM ${consent} WHERE case_study_id = $1`, [
            id,
          ]),
        ).rejects.toThrow();
        await db.client.query(
          `INSERT INTO ${review} (revision_id, stage, outcome, reviewer_user_id, feedback) VALUES ($1, 'technical', 'approve', $2, 'private')`,
          [rev, owner],
        );
        await expect(
          db.client.query(
            `INSERT INTO ${review} (revision_id, stage, outcome, reviewer_user_id) VALUES ($1, 'technical', 'reject', $2)`,
            [rev, owner],
          ),
        ).rejects.toThrow();
        await db.client.query(
          `UPDATE ${review} SET feedback = NULL, redacted_at = now() WHERE revision_id = $1`,
          [rev],
        );
        await expect(
          db.client.query(
            `UPDATE ${review} SET feedback = 'restore' WHERE revision_id = $1`,
            [rev],
          ),
        ).rejects.toThrow();
        await db.client.query(
          `INSERT INTO ${event} (revision_id, action, actor_user_id, reason_code) VALUES ($1, 'withdraw', $2, 'owner_request')`,
          [rev, owner],
        );
        await expect(
          db.client.query(`DELETE FROM ${event} WHERE revision_id = $1`, [rev]),
        ).rejects.toThrow();
      } finally {
        await db.drop();
      }
    });

    it("rejects malformed invitations, consent and editorial decisions", async () => {
      const db = await provisionDisposableDatabase("case_study_constraints");
      try {
        const author = await user(db.client);
        const id = await caseStudy(db.client, author);
        const rev = await submit(db.client, id, author);
        await expect(
          db.client.query(
            `INSERT INTO ${revision} (case_study_id, revision_no, content_hash, author_connection, submitter_user_id) VALUES ($1, 2, $2, 'community', $3)`,
            [id, hash, author],
          ),
        ).rejects.toThrow();
        await expect(
          db.client.query(
            `INSERT INTO ${revision} (case_study_id, revision_no, content, content_hash, author_connection, submitter_user_id, attribution_subject_ids, attribution_hashes) VALUES ($1, 2, '{}', $2, 'community', $3, ARRAY[$3]::uuid[], ARRAY[]::varchar[])`,
            [id, hash, author],
          ),
        ).rejects.toThrow();
        await expect(
          db.client.query(
            "INSERT INTO knight_hacks_case_study_invitation (case_study_id, token_hash, attribution_hash, expires_at) VALUES ($1, $2, $3, now() + interval '15 days')",
            [id, hash, hash],
          ),
        ).rejects.toThrow();
        await db.client.query(
          "INSERT INTO knight_hacks_case_study_invitation (case_study_id, token_hash, attribution_hash, expires_at) VALUES ($1, $2, $3, now() + interval '1 day')",
          [id, hash, hash],
        );
        await expect(
          db.client.query(
            "INSERT INTO knight_hacks_case_study_invitation (case_study_id, token_hash, attribution_hash, expires_at) VALUES ($1, $2, $3, now() + interval '1 day')",
            [id, hash, hash],
          ),
        ).rejects.toThrow();
        await expect(
          db.client.query(
            `INSERT INTO ${consent} (case_study_id, subject_user_id, attribution_hash, policy_version, action) VALUES ($1, $2, $3, 0, 'accept')`,
            [id, author, hash],
          ),
        ).rejects.toThrow();
        await expect(
          db.client.query(
            `INSERT INTO ${review} (revision_id, stage, outcome, reviewer_user_id, evidence_basis, claims_verified) VALUES ($1, 'editorial', 'approve', $2, 'member_record', true)`,
            [rev, author],
          ),
        ).rejects.toThrow();
        await expect(
          db.client.query(
            `INSERT INTO ${review} (revision_id, stage, outcome, reviewer_user_id, eligibility, evidence_basis, claims_verified) VALUES ($1, 'editorial', 'approve', $2, 'unable_to_verify', 'insufficient', true)`,
            [rev, author],
          ),
        ).rejects.toThrow();
        await db.client.query(
          `INSERT INTO ${review} (revision_id, stage, outcome, reviewer_user_id, eligibility, evidence_basis, claims_verified) VALUES ($1, 'editorial', 'approve', $2, 'verified', 'member_record', true)`,
          [rev, author],
        );
      } finally {
        await db.drop();
      }
    });
  },
);

describe.runIf(canRunDatabaseTests())(
  "case-study deletion and upgrade on PostgreSQL",
  () => {
    it("allows only one terminal review decision during a race", async () => {
      const db = await provisionDisposableDatabase("case_study_race");
      const other = new Client({ connectionString: db.url });
      try {
        await other.connect();
        const author = await user(db.client);
        const reviewer = await user(db.client);
        const id = await caseStudy(db.client, author);
        const rev = await submit(db.client, id, author);
        const sql = `INSERT INTO ${review} (revision_id, stage, outcome, reviewer_user_id) VALUES ($1, 'technical', 'approve', $2)`;
        const results = await Promise.allSettled([
          db.client.query(sql, [rev, reviewer]),
          other.query(sql, [rev, reviewer]),
        ]);
        expect(
          results.filter((result) => result.status === "fulfilled"),
        ).toHaveLength(1);
        expect(
          (
            await db.client.query<{ count: number }>(
              `SELECT count(*)::int AS count FROM ${review} WHERE revision_id = $1`,
              [rev],
            )
          ).rows[0]?.count,
        ).toBe(1);
      } finally {
        await other.end();
        await db.drop();
      }
    });

    it("allows direct account deletion with fail-closed owner and live attribution", async () => {
      const db = await provisionDisposableDatabase("case_study_delete");
      try {
        const owner = await user(db.client);
        const coauthor = await user(db.client);
        const id = await caseStudy(db.client, owner);
        const rev = await submit(db.client, id, owner);
        await db.client.query(
          `UPDATE ${study} SET published_revision_id = $1 WHERE id = $2`,
          [rev, id],
        );
        await db.client.query(
          "INSERT INTO knight_hacks_case_study_draft (case_study_id, owner_user_id) VALUES ($1, $2)",
          [id, owner],
        );
        await db.client.query(
          "INSERT INTO knight_hacks_case_study_contributor (case_study_id, user_id, attribution) VALUES ($1, $2, '{}'), ($1, $3, '{}')",
          [id, owner, coauthor],
        );
        await db.client.query(
          "INSERT INTO knight_hacks_case_study_invitation (case_study_id, token_hash, attribution_hash, target_user_id, expires_at) VALUES ($1, $2, $3, $4, now() + interval '1 day')",
          [id, hash, hash, coauthor],
        );
        await db.client.query(
          `INSERT INTO ${consent} (case_study_id, subject_user_id, attribution_hash, policy_version, action) VALUES ($1, $2, $3, 1, 'accept')`,
          [id, coauthor, hash],
        );
        await db.client.query(
          `INSERT INTO ${review} (revision_id, stage, outcome, reviewer_user_id) VALUES ($1, 'technical', 'approve', $2)`,
          [rev, coauthor],
        );
        await db.client.query(`DELETE FROM auth_user WHERE id IN ($1, $2)`, [
          owner,
          coauthor,
        ]);
        const rows = await db.client.query<{
          owner_user_id: string | null;
          published_revision_id: string | null;
        }>(
          `SELECT owner_user_id, published_revision_id FROM ${study} WHERE id = $1`,
          [id],
        );
        expect(rows.rows[0]?.owner_user_id).toBeNull();
        expect(rows.rows[0]?.published_revision_id).toBe(rev);
        for (const table of [
          "knight_hacks_case_study_draft",
          "knight_hacks_case_study_contributor",
          "knight_hacks_case_study_invitation",
        ]) {
          expect(
            (
              await db.client.query<{ count: number }>(
                `SELECT count(*)::int AS count FROM ${table} WHERE case_study_id = $1`,
                [id],
              )
            ).rows[0]?.count,
          ).toBe(0);
        }
        expect(
          (
            await db.client.query<{ count: number }>(
              `SELECT count(*)::int AS count FROM ${consent} WHERE case_study_id = $1`,
              [id],
            )
          ).rows[0]?.count,
        ).toBe(1);
        expect(
          (
            await db.client.query<{ count: number }>(
              `SELECT count(*)::int AS count FROM ${review} WHERE revision_id = $1`,
              [rev],
            )
          ).rows[0]?.count,
        ).toBe(1);
      } finally {
        await db.drop();
      }
    });

    it("upgrades a populated pre-P3 database without changing authentication or judging tables", async () => {
      const base = env.DATABASE_URL;
      if (!base) throw new Error("DATABASE_URL required");
      const name = `case_study_upgrade_${randomUUID().replaceAll("-", "")}`;
      const admin = new Client({
        connectionString: new URL("/postgres", base).toString(),
      });
      await admin.connect();
      await admin.query(`CREATE DATABASE "${name}"`);
      const client = new Client({
        connectionString: new URL(`/${name}`, base).toString(),
      });
      try {
        await client.connect();
        const migrations = await readMigrations();
        for (const migration of migrations.filter(
          (entry) => entry.name < "0065_",
        ))
          await applyMigration(client, migration);
        const id = await user(client);
        const before = await client.query<{ count: number }>(
          "SELECT count(*)::int AS count FROM knight_hacks_project",
        );
        for (const migration of migrations.filter(
          (entry) => entry.name >= "0065_",
        ))
          await applyMigration(client, migration);
        expect(
          (await client.query("SELECT id FROM auth_user WHERE id = $1", [id]))
            .rowCount,
        ).toBe(1);
        expect(
          (
            await client.query<{ count: number }>(
              "SELECT count(*)::int AS count FROM knight_hacks_project",
            )
          ).rows[0]?.count,
        ).toBe(before.rows[0]?.count);
        expect(
          (
            await client.query<{ count: number }>(
              "SELECT count(*)::int AS count FROM knight_hacks_case_study_study",
            )
          ).rows[0]?.count,
        ).toBe(0);
      } finally {
        await client.end();
        await admin.query(`DROP DATABASE "${name}"`);
        await admin.end();
      }
    });
  },
);
