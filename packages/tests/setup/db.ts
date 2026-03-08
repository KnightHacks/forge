/* eslint-disable no-console */
import { exec } from "child_process";
import fs from "fs";
import { unlink } from "fs/promises";
import { pipeline } from "stream/promises";
import { promisify } from "util";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import Pool from "pg-pool";

import { minioClient } from "@forge/api/minio/minio-client";
import * as authSchema from "@forge/db/schemas/auth";
import * as knightHacksSchema from "@forge/db/schemas/knight-hacks";

const execAsync = promisify(exec);

// Hard-coded test database URL - NEVER reads from .env
const TEST_DB_NAME = "forge_test";
const ADMIN_DB_URL = "postgresql://root:mysecretpassword@localhost:5432/local";
const TEST_DB_URL = `postgresql://root:mysecretpassword@localhost:5432/${TEST_DB_NAME}`;

function parsePg() {
  const u = new URL(ADMIN_DB_URL);
  return {
    user: u.username,
    password: u.password,
    host: u.hostname,
    port: u.port,
  };
}

type AuthSchema = typeof authSchema;
type KnightHacksSchema = typeof knightHacksSchema;
type DatabaseSchema = AuthSchema & KnightHacksSchema;

let testPool: Pool<import("pg").Client> | null = null;
export let testDb: NodePgDatabase<DatabaseSchema> | null = null;

// Admin pool for DDL operations (CREATE/DROP DATABASE)
const adminPool = new Pool({
  connectionString: ADMIN_DB_URL,
  database: "postgres",
});

/**
 * Creates the ephemeral test database, pushes schema, and seeds test data.
 * Called once before all tests run.
 */
async function setupDatabase() {
  try {
    console.log(`[Test DB] Dropping database ${TEST_DB_NAME} if it exists...`);
    await adminPool.query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`);

    console.log(`[Test DB] Creating fresh database ${TEST_DB_NAME}...`);
    await adminPool.query(`CREATE DATABASE ${TEST_DB_NAME}`);

    // Create test pool and drizzle instance
    testPool = new Pool({
      connectionString: TEST_DB_URL,
    });

    testDb = drizzle({
      client: testPool,
      schema: { ...authSchema, ...knightHacksSchema },
      casing: "snake_case",
    });

    // Push schema using drizzle-kit
    console.log(`[Test DB] Pushing schema to ${TEST_DB_NAME}...`);
    const { stdout, stderr } = await execAsync(
      `cd ../../packages/db && DATABASE_URL="${TEST_DB_URL}" pnpm drizzle-kit push`,
    );
    if (stderr && !stderr.includes("No schema changes")) {
      console.warn("[Test DB] drizzle-kit push stderr:", stderr);
    }
    if (stdout) {
      console.log("[Test DB] drizzle-kit push:", stdout);
    }

    // Pull seeded devdb from MinIO and apply it
    console.log(`[Test DB] Pulling seeded devdb from MinIO...`);
    await applySeededDevdb();

    // Seed additional test data on top of the seeded devdb
    console.log(`[Test DB] Seeding additional test data...`);
    await seedTestData();

    console.log(`[Test DB] Setup complete!`);
  } catch (error) {
    console.error("[Test DB] Setup failed:", error);
    throw error;
  }
}

/**
 * Pulls the seeded devdb backup from MinIO and applies it to the test database.
 * This gives us a realistic starting state with real (but sanitized) data.
 */
async function applySeededDevdb() {
  const BUCKET_NAME = "dev-db-backups";
  const objectName = "backup.sql";
  const backupFile = "backup.sql";

  try {
    // Get presigned URL for the backup file
    const fileUrl = await minioClient.presignedGetObject(
      BUCKET_NAME,
      objectName,
      60 * 60 * 24, // 24 hour expiry
    );

    console.log("[Test DB] Downloading backup.sql from MinIO...");
    const res = await fetch(fileUrl);
    if (!res.ok || !res.body) {
      throw new Error(`Failed to download backup: ${res.status}`);
    }

    // Write the backup file
    await pipeline(res.body, fs.createWriteStream(backupFile));

    // Apply the backup to the test database
    const { user, password, host, port } = parsePg();
    /* eslint-disable no-restricted-properties */
    const envN = { ...process.env, PGPASSWORD: password };

    console.log("[Test DB] Applying backup.sql to test database...");
    await execAsync(
      `psql -h ${host} -p ${port} -U ${user} ${TEST_DB_NAME} < ${backupFile}`,
      { env: envN },
    );

    console.log("[Test DB] Successfully applied seeded devdb");
  } catch (error) {
    console.error("[Test DB] Failed to apply seeded devdb:", error);
    // Don't throw - allow tests to continue with empty DB if MinIO is unavailable
    console.warn("[Test DB] Continuing with empty database...");
  } finally {
    // Clean up backup file
    try {
      await unlink(backupFile);
    } catch {
      // File might not exist, ignore
    }
  }
}

/**
 * Seeds additional test data on top of the seeded devdb.
 * This can include test-specific users, events, forms, etc.
 */
async function seedTestData() {
  if (!testDb) throw new Error("testDb not initialized");

  // Additional test data can be added here if needed
  // For now, we rely on the seeded devdb from MinIO
  console.log(`[Test DB] Additional test data seeding complete`);
}

/**
 * Tears down the test database.
 * Called once after all tests complete.
 */
async function teardownDatabase() {
  try {
    console.log(`[Test DB] Closing test pool...`);
    if (testPool) {
      await testPool.end();
      testPool = null;
    }
    testDb = null;

    console.log(`[Test DB] Dropping database ${TEST_DB_NAME}...`);
    await adminPool.query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`);

    console.log(`[Test DB] Teardown complete!`);
  } catch (error) {
    console.error("[Test DB] Teardown failed:", error);
    throw error;
  } finally {
    await adminPool.end();
  }
}

// Vitest global setup/teardown
export async function setup() {
  await setupDatabase();
}

export async function teardown() {
  await teardownDatabase();
}
