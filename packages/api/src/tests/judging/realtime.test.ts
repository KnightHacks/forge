import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";

import { watchJudgingChanges } from "../../utils/judging/realtime";

const pool = vi.hoisted(() => ({ connect: vi.fn() }));
vi.mock("@forge/db/client", () => ({ db: { $client: pool } }));

function connection() {
  return Object.assign(new EventEmitter(), {
    query: vi.fn().mockResolvedValue(undefined),
    release: vi.fn(),
  });
}

describe("judging change subscriptions", () => {
  afterEach(() => vi.clearAllMocks());

  it("shares one database listener, filters events, and releases it on disconnect", async () => {
    const client = connection();
    pool.connect.mockResolvedValue(client);
    const firstAbort = new AbortController();
    const secondAbort = new AbortController();
    const first = watchJudgingChanges("first", firstAbort.signal);
    const second = watchJudgingChanges("second", secondAbort.signal);
    expect(await first.next()).toEqual({ done: false, value: true });
    expect(await second.next()).toEqual({ done: false, value: true });
    expect(pool.connect).toHaveBeenCalledTimes(1);
    expect(client.query).toHaveBeenCalledWith("LISTEN forge_judging");

    const waiting = first.next();
    const received = vi.fn();
    void waiting.then(received);
    client.emit("notification", {
      channel: "forge_judging",
      payload: "second",
    });
    expect(await second.next()).toEqual({ done: false, value: true });
    expect(received).not.toHaveBeenCalled();
    client.emit("notification", { channel: "forge_judging", payload: "first" });
    expect(await waiting).toEqual({ done: false, value: true });

    firstAbort.abort();
    await first.return();
    expect(client.release).not.toHaveBeenCalled();
    secondAbort.abort();
    await second.return();
    expect(client.release).toHaveBeenCalledExactlyOnceWith(true);
  });

  it("ends a failed listener and opens a fresh one on reconnect", async () => {
    const client = connection();
    pool.connect.mockResolvedValue(client);
    const abort = new AbortController();
    const stream = watchJudgingChanges("first", abort.signal);
    await stream.next();
    const waiting = stream.next();
    client.emit("error", new Error("connection lost"));
    await expect(waiting).rejects.toThrow("connection lost");
    expect(client.release).toHaveBeenCalledExactlyOnceWith(true);

    const replacement = connection();
    pool.connect.mockResolvedValue(replacement);
    const resumed = watchJudgingChanges("first", abort.signal);
    expect(await resumed.next()).toEqual({ done: false, value: true });
    abort.abort();
    await resumed.return();
    expect(replacement.release).toHaveBeenCalledExactlyOnceWith(true);
  });

  it("cleans up when LISTEN fails", async () => {
    const client = connection();
    client.query.mockRejectedValue(new Error("listen failed"));
    pool.connect.mockResolvedValue(client);
    const stream = watchJudgingChanges("first", new AbortController().signal);
    await expect(stream.next()).rejects.toThrow("listen failed");
    expect(client.release).toHaveBeenCalledExactlyOnceWith(true);
  });

  it("releases a listener when an idle request is aborted", async () => {
    const client = connection();
    pool.connect.mockResolvedValue(client);
    const abort = new AbortController();
    const stream = watchJudgingChanges("first", abort.signal);
    await stream.next();
    const waiting = stream.next();
    abort.abort();
    expect(await waiting).toEqual({ done: true, value: undefined });
    expect(client.release).toHaveBeenCalledExactlyOnceWith(true);
  });
});
