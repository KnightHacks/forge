import { cleanupAbandonedFormAttachments } from "@forge/api/utils";
import { logger } from "@forge/utils";

import { CronBuilder } from "../structs/CronBuilder";

export const formAttachmentCleanup = new CronBuilder({
  color: 6,
  name: "form-attachment-cleanup",
}).addCron("17 * * * *", async () => {
  const result = await cleanupAbandonedFormAttachments();
  if (result.removed > 0) {
    logger.log(`removed ${result.removed} abandoned form attachments`);
  }
});
