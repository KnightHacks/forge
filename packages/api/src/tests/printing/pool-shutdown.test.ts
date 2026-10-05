import { Client, Pool } from "pg";
import { describe, expect, it, vi } from "vitest";

import { trackTestPoolShutdown } from "../support/close-test-pool";

const flushTasks = () => new Promise<void>((resolve) => setImmediate(resolve));

describe("printing test database teardown", () => {
  it("waits for every connection to end after Pool.end resolves", async () => {
    // No database required: pg Pool.end can resolve after removing clients
    // from its bookkeeping but before their sockets report the end event.
    const pool = new Pool();
    const close = trackTestPoolShutdown(pool);
    const first = new Client();
    const second = new Client();
    pool.emit("connect", first);
    pool.emit("connect", second);
    const dropDatabase = vi.fn();
    const shutdown = close().then(dropDatabase);

    await flushTasks();
    expect(dropDatabase).not.toHaveBeenCalled();
    first.emit("end");
    await flushTasks();
    expect(dropDatabase).not.toHaveBeenCalled();
    second.emit("end");
    await shutdown;
    expect(dropDatabase).toHaveBeenCalledOnce();
    expect(pool.listenerCount("connect")).toBe(0);
  });

  it("handles connections that ended before teardown and an unused pool", async () => {
    const pool = new Pool();
    const close = trackTestPoolShutdown(pool);
    const client = new Client();
    pool.emit("connect", client);
    client.emit("end");
    await close();
    await trackTestPoolShutdown(new Pool())();
    expect(pool.listenerCount("connect")).toBe(0);
  });

  it("propagates pool shutdown failures instead of proceeding to drop", async () => {
    const pool = new Pool();
    const close = trackTestPoolShutdown(pool);
    const error = new Error("pool shutdown failed");
    const end = vi.spyOn(pool, "end").mockRejectedValueOnce(error);
    await expect(close()).rejects.toBe(error);
    expect(pool.listenerCount("connect")).toBe(0);
    end.mockRestore();
    await pool.end();
  });
});
