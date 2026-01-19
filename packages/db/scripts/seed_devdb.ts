import { exec } from "child_process";
import { unlink } from "fs/promises";
import { promisify } from "util";
const execAsync = promisify(exec);
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Client } from "pg";
import { Routes } from "discord-api-types/v10";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import Pool from "pg-pool";

import {
  DEV_KNIGHTHACKS_GUILD_ID,
  KNIGHTHACKS_S3_BUCKET_REGION,
  PROD_KNIGHTHACKS_GUILD_ID,
} from "@forge/consts/knight-hacks";

import { discord } from "../../api/src/utils";
import { env } from "../src/env";
import * as authSchema from "../src/schemas/auth";
import * as knightHacksSchema from "../src/schemas/knight-hacks";
import { minioClient } from "../../api/src/minio/minio-client";


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
  console.log("Cleaning up connections");

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

	const { originalDb: _, user, password, host, port } = parsePg();
	/* eslint-disable no-restricted-properties */
		const envN = { ...process.env, PGPASSWORD: password };
	await execAsync(
		`dropdb -h ${host} -p ${port} -U ${user} backup`,
		{ env: envN },
	);
}

const TABLES_REMOVE_ALL: string[] = [
  "auth_verification",
  "auth_session",
  "auth_judge_session",
  "knight_hacks_judged_submission",
  "knight_hacks_judges",
];

const roleIdMappings: Record<string, string> = {};
const eventIdMappings: Record<string, string> = {};

