import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import Pool from "pg-pool";

import { env } from "./env";
import * as authSchema from "./schemas/auth";
import * as knightHacksSchema from "./schemas/knight-hacks";
import * as relations from "./schemas/relations";

const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

type AuthSchema = typeof authSchema;
type KnightHacksSchema = typeof knightHacksSchema;
type RelationsSchema = typeof relations;

type DatabaseSchema = AuthSchema & KnightHacksSchema & RelationsSchema;

export const db: NodePgDatabase<DatabaseSchema> = drizzle({
  client: pool,
  schema: { ...authSchema, ...knightHacksSchema, ...relations },
  casing: "snake_case",
});
