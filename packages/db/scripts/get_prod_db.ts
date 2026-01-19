/* eslint-disable no-console */
// Usage:
//   pnpm --filter @forge/db with-env tsx scripts/get_prod_db.tsx

import { exec } from "child_process";
import { unlink } from "fs/promises";
import { promisify } from "util";
import { minioClient } from "../../api/src/minio/minio-client";
import fs from "fs";
import { pipeline } from "stream/promises";
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

	await pipeline(
		res.body,
		fs.createWriteStream(objectName),
	);

  const { originalDb: _, user, password, host: _host, port } = parsePg();
  /* eslint-disable no-restricted-properties */
  const envN = { ...process.env, PGPASSWORD: password };

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
