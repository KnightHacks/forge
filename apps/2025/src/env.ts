import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]),
    BLADE_URL: z.string().url(),
  },
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    BLADE_URL: "http://localhost:3000/alejaimes",
  },
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
