import { and, eq } from "@forge/db";
import {
  HackerCheckInAttempt,
  HackerEventAttendee,
} from "@forge/db/schemas/knight-hacks";

import type { WriteDb } from "../db";

/**
 * Event attendance and scanner history is permanent analytics data. Callers
 * must hold the parent Event row lock before using this result to delete it so
 * a concurrent check-in cannot pass its foreign-key check between the probe
 * and the delete.
 */
export async function hasHackathonEventHistory(
  database: WriteDb,
  input: { eventId: string; hackathonId: string },
) {
  const [attendance] = await database
    .select({ id: HackerEventAttendee.id })
    .from(HackerEventAttendee)
    .where(
      and(
        eq(HackerEventAttendee.eventId, input.eventId),
        eq(HackerEventAttendee.hackathonId, input.hackathonId),
      ),
    )
    .limit(1);
  if (attendance) return true;

  const [attempt] = await database
    .select({ id: HackerCheckInAttempt.id })
    .from(HackerCheckInAttempt)
    .where(
      and(
        eq(HackerCheckInAttempt.eventId, input.eventId),
        eq(HackerCheckInAttempt.hackathonId, input.hackathonId),
      ),
    )
    .limit(1);
  return Boolean(attempt);
}
