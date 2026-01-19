import cron from "node-cron";
import { exec } from "child_process";

const COMMAND = "pnpm --filter @forge/db with-env tsx scripts/seed_devdb.ts"; 

export function execute() {
  cron.schedule("0 8 * * *", () => {
    console.log("[CRON] Prod DB backup for local dev job fired:", new Date().toISOString());

    exec(COMMAND, (error, stdout) => {
      if (error) {
        console.error("[CRON] Command failed:", error);
        return;
      }
      if (stdout) {
        console.log("[CRON] Command stdout:", stdout);
      }
    });
  });
}


