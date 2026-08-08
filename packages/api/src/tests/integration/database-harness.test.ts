import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { DisposableDatabase } from "@forge/db/testing";
import { sql } from "@forge/db";
import {
  canRunDatabaseTests,
  provisionDisposableDatabase,
} from "@forge/db/testing";

/**
 * Proves the disposable-database path works end to end, so API tests can run
 * against real SQL instead of a mocked `db`.
 *
 * Today 17 of 19 `vi.mock` calls in this package stub `@forge/db/client`, so no
 * query, join predicate, `where` clause, or transaction boundary is verified
 * anywhere and a query refactor cannot fail CI. This is the seam that closes
 * that gap.
 *
 * Skips rather than fails without a loopback `DATABASE_URL`, so a contributor
 * with no local Postgres still gets a green suite. Start one from the repo root
 * with `docker compose up -d`, then run with `DATABASE_URL=... pnpm test`.
 */
describe.runIf(canRunDatabaseTests())("disposable database harness", () => {
  let disposable: DisposableDatabase | undefined;

  // `@forge/db/client` builds its pool from DATABASE_URL at module load, so it
  // can only be imported once the disposable database exists and the variable
  // points at it. Hence the dynamic imports below.
  let client: typeof import("@forge/db/client").db;
  let schemas: typeof import("@forge/db/schemas/knight-hacks");

  function database(): DisposableDatabase {
    if (!disposable) throw new Error("Disposable database is not ready");
    return disposable;
  }

  beforeAll(async () => {
    disposable = await provisionDisposableDatabase("forge_api");
    // Redirecting the module-scope pool at the disposable database is the whole
    // point of this seam, and it has to happen before the import below.
    // eslint-disable-next-line no-restricted-properties
    process.env.DATABASE_URL = disposable.url;

    ({ db: client } = await import("@forge/db/client"));
    schemas = await import("@forge/db/schemas/knight-hacks");
  }, 120_000);

  afterAll(async () => {
    // Close the pool before dropping. `drop()` evicts leftover sessions as a
    // backstop, but a pool killed mid-connection emits an unhandled `57P01`.
    await client.$client.end().catch(() => undefined);
    await disposable?.drop();
  }, 30_000);

  it("applies every committed migration to a fresh database", async () => {
    const { rows } = await database().client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
    );
    const tables = rows.map((row) => row.table_name);

    // One representative table per schema module, so a migration that fails to
    // apply surfaces here rather than as a confusing query error later.
    expect(tables).toContain("knight_hacks_member");
    expect(tables).toContain("knight_hacks_event");
    expect(tables).toContain("auth_user");
  });

  it("exposes the underlying pg Pool for lifecycle management", () => {
    expect(client.$client).toBeInstanceOf(Pool);
  });

  it("rolls back every statement on the same checked-out connection", async () => {
    await database().client.query(
      "CREATE TABLE transaction_atomicity_probe (id integer PRIMARY KEY)",
    );

    const rollback = new Error("rollback transaction atomicity probe");
    await expect(
      client.transaction(async (tx) => {
        await tx.execute(
          sql`INSERT INTO transaction_atomicity_probe (id) VALUES (1)`,
        );
        throw rollback;
      }),
    ).rejects.toBe(rollback);

    const result = await database().client.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM transaction_atomicity_probe",
    );
    expect(result.rows[0]?.count).toBe(0);
  });

  it("agrees with the migrated SQL on every column Drizzle declares", async () => {
    // The assertion mocked-`db` tests cannot make. Drizzle names each declared
    // column in the generated SELECT, so drift between a schema file and the
    // committed migrations fails here naming the offending column, instead of
    // surfacing in production. Empty tables are fine — the point is that the
    // query plans and executes, not what it returns.
    await expect(
      client.select().from(schemas.Member).limit(1),
    ).resolves.toBeInstanceOf(Array);
    await expect(
      client.select().from(schemas.Event).limit(1),
    ).resolves.toBeInstanceOf(Array);
    await expect(
      client.select().from(schemas.DuesPayment).limit(1),
    ).resolves.toBeInstanceOf(Array);
  });

  it("isolates each run in its own database", () => {
    expect(database().url).toMatch(/\/forge_api_[0-9a-f]{32}$/);
  });
});
