import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { DisposableDatabase } from "../testing";
import {
  applyMigration,
  canRunDatabaseTests,
  provisionDisposableDatabase,
  readMigrations,
} from "../testing";

let database: DisposableDatabase;
const user = randomUUID();
const event = randomUUID();
const eventClient = randomUUID();
const projectsClient = randomUUID();
const parent = randomUUID();
const eventSession = randomUUID();
const eventCode = randomUUID();
const projectsSession = randomUUID();

async function insertClient(
  id: string,
  kind: string,
  hackathonId: string | null,
  clientId: string,
  origin: string,
) {
  return database.client.query(
    `INSERT INTO knight_hacks_hackathon_portal_client
  (id, client_kind, hackathon_id, client_id, name, production_origin) VALUES ($1,$2,$3,$4,'test',$5)`,
    [id, kind, hackathonId, clientId, origin],
  );
}
async function insertSession(
  id: string,
  client: string,
  kind: string,
  hackathonId: string | null,
) {
  return database.client.query(
    `INSERT INTO knight_hacks_hackathon_portal_session
  (id, portal_client_id, client_kind, hackathon_id, user_id, better_auth_session_id, access_token_hash, refresh_token_hash, access_expires_at, refresh_expires_at)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now()+interval '15 minutes',now()+interval '30 days')`,
    [
      id,
      client,
      kind,
      hackathonId,
      user,
      parent,
      randomUUID().replaceAll("-", "").repeat(2),
      randomUUID().replaceAll("-", "").repeat(2),
    ],
  );
}
async function insertCode(
  client: string,
  kind: string,
  hackathonId: string | null,
) {
  return database.client.query(
    `INSERT INTO knight_hacks_hackathon_portal_authorization_code
  (portal_client_id, client_kind, hackathon_id, user_id, better_auth_session_id, code_hash, code_challenge, redirect_uri, expires_at)
  VALUES ($1,$2,$3,$4,$5,$6,'challenge','https://projects.knighthacks.org/api/projects-auth/callback',now()+interval '5 minutes')`,
    [
      client,
      kind,
      hackathonId,
      user,
      parent,
      randomUUID().replaceAll("-", "").repeat(2),
    ],
  );
}

