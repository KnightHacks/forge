import { inArray } from "@forge/db";
import { db } from "@forge/db/client";
import { Member } from "@forge/db/schemas/knight-hacks";

// Read-time actor-name resolution for Issue history and Admin logs (R-20).
// Both surfaces store a permanent write-time name snapshot alongside a
// nullable link to the acting Member. Resolving the current name here, at
// read time, lets renamed/updated members show their current name on old
// rows without rewriting history — callers keep the stored snapshot as the
// fallback for deleted/unlinked/system actors.

function fullName(member: { firstName: string; lastName: string }) {
  return `${member.firstName} ${member.lastName}`.trim();
}

/** Batch-resolve current display names for a set of Member ids. */
export async function resolveMemberDisplayNames(
  memberIds: readonly (string | null | undefined)[],
): Promise<Map<string, string>> {
  const ids = [...new Set(memberIds.filter((id): id is string => !!id))];
  if (ids.length === 0) return new Map();

  const rows = await db
    .select({
      firstName: Member.firstName,
      id: Member.id,
      lastName: Member.lastName,
    })
    .from(Member)
    .where(inArray(Member.id, ids));

  return new Map(rows.map((row) => [row.id, fullName(row)]));
}

/**
 * Same resolution keyed by the acting User's id rather than Member id, for
 * surfaces (Issue history) that only stored a User link.
 */
export async function resolveMemberDisplayNamesByUserId(
  userIds: readonly (string | null | undefined)[],
): Promise<Map<string, string>> {
  const ids = [...new Set(userIds.filter((id): id is string => !!id))];
  if (ids.length === 0) return new Map();

  const rows = await db
    .select({
      firstName: Member.firstName,
      lastName: Member.lastName,
      userId: Member.userId,
    })
    .from(Member)
    .where(inArray(Member.userId, ids));

  return new Map(rows.map((row) => [row.userId, fullName(row)]));
}
