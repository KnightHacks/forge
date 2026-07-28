import { sql } from "drizzle-orm";
import { check, pgTableCreator } from "drizzle-orm/pg-core";

import type { DISCORD } from "@forge/consts";

const createTable = pgTableCreator((name) => `knight_hacks_${name}`);

/**
 * Officer-managed Discord wiring: which server the platform talks to, which
 * channels it posts in, and which roles it grants.
 *
 * One row is one *setting*, not one value. `PROD_LOG_CHANNEL`/`DEV_LOG_CHANNEL`
 * used to be two exports feeding an `IS_PROD` ternary; they are one row here
 * with two columns, so the pair stays visibly connected and an officer editing
 * the production channel cannot silently orphan the development one.
 *
 * `developmentId` is nullable and means "no separate development value" — the
 * resolver falls back to `productionId`, which is exactly what the old
 * `ALUMNI_ROLE = PROD_ALUMNI_ROLE` line did.
 *
 * Read this through `@forge/utils/discord-config` rather than querying it
 * directly; that module caches the whole table and applies the fallback rule.
 */
export const DiscordConfig = createTable(
  "discord_config",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    /**
     * Stable machine identifier from `DISCORD.CONFIG_KEYS`. Code looks settings
     * up by this, so it is a contract rather than something an officer invents.
     */
    key: t
      .varchar({ length: 64 })
      .$type<DISCORD.ConfigKey>()
      .notNull()
      .unique(),
    /** Which sort of Discord object the IDs point at. Guidance for the editor. */
    kind: t.varchar({ length: 16 }).$type<DISCORD.ConfigKind>().notNull(),
    /** Human-facing name, e.g. "Alumni role". */
    label: t.varchar({ length: 128 }).notNull(),
    /** What this controls and what breaks when it is wrong. */
    description: t.text().notNull(),
    /** Snowflake used when `NODE_ENV === "production"`. */
    productionId: t.varchar({ length: 20 }).notNull(),
    /** Snowflake used outside production. `NULL` reuses `productionId`. */
    developmentId: t.varchar({ length: 20 }),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  }),
  (table) => ({
    validKind: check(
      "knight_hacks_discord_config_kind_check",
      sql`${table.kind} IN ('channel', 'guild', 'role')`,
    ),
    // Discord snowflakes are 17-20 digits. A paste that picks up a role
    // *mention* (`<@&123>`) or a trailing space is the realistic way an officer
    // breaks this table, and it would otherwise surface as a 404 from Discord
    // hours later inside a cron job.
    validProductionId: check(
      "knight_hacks_discord_config_production_id_check",
      sql`${table.productionId} ~ '^[0-9]{17,20}$'`,
    ),
    validDevelopmentId: check(
      "knight_hacks_discord_config_development_id_check",
      sql`${table.developmentId} IS NULL OR ${table.developmentId} ~ '^[0-9]{17,20}$'`,
    ),
  }),
);

export type InsertDiscordConfig = typeof DiscordConfig.$inferInsert;
export type SelectDiscordConfig = typeof DiscordConfig.$inferSelect;

/**
 * Applies the environment fallback rule in one place so the read path, the
 * seed script, and tests cannot drift apart.
 */
export function resolveDiscordConfigId(
  row: Pick<SelectDiscordConfig, "developmentId" | "productionId">,
  isProduction: boolean,
): string {
  return isProduction
    ? row.productionId
    : (row.developmentId ?? row.productionId);
}
