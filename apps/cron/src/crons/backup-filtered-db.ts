import { spawn } from "child_process";
import { createInterface } from "readline/promises";

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

    // We're doing it this way so that we get line by line output. I'm
    // not too worried about the exit status or anything. We just need
    // it to run.
    await Promise.all(
      (
        [
          [proc.stdout, "log"],
          [proc.stderr, "error"],
        ] as const
      ).map(async ([stream, key]) => {
        for await (const line of createInterface({
          input: stream,
          crlfDelay: Infinity,
        })) {
          if (line) console[key](line);
        }
      }),
    );
  },
);
