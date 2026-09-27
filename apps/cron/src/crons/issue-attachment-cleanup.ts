import { cleanupAbandonedIssueImages } from "@forge/api/utils";
import { logger } from "@forge/utils";

import { CronBuilder } from "../structs/CronBuilder";

export const issueAttachmentCleanup = new CronBuilder({
  color: 6,
  name: "issue-attachment-cleanup",
}).addCron("23 * * * *", async () => {
  const result = await cleanupAbandonedIssueImages();
  if (result.removed > 0) {
    logger.log(`removed ${result.removed} abandoned issue images`);
  }
});
