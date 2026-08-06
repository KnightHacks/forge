import { and, asc, inArray, lte } from "@forge/db";
import { db } from "@forge/db/client";
import { HackerParticipantCommand } from "@forge/db/schemas/knight-hacks";

/** Removes expired idempotency payloads in bounded batches. */
export async function cleanupExpiredHackerParticipantCommands({
  limit = 500,
  now = new Date(),
}: {
  limit?: number;
  now?: Date;
} = {}) {
  const rows = await db
    .select({ id: HackerParticipantCommand.id })
    .from(HackerParticipantCommand)
    .where(lte(HackerParticipantCommand.expiresAt, now))
    .orderBy(
      asc(HackerParticipantCommand.expiresAt),
      asc(HackerParticipantCommand.id),
    )
    .limit(Math.max(1, Math.min(limit, 2_000)));
  if (rows.length === 0) return { deleted: 0 };

  const deleted = await db
    .delete(HackerParticipantCommand)
    .where(
      and(
        lte(HackerParticipantCommand.expiresAt, now),
        inArray(
          HackerParticipantCommand.id,
          rows.map(({ id }) => id),
        ),
      ),
    )
    .returning({ id: HackerParticipantCommand.id });
  return { deleted: deleted.length };
}
