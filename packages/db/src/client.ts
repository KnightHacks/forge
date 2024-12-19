import { drizzle } from "drizzle-orm/node-postgres";
import Pool from "pg-pool";

import { env } from "./env";
import * as authSchema from "./schemas/auth";
import * as knightHacksSchema from "./schemas/knight-hacks";

const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

export const db = drizzle({
  client: pool,
  schema: { ...authSchema, ...knightHacksSchema },
  casing: "snake_case",
});
