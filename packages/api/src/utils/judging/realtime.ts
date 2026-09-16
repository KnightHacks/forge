import type { PoolClient } from "pg";

import { sql } from "@forge/db";
import { db } from "@forge/db/client";

import type { WriteDb } from "../db";

interface Notification {
  channel: string;
  payload?: string;
}
type Subscriber = (change: string | Error) => void;
interface Listener {
  ready: Promise<PoolClient>;
  subscribers: Set<Subscriber>;
  failed: Error | null;
}

let listener: Listener | undefined;

/** PostgreSQL delivers this only if the surrounding transaction commits. */
export async function notifyJudgingChanged(tx: WriteDb, hackathonId: string) {
  await tx.execute(sql`select pg_notify('forge_judging', ${hackathonId})`);
}

function getListener(): Listener {
  if (listener && !listener.failed) return listener;
  const current: Listener = {
    failed: null,
    subscribers: new Set(),
    ready: db.$client.connect().then(async (client) => {
      const fail = (error: Error) => {
        current.failed = error;
        for (const subscriber of current.subscribers) subscriber(error);
      };
      client.on("error", fail);
      client.on("end", () => fail(new Error("Judging listener disconnected.")));
      client.on("notification", (notification: Notification) => {
        if (notification.channel !== "forge_judging" || !notification.payload)
          return;
        for (const subscriber of current.subscribers)
          subscriber(notification.payload);
      });
      try {
        await client.query("LISTEN forge_judging");
        return client;
      } catch (error) {
        client.release(true);
        throw error;
      }
    }),
  };
  listener = current;
  return current;
}

/** One dedicated LISTEN connection per process, shared by all judging screens.
 * `true` asks for a refetch; `false` only asks the subscription to recheck access.
 * Notifications contain no judge data. Reconnect always starts with a refetch.
 */
export async function* watchJudgingChanges(
  hackathonId: string,
  signal?: AbortSignal,
): AsyncGenerator<boolean, void> {
  if (signal?.aborted) return;
  const current = getListener();
  const pending: { changed: boolean; checkAccess: boolean; wake?: () => void } =
    {
      changed: true,
      checkAccess: false,
    };
  const receive: Subscriber = (change) => {
    if (change === hackathonId) pending.changed = true;
    else if (!(change instanceof Error)) return;
    pending.wake?.();
  };
  current.subscribers.add(receive);
  const abort = () => pending.wake?.();
  signal?.addEventListener("abort", abort, { once: true });
  const accessTimer = setInterval(() => {
    pending.checkAccess = true;
    pending.wake?.();
  }, 30_000);
  try {
    await current.ready;
    while (!signal?.aborted) {
      if (current.failed) throw current.failed;
      if (pending.changed || pending.checkAccess) {
        const refresh = pending.changed;
        pending.changed = false;
        pending.checkAccess = false;
        yield refresh;
      } else {
        await new Promise<void>((resolve) => {
          pending.wake = resolve;
        });
      }
    }
  } finally {
    clearInterval(accessTimer);
    signal?.removeEventListener("abort", abort);
    current.subscribers.delete(receive);
    if (!current.subscribers.size) {
      if (listener === current) listener = undefined;
      // Destroy the dedicated connection so LISTEN state never enters the pool.
      const client = await current.ready.catch(() => null);
      client?.release(true);
    }
  }
}
