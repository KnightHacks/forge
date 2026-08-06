import { cleanupExpiredHackathonCheckInAttempts } from "@forge/api/utils";
import { EVENTS } from "@forge/consts";
import { logger } from "@forge/utils";

import { CronBuilder } from "../structs/CronBuilder";

export const hackCheckInCleanup = new CronBuilder({
  color: 6,
  name: "hackathon-check-in/cleanup",
}).addCron(
  "17 4 * * *",
  async () => {
    const result = await cleanupExpiredHackathonCheckInAttempts({
      now: new Date(),
    });
    if (result.deleted > 0) {
      logger.info(
        `Deleted ${result.deleted} expired hackathon check-in attempts.`,
      );
    }
  },
  { timezone: EVENTS.CALENDAR_TIME_ZONE },
);
