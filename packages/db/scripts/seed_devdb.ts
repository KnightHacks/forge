// TODO: use a real logger to avoid this issue
/* eslint-disable no-console */

// Usage:
//   pnpm --filter @forge/db with-env tsx scripts/seed_devdb.ts

// A script to be run on prod only, this will take the prod db and make a
// backup SQL script containing shared configuration and data belonging to
// members of the team: officers, directors, and configured team roles. It
// removes other people and sensitive operational data. It also takes all the
// server-specific Discord IDs in the
// DB and then sync them up with an event/role in the dev server and change the
// ID in the db for the local version. This sql file is uploaded to our minio
// client to be pulled by the get_prod_db.ts script. There's no realistic
// reason for this script to ever be ran on dev unless you're updating it cause
// I probably messed a lot up :D. See get_prod_db.ts for how to get prod data
// into your local db for deving.

// TODO: look into moving into a separate area so we don't have to do the BS
//       that we do with `../../api` and `../../utils`

import { exec } from "child_process";
import { unlink } from "fs/promises";
import { promisify } from "util";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { ChannelType, Routes } from "discord-api-types/v10";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { stringify } from "superjson";

import { ISSUE, MINIO } from "@forge/consts";

// Scripts can use relative imports to avoid circular dependencies
import { minioClient } from "../../api/src/minio/minio-client";
import * as discord from "../../utils/src/discord";
import { env } from "../src/env";
import * as authSchema from "../src/schemas/auth";
import * as discordConfigSchema from "../src/schemas/discord-config";
import * as knightHacksSchema from "../src/schemas/knight-hacks";
import {
  formConfigurationSanitizerSql,
  hackathonPublicationSanitizerSql,
  sanitizedEventProviderState,
  sanitizedHackathonEventProviderState,
  TABLES_TO_DROP,
  teamDataSanitizerSql,
  unclassifiedDatabaseTables,
} from "./dev-db-backup-sanitizer";

const execAsync = promisify(exec);
console.log("Starting seeding script");

type AuthSchema = typeof authSchema;
type DiscordConfigSchema = typeof discordConfigSchema;
type KnightHacksSchema = typeof knightHacksSchema;
type DatabaseSchema = AuthSchema & DiscordConfigSchema & KnightHacksSchema;

const backupDbName = `backup`;

// Admin connection to postgres database for DDL operations
const adminPool = new Pool({
  connectionString: env.DATABASE_URL,
  database: "postgres",
});

let backupPool: Pool | null = null;
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
  await execAsync(`dropdb -h ${host} -p ${port} -U ${user} backup`, {
    env: envN,
  });
}

const roleIdMappings: Record<string, string> = {};
const eventIdMappings: Record<string, string> = {};
const channelIdMappings: Record<string, string> = {};

/**
 * This script is the one place that needs *both* environments' guild IDs at
 * once — it reads the production server and writes to the development one — so
 * it reads the raw row rather than going through the environment-resolving
 * accessor in `@forge/utils/discord-config`. It cannot import that accessor
 * anyway: `@forge/utils` depends on `@forge/db`, and the reverse edge would be
 * a cycle.
 */
async function guildIds() {
  if (!backupDb) throw new Error("Backup database is not connected.");

  const row = await backupDb.query.DiscordConfig.findFirst({
    where: eq(discordConfigSchema.DiscordConfig.key, "guild"),
  });
  if (!row?.developmentId) {
    throw new Error(
      'The "guild" row in knight_hacks_discord_config is missing or has no development_id. Seeding cannot map production Discord objects onto the development server without both.',
    );
  }
  return { development: row.developmentId, production: row.productionId };
}

async function truncateExcludedTable(name: string) {
  if (!backupDb) return;

  if (TABLES_TO_DROP.includes(name as (typeof TABLES_TO_DROP)[number])) {
    await backupDb.execute(
      sql.raw(`TRUNCATE TABLE "${name}" RESTART IDENTITY CASCADE`),
    );
  }
}

function requiredRoleMapping(roleId: string, owner: string) {
  const mapped = roleIdMappings[roleId];
  if (!mapped) {
    throw new Error(
      `No development Discord mapping for ${owner} role ${roleId}.`,
    );
  }
  return mapped;
}

async function sanitizeRoles() {
  if (!backupDb) return;

  const roles = await backupDb.query.Roles.findMany();
  for (const role of roles) {
    const mappedRoleId = requiredRoleMapping(
      role.discordRoleId,
      `permission ${role.id}`,
    );

    await backupDb
      .update(authSchema.Roles)
      .set({
        discordRoleId: mappedRoleId,
        issueReminderChannel: ISSUE.DEV_ISSUE_REMINDER_CHANNEL_ID,
      })
      .where(eq(authSchema.Roles.id, role.id));
  }
}

