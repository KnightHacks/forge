import { randomInt } from "node:crypto";
import { TRPCError } from "@trpc/server";

import type { HackerTeamAction } from "@forge/validators";
import { and, asc, count, eq, ilike, inArray, ne, or, sql } from "@forge/db";
import { db } from "@forge/db/client";
import {
  HackathonClass,
  Hacker,
  HackerAttendee,
  HackerTeam,
  HackerTeamMember,
} from "@forge/db/schemas/knight-hacks";

import { createAdminAuditEvent } from "../audit/service";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Reader = typeof db | Tx;
export async function lockHackerTeams(tx: Tx, hackathonId: string) {
  // Share check-in's allocation lock: approvals and first arrivals have one order.
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`blade:hackathon-allocation:${hackathonId}`}, 0))`,
  );
}
function fail(message: string): never {
  throw new TRPCError({ code: "CONFLICT", message });
}
export async function requireTeamParticipant(
  executor: Reader,
  userId: string,
  hackathonId: string,
  lock = false,
) {
  const query = executor
    .select({
      id: HackerAttendee.id,
      status: HackerAttendee.status,
      checkedInAt: HackerAttendee.checkedInAt,
    })
    .from(HackerAttendee)
    .innerJoin(Hacker, eq(Hacker.id, HackerAttendee.hackerId))
    .where(
      and(
        eq(Hacker.userId, userId),
        eq(HackerAttendee.hackathonId, hackathonId),
      ),
    )
    .limit(1);
  const [attendee] = await (lock
    ? query.for("update", { of: HackerAttendee })
    : query);
  if (!attendee || !["confirmed", "checkedin"].includes(attendee.status))
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Confirm attendance to unlock Teams.",
    });
  return attendee;
}
export async function teamDetails(
  executor: Reader,
  hackathonId: string,
  ids: string[],
  ownerId?: string,
  admin = false,
) {
  if (!ids.length) return [];
  const teams = await executor
    .select({
      id: HackerTeam.id,
      name: HackerTeam.name,
      together: HackerTeam.together,
      frozenAt: HackerTeam.frozenAt,
      className: HackathonClass.name,
    })
    .from(HackerTeam)
    .leftJoin(HackathonClass, eq(HackathonClass.id, HackerTeam.classId))
    .where(
      and(eq(HackerTeam.hackathonId, hackathonId), inArray(HackerTeam.id, ids)),
    )
    .orderBy(asc(HackerTeam.name), asc(HackerTeam.id));
  const members = await executor
    .select({
      teamId: HackerTeamMember.teamId,
      attendeeId: HackerTeamMember.attendeeId,
      role: HackerTeamMember.role,
      name: sql<string>`concat(${Hacker.firstName}, ' ', ${Hacker.lastName})`,
      status: HackerAttendee.status,
      className: HackathonClass.name,
    })
    .from(HackerTeamMember)
    .innerJoin(
      HackerAttendee,
      eq(HackerAttendee.id, HackerTeamMember.attendeeId),
    )
    .innerJoin(Hacker, eq(Hacker.id, HackerAttendee.hackerId))
    .leftJoin(HackathonClass, eq(HackathonClass.id, HackerAttendee.classId))
    .where(
      and(
        eq(HackerTeamMember.hackathonId, hackathonId),
        inArray(HackerTeamMember.teamId, ids),
      ),
    )
    .orderBy(asc(HackerTeamMember.attendeeId));
  return teams.map((team) => {
    const rows = members.filter((m) => m.teamId === team.id);
    const owns =
      admin || rows.some((m) => m.attendeeId === ownerId && m.role === "owner");
    const dto = (m: (typeof members)[number]) => ({
      attendeeId: m.attendeeId,
      name: m.name,
      owner: m.role === "owner",
      checkedIn: m.status === "checkedin",
      className: m.className,
    });
    return {
      id: team.id,
      name: team.name,
      together: team.together,
      frozen: team.frozenAt !== null,
      className: team.className,
      members: rows.filter((m) => m.role !== "pending").map(dto),
      requests: owns ? rows.filter((m) => m.role === "pending").map(dto) : [],
    };
  });
}
export async function searchHackerTeams(
  hackathonId: string,
  query: string,
  page: number,
  ownerId?: string,
  admin = false,
  together?: boolean,
) {
  const search = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
  const ids = await db
    .selectDistinct({ id: HackerTeam.id, name: HackerTeam.name })
    .from(HackerTeam)
    .leftJoin(
      HackerTeamMember,
      and(
        eq(HackerTeamMember.teamId, HackerTeam.id),
        ne(HackerTeamMember.role, "pending"),
      ),
    )
    .leftJoin(
      HackerAttendee,
      eq(HackerAttendee.id, HackerTeamMember.attendeeId),
    )
    .leftJoin(Hacker, eq(Hacker.id, HackerAttendee.hackerId))
    .where(
      and(
        eq(HackerTeam.hackathonId, hackathonId),
        together === undefined ? undefined : eq(HackerTeam.together, together),
        or(
          ilike(HackerTeam.name, search),
          ilike(
            sql`concat(${Hacker.firstName}, ' ', ${Hacker.lastName})`,
            search,
          ),
        ),
      ),
    )
    .orderBy(asc(HackerTeam.name), asc(HackerTeam.id))
    .limit(21)
    .offset(page * 20);
  return {
    teams: await teamDetails(
      db,
      hackathonId,
      ids.slice(0, 20).map((t) => t.id),
      ownerId,
      admin,
    ),
    hasMore: ids.length > 20,
  };
}
export async function participantTeams(
  userId: string,
  hackathonId: string,
  input: { query: string; page: number },
) {
  const attendee = await requireTeamParticipant(db, userId, hackathonId);
  const [membership] = await db
    .select()
    .from(HackerTeamMember)
    .where(eq(HackerTeamMember.attendeeId, attendee.id));
  const own = membership
    ? (await teamDetails(db, hackathonId, [membership.teamId], attendee.id))[0]
    : null;
  return {
    attendeeId: attendee.id,
    canJoin: attendee.status === "confirmed" && !attendee.checkedInAt,
    ownTeam: membership?.role !== "pending" ? (own ?? null) : null,
    pendingTeam:
      membership?.role === "pending" && own
        ? { id: own.id, name: own.name }
        : null,
    ...(await searchHackerTeams(
      hackathonId,
      input.query,
      input.page,
      attendee.id,
    )),
  };
}

/** Caller holds the allocation lock. Also used before deleting applications. */
export async function removeHackerTeamMember(tx: Reader, attendeeId: string) {
  const [removed] = await tx
    .delete(HackerTeamMember)
    .where(eq(HackerTeamMember.attendeeId, attendeeId))
    .returning();
  if (!removed || removed.role === "pending") return;
  const remaining = await tx
    .select()
    .from(HackerTeamMember)
    .where(
      and(
        eq(HackerTeamMember.teamId, removed.teamId),
        ne(HackerTeamMember.role, "pending"),
      ),
    );
  if (!remaining.length) {
    await tx.delete(HackerTeam).where(eq(HackerTeam.id, removed.teamId));
    return;
  }
  if (removed.role === "owner") {
    const successor = remaining[randomInt(remaining.length)];
    if (successor)
      await tx
        .update(HackerTeamMember)
        .set({ role: "owner" })
        .where(eq(HackerTeamMember.attendeeId, successor.attendeeId));
  }
}

export async function changeHackerTeam(
  userId: string,
  hackathonId: string,
  input: HackerTeamAction,
  admin = false,
) {
  return db.transaction(async (tx) => {
    await lockHackerTeams(tx, hackathonId);
    const attendee = admin
      ? null
      : await requireTeamParticipant(tx, userId, hackathonId, true);
    if (
      admin &&
      !(
        input.action === "remove" ||
        input.action === "delete" ||
        (input.action === "update" && input.together === undefined)
      )
    )
      throw new TRPCError({ code: "FORBIDDEN" });
    const [membership] = attendee
      ? await tx
          .select()
          .from(HackerTeamMember)
          .where(eq(HackerTeamMember.attendeeId, attendee.id))
      : [];
    const canJoin = attendee?.status === "confirmed" && !attendee.checkedInAt;
    let changedTeamId = "teamId" in input ? input.teamId : membership?.teamId;
    if (input.action === "create") {
      if (!canJoin || membership)
        fail(
          "You must be confirmed, not checked in, and have no team or pending request.",
        );
      const [team] = await tx
        .insert(HackerTeam)
        .values({ hackathonId, name: input.name })
        .returning();
      if (!team) throw new Error("Team creation failed.");
      await tx.insert(HackerTeamMember).values({
        attendeeId: attendee.id,
        hackathonId,
        teamId: team.id,
        role: "owner",
      });
      changedTeamId = team.id;
    } else if (input.action === "cancel" || input.action === "leave") {
      if (
        !membership ||
        (input.action === "cancel") !== (membership.role === "pending")
      )
        fail("Your team membership has changed. Refresh and try again.");
      await removeHackerTeamMember(tx, membership.attendeeId);
    } else {
      const [team] = await tx
        .select()
        .from(HackerTeam)
        .where(
          and(
            eq(HackerTeam.id, input.teamId),
            eq(HackerTeam.hackathonId, hackathonId),
          ),
        );
      if (!team)
        throw new TRPCError({ code: "NOT_FOUND", message: "Team not found." });
      if (input.action === "request") {
        if (!canJoin || membership)
          fail(
            "You must be confirmed, not checked in, and have no team or pending request.",
          );
        if (team.frozenAt)
          fail("This team's membership is locked after check-in.");
        const [size] = await tx
          .select({ value: count() })
          .from(HackerTeamMember)
          .where(
            and(
              eq(HackerTeamMember.teamId, team.id),
              ne(HackerTeamMember.role, "pending"),
            ),
          );
        if ((size?.value ?? 0) >= 4) fail("This team is full.");
        await tx.insert(HackerTeamMember).values({
          attendeeId: attendee.id,
          hackathonId,
          teamId: team.id,
          role: "pending",
        });
      } else {
        if (
          !admin &&
          (membership?.teamId !== team.id || membership.role !== "owner")
        )
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the team owner can do that.",
          });
        if (input.action === "update") {
          if (
            team.frozenAt &&
            input.together !== undefined &&
            input.together !== team.together
          )
            fail("Class preference is locked after the first check-in.");
          await tx
            .update(HackerTeam)
            .set({
              name: input.name,
              ...(input.together === undefined
                ? {}
                : { together: input.together }),
            })
            .where(eq(HackerTeam.id, team.id));
        } else if (input.action === "delete") {
          await tx.delete(HackerTeam).where(eq(HackerTeam.id, team.id));
        } else {
          const [target] = await tx
            .select({
              role: HackerTeamMember.role,
              status: HackerAttendee.status,
              checkedInAt: HackerAttendee.checkedInAt,
            })
            .from(HackerTeamMember)
            .innerJoin(
              HackerAttendee,
              eq(HackerAttendee.id, HackerTeamMember.attendeeId),
            )
            .where(
              and(
                eq(HackerTeamMember.teamId, team.id),
                eq(HackerTeamMember.attendeeId, input.attendeeId),
              ),
            )
            .for("update", { of: HackerAttendee });
          if (
            !target ||
            (input.action === "decide") !== (target.role === "pending")
          )
            fail("This member or request has changed.");
          if (input.action === "decide" && input.accept) {
            if (
              team.frozenAt ||
              target.status !== "confirmed" ||
              target.checkedInAt
            )
              fail(
                "Joining is locked after check-in or when attendance is no longer confirmed.",
              );
            const [size] = await tx
              .select({ value: count() })
              .from(HackerTeamMember)
              .where(
                and(
                  eq(HackerTeamMember.teamId, team.id),
                  ne(HackerTeamMember.role, "pending"),
                ),
              );
            if ((size?.value ?? 0) >= 4) fail("This team is full.");
            await tx
              .update(HackerTeamMember)
              .set({ role: "member" })
              .where(eq(HackerTeamMember.attendeeId, input.attendeeId));
          } else {
            await removeHackerTeamMember(tx, input.attendeeId);
          }
        }
      }
    }
    await createAdminAuditEvent(
      {
        actionKey: "hacker_team.changed",
        actor: { id: userId, name: null },
        metadata: { operation: input.action, hackathonId, organizer: admin },
        subjects: [
          {
            targetType: "hacker_team",
            targetId: changedTeamId ?? hackathonId,
            targetLabel: "Hacker team",
            relation: "primary",
          },
        ],
      },
      tx,
    );
    return { ok: true as const };
  });
}
