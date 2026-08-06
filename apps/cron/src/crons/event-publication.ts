import { runEventPublicationCycle } from "@forge/api/utils";
import { logger } from "@forge/utils";

import { CronBuilder } from "../structs/CronBuilder";

export const eventPublication = new CronBuilder({
  color: 4,
  name: "hackathon-events/publication",
}).addCron("* * * * *", async () => {
  const result = await runEventPublicationCycle({ limit: 50 });
  if (result.claimed > 0) {
    logger.info(`Reconciled ${result.claimed} hackathon event projections.`);
  }
});
