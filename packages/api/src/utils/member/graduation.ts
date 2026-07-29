import type { SQL } from "@forge/db";
import { sql } from "@forge/db";
import { Member } from "@forge/db/schemas/knight-hacks";

/**
 * A member has graduated once their graduation date has passed. This is the one
 * definition of that rule; Guild listings, the alumni dashboard, and the admin
 * member list all read it from here so they cannot drift apart.
 *
 * `gradDate` is a `date` column, not a timestamp, so someone graduating today
 * still counts as a current student for the whole of that day.
 */
export function graduatedCondition(graduated: boolean): SQL {
  return graduated
    ? sql`${Member.gradDate} < CURRENT_DATE`
    : sql`${Member.gradDate} >= CURRENT_DATE`;
}

export function hasGraduated(
  gradDate: Date | string,
  now = new Date(),
): boolean {
  const dateOnly =
    gradDate instanceof Date
      ? gradDate.toISOString().slice(0, 10)
      : gradDate.slice(0, 10);

  return new Date(`${dateOnly}T23:59:59Z`) < now;
}
