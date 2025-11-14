import cron from "node-cron";

import { syncAlumniRoles } from "../services/alumni-assign";

export function execute() {
  cron.schedule("0 8 * * *", () => {
    void (async () => {
      console.log(
        "[CRON] Alumni discord role assign cron job fired:",
        new Date().toISOString(),
      );
      try {
        await syncAlumniRoles();
        console.log("[CRON] Alumni discord role sync completed");
      } catch (err) {
        console.error("[CRON] Alumni discord role sync failed:", err);
      }
    })();
  });
}
