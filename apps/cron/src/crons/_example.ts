import { CronBuilder } from "../structs/CronBuilder";

export const testCron = new CronBuilder({
  name: "test",
  color: 1,
}).addCron(
  "* * * * * ", // every minute
  () => {
    console.log("This is an example cron that runs every minute");
  },
);
