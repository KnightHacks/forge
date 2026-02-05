import { hooks } from "./hooks";

for (const hook of hooks) {
  hook();
}

console.log("[CRON] Cron jobs loaded");
