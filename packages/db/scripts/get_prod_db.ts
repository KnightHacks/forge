// TODO: use a real logger to avoid this issue
/* eslint-disable no-console */

/**
 * Usage:
 *   pnpm --filter=@forge/db with-env tsx scripts/get_prod_db.ts [--truncate]
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

import { execFile } from "child_process";
import { createWriteStream } from "fs";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { pipeline } from "stream/promises";
import { promisify } from "util";

import { minioClient } from "../../api/src/minio/minio-client";
import { env } from "../src/env";
import {
  psqlFileArgs,
  truncateRestorePostlude,
  truncateRestorePrelude,
} from "./prod-db-restore";

const execFileAsync = promisify(execFile);

interface LocalDbCommand {
  database: string;
  envN: NodeJS.ProcessEnv;
  host: string;
  port: string;
  user: string;
}

function parsePg() {
  const u = new URL(env.DATABASE_URL);
  return {
    originalDb: u.pathname.slice(1),
    user: u.username,
    password: u.password,
    host: u.hostname,
    port: u.port || "5432",
  };
}

async function runLocalSqlFiles(
  fileNames: readonly string[],
  { envN, ...connection }: LocalDbCommand,
  options?: { singleTransaction?: boolean },
) {
  await execFileAsync("psql", psqlFileArgs(connection, fileNames, options), {
    env: envN,
  });
}

async function repairLocalAuthTables(
  command: LocalDbCommand,
  repairFile: string,
) {
  console.log("Repairing local auth tables and Discord account links");

  const repairSql = `CREATE TABLE IF NOT EXISTS "auth_account" (
  "id" text NOT NULL,
  "user_id" uuid NOT NULL,
  "provider" varchar(255) NOT NULL,
  "provider_account_id" varchar(255) NOT NULL,
  "refresh_token" varchar(255),
  "access_token" text,
  "expires_at" timestamp with time zone,
  "scope" varchar(255),
  "id_token" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "auth_account_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);

CREATE TABLE IF NOT EXISTS "auth_judge_session" (
  "session_token" varchar(255) PRIMARY KEY NOT NULL,
  "room_name" text NOT NULL,
  "expires" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "auth_permissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "role_id" uuid NOT NULL,
  "user_id" uuid NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'auth_account_user_id_auth_user_id_fk'
  ) THEN
    ALTER TABLE "auth_account"
      ADD CONSTRAINT "auth_account_user_id_auth_user_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'auth_permissions_role_id_auth_roles_id_fk'
  ) THEN
    ALTER TABLE "auth_permissions"
      ADD CONSTRAINT "auth_permissions_role_id_auth_roles_id_fk"
      FOREIGN KEY ("role_id") REFERENCES "public"."auth_roles"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'auth_permissions_user_id_auth_user_id_fk'
  ) THEN
    ALTER TABLE "auth_permissions"
      ADD CONSTRAINT "auth_permissions_user_id_auth_user_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

INSERT INTO auth_account (
  id,
  user_id,
  provider,
  provider_account_id,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid()::text,
  chosen.id,
  'discord',
  chosen.discord_user_id,
  now(),
  now()
FROM (
  SELECT DISTINCT ON (u.discord_user_id)
    u.id,
    u.discord_user_id
  FROM auth_user u
  WHERE u.discord_user_id IS NOT NULL
  ORDER BY
    u.discord_user_id,
    EXISTS (SELECT 1 FROM knight_hacks_member m WHERE m.user_id = u.id) DESC,
    EXISTS (SELECT 1 FROM knight_hacks_hacker h WHERE h.user_id = u.id) DESC,
    u.created_at ASC
) chosen
ON CONFLICT (provider, provider_account_id) DO UPDATE
SET user_id = EXCLUDED.user_id,
    updated_at = now();
`;

  await writeFile(repairFile, repairSql);
  await runLocalSqlFiles([repairFile], command, { singleTransaction: true });
}

async function main() {
  const args = process.argv.slice(2);

  const BUCKET_NAME = "dev-db-backups";
  const objectName = "backup.sql";
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "forge-db-pull-"));
  const backupFile = join(temporaryDirectory, objectName);

  try {
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

    await pipeline(res.body, createWriteStream(backupFile));

    const { originalDb: database, user, password, host, port } = parsePg();
    /* eslint-disable no-restricted-properties */
    const envN = { ...process.env, PGPASSWORD: password };
    const command = { database, envN, host, port, user };

    console.log("Inserting prod rows into local DB");
    if (args.includes("--truncate")) {
      console.log("Replacing local rows in one transaction");
      const preludeFile = join(temporaryDirectory, "restore-prelude.sql");
      const postludeFile = join(temporaryDirectory, "restore-postlude.sql");
      await Promise.all([
        writeFile(preludeFile, truncateRestorePrelude()),
        writeFile(postludeFile, truncateRestorePostlude()),
      ]);
      await runLocalSqlFiles([preludeFile, backupFile, postludeFile], command, {
        singleTransaction: true,
      });
    } else {
      await runLocalSqlFiles([backupFile], command, {
        singleTransaction: true,
      });
    }

    await repairLocalAuthTables(
      command,
      join(temporaryDirectory, "repair-local-auth.sql"),
    );
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
}

await main();
