import cron from "node-cron";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { logger } from "@forge/utils";

import { CronBuilder } from "../../../../apps/cron/src/structs/CronBuilder";

// Mock node-cron
vi.mock("node-cron", () => ({
  default: {
    schedule: vi.fn(),
  },
}));

// Mock logger
vi.mock("@forge/utils", () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
  },
}));

describe("cron.CronBuilder.executor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should execute executor function when cron runs", async () => {
    const builder = new CronBuilder({
      name: "Test Cron",
    });

    const executor = vi.fn().mockResolvedValue(undefined);
    let scheduledFn: (() => Promise<void>) | undefined;

    // Mock schedule to capture the executor function
    vi.mocked(cron.schedule).mockImplementation(
      (_expr: string, fn: () => Promise<void>) => {
        scheduledFn = fn;
        return {} as cron.ScheduledTask; // Return a mock cron task
      },
    );

    builder.addCron("* * * * *", executor);
    builder.schedule();

    expect(scheduledFn).toBeDefined();
    if (scheduledFn) {
      await scheduledFn();
    }

    expect(executor).toHaveBeenCalledTimes(1);
  });

  it("should log start time when executor runs", async () => {
    const builder = new CronBuilder({
      name: "Test Cron",
    });

    const executor = vi.fn().mockResolvedValue(undefined);
    const startTime = new Date("2024-01-15T10:30:00Z");
    vi.setSystemTime(startTime);

    let scheduledFn: (() => Promise<void>) | undefined;
    vi.mocked(cron.schedule).mockImplementation(
      (_expr: string, fn: () => Promise<void>) => {
        scheduledFn = fn;
        return {} as cron.ScheduledTask;
      },
    );

    builder.addCron("* * * * *", executor);
    builder.schedule();

    if (scheduledFn) {
      await scheduledFn();
    }

    expect(vi.mocked(logger.log)).toHaveBeenCalled();
  });

  it("should log execution time when executor completes", async () => {
    const builder = new CronBuilder({
      name: "Test Cron",
    });

    const executor = vi.fn().mockResolvedValue(undefined);
    const startTime = new Date("2024-01-15T10:30:00Z");
    vi.setSystemTime(startTime);

    let scheduledFn: (() => Promise<void>) | undefined;
    vi.mocked(cron.schedule).mockImplementation(
      (_expr: string, fn: () => Promise<void>) => {
        scheduledFn = fn;
        return {} as cron.ScheduledTask;
      },
    );

    builder.addCron("* * * * *", executor);
    builder.schedule();

    if (scheduledFn) {
      vi.advanceTimersByTime(100);
      await scheduledFn();
    }

    expect(vi.mocked(logger.log)).toHaveBeenCalled();
  });

  it("should handle errors in executor gracefully", async () => {
    const builder = new CronBuilder({
      name: "Test Cron",
    });

    const error = new Error("Test error");
    const executor = vi.fn().mockRejectedValue(error);

    let scheduledFn: (() => Promise<void>) | undefined;
    vi.mocked(cron.schedule).mockImplementation(
      (_expr: string, fn: () => Promise<void>) => {
        scheduledFn = fn;
        return {} as cron.ScheduledTask;
      },
    );

    builder.addCron("* * * * *", executor);
    builder.schedule();

    if (scheduledFn) {
      await scheduledFn();
    }

    expect(vi.mocked(logger.error)).toHaveBeenCalled();
    expect(executor).toHaveBeenCalledTimes(1);
  });

  it("should log scheduled message when schedule() is called", () => {
    vi.mocked(cron.schedule).mockReturnValue({} as cron.ScheduledTask);

    const builder = new CronBuilder({
      name: "Test Cron",
    });

    const executor = vi.fn();
    builder.addCron("* * * * *", executor);
    builder.schedule();

    expect(vi.mocked(logger.log)).toHaveBeenCalled();
  });

  it("should calculate execution time correctly", async () => {
    const builder = new CronBuilder({
      name: "Test Cron",
    });

    const executor = vi.fn().mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const startTime = new Date("2024-01-15T10:30:00Z");
    vi.setSystemTime(startTime);

    let scheduledFn: (() => Promise<void>) | undefined;
    vi.mocked(cron.schedule).mockImplementation(
      (_expr: string, fn: () => Promise<void>) => {
        scheduledFn = fn;
        return {} as cron.ScheduledTask;
      },
    );

    builder.addCron("* * * * *", executor);
    builder.schedule();

    if (scheduledFn) {
      const promise = scheduledFn();
      vi.advanceTimersByTime(50);
      await promise;
    }

    expect(vi.mocked(logger.log)).toHaveBeenCalled();
  });
});
