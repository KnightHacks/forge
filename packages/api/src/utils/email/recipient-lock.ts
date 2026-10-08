import type { EmailRecipientLock } from "@forge/email";
import { sql } from "@forge/db";
import { db } from "@forge/db/client";

// Shared by every campaign and cleanup call in this process. Keep six of the
// default ten pool connections available while Listmonk requests are pending.
const MAX_CONCURRENT_RECIPIENT_LOCKS = 4;
let activeRecipientLocks = 0;
const waitingRecipientLocks: (() => void)[] = [];

export const withEmailRecipientLock: EmailRecipientLock = async (
  email,
  operation,
) => {
  // Wait before opening a transaction so queued work holds no DB connection.
  if (activeRecipientLocks >= MAX_CONCURRENT_RECIPIENT_LOCKS) {
    await new Promise<void>((resolve) => waitingRecipientLocks.push(resolve));
  } else {
    activeRecipientLocks += 1;
  }

  try {
    // A transaction-scoped lock coordinates Blade, cron, and retention cleanup.
    // Listmonk v6 replaces the whole subscriber, including other sends' data.
    await db.transaction(async (tx) => {
      await tx.execute(sql`set local lock_timeout = '15s'`);
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`forge:email-recipient:${email.trim().toLowerCase()}`}, 0))`,
      );
      await operation();
    });
  } finally {
    // Transfer the slot directly to the oldest waiter, including after errors.
    const next = waitingRecipientLocks.shift();
    if (next) next();
    else activeRecipientLocks -= 1;
  }
};
