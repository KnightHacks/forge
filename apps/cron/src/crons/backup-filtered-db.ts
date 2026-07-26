import { spawn } from "child_process";
import { createInterface } from "readline/promises";

import { logger } from "@forge/utils";

import { CronBuilder } from "../structs/CronBuilder";

const COMMAND = "pnpm";
const COMMAND_ARGS = [
  "--filter",
  "@forge/db",
  "with-env",
  "tsx",
  "scripts/seed_devdb.ts",
];

export const backupFilteredDb = new CronBuilder({
  name: "backup filtered db",
  color: 4,
}).addCron(
  "0 8 * * * ", // 8am every day
  async () => {
    const proc = spawn(COMMAND, COMMAND_ARGS, {
      stdio: "pipe",
    });

    const streams = (
      [
        [proc.stdout, "log"],
        [proc.stderr, "error"],
      ] as const
    ).map(async ([stream, key]) => {
      for await (const line of createInterface({
        input: stream,
        crlfDelay: Infinity,
      })) {
        if (line) logger[key](line);
      }
    });
    const exitCode = new Promise<number | null>((resolve, reject) => {
      proc.once("error", reject);
      proc.once("close", resolve);
    });

    const [, code] = await Promise.all([Promise.all(streams), exitCode]);
    if (code !== 0) {
      throw new Error(`Filtered database backup exited with code ${code}.`);
    }
  },
);
