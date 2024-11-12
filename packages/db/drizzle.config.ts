import type { Config } from "drizzle-kit";

import { env } from "./env";

export default {
  schema: "./src/schemas",
  dialect: "postgresql",
  dbCredentials: { url: env.DATABASE_URL },
  casing: "snake_case",
} satisfies Config;