async function sanitizeHackathonDiscordConfiguration() {
  if (!backupDb) return;

  const hackathons = await backupDb.query.Hackathon.findMany({
    columns: {
      eventAnnouncementChannelId: true,
      generalHackerDiscordRoleId: true,
      id: true,
    },
  });
  for (const hackathon of hackathons) {
    await backupDb
      .update(knightHacksSchema.Hackathon)
      .set({
        eventAnnouncementChannelId: hackathon.eventAnnouncementChannelId
          ? (channelIdMappings[hackathon.eventAnnouncementChannelId] ?? null)
          : null,
        generalHackerDiscordRoleId: hackathon.generalHackerDiscordRoleId
          ? requiredRoleMapping(
              hackathon.generalHackerDiscordRoleId,
              `hackathon ${hackathon.id} general hacker`,
            )
          : null,
      })
      .where(eq(knightHacksSchema.Hackathon.id, hackathon.id));
  }

  const classes = await backupDb.query.HackathonClass.findMany({
    columns: { discordRoleId: true, id: true },
  });
  for (const hackathonClass of classes) {
    await backupDb
      .update(knightHacksSchema.HackathonClass)
      .set({
        discordRoleId: requiredRoleMapping(
          hackathonClass.discordRoleId,
          `hackathon class ${hackathonClass.id}`,
        ),
      })
      .where(eq(knightHacksSchema.HackathonClass.id, hackathonClass.id));
  }
}

