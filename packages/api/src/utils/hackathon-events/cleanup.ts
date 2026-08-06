import { and, asc, inArray, isNotNull, lte } from "@forge/db";
import { db } from "@forge/db/client";
import { HackerCheckInAttempt } from "@forge/db/schemas/knight-hacks";

/** Deletes only expiring operational failures; successful admission history has no expiry. */
export async function cleanupExpiredHackathonCheckInAttempts({
  limit = 500,
  now,
}: {
  limit?: number;
  now: Date;
}) {
  const rows = await db
    .select({ id: HackerCheckInAttempt.id })
    .from(HackerCheckInAttempt)
    .where(
      and(
        isNotNull(HackerCheckInAttempt.expiresAt),
        lte(HackerCheckInAttempt.expiresAt, now),
      ),
    )
    .orderBy(asc(HackerCheckInAttempt.expiresAt), asc(HackerCheckInAttempt.id))
    .limit(Math.max(1, Math.min(limit, 2_000)));
  if (rows.length === 0) return { deleted: 0 };

  const deleted = await db
    .delete(HackerCheckInAttempt)
    .where(
      inArray(
        HackerCheckInAttempt.id,
        rows.map(({ id }) => id),
      ),
    )
    .returning({ id: HackerCheckInAttempt.id });
  return { deleted: deleted.length };
}
