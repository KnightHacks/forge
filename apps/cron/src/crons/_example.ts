import { CronBuilder } from "../structs/CronBuilder";

export const testCron = new CronBuilder({
  name: "test",
  cronExpression: "* * * * * ", // every minute
  color: 1,
}).addExecutor(() => {
  console.log("This is an example cron that runs every minute");
});
