import { dispatchPendingFormCallbacks } from "@forge/api/utils";
import { logger } from "@forge/utils";

import { CronBuilder } from "../structs/CronBuilder";

export const formCallbacks = new CronBuilder({
  color: 5,
  name: "form-callbacks",
}).addCron("* * * * *", async () => {
  const results = await dispatchPendingFormCallbacks(25);
  const failures = results.filter((result) => result?.status === "failed");
  if (results.length > 0) {
    logger.log(
      `processed ${results.length} form callbacks (${failures.length} failed)`,
    );
  }
});