async function sanitizeEvents() {
  if (!backupDb) return;

  const events = await backupDb.query.Event.findMany();
  for (const event of events) {
    const mappedDiscordId = event.discordId
      ? eventIdMappings[event.discordId]
      : undefined;

    await backupDb
      .update(knightHacksSchema.Event)
      .set(
        event.hackathonId
          ? sanitizedHackathonEventProviderState()
          : sanitizedEventProviderState(event.legacy, mappedDiscordId),
      )
      .where(eq(knightHacksSchema.Event.id, event.id));
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
  } catch (err) {
    console.error(err);
    throw err;
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

  const guild = await guildIds();
  const [permissionRoles, hackathons, hackathonClasses] = await Promise.all([
    backupDb.query.Roles.findMany({ columns: { discordRoleId: true } }),
    backupDb.query.Hackathon.findMany({
      columns: { generalHackerDiscordRoleId: true },
    }),
    backupDb.query.HackathonClass.findMany({
      columns: { discordRoleId: true },
    }),
  ]);
  const referencedRoleIds = new Set([
    ...permissionRoles.map((row) => row.discordRoleId),
    ...hackathons.flatMap((row) =>
      row.generalHackerDiscordRoleId ? [row.generalHackerDiscordRoleId] : [],
    ),
    ...hackathonClasses.map((row) => row.discordRoleId),
  ]);
  let prodRoles = (await discord.api.get(
    Routes.guildRoles(guild.production),
  )) as DiscordRole[];
  prodRoles = prodRoles.filter((role) => referencedRoleIds.has(role.id));

  const devRolesArr = (await discord.api.get(
    Routes.guildRoles(guild.development),
  )) as DiscordRole[];
  const devRoles = Object.fromEntries(
    devRolesArr.map((role) => [role.name + " " + role.permissions, role]),
  );

  for (const role of prodRoles) {
    const hash = role.name + " " + role.permissions;
    if (devRoles[hash]) {
      roleIdMappings[role.id] = devRoles[hash].id;
    } else {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const newRole = (await discord.api.post(
        Routes.guildRoles(guild.development),
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
}

interface DiscordGuildChannel {
  id: string;
  name?: string;
  type: ChannelType;
}

function textChannelName(channel: DiscordGuildChannel) {
  if (
    channel.type !== ChannelType.GuildText &&
    channel.type !== ChannelType.GuildAnnouncement
  ) {
    return null;
  }
  return channel.name?.trim().toLowerCase() ?? null;
}

async function syncAnnouncementChannels() {
  if (!backupDb) return;

  const configuredIds = new Set(
    (
      await backupDb.query.Hackathon.findMany({
        columns: { eventAnnouncementChannelId: true },
      })
    ).flatMap((row) =>
      row.eventAnnouncementChannelId ? [row.eventAnnouncementChannelId] : [],
    ),
  );
  if (configuredIds.size === 0) return;

  const guild = await guildIds();
  const [productionChannels, developmentChannels] = (await Promise.all([
    discord.api.get(Routes.guildChannels(guild.production)),
    discord.api.get(Routes.guildChannels(guild.development)),
  ])) as [DiscordGuildChannel[], DiscordGuildChannel[]];
  const developmentByName = new Map<string, DiscordGuildChannel[]>();
  for (const channel of developmentChannels) {
    const name = textChannelName(channel);
    if (!name) continue;
    developmentByName.set(name, [
      ...(developmentByName.get(name) ?? []),
      channel,
    ]);
  }

  for (const channel of productionChannels) {
    if (!configuredIds.has(channel.id)) continue;
    const name = textChannelName(channel);
    const candidates = name ? developmentByName.get(name) : undefined;
    if (candidates?.length === 1 && candidates[0]) {
      channelIdMappings[channel.id] = candidates[0].id;
      continue;
    }
    console.warn(
      `No unique development text-channel match for hackathon announcement channel ${channel.id}; the restored setting will be cleared.`,
    );
  }
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

  const guild = await guildIds();
  const linkedClubEventIds = new Set(
    (
      await backupDb.query.Event.findMany({
        columns: { discordId: true, hackathonId: true },
      })
    ).flatMap((event) =>
      event.hackathonId === null && event.discordId ? [event.discordId] : [],
    ),
  );
  const prodEvents = (
    (await discord.api.get(
      Routes.guildScheduledEvents(guild.production),
    )) as DiscordGuildScheduledEvent[]
  ).filter((event) => linkedClubEventIds.has(event.id));

  const devEventsArr = (await discord.api.get(
    Routes.guildScheduledEvents(guild.development),
  )) as DiscordGuildScheduledEvent[];
  const devEvents = Object.fromEntries(
    devEventsArr.map((ev) => [ev.name + " " + ev.scheduled_start_time, ev]),
  );

  for (const event of prodEvents) {
    const hash = event.name + " " + event.scheduled_start_time;
    if (devEvents[hash]) {
      eventIdMappings[event.id] = devEvents[hash].id;
    } else {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const newEvent = (await discord.api.post(
        Routes.guildScheduledEvents(guild.development),
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
}

async function minio() {
  const BUCKET_NAME = "dev-db-backups";
  const filePath = "backup.sql";
  const { originalDb: _originalDb, user, password, host, port } = parsePg();
  /* eslint-disable no-restricted-properties */
  const envN = { ...process.env, PGPASSWORD: password };

  await execAsync(
    `pg_dump -h ${host} -p ${port} -U ${user} --schema=public --data-only --column-inserts --disable-triggers --no-owner --no-acl ${backupDbName} > ${filePath}`,
    { env: envN },
  );

  try {
    const bucketExists = await minioClient.bucketExists(BUCKET_NAME);
    if (!bucketExists) {
      await minioClient.makeBucket(BUCKET_NAME, MINIO.BUCKET_REGION);
    }

    await minioClient.fPutObject(BUCKET_NAME, filePath, filePath, {
      "Content-Type": "text/plain",
    });
  } finally {
    await unlink(filePath);
  }
}

async function main() {
  try {
    const baseConnectionString = env.DATABASE_URL.substring(
      0,
      env.DATABASE_URL.lastIndexOf("/") + 1,
    );

    console.log(`Dropping database ${backupDbName} if it exists...`);
    await adminPool.query(`DROP DATABASE IF EXISTS ${backupDbName}`);

    console.log(`Creating fresh database ${backupDbName}`);
    await copyDatabase();

    backupPool = new Pool({
      connectionString: baseConnectionString + backupDbName,
    });

    backupDb = drizzle({
      client: backupPool,
      schema: { ...authSchema, ...discordConfigSchema, ...knightHacksSchema },
      casing: "snake_case",
    });

    const { rows: tablesJSON } = await backupDb.execute(sql`
		  SELECT table_name 
		  FROM information_schema.tables 
		  WHERE table_schema = 'public' 
		  AND table_type = 'BASE TABLE'
		`);

    let tables = tablesJSON.map((t) => t.table_name as string);
    const unclassified = unclassifiedDatabaseTables(tables);
    if (unclassified.length > 0) {
      throw new Error(
        `Refusing to sanitize unclassified public tables: ${unclassified.join(", ")}`,
      );
    }
    tables = [...tables.filter((x) => x !== "auth_user"), "auth_user"];

    console.log("Syncing roles, channels, and events from prod to dev Discord");
    await syncRoles();
    await syncAnnouncementChannels();
    await syncEvents();

    console.log("Removing tables that are not approved for development");
    for (const tableName of tables) {
      await truncateExcludedTable(tableName);
    }

    console.log("Mapping development Discord roles and events");
    await sanitizeRoles();
    await sanitizeHackathonDiscordConfiguration();
    await sanitizeEvents();

    console.log("Disabling external hackathon publication in the dev backup");
    await backupDb.execute(sql.raw(hackathonPublicationSanitizerSql()));

    console.log("Removing form media whose objects are not copied to dev");
    await backupDb.execute(sql.raw(formConfigurationSanitizerSql()));

    console.log("Keeping team data and scrubbing credentials");
    await backupDb.execute(sql.raw(teamDataSanitizerSql()));

    console.log("Uploading to minio");
    await minio();

    console.log("Cleaning up backup db");
    await cleanUp();

    await discord.log({
      title: `Successfully saved limited prod db to minio`,
      message: `Successfully saved limited prod db to minio. Run the get_prod_db.ts script to get it into your local dev db.`,
      color: "success_green",
      userId: "Host",
    });

    process.exit(0);
  } catch (error) {
    console.error("Error during database seeding:", error);
    await discord.log({
      title: `Failed to save limited prod db to minio`,
      message: `Failed to sav limited prod db to minio. Error: ${stringify(error)}`,
      color: "uhoh_red",
      userId: "Host",
    });
    await cleanUp();
    process.exit(1);
  }
}

await main();
