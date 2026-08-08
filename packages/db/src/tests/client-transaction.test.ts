import type { Pool } from "pg";
import { describe, expect, it, vi } from "vitest";

import { sql } from "drizzle-orm";

import { createDatabase } from "../client";

describe("database client transactions", () => {
  it("uses one explicitly checked-out client when pool identity is unavailable", async () => {
    const queries: string[] = [];
    const release = vi.fn();
    const connection = {
      query(query: { text: string }) {
        queries.push(query.text);
        return Promise.resolve({ rows: [] });
      },
      release,
    };
    // This deliberately has no Pool prototype. It recreates the shape Next's
    // production bundle exposed to Drizzle when its duplicated pg modules made
    // `instanceof Pool` false and its minified constructor was anonymous.
    const connect = vi.fn().mockResolvedValue(connection);
    const disguisedPool = { connect } as unknown as Pool;
    const client = createDatabase(disguisedPool);

    await client.transaction(async (tx) => {
      await tx.execute(sql.raw("select 1"));
    });

    expect(connect).toHaveBeenCalledOnce();
    expect(queries).toEqual(["begin", "select 1", "commit"]);
    expect(release).toHaveBeenCalledOnce();
  });

  it("rolls back and releases the same client after a failed transaction", async () => {
    const queries: string[] = [];
    const release = vi.fn();
    const connection = {
      query(query: { text: string }) {
        queries.push(query.text);
        return Promise.resolve({ rows: [] });
      },
      release,
    };
    const disguisedPool = {
      connect: vi.fn().mockResolvedValue(connection),
    } as unknown as Pool;
    const client = createDatabase(disguisedPool);
    const failure = new Error("stop transaction");

    await expect(
      client.transaction(async (tx) => {
        await tx.execute(sql.raw("select 1"));
        throw failure;
      }),
    ).rejects.toBe(failure);

    expect(queries).toEqual(["begin", "select 1", "rollback"]);
    expect(release).toHaveBeenCalledOnce();
  });
});
