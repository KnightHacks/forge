import { logger } from "@forge/utils";

import { CronBuilder } from "../structs/CronBuilder";

// A worked example of writing a cron, kept deliberately.
//
// `CronBuilder` is documented nowhere else, so this is the only place a new
// contributor can see the shape of one. It is excluded from knip for that
// reason rather than because the tool is wrong: nothing imports it, and nothing
// should.
//
// Crons do not run by living in this directory. `src/index.ts` imports each one
// explicitly and calls `.schedule()`, so adding a file here does nothing until
// you wire it up there — the step most easily missed.
//
// `color` is the Discord embed colour the job reports with.
export const testCron = new CronBuilder({
  name: "test",
  color: 1,
}).addCron(
  "* * * * * ", // every minute
  () => {
    logger.log("This is an example cron that runs every minute");
  },
);
