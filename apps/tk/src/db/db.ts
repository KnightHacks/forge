import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { config } from "../config";

import * as schema from "./schema";

const client = createClient({
    url: config.DATABASE_URL,
    authToken: config.DATABASE_AUTH_TOKEN,
});

const db = drizzle(client, { schema });

export default db;