async function cleanTable(name: string, userIdsToKeep: string[]) {
  if (!backupDb) return;

  if (TABLES_REMOVE_ALL.includes(name)) {
    console.log("Removing all rows from ", name);
    await backupDb.execute(
      sql.raw(`TRUNCATE TABLE "${name}" RESTART IDENTITY CASCADE`),
    );
    return;
  }

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
      WHERE ${sql.identifier(userFkColumn)} NOT IN (${sql.join(
        userIdsToKeep.map((id) => sql`${id}`),
        sql`, `,
      )})
    `);
  } else if (name === "auth_roles") {
    const all_rows = await backupDb.query.Roles.findMany();
    for (const row of all_rows) {
      const id = row.id;
      await backupDb.execute(sql`
				UPDATE "auth_roles" 
  			SET discord_role_id = ${roleIdMappings[row.discordRoleId]} 
  			WHERE id = ${id}
			`);
    }
    console.log("Updated auth roles to use dev server discord ids");
  } else if (name === "knight_hacks_event") {
    const all_rows = await backupDb.query.Event.findMany();
    for (const row of all_rows) {
      if (!eventIdMappings[row.discordId]) continue;
      const id = row.id;
      await backupDb.execute(sql`
				UPDATE "knight_hacks_event" 
  			SET discord_id = ${eventIdMappings[row.discordId]} 
  			WHERE id = ${id}
			`);
    }
    console.log("Updated KH events to use dev server discord ids");
  } else {
    console.log(`Table ${name} will remain unaffected entirely`);
  }
}

async function copyDatabase() {
  const backupFile = "backup.sql";
  const { originalDb, user, password, host, port } = parsePg();
  /* eslint-disable no-restricted-properties */
  const envN = { ...process.env, PGPASSWORD: password };

  try {
    await execAsync(
      `pg_dump -h ${host} -p ${port} -U ${user} ${originalDb} > ${backupFile}`,
      { env: envN },
    );
    await execAsync(
      `createdb -h ${host} -p ${port} -U ${user} ${backupDbName}`,
      { env: envN },
    );
    await execAsync(
      `psql -h ${host} -p ${port} -U ${user} ${backupDbName} < ${backupFile}`,
      { env: envN },
    );
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
    port: u.port,
  };
}

interface RoleColors {
  primary_color: number;
  secondary_color: number | null;
  tertiary_color: number | null;
}

interface DiscordRole {
  id: string;
  name: string;
  description: string | null;
  permissions: string;
  position: number;
  color: number;
  colors: RoleColors;
  hoist: boolean;
  managed: boolean;
  mentionable: boolean;
  icon: string | null;
  unicode_emoji: string | null;
  flags: number;
}

async function syncRoles() {
  if (!backupDb) return;

  const prodRolesWithPerms = new Set(
    (
      await backupDb.query.Roles.findMany({ columns: { discordRoleId: true } })
    ).map((row) => row.discordRoleId),
  );
  let prodRoles = (await discord.get(
    Routes.guildRoles(PROD_KNIGHTHACKS_GUILD_ID),
  )) as DiscordRole[];
  prodRoles = prodRoles.filter((role) => prodRolesWithPerms.has(role.id));

  const devRolesArr = (await discord.get(
    Routes.guildRoles(DEV_KNIGHTHACKS_GUILD_ID),
  )) as DiscordRole[];
  const devRoles = Object.fromEntries(
    devRolesArr.map((role) => [role.name + " " + role.permissions, role]),
  );

  for (const role of prodRoles) {
    const hash = role.name + " " + role.permissions;
    if (devRoles[hash]) {
      roleIdMappings[role.id] = devRoles[hash].id;
    } else {
      const newRole = (await discord.post(
        Routes.guildRoles(DEV_KNIGHTHACKS_GUILD_ID),
        {
          body: {
            name: role.name,
            permissions: role.permissions,
            color: role.color,
            hoist: role.hoist,
            mentionable: role.mentionable,
          },
        },
      )) as DiscordRole;
      roleIdMappings[role.id] = newRole.id;
    }
  }

  console.log(roleIdMappings);
}

interface DiscordGuildScheduledEvent {
  id: string;
  guild_id: string;
  channel_id: string | null;
  name: string;
  description: string | null;
  scheduled_start_time: string;
  scheduled_end_time: string | null;
  privacy_level: number;
  status: number;
  entity_type: number;
  entity_id: string | null;
  entity_metadata: {
    location?: string;
  } | null;
  creator_id?: string;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  creator?: any;
  user_count?: number;
  image?: string | null;
}

async function syncEvents() {
  if (!backupDb) return;

  const prodEvents = (await discord.get(
    Routes.guildScheduledEvents(PROD_KNIGHTHACKS_GUILD_ID),
  )) as DiscordGuildScheduledEvent[];

  const devEventsArr = (await discord.get(
    Routes.guildScheduledEvents(DEV_KNIGHTHACKS_GUILD_ID),
  )) as DiscordGuildScheduledEvent[];
  const devEvents = Object.fromEntries(
    devEventsArr.map((ev) => [ev.name + " " + ev.scheduled_start_time, ev]),
  );

  for (const event of prodEvents) {
    const hash = event.name + " " + event.scheduled_start_time;
    if (devEvents[hash]) {
      eventIdMappings[event.id] = devEvents[hash].id;
    } else {
      const newEvent = (await discord.post(
        Routes.guildScheduledEvents(DEV_KNIGHTHACKS_GUILD_ID),
        {
          body: {
            name: event.name,
            description: event.description,
            scheduled_start_time: event.scheduled_start_time,
            scheduled_end_time: event.scheduled_end_time,
            privacy_level: event.privacy_level,
            entity_type: event.entity_type,
            entity_metadata: event.entity_metadata,
          },
        },
      )) as DiscordGuildScheduledEvent;
      eventIdMappings[event.id] = newEvent.id;
    }
  }

  console.log(eventIdMappings);
}

async function minio() {
	const BUCKET_NAME = "dev-db-backups";
	const filePath = "backup.sql";
	const { originalDb: _originalDb, user, password, host, port } = parsePg();
	/* eslint-disable no-restricted-properties */
		const envN = { ...process.env, PGPASSWORD: password };

	await execAsync(
		`pg_dump -h ${host} -p ${port} -U ${user} --data-only --column-inserts --disable-triggers --no-owner --no-acl ${backupDbName} > ${filePath}`,
		{ env: envN },
	);

	const bucketExists = await minioClient.bucketExists(BUCKET_NAME);
	if (!bucketExists) {
		await minioClient.makeBucket(
			BUCKET_NAME,
			KNIGHTHACKS_S3_BUCKET_REGION,
		);
	}

	await minioClient.fPutObject(
		BUCKET_NAME,
		filePath,
		filePath,
		{
			"Content-Type": "text/plain", 
		}
	);

	const fileUrl = await minioClient.presignedGetObject(
		BUCKET_NAME,
		filePath,
		60 * 60 * 24,
	);

	await unlink(filePath);

	console.log(`Saved backup to ${fileUrl}`);
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

    await syncRoles();
    await syncEvents();

    const { rows: tablesJSON } = await backupDb.execute(sql`
		  SELECT table_name 
		  FROM information_schema.tables 
		  WHERE table_schema = 'public' 
		  AND table_type = 'BASE TABLE'
		`);

    let tables = tablesJSON.map((t) => t.table_name as string);
    tables = [...tables.filter((x) => x !== "auth_user"), "auth_user"];

    console.log("Getting admins");
    const userIdsToKeep: string[] = (
      await backupDb.query.Permissions.findMany({
        columns: {
          userId: true,
        },
      })
    ).map((t) => t.userId);

    for (const tableName of tables) {
      await cleanTable(tableName, userIdsToKeep);
    }

    console.log(
      `Keeping ${userIdsToKeep.length} admin users and cascading to whatever has cascade in the schema already`,
    );

    await backupDb.execute(sql`
	    DELETE FROM auth_user 
	    WHERE id NOT IN (${sql.join(
        userIdsToKeep.map((id) => sql`${id}`),
        sql`, `,
      )})
	  `);

		await minio();

    await cleanUp();

    process.exit(0);
  } catch (error) {
    console.error("Error during database seeding:", error);
    await cleanUp();
    process.exit(1);
  }
}

await main();
