import type { Pool, PoolClient } from "pg";

/** Register before the first query; close before dropping the test database. */
export function trackTestPoolShutdown(pool: Pool) {
  if (pool.totalCount !== 0) {
    throw new Error("Register test pool shutdown before opening connections.");
  }
  const connections = new Set<Promise<void>>();
  const connected = (client: PoolClient) => {
    const closed = new Promise<void>((resolve) => {
      client.once("end", () => {
        connections.delete(closed);
        resolve();
      });
    });
    connections.add(closed);
  };
  pool.on("connect", connected);

  return async () => {
    try {
      // pg removes idle clients from its array before their sockets close, so
      // Pool.end alone can resolve too early for pg_terminate_backend/drop.
      await pool.end();
      await Promise.all(connections);
    } finally {
      pool.off("connect", connected);
    }
  };
}
