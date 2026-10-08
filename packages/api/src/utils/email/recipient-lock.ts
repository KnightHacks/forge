import type { EmailRecipientLock } from "@forge/email";
import { sql } from "@forge/db";
import { db } from "@forge/db/client";

export const withEmailRecipientLock: EmailRecipientLock = async (
  email,
  operation,
) => {
  // A transaction-scoped lock coordinates Blade, cron, and retention cleanup.
  // Listmonk v6 replaces the whole subscriber, including other sends' data.
  await db.transaction(async (tx) => {
    await tx.execute(sql`set local lock_timeout = '15s'`);
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`forge:email-recipient:${email.trim().toLowerCase()}`}, 0))`,
    );
    await operation();
  });
};
