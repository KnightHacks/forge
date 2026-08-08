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

type ForgeDatabase = NodePgDatabase<DatabaseSchema> & { $client: Pool };

const schema = {
  ...auditSchema,
  ...authSchema,
  ...clubTeamSchema,
  ...discordSchema,
  ...discordConfigSchema,
  ...knightHacksSchema,
  ...relations,
};

// Drizzle normally decides whether to check out a dedicated connection by
// inspecting the pool's runtime class. Next.js can bundle `pg` separately from
// Drizzle, making that class check fail even when the client really is a Pool.
// In that failure mode BEGIN, the mutation, the audit rows, and COMMIT can each
// land on different pooled connections. Always check out the connection here,
// then let Drizzle transact on that concrete PoolClient.
export function createDatabase(clientPool: Pool): ForgeDatabase {
  const database: ForgeDatabase = drizzle({
    client: clientPool,
    schema,
    casing: "snake_case",
  });
  const runTransaction: typeof database.transaction = async (
    transaction,
    config,
  ) => {
    const client = await clientPool.connect();
    try {
      const connectionDatabase = drizzle({
        client,
        schema,
        casing: "snake_case",
      });
      return await connectionDatabase.transaction(transaction, config);
    } finally {
      client.release();
    }
  };

  Object.defineProperty(database, "transaction", {
    configurable: false,
    value: runTransaction,
    writable: false,
  });

  return database;
}

// `drizzle()` returns the database plus its underlying pool as `$client`. The
// annotation is written out for stable declaration output, so it has to include
// `$client` too — otherwise the pool is invisible to callers that need to shut
// it down, such as the disposable-database test harness.
export const db: ForgeDatabase = createDatabase(pool);