describe.skipIf(!canRunDatabaseTests())(
  "Projects authentication migration",
  () => {
    beforeAll(async () => {
      database = await provisionDisposableDatabase("forge_projects_schema");
    }, 120_000);
    afterAll(async () => {
      await database.drop();
    }, 30_000);

    it("migrates empty databases without provisioning Projects", async () => {
      const clients = await database.client.query(
        "SELECT * FROM knight_hacks_hackathon_portal_client",
      );
      expect(clients.rows).toHaveLength(0);
    });

    it("upgrades sanitized event credentials without changing their values or IDs", async () => {
      // Rebuild only this disposable database at the preceding migration.
      await database.client.query(
        "DROP SCHEMA public CASCADE; CREATE SCHEMA public",
      );
      const migrations = await readMigrations();
      const migrationIndex = migrations.findIndex(({ name }) =>
        name.startsWith("0064_"),
      );
      expect(migrationIndex).toBeGreaterThan(0);
      for (const migration of migrations.slice(0, migrationIndex))
        await applyMigration(database.client, migration);
      await database.client.query(
        "INSERT INTO auth_user (id, discord_user_id) VALUES ($1, 'sanitized-projects-user')",
        [user],
      );
      await database.client.query(
        "INSERT INTO auth_session (id, user_id, session_token, expires) VALUES ($1,$2,'sanitized-parent',now()+interval '30 days')",
        [parent, user],
      );
      await database.client.query(
        `INSERT INTO knight_hacks_hackathon (id,name,display_name,theme,start_date,end_date,application_open,application_deadline,confirmation_deadline)
      VALUES ($1,'sanitized-event','Sanitized event','test',now(),now(),now(),now(),now())`,
        [event],
      );
      await database.client.query(
        `INSERT INTO knight_hacks_hackathon_portal_client (id,hackathon_id,client_id,name,production_origin) VALUES ($1,$2,'sanitized-event','Event','https://sanitized.knighthacks.org')`,
        [eventClient, event],
      );
      await database.client.query(
        `INSERT INTO knight_hacks_hackathon_portal_authorization_code (id,portal_client_id,hackathon_id,user_id,better_auth_session_id,code_hash,code_challenge,redirect_uri,expires_at)
      VALUES ($1,$2,$3,$4,$5,$6,'challenge','https://sanitized.knighthacks.org/callback',now()+interval '5 minutes')`,
        [eventCode, eventClient, event, user, parent, "a".repeat(64)],
      );
      await database.client.query(
        `INSERT INTO knight_hacks_hackathon_portal_session (id,portal_client_id,hackathon_id,user_id,better_auth_session_id,access_token_hash,refresh_token_hash,access_expires_at,refresh_expires_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,now()+interval '15 minutes',now()+interval '30 days')`,
        [
          eventSession,
          eventClient,
          event,
          user,
          parent,
          "b".repeat(64),
          "c".repeat(64),
        ],
      );
      await database.client.query(
        `INSERT INTO knight_hacks_hackathon_portal_session_credential (portal_session_id,token_hash,token_kind,expires_at) VALUES ($1,$2,'refresh',now()+interval '30 days')`,
        [eventSession, "c".repeat(64)],
      );
      const tables = [
        "client",
        "authorization_code",
        "session",
        "session_credential",
      ];
      const before = await Promise.all(
        tables.map((table) =>
          database.client.query(
            `SELECT * FROM knight_hacks_hackathon_portal_${table}`,
          ),
        ),
      );
      for (const migration of migrations.slice(migrationIndex))
        await applyMigration(database.client, migration);
      for (const [index, table] of tables.entries()) {
        const after = await database.client.query(
          `SELECT * FROM knight_hacks_hackathon_portal_${table}`,
        );
        expect(after.rows).toEqual(
          before[index]?.rows.map((row: Record<string, unknown>) =>
            table === "session_credential"
              ? row
              : { ...row, client_kind: "hackathon" },
          ),
        );
      }
    });

    it("enforces registration and every scope relationship in PostgreSQL", async () => {
      for (const [kind, hackathonId, clientId, origin] of [
        ["hackathon", null, "event2", "https://event2.knighthacks.org"],
        ["hackathon", event, "projects", "https://projects.knighthacks.org"],
        ["projects", event, "projects", "https://projects.knighthacks.org"],
        ["projects", null, "arbitrary", "https://projects.knighthacks.org"],
        ["projects", null, "projects", "https://arbitrary.knighthacks.org"],
        ["other", null, "other", "https://other.knighthacks.org"],
      ] as const) {
        await expect(
          insertClient(randomUUID(), kind, hackathonId, clientId, origin),
        ).rejects.toMatchObject({ code: "23514" });
      }
      await insertClient(
        projectsClient,
        "projects",
        null,
        "projects",
        "https://projects.knighthacks.org",
      );
      for (const [client, kind, hackathonId, error] of [
        [projectsClient, "projects", event, "23514"],
        [eventClient, "hackathon", null, "23514"],
        [eventClient, "projects", null, "23503"],
        [projectsClient, "hackathon", event, "23503"],
        [randomUUID(), "projects", null, "23503"],
      ] as const) {
        await expect(
          insertSession(randomUUID(), client, kind, hackathonId),
        ).rejects.toMatchObject({ code: error });
        await expect(
          insertCode(client, kind, hackathonId),
        ).rejects.toMatchObject({ code: error });
      }
      await insertSession(projectsSession, projectsClient, "projects", null);
      await insertCode(projectsClient, "projects", null);
      await expect(
        database.client.query(
          `INSERT INTO knight_hacks_hackathon_portal_session_credential (portal_session_id,token_hash,token_kind,expires_at) VALUES ($1,$2,'access',now())`,
          [randomUUID(), "d".repeat(64)],
        ),
      ).rejects.toMatchObject({ code: "23503" });
    });

    it("preserves Projects through event deletion and cascades parent/user deletion", async () => {
      await database.client.query(
        "DELETE FROM knight_hacks_hackathon WHERE id=$1",
        [event],
      );
      expect(
        (
          await database.client.query(
            "SELECT id FROM knight_hacks_hackathon_portal_session",
          )
        ).rows,
      ).toEqual([{ id: projectsSession }]);
      await database.client.query(
        `INSERT INTO knight_hacks_hackathon_portal_session_credential (portal_session_id,token_hash,token_kind,expires_at) VALUES ($1,$2,'access',now())`,
        [projectsSession, "e".repeat(64)],
      );
      await database.client.query("DELETE FROM auth_session WHERE id=$1", [
        parent,
      ]);
      for (const table of [
        "authorization_code",
        "session",
        "session_credential",
      ])
        expect(
          (
            await database.client.query(
              `SELECT * FROM knight_hacks_hackathon_portal_${table}`,
            )
          ).rows,
        ).toHaveLength(0);
      await database.client.query(
        "INSERT INTO auth_session (id, user_id, session_token, expires) VALUES ($1,$2,'sanitized-parent-2',now()+interval '30 days')",
        [parent, user],
      );
      await insertSession(randomUUID(), projectsClient, "projects", null);
      await insertCode(projectsClient, "projects", null);
      await database.client.query("DELETE FROM auth_user WHERE id=$1", [user]);
      for (const table of [
        "authorization_code",
        "session",
        "session_credential",
      ])
        expect(
          (
            await database.client.query(
              `SELECT * FROM knight_hacks_hackathon_portal_${table}`,
            )
          ).rows,
        ).toHaveLength(0);
    });
  },
);
