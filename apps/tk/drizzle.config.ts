import { defineConfig } from "drizzle-kit";
import { config } from "./src/config";

export default defineConfig({
    dialect: "sqlite",
    schema: "./src/db/schema.ts",
    driver: "turso",
    dbCredentials: {
        url: config.DATABASE_URL,
        authToken: config.DATABASE_AUTH_TOKEN,
    },
});
