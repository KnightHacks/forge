import { AsyncLocalStorage } from "node:async_hooks";
import cron from "node-cron";

// DO NOT TOUCH
const currentCron = new AsyncLocalStorage<CronBuilder | undefined>();
const oldLog = console.log;
(console as unknown as { log: typeof console.log }).log = (
  ...args: unknown[]
) => {
  const store = currentCron.getStore();
  if (store !== undefined) {
    let s = "";
    s += "\x1B[30mCRON\x1B[0m ";
    if (store.color !== undefined) {
      s += `\x1B[1;3${store.color}m`;
    }
    s += `[${store.name}]`;
    if (store.color !== undefined) {
      s += `\x1B[0m`;
    }
    args = [s, ...args];
  }
  oldLog.bind(console)(...args);
};
// DO NOT TOUCH

export interface CronOptions {
  name: string;
  cronExpression: string;
  color?: number;
}

export class CronBuilder {
  public name: string;
  public color?: number;
  private cronExpression: string;
  private executors: (() => Promise<void> | void)[] = [];

  constructor(options: CronOptions) {
    this.name = options.name;
    this.cronExpression = options.cronExpression;
    this.color = options.color;
  }

  /**
   * @example
   * ```ts
   * builder.addExecutor(
   *  async () => {
   *   console.log("This is an example cron that runs every minute");
   *  }
   * );
   */
  public addExecutor(executor: () => Promise<void> | void): this {
    this.executors.push(executor);
    return this;
  }

  public schedule(): void {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    cron.schedule(this.cronExpression, this._executor.bind(this));
    currentCron.run(this, () =>
      console.log(`scheduled @ ${this.cronExpression}`),
    );
  }

  private async _executor(): Promise<void> {
    return await currentCron.run(this, async () => {
      const startTime = Date.now();
      console.log(`started @ ${new Date(startTime).toLocaleTimeString()}`);

      try {
        // eslint-disable-next-line @typescript-eslint/await-thenable
        await Promise.all(this.executors.map((executor) => executor()));
      } catch (error) {
        console.error(`Error during execution:`, error);
      }

      const endTime = Date.now();
      console.log(
        `finished @ ${new Date(endTime).toLocaleTimeString()} (${endTime - startTime}ms)`,
      );
    });
  }
}
