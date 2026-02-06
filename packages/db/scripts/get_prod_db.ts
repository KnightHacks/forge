/* eslint-disable no-console */
/**
 * Usage:
 *   pnpm --filter @forge/db with-env tsx scripts/get_prod_db.ts [--truncate]
 *
 * Pass in --truncate if you want to truncate the entire database before
 * pushing the rows from prod.
 *
 * This is helpful if there was a migration or something and is currently
 * the only way to do updates on rows that were updated in prod instead of
 * just inserted.
 *
 * We should switch to upserts at some point but idk how to do that cleanly.
 *
 * Script to get prod db data into local db.
 * Simply run the command above to get the rows and insert them automatically.
 *
 * This won't lose any data that you already have if --truncate wasn't passed in
 * such as the superadmin from the bootstrap script.
 *
 * The bootstrap script can also be run after running this command and it'll work fine.
 */

import { exec } from "child_process";
import fs from "fs";
import { unlink } from "fs/promises";
import { pipeline } from "stream/promises";
import { promisify } from "util";

import { minioClient } from "../../api/src/minio/minio-client";
import { env } from "../src/env";

const execAsync = promisify(exec);

function parsePg() {
  const u = new URL(env.DATABASE_URL);
  return {
    originalDb: u.pathname.slice(1),
    user: u.username,
    password: u.password,
    host: u.hostname,
    port: u.port,
  };
}

async function main() {
  const args = process.argv.slice(2);

  const BUCKET_NAME = "dev-db-backups";
  const objectName = "backup.sql";

  const fileUrl = await minioClient.presignedGetObject(
    BUCKET_NAME,
    objectName,
    60 * 60 * 24,
  );

  console.log("Pulling backup.sql from minio");

  const res = await fetch(fileUrl);
  if (!res.ok || !res.body) {
    throw new Error(`Download failed: ${res.status}`);
  }

  await pipeline(res.body, fs.createWriteStream(objectName));

  const { originalDb: _, user, password, host: _host, port } = parsePg();
  /* eslint-disable no-restricted-properties */
  const envN = { ...process.env, PGPASSWORD: password };

  if (args.includes("--truncate")) {
    //We wanna truncate all tables so that it updates already seeded rows too
    //Probably at some point write a sed script that changes all inserts to upserts
    console.log("Truncating all tables in DB");
    //Imma be real ts was GPT pls lmk if its cooked
    await execAsync(
      `psql -h localhost -p ${port} -U ${user} -d local << 'EOF'
			SET session_replication_role = replica;
			DO $$ 
			DECLARE 
			r RECORD;
			BEGIN
			FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
				LOOP
			EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
			END LOOP;
			END $$;
			SET session_replication_role = DEFAULT;
			EOF`,
      { env: envN },
    );
  }

  console.log("Inserting prod rows into local DB");
  try {
    await execAsync(
      `psql -h localhost -p ${port} -U ${user} local < ${objectName}`,
      { env: envN },
    );
  } finally {
    await unlink(objectName);
  }
}

await main();
