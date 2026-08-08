import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { env } from "./env";
import * as auditSchema from "./schemas/audit";
import * as authSchema from "./schemas/auth";
import * as clubTeamSchema from "./schemas/club-team";
import * as discordSchema from "./schemas/discord";
import * as discordConfigSchema from "./schemas/discord-config";
import * as knightHacksSchema from "./schemas/knight-hacks";
import * as relations from "./schemas/relations";

// Drizzle identifies a node-postgres pool with `instanceof pg.Pool` before it
// checks out one connection for a transaction. Do not instantiate `pg-pool`
// directly: production bundling can erase that class name, causing BEGIN,
// statements, and COMMIT to run on different pooled connections.
const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

type AuthSchema = typeof authSchema;
type AuditSchema = typeof auditSchema;
type ClubTeamSchema = typeof clubTeamSchema;
type DiscordSchema = typeof discordSchema;
type DiscordConfigSchema = typeof discordConfigSchema;
type KnightHacksSchema = typeof knightHacksSchema;
type RelationsSchema = typeof relations;

type DatabaseSchema = AuditSchema &
  AuthSchema &
  ClubTeamSchema &
  DiscordSchema &
  DiscordConfigSchema &
  KnightHacksSchema &
  RelationsSchema;

// `drizzle()` returns the database plus its underlying pool as `$client`. The
// annotation is written out for stable declaration output, so it has to include
// `$client` too — otherwise the pool is invisible to callers that need to shut
// it down, such as the disposable-database test harness.
export const db: NodePgDatabase<DatabaseSchema> & { $client: typeof pool } =
  drizzle({
    client: pool,
    schema: {
      ...auditSchema,
      ...authSchema,
      ...clubTeamSchema,
      ...discordSchema,
      ...discordConfigSchema,
      ...knightHacksSchema,
      ...relations,
    },
    casing: "snake_case",
  });
