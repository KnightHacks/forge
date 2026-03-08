import cron from "node-cron";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

describe("CronBuilder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should initialize with name and color", () => {
    const builder = new CronBuilder({
      name: "Test Cron",
      color: 1,
    });

    expect(builder.name).toBe("Test Cron");
    expect(builder.color).toBe(1);
  });

  it("should initialize with name only (no color)", () => {
    const builder = new CronBuilder({
      name: "Test Cron",
    });

    expect(builder.name).toBe("Test Cron");
    expect(builder.color).toBeUndefined();
  });

  it("should allow chaining addCron calls", () => {
    const builder = new CronBuilder({
      name: "Test Cron",
    });

    const executor1 = vi.fn();
    const executor2 = vi.fn();

    const result = builder
      .addCron("* * * * *", executor1)
      .addCron("0 0 * * *", executor2);

    expect(result).toBe(builder);
  });

  it("should schedule crons when schedule() is called", () => {
    const builder = new CronBuilder({
      name: "Test Cron",
    });

    const executor = vi.fn();

    builder.addCron("* * * * *", executor);
    builder.schedule();

    expect(cron.schedule).toHaveBeenCalledTimes(1);
    expect(cron.schedule).toHaveBeenCalledWith(
      "* * * * *",
      expect.any(Function),
    );
  });

  it("should schedule multiple crons", () => {
    const builder = new CronBuilder({
      name: "Test Cron",
    });

    const executor1 = vi.fn();
    const executor2 = vi.fn();

    builder.addCron("* * * * *", executor1);
    builder.addCron("0 0 * * *", executor2);
    builder.schedule();

    expect(cron.schedule).toHaveBeenCalledTimes(2);
  });
});
