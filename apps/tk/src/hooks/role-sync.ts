import cron from "node-cron";

import { syncRoles } from "../services/role-sync";

/**
 * Cron job to sync Blade permissions with Discord roles
 * Runs every morning at 8:00 AM
 */
export function execute() {
  cron.schedule("0 8 * * *", () => {
    void (async () => {
      console.log("[CRON] Role sync job fired:", new Date().toISOString());
      try {
        await syncRoles();
        console.log("[CRON] Role sync completed successfully");
      } catch (err) {
        console.error("[CRON] Role sync failed:", err);
      }
    })();
  });
}
