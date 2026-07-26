import { runEmailDeliveryCycle } from "@forge/api/utils";
import { logger } from "@forge/utils";

import { CronBuilder } from "../structs/CronBuilder";

export const emailDelivery = new CronBuilder({
  color: 5,
  name: "email-delivery",
}).addCron("*/2 * * * *", async () => {
  const result = await runEmailDeliveryCycle();
  logger.info(
    `prepared=${result.prepared} reconciled=${result.reconciled} removedDrafts=${result.removedDrafts} removedRecipientSnapshots=${result.removedRecipients}`,
  );
});
