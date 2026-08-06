import {
  cleanupExpiredHackerParticipantCommands,
  cleanupExpiredHackerPortalCredentials,
} from "@forge/api/utils";
import { logger } from "@forge/utils";

import { CronBuilder } from "../structs/CronBuilder";

export const hackerPortalAuthCleanup = new CronBuilder({
  color: 4,
  name: "hackers/portal-auth-cleanup",
}).addCron("17 * * * *", async () => {
  const [removed, commands] = await Promise.all([
    cleanupExpiredHackerPortalCredentials(),
    cleanupExpiredHackerParticipantCommands(),
  ]);
  if (
    removed.authorizationCodes > 0 ||
    removed.credentials > 0 ||
    removed.sessions > 0 ||
    commands.deleted > 0
  ) {
    logger.info(
      "Removed " +
        removed.authorizationCodes +
        " expired hacker authorization codes and " +
        removed.credentials +
        " expired portal access credentials and " +
        removed.sessions +
        " portal sessions and " +
        commands.deleted +
        " expired participant commands.",
    );
  }
});
