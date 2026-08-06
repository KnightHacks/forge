import { randomUUID } from "node:crypto";

import { and, asc, eq, isNull, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { User } from "@forge/db/schemas/auth";
import {
  Event,
  Hackathon,
  HackathonClass,
  Hacker,
  HackerAttendee,
  HackerCheckInAttempt,
  HackerDiscordRoleGrant,
  HackerDiscordRoleGrantAttempt,
  HackerEventAttendee,
} from "@forge/db/schemas/knight-hacks";

import type { RoleDiscordGateway } from "../roles/discord-gateway";

const ROLE_LEASE_MS = 30_000;

function safeError(error: unknown) {
  const status = (error as { status?: number } | null)?.status;
  return typeof status === "number"
    ? status >= 500
      ? "discord_5xx"
      : `discord_${status}`
    : "discord_delivery_failed";
}

function roleOutcome(error: unknown) {
  const status = (error as { status?: number } | null)?.status;
  return status === undefined || status >= 500 ? "unknown" : "failed";
}

async function loadDesiredRoles(hackerAttendeeId: string, hackathonId: string) {
  const [attendee] = await db
    .select({
      classRoleId: HackathonClass.discordRoleId,
      generalRoleId: Hackathon.generalHackerDiscordRoleId,
      isVip: HackerAttendee.isVip,
    })
    .from(HackerAttendee)
    .innerJoin(Hackathon, eq(Hackathon.id, HackerAttendee.hackathonId))
    .leftJoin(
      HackathonClass,
      and(
        eq(HackathonClass.id, HackerAttendee.classId),
        eq(HackathonClass.hackathonId, HackerAttendee.hackathonId),
        eq(HackathonClass.kind, "class"),
      ),
    )
    .where(
      and(
        eq(HackerAttendee.id, hackerAttendeeId),
        eq(HackerAttendee.hackathonId, hackathonId),
      ),
    )
    .limit(1);
  if (!attendee) return [];
  const vip = attendee.isVip
    ? await db.query.HackathonClass.findFirst({
        columns: { discordRoleId: true },
        where: and(
          eq(HackathonClass.hackathonId, hackathonId),
          eq(HackathonClass.kind, "vip"),
        ),
      })
    : null;
  return [
    ...(attendee.generalRoleId
      ? [{ kind: "general" as const, roleId: attendee.generalRoleId }]
      : []),
    ...(attendee.classRoleId
      ? [{ kind: "class" as const, roleId: attendee.classRoleId }]
      : []),
    ...(vip?.discordRoleId
      ? [{ kind: "vip" as const, roleId: vip.discordRoleId }]
      : []),
  ];
}

async function refreshDesiredGrants(
  hackerAttendeeId: string,
  hackathonId: string,
  sourceAttendanceId: string,
  sourceEventId: string,
) {
  const desired = await loadDesiredRoles(hackerAttendeeId, hackathonId);
  for (const role of desired) {
    let current = await db.query.HackerDiscordRoleGrant.findFirst({
      columns: { desiredRoleId: true, id: true, leaseToken: true },
      where: and(
        eq(HackerDiscordRoleGrant.hackerAttendeeId, hackerAttendeeId),
        eq(HackerDiscordRoleGrant.kind, role.kind),
      ),
    });
    if (!current) {
      await db
        .insert(HackerDiscordRoleGrant)
        .values({
          desiredRoleId: role.roleId,
          hackerAttendeeId,
          hackathonId,
          kind: role.kind,
          sourceAttendanceId,
          sourceEventId,
        })
        .onConflictDoNothing();
      current = await db.query.HackerDiscordRoleGrant.findFirst({
        columns: { desiredRoleId: true, id: true, leaseToken: true },
        where: and(
          eq(HackerDiscordRoleGrant.hackerAttendeeId, hackerAttendeeId),
          eq(HackerDiscordRoleGrant.kind, role.kind),
        ),
      });
    }
    if (current && current.desiredRoleId !== role.roleId) {
      await db.transaction(async (tx) => {
        const [locked] = await tx
          .select({
            desiredRoleId: HackerDiscordRoleGrant.desiredRoleId,
            id: HackerDiscordRoleGrant.id,
            leaseToken: HackerDiscordRoleGrant.leaseToken,
          })
          .from(HackerDiscordRoleGrant)
          .where(eq(HackerDiscordRoleGrant.id, current.id))
          .for("update")
          .limit(1);
        if (!locked || locked.desiredRoleId === role.roleId) return;
        if (locked.leaseToken) {
          await tx
            .update(HackerDiscordRoleGrantAttempt)
            .set({
              error: "desired_role_changed",
              finishedAt: new Date(),
              outcome: "unknown",
            })
            .where(
              and(
                eq(
                  HackerDiscordRoleGrantAttempt.attemptToken,
                  locked.leaseToken,
                ),
                eq(HackerDiscordRoleGrantAttempt.outcome, "pending"),
              ),
            );
        }
        await tx
          .update(HackerDiscordRoleGrant)
          .set({
            desiredRoleId: role.roleId,
            lastError: null,
            leaseExpiresAt: null,
            leaseToken: null,
            state: "pending",
            succeededAt: null,
          })
          .where(eq(HackerDiscordRoleGrant.id, locked.id));
      });
    }
  }
  return desired;
}

export async function deliverHackathonRoleGrants({
  actorId,
  attemptId,
  clock = () => new Date(),
  gateway,
  hackathonId,
  now,
}: {
  actorId: string;
  attemptId: string;
  clock?: () => Date;
  gateway: RoleDiscordGateway;
  hackathonId: string;
  now?: Date;
}) {
  const [source] = await db
    .select({
      discordUserId: User.discordUserId,
      hackerAttendeeId: HackerAttendee.id,
    })
    .from(HackerCheckInAttempt)
    .innerJoin(
      HackerAttendee,
      and(
        eq(HackerAttendee.id, HackerCheckInAttempt.hackerAttendeeId),
        eq(HackerAttendee.hackathonId, HackerCheckInAttempt.hackathonId),
      ),
    )
    .innerJoin(Hacker, eq(Hacker.id, HackerAttendee.hackerId))
    .innerJoin(User, eq(User.id, Hacker.userId))
    .where(
      and(
        eq(HackerCheckInAttempt.id, attemptId),
        eq(HackerCheckInAttempt.hackathonId, hackathonId),
        eq(HackerCheckInAttempt.eventPurpose, "primary_check_in"),
      ),
    )
    .limit(1);
  if (!source) return { failedCount: 0, grants: [], succeededCount: 0 };

  // A repeat primary scan records a new check-in attempt without creating a
  // second attendance row. Role repair still belongs to the canonical active
  // primary attendance, rather than to the selected attempt's nullable link.
  const [primaryAttendance] = await db
    .select({
      eventId: HackerEventAttendee.eventId,
      id: HackerEventAttendee.id,
    })
    .from(HackerEventAttendee)
    .innerJoin(
      Event,
      and(
        eq(Event.id, HackerEventAttendee.eventId),
        eq(Event.hackathonId, HackerEventAttendee.hackathonId),
        eq(Event.purpose, "primary_check_in"),
      ),
    )
    .where(
      and(
        eq(HackerEventAttendee.hackerAttId, source.hackerAttendeeId),
        eq(HackerEventAttendee.hackathonId, hackathonId),
        isNull(HackerEventAttendee.voidedAt),
      ),
    )
    .orderBy(asc(HackerEventAttendee.checkedInAt))
    .limit(1);
  if (!primaryAttendance)
    return { failedCount: 0, grants: [], succeededCount: 0 };

  const desired = await refreshDesiredGrants(
    source.hackerAttendeeId,
    hackathonId,
    primaryAttendance.id,
    primaryAttendance.eventId,
  );
  const allGrants = await db
    .select()
    .from(HackerDiscordRoleGrant)
    .where(
      and(
        eq(HackerDiscordRoleGrant.hackerAttendeeId, source.hackerAttendeeId),
        eq(HackerDiscordRoleGrant.hackathonId, hackathonId),
      ),
    );
  // Rows for roles removed from current configuration remain as delivery
  // evidence, but are retired from the active desired set.
  const grants = allGrants.filter((grant) =>
    desired.some(
      (role) => role.kind === grant.kind && role.roleId === grant.desiredRoleId,
    ),
  );

  if (!/^\d{17,20}$/.test(source.discordUserId)) {
    for (const grant of grants) {
      await db
        .update(HackerDiscordRoleGrant)
        .set({
          lastError: "discord_identity_invalid",
          leaseExpiresAt: null,
          leaseToken: null,
          state: "failed",
        })
        .where(eq(HackerDiscordRoleGrant.id, grant.id));
    }
    return {
      failedCount: grants.length,
      grants: grants.map(({ kind }) => ({
        kind,
        lastError: "discord_identity_invalid",
        state: "failed" as const,
      })),
      succeededCount: 0,
    };
  }

  for (const grant of grants) {
    if (grant.state === "succeeded") continue;
    const claimNow = now ?? clock();
    const token = randomUUID();
    const leaseExpiresAt = new Date(claimNow.getTime() + ROLE_LEASE_MS);
    const attempt = await db.transaction(async (tx) => {
      const [locked] = await tx
        .select({
          desiredRoleId: HackerDiscordRoleGrant.desiredRoleId,
          leaseExpiresAt: HackerDiscordRoleGrant.leaseExpiresAt,
          leaseToken: HackerDiscordRoleGrant.leaseToken,
          state: HackerDiscordRoleGrant.state,
        })
        .from(HackerDiscordRoleGrant)
        .where(eq(HackerDiscordRoleGrant.id, grant.id))
        .for("update")
        .limit(1);
      if (!locked || locked.state === "succeeded") return null;
      if (locked.leaseExpiresAt && locked.leaseExpiresAt >= claimNow) {
        return null;
      }

      if (locked.leaseToken) {
        await tx
          .update(HackerDiscordRoleGrantAttempt)
          .set({
            error: "lease_expired",
            finishedAt: claimNow,
            outcome: "unknown",
          })
          .where(
            and(
              eq(HackerDiscordRoleGrantAttempt.attemptToken, locked.leaseToken),
              eq(HackerDiscordRoleGrantAttempt.outcome, "pending"),
            ),
          );
      }

      await tx
        .update(HackerDiscordRoleGrant)
        .set({
          attemptCount: sql`${HackerDiscordRoleGrant.attemptCount} + 1`,
          lastAttemptAt: claimNow,
          leaseExpiresAt,
          leaseToken: token,
          state: "pending",
        })
        .where(eq(HackerDiscordRoleGrant.id, grant.id));
      const [created] = await tx
        .insert(HackerDiscordRoleGrantAttempt)
        .values({
          attemptToken: token,
          attemptedBy: actorId,
          discordUserIdSnapshot: source.discordUserId,
          grantId: grant.id,
          roleIdSnapshot: locked.desiredRoleId,
          startedAt: claimNow,
        })
        .returning({
          id: HackerDiscordRoleGrantAttempt.id,
          roleId: HackerDiscordRoleGrantAttempt.roleIdSnapshot,
        });
      return created ?? null;
    });
    if (!attempt) continue;
    try {
      await gateway.grantRole(source.discordUserId, attempt.roleId);
      const finishedAt = new Date();
      await db.transaction(async (tx) => {
        await tx
          .update(HackerDiscordRoleGrantAttempt)
          .set({ finishedAt, outcome: "succeeded" })
          .where(
            and(
              eq(HackerDiscordRoleGrantAttempt.id, attempt.id),
              eq(HackerDiscordRoleGrantAttempt.outcome, "pending"),
            ),
          );
        await tx
          .update(HackerDiscordRoleGrant)
          .set({
            lastError: null,
            leaseExpiresAt: null,
            leaseToken: null,
            state: "succeeded",
            succeededAt: finishedAt,
          })
          .where(
            and(
              eq(HackerDiscordRoleGrant.id, grant.id),
              eq(HackerDiscordRoleGrant.leaseToken, token),
            ),
          );
      });
    } catch (error) {
      const outcome = roleOutcome(error);
      const errorMessage = safeError(error);
      const finishedAt = new Date();
      await db.transaction(async (tx) => {
        await tx
          .update(HackerDiscordRoleGrantAttempt)
          .set({ error: errorMessage, finishedAt, outcome })
          .where(
            and(
              eq(HackerDiscordRoleGrantAttempt.id, attempt.id),
              eq(HackerDiscordRoleGrantAttempt.outcome, "pending"),
            ),
          );
        await tx
          .update(HackerDiscordRoleGrant)
          .set({
            lastError: errorMessage,
            leaseExpiresAt: null,
            leaseToken: null,
            state: outcome,
          })
          .where(
            and(
              eq(HackerDiscordRoleGrant.id, grant.id),
              eq(HackerDiscordRoleGrant.leaseToken, token),
            ),
          );
      });
    }
  }

  const currentRows = await db
    .select({
      desiredRoleId: HackerDiscordRoleGrant.desiredRoleId,
      kind: HackerDiscordRoleGrant.kind,
      lastError: HackerDiscordRoleGrant.lastError,
      state: HackerDiscordRoleGrant.state,
    })
    .from(HackerDiscordRoleGrant)
    .where(
      and(
        eq(HackerDiscordRoleGrant.hackerAttendeeId, source.hackerAttendeeId),
        eq(HackerDiscordRoleGrant.hackathonId, hackathonId),
      ),
    );
  const current = currentRows
    .filter((grant) =>
      desired.some(
        (role) =>
          role.kind === grant.kind && role.roleId === grant.desiredRoleId,
      ),
    )
    .map(({ kind, lastError, state }) => ({ kind, lastError, state }));
  return {
    failedCount: current.filter((grant) => grant.state !== "succeeded").length,
    grants: current,
    succeededCount: current.filter((grant) => grant.state === "succeeded")
      .length,
  };
}

export async function loadHackathonRoleGrantHealth(
  hackerAttendeeId: string,
  hackathonId: string,
) {
  const desired = await loadDesiredRoles(hackerAttendeeId, hackathonId);
  const rows = await db
    .select({
      desiredRoleId: HackerDiscordRoleGrant.desiredRoleId,
      kind: HackerDiscordRoleGrant.kind,
      lastError: HackerDiscordRoleGrant.lastError,
      state: HackerDiscordRoleGrant.state,
    })
    .from(HackerDiscordRoleGrant)
    .where(
      and(
        eq(HackerDiscordRoleGrant.hackerAttendeeId, hackerAttendeeId),
        eq(HackerDiscordRoleGrant.hackathonId, hackathonId),
      ),
    );
  const grants = [
    ...rows
      .filter((grant) =>
        desired.some(
          (role) =>
            role.kind === grant.kind && role.roleId === grant.desiredRoleId,
        ),
      )
      .map(({ kind, lastError, state }) => ({ kind, lastError, state })),
    ...desired.flatMap((role) =>
      rows.some(
        (grant) =>
          grant.kind === role.kind && grant.desiredRoleId === role.roleId,
      )
        ? []
        : [{ kind: role.kind, lastError: null, state: "pending" as const }],
    ),
  ];
  return {
    grants,
    state:
      grants.length === 0
        ? ("not_applicable" as const)
        : grants.every((grant) => grant.state === "succeeded")
          ? ("synced" as const)
          : grants.some(
                (grant) =>
                  grant.state === "failed" || grant.state === "unknown",
              )
            ? ("error" as const)
            : ("pending" as const),
  };
}
