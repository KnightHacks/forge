import { expect } from "vitest";

import type { db as databaseClient } from "@forge/db/client";

export async function refreshConcurrently<T>(
  db: typeof databaseClient,
  refreshTokenHash: string,
  refresh: () => Promise<T>,
) {
  const blocker = await db.$client.connect();
  let refreshes: Promise<PromiseSettledResult<T>[]> | undefined;
  try {
    await blocker.query("BEGIN");
    await blocker.query(
      "SELECT id FROM knight_hacks_hackathon_portal_session WHERE refresh_token_hash = $1 FOR UPDATE",
      [refreshTokenHash],
    );
    refreshes = Promise.allSettled([refresh(), refresh()]);
    // Both transactions must begin their credential reads before either can rotate.
    await expect
      .poll(
        async () => {
          const result = await db.$client.query<{ waiting: number }>(
            `SELECT count(*)::int AS waiting FROM pg_stat_activity
         WHERE datname = current_database() AND wait_event_type = 'Lock'
           AND query LIKE '%knight_hacks_hackathon_portal_session_credential%'`,
          );
          return result.rows[0]?.waiting;
        },
        { timeout: 5_000, interval: 10 },
      )
      .toBe(2);
  } finally {
    await blocker.query("ROLLBACK");
    blocker.release();
    // Drain requests even if the overlap assertion fails, before test teardown.
    await refreshes;
  }

  return refreshes;
}
