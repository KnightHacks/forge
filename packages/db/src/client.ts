import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import Pool from "pg-pool";

import { env } from "./env";
import * as auditSchema from "./schemas/audit";
import * as authSchema from "./schemas/auth";
import * as discordSchema from "./schemas/discord";
import * as knightHacksSchema from "./schemas/knight-hacks";
import * as relations from "./schemas/relations";

const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

type AuthSchema = typeof authSchema;
type AuditSchema = typeof auditSchema;
type DiscordSchema = typeof discordSchema;
type KnightHacksSchema = typeof knightHacksSchema;
type RelationsSchema = typeof relations;

type DatabaseSchema = AuditSchema &
  AuthSchema &
  DiscordSchema &
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
      ...discordSchema,
      ...knightHacksSchema,
      ...relations,
    },
    casing: "snake_case",
  });
