import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "../env";

// Create the connection
const connectionString = env.DATABASE_URL;
const client = postgres(connectionString, {
  onnotice: () => undefined, // Suppress notices
});

// Create the database instance
export const db = drizzle(client);
