import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Client } from "pg";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import Pool from "pg-pool";

import { exec } from 'child_process';
import { promisify } from 'util';
import { unlink } from 'fs/promises';

const execAsync = promisify(exec);

import { env } from "../src/env";
import * as authSchema from "../src/schemas/auth";
import * as knightHacksSchema from "../src/schemas/knight-hacks";
import { Roles } from "../src/schemas/auth";
import { Permissions } from "../src/schemas/auth";

/* eslint-disable no-console */
// Usage:
//   pnpm --filter @forge/db with-env tsx scripts/seed_devdb.ts

console.log("Starting seeding script");

type AuthSchema = typeof authSchema;
type KnightHacksSchema = typeof knightHacksSchema;
type DatabaseSchema = AuthSchema & KnightHacksSchema;

const backupDbName = `backup`;

// Admin connection to postgres database for DDL operations
const adminPool = new Pool({
  connectionString: env.DATABASE_URL,
  database: "postgres",
});

let backupPool: Pool<Client> | null = null;
let backupDb: NodePgDatabase<DatabaseSchema> | null = null;

async function cleanUp() {
  console.log("Cleaning up connections...");

  if (backupPool !== null) {
    try {
      await backupPool.end();
    } catch (e) {
      console.error("Error ending backup pool:", e);
    }
  }

  try {
    await adminPool.end();
  } catch (e) {
    console.error("Error ending admin pool:", e);
  }
}

const TABLES_REMOVE_ALL: string[] = [
  "auth_verification",
  "auth_session",
	"auth_judge_session",
  "knight_hacks_judged_submission",
  "knight_hacks_judges",
];

async function cleanTable(name: string, userIdsToDelete: string[]) {
  if (!backupDb) return;

  if (TABLES_REMOVE_ALL.includes(name)) {
    console.log("Removing all rows from ", name);
    await backupDb.execute(
      sql.raw(`TRUNCATE TABLE "${name}" RESTART IDENTITY CASCADE`),
    );
    return;
  }

  if (userIdsToDelete.length == 0) return;

  const relResult = await backupDb.execute(sql`
    SELECT kcu.column_name
    FROM information_schema.key_column_usage AS kcu
    JOIN information_schema.constraint_column_usage AS ccu 
      ON ccu.constraint_name = kcu.constraint_name
    WHERE kcu.table_name = ${name}
      AND ccu.table_name = 'auth_user'
      AND ccu.column_name = 'id'
      AND kcu.table_schema = 'public'
    LIMIT 1;
  `);

  const userFkColumn = relResult.rows[0]?.column_name as string | undefined;

  if (userFkColumn) {
    console.log(`Cascading removing user info in table ${name}`);

    await backupDb.execute(sql`
      DELETE FROM ${sql.identifier(name)}
      WHERE ${sql.identifier(userFkColumn)} IN (${sql.join(
        userIdsToDelete.map((id) => sql`${id}`),
        sql`, `,
      )})
    `);
  } else {
    console.log(`Table ${name} will remain unaffected entirely`);
  }
}

const isAdmin: Record<string, boolean> = {};

async function shouldKeepId(userid: string): Promise<boolean> {
  if (!Object.keys(isAdmin).includes(userid)) {
		if(!backupDb) return false;
			const permRows = await backupDb
			.select({
				permissions: Roles.permissions,
			})
			.from(Roles)
			.innerJoin(Permissions, eq(Roles.id, Permissions.roleId))
			.where(sql`cast(${Permissions.userId} as text) = ${userid}`);

			const admin = permRows.length > 0;
    	isAdmin[userid] = admin;
  }
  console.log(userid, isAdmin[userid]);
  return isAdmin[userid] ?? false;
}

async function copyDatabase() {
  const backupFile = 'backup.sql';
	const { originalDb, user, password, host, port } = parsePg();
  const envN = { ...process.env, PGPASSWORD: password };
  
  try {
    await execAsync(`pg_dump -h ${host} -p ${port} -U ${user} ${originalDb} > ${backupFile}`, { env: envN });
    await execAsync(`createdb -h ${host} -p ${port} -U ${user} ${backupDbName}`, { env: envN });
    await execAsync(`psql -h ${host} -p ${port} -U ${user} ${backupDbName} < ${backupFile}`, { env: envN });
    
  } finally {
    await unlink(backupFile);
  }
}

function parsePg() {
  const u = new URL(env.DATABASE_URL);
  return {
    originalDb: u.pathname.slice(1),
    user: u.username,
    password: u.password,
		host: u.hostname,
		port: u.port
  };
}

async function main() {
  try {
    const baseConnectionString = env.DATABASE_URL.substring(
      0,
      env.DATABASE_URL.lastIndexOf("/") + 1,
    );

    console.log(`Dropping database ${backupDbName} if it exists...`);
    await adminPool.query(`DROP DATABASE IF EXISTS ${backupDbName}`);

    console.log(`Creating fresh database ${backupDbName}...`);
		await copyDatabase();

    backupPool = new Pool({
      connectionString: baseConnectionString + backupDbName,
    });

    backupDb = drizzle({
      client: backupPool,
      schema: { ...authSchema, ...knightHacksSchema },
      casing: "snake_case",
    });

    const { rows: tablesJSON } = await backupDb.execute(sql`
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
`);

    let tables = tablesJSON.map((t) => t.table_name as string);
    tables = [...tables.filter((x) => x !== "auth_user"), "auth_user"];

    const allUsers = await backupDb.execute(sql`SELECT id FROM auth_user`);

    const userIdsToDelete: string[] = [];

    for (const row of allUsers.rows) {
      const userId = row.id as string;
      const keep = await shouldKeepId(userId);
      if (!keep) userIdsToDelete.push(userId);
    }

    for (const tableName of tables) {
      await cleanTable(tableName, userIdsToDelete);
    }

    if (userIdsToDelete.length > 0) {
      console.log(
        `Deleting ${userIdsToDelete.length} non-admin users and cascading to whatever has cascade in the schema already`,
      );

      await backupDb.execute(sql`
	      DELETE FROM auth_user 
	      WHERE id IN (${sql.join(
          userIdsToDelete.map((id) => sql`${id}`),
          sql`, `,
        )})
	    `);
    }

    await cleanUp();

    process.exit(0);
  } catch (error) {
    console.error("Error during database seeding:", error);
    await cleanUp();
    process.exit(1);
  }
}

main();

