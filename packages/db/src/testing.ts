import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { Client } from "pg";

import { env } from "./env";

/**
 * Test-only helpers for running against a real, disposable PostgreSQL database.
 *
 * Extracted from `src/tests/event-management-migration.test.ts`, which was the
 * only place in the monorepo that exercised real SQL. Everything else mocks
 * `@forge/db/client`, so no query, join predicate, transaction boundary, or
 * index is verified anywhere — which makes query refactors invisible to CI.
 *
 * Exported through the `@forge/db/testing` subpath so `@forge/api` can use it
 * without reaching into this package's internals.
 */

const SQL_MIGRATION_PATTERN = /^\d+_.*\.sql$/;
const MIGRATION_DIRECTORY = new URL("../drizzle/", import.meta.url);

export interface MigrationFile {
  name: string;
  sql: string;
}

/**
 * Only loopback hosts are ever acceptable. This harness issues `CREATE DATABASE`
 * and `DROP DATABASE`, so pointing it at a remote `DATABASE_URL` would be
 * destructive. The check lives here rather than in each caller so a new test
 * cannot forget it.
 */
export function isLoopbackDatabaseUrl(
  value: string | undefined,
): value is string {
  if (!value) return false;

  try {
    const host = new URL(value).hostname;
    return host === "127.0.0.1" || host === "localhost" || host === "::1";
  } catch {
    return false;
  }
}

/** Guard for `describe.runIf(...)`, so suites skip rather than fail locally. */
export function canRunDatabaseTests(): boolean {
  return isLoopbackDatabaseUrl(env.DATABASE_URL);
}

export async function readMigrations(): Promise<MigrationFile[]> {
  const names = (await readdir(MIGRATION_DIRECTORY))
    .filter((name) => SQL_MIGRATION_PATTERN.test(name))
    .sort();

  return Promise.all(
    names.map(async (name) => ({
      name,
      sql: await readFile(new URL(name, MIGRATION_DIRECTORY), "utf8"),
    })),
  );
}

export async function applyMigration(
  client: Client,
  migration: MigrationFile,
): Promise<void> {
  const statements = migration.sql
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await client.query(statement);
  }
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function databaseUrlFor(baseUrl: string, database: string): string {
  const url = new URL(baseUrl);
  url.pathname = `/${database}`;
  return url.toString();
}

export interface DisposableDatabase {
  /** Connection string for the freshly created database. */
  url: string;
  /** Connected client for the freshly created database. */
  client: Client;
  /**
   * Closes connections and drops the database. Safe to call twice.
   *
   * Close any pool you opened first — notably `@forge/db/client`'s, via
   * `db.$client.end()`. This evicts stragglers so the drop succeeds, but a pool
   * killed mid-connection emits an unhandled `57P01` that fails the run.
   */
  drop: () => Promise<void>;
}

/**
 * Creates a uniquely named database, applies every committed migration in
 * order, and hands back a connection plus a teardown function.
 *
 * Throws rather than skipping when `DATABASE_URL` is missing or non-loopback:
 * a caller that reaches this function has already decided it wants a database,
 * and silently passing would be worse than failing. Use `canRunDatabaseTests()`
 * with `describe.runIf` to skip instead.
 */
export async function provisionDisposableDatabase(
  namePrefix = "forge_test",
): Promise<DisposableDatabase> {
  const baseUrl = env.DATABASE_URL;
  if (!isLoopbackDatabaseUrl(baseUrl)) {
    throw new Error(
      "provisionDisposableDatabase requires a loopback DATABASE_URL. It issues CREATE DATABASE and DROP DATABASE and must never touch a remote host.",
    );
  }

  const databaseName = `${namePrefix}_${randomUUID().replaceAll("-", "")}`;
  const adminClient = new Client({
    connectionString: databaseUrlFor(baseUrl, "postgres"),
  });
  await adminClient.connect();
  await adminClient.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);

  const url = databaseUrlFor(baseUrl, databaseName);
  const client = new Client({ connectionString: url });

  try {
    await client.connect();
    for (const migration of await readMigrations()) {
      await applyMigration(client, migration);
    }
  } catch (error) {
    // Do not leak the database if migrations fail partway through.
    await client.end().catch(() => undefined);
    await adminClient.query(
      `DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)}`,
    );
    await adminClient.end();
    throw error;
  }

  let dropped = false;
  return {
    url,
    client,
    drop: async () => {
      if (dropped) return;
      dropped = true;
      await client.end().catch(() => undefined);

      // Closing our own client is not enough. Anything that imported
      // `@forge/db/client` opened a connection pool against this database, and
      // Postgres refuses to drop a database that still has sessions. Evict them
      // rather than requiring every caller to find and close every pool.
      await adminClient.query(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
        [databaseName],
      );
      await adminClient.query(
        `DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)}`,
      );
      await adminClient.end();
    },
  };
}
