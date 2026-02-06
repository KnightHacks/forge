import { AsyncLocalStorage } from "node:async_hooks";
import cron from "node-cron";

// DO NOT TOUCH
// Basically the whole point here is to override console.log such that when
// we are inside of the CronBuilder AsyncLocalStorage, we add the logging info
// to the messages.
//
// For all available functions:
// 1) Reassign logger function so we can use it
// 2) Check if we are in the AsyncLocalStorage we generate in cron
// 3) Add the message to the front of args if we are
// 4) Call the reassigned logger function
const currentCron = new AsyncLocalStorage<CronBuilder | undefined>();
for (const key of [
  "log",
  "error",
  "warn",
  "info",
] satisfies (keyof typeof console)[]) {
  const oldLogger =
    (console as unknown as Record<string, (...args: unknown[]) => void>)[key] ??
    (() => {
      /* empty */
    }); // 1
  (console as unknown as Record<string, (...args: unknown[]) => void>)[key] = (
    ...args: unknown[]
  ) => {
    const store = currentCron.getStore(); // 2
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
      args = [s, ...args]; // 3
    }
    oldLogger.bind(console)(...args); // 4
  };
}
// DO NOT TOUCH

export interface CronOptions {
  name: string;
  color?: number;
}

export type ExecutorFunction = () => Promise<void> | void;
export interface Cron {
  expression: string;
  executor: ExecutorFunction;
}

export class CronBuilder {
  public name: string;
  public color?: number;
  private crons: Cron[] = [];

  constructor(options: CronOptions) {
    this.name = options.name;
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
  public addCron(expression: string, executor: ExecutorFunction): this {
    this.crons.push({ expression, executor });
    return this;
  }

  public schedule(): void {
    for (const { expression, executor } of this.crons) {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      cron.schedule(expression, executor.bind(this));
      currentCron.run(this, () => console.log(`scheduled @ ${expression}`));
    }
  }

  private async _executor(executor: ExecutorFunction): Promise<void> {
    return await currentCron.run(this, async () => {
      const startTime = Date.now();
      console.log(`started @ ${new Date(startTime).toLocaleTimeString()}`);

      try {
        await executor();
      } catch (error) {
        console.error(error);
      }

      const endTime = Date.now();
      console.log(
        `finished @ ${new Date(endTime).toLocaleTimeString()} (${endTime - startTime}ms)`,
      );
    });
  }
}
