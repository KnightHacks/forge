import { TRPCError } from "@trpc/server";
import QRCode from "qrcode";
import { z } from "zod";

import type { AuditActionKey } from "@forge/validators";
import { and, asc, desc, eq, gte, isNull, lte, max, or, sql } from "@forge/db";
import { db } from "@forge/db/client";
import {
  GuestJudgeSession,
  Hackathon,
  HackathonJudgingConfiguration,
  Judge,
  JudgingRoom,
  JudgingRoomAccessLink,
  JudgingRoomPresence,
  ProjectChallenge,
} from "@forge/db/schemas/knight-hacks";
import {
  guestJudgeNameSchema,
  judgingGuestSessionIdSchema,
  judgingHackathonIdSchema,
  judgingJudgeIdSchema,
  judgingPresenceHeartbeatSchema,
  judgingRoomCreateSchema,
  judgingRoomIdSchema,
  judgingRoomMoveSchema,
  judgingRoomUpdateSchema,
} from "@forge/validators";

import type { AuditActor } from "../utils/audit/service";
import type { WriteDb } from "../utils/db";
import {
  completeGuestJudge,
  judgingRoomActivationUrl,
} from "../judging-access.server";
import {
  createTRPCRouter,
  judgeProcedure,
  permProcedure,
  publicProcedure,
} from "../trpc";
import {
  captureAdminAuditActor,
  createAdminAuditEvent,
} from "../utils/audit/service";
import { resolveJudgeAccess } from "../utils/judging/principal";
import { assertCanManageProjects } from "../utils/projects/access";

const contextInputSchema = z.object({
  hackathonId: z.string().uuid().optional(),
});

const RECENT_PRESENCE_WINDOW_MS = 15 * 60 * 1000;

async function writeJudgingAudit(
  tx: WriteDb,
  input: {
    actionKey: AuditActionKey;
    actor: AuditActor;
    metadata?: Record<string, boolean | string>;
    roomId: string;
    roomName: string;
  },
) {
  await createAdminAuditEvent(
    {
      actionKey: input.actionKey,
      actor: input.actor,
      metadata: input.metadata,
      subjects: [
        {
          relation: "primary",
          targetId: input.roomId,
          targetLabel: input.roomName,
          targetType: "judging_room",
        },
      ],
    },
    tx,
  );
}

async function selectedHackathon(hackathonId?: string, allowAny = false) {
  if (hackathonId && allowAny) {
    return (
      (await db.query.Hackathon.findFirst({
        columns: { displayName: true, id: true },
        where: eq(Hackathon.id, hackathonId),
      })) ?? null
    );
  }
  const now = new Date();
  const [active] = await db
    .select({ displayName: Hackathon.displayName, id: Hackathon.id })
    .from(Hackathon)
    .where(and(lte(Hackathon.startDate, now), gte(Hackathon.endDate, now)))
    .orderBy(desc(Hackathon.startDate))
    .limit(1);
  return active ?? null;
}

async function listActiveRooms(hackathonId: string) {
  return db
    .select({
      challengeId: JudgingRoom.challengeId,
      challengeLabel: ProjectChallenge.label,
      id: JudgingRoom.id,
      name: JudgingRoom.name,
    })
    .from(JudgingRoom)
    .innerJoin(
      ProjectChallenge,
      eq(ProjectChallenge.id, JudgingRoom.challengeId),
    )
    .where(
      and(
        eq(JudgingRoom.hackathonId, hackathonId),
        isNull(JudgingRoom.archivedAt),
      ),
    )
    .orderBy(asc(JudgingRoom.displayOrder), asc(JudgingRoom.name));
}

async function lockRoomAggregate(
  tx: WriteDb,
  roomId: string,
  options: { active?: boolean } = {},
) {
  const [scope] = await tx
    .select({ hackathonId: JudgingRoom.hackathonId })
    .from(JudgingRoom)
    .where(eq(JudgingRoom.id, roomId))
    .limit(1);
  if (!scope) throw new TRPCError({ code: "NOT_FOUND" });

  const [hackathon] = await tx
    .select({ id: Hackathon.id })
    .from(Hackathon)
    .where(eq(Hackathon.id, scope.hackathonId))
    .for("update")
    .limit(1);
  if (!hackathon) throw new TRPCError({ code: "NOT_FOUND" });

  const [room] = await tx
    .select({
      challengeId: JudgingRoom.challengeId,
      hackathonId: JudgingRoom.hackathonId,
      id: JudgingRoom.id,
      name: JudgingRoom.name,
    })
    .from(JudgingRoom)
    .where(
      and(
        eq(JudgingRoom.id, roomId),
        options.active ? isNull(JudgingRoom.archivedAt) : undefined,
      ),
    )
    .for("update")
    .limit(1);
  if (!room) throw new TRPCError({ code: "NOT_FOUND" });
  return room;
}

async function revokeRoomAccessWithDb(
  tx: WriteDb,
  input: {
    reason: string;
    roomId: string;
    userId: string;
  },
) {
  const now = new Date();
  const links = await tx
    .update(JudgingRoomAccessLink)
    .set({
      revokedAt: now,
      revokedByUserId: input.userId,
      revocationReason: input.reason,
    })
    .where(
      and(
        eq(JudgingRoomAccessLink.roomId, input.roomId),
        isNull(JudgingRoomAccessLink.revokedAt),
      ),
    )
    .returning({ id: JudgingRoomAccessLink.id });
  if (!links.length) return { revoked: false };
  const activeLink = links[0];
  if (!activeLink) return { revoked: false };

  const sessions = await tx
    .update(GuestJudgeSession)
    .set({
      revokedAt: now,
      revokedByUserId: input.userId,
      revocationReason: input.reason,
    })
    .where(
      and(
        eq(GuestJudgeSession.accessLinkId, activeLink.id),
        isNull(GuestJudgeSession.revokedAt),
      ),
    )
    .returning({ judgeId: GuestJudgeSession.judgeId });
  const judgeIds = sessions
    .map((session) => session.judgeId)
    .filter((id): id is string => id !== null);
  for (const judgeId of judgeIds) {
    await tx
      .update(JudgingRoomPresence)
      .set({ leftAt: now, leaveReason: input.reason })
      .where(
        and(
          eq(JudgingRoomPresence.judgeId, judgeId),
          isNull(JudgingRoomPresence.leftAt),
        ),
      );
  }
  return { revoked: true };
}

async function joinMemberRoom(input: {
  displayName: string;
  roomId: string;
  userId: string;
}) {
  return db.transaction(async (tx) => {
    const [room] = await tx
      .select({
        challengeId: JudgingRoom.challengeId,
        hackathonId: JudgingRoom.hackathonId,
        roomId: JudgingRoom.id,
      })
      .from(JudgingRoom)
      .where(
        and(eq(JudgingRoom.id, input.roomId), isNull(JudgingRoom.archivedAt)),
      )
      .for("update")
      .limit(1);
    if (!room) throw new TRPCError({ code: "NOT_FOUND" });

    let [judge] = await tx
      .select({ id: Judge.id })
      .from(Judge)
      .where(
        and(
          eq(Judge.hackathonId, room.hackathonId),
          eq(Judge.userId, input.userId),
        ),
      )
      .limit(1);
    if (!judge) {
      [judge] = await tx
        .insert(Judge)
        .values({
          displayName: input.displayName,
          hackathonId: room.hackathonId,
          kind: "member",
          userId: input.userId,
        })
        .returning({ id: Judge.id });
    } else {
      await tx
        .update(Judge)
        .set({ displayName: input.displayName })
        .where(eq(Judge.id, judge.id));
    }
    if (!judge) throw new Error("Member judge was not created.");
    const now = new Date();
    await tx
      .update(JudgingRoomPresence)
      .set({ leftAt: now, leaveReason: "switched-room" })
      .where(
        and(
          eq(JudgingRoomPresence.judgeId, judge.id),
          isNull(JudgingRoomPresence.leftAt),
        ),
      );
    await tx.insert(JudgingRoomPresence).values({
      hackathonId: room.hackathonId,
      judgeId: judge.id,
      roomId: room.roomId,
    });
    return room;
  });
}

export const judgingRouter = createTRPCRouter({
  getContext: publicProcedure
    .input(contextInputSchema)
    .query(async ({ ctx, input }) => {
      const access = await resolveJudgeAccess(ctx);
      if (access.kind === "none") return { kind: "none" as const };
      if (access.kind === "incomplete-guest") {
        const [room] = await db
          .select({
            hackathonName: Hackathon.displayName,
            roomName: JudgingRoom.name,
          })
          .from(JudgingRoom)
          .innerJoin(Hackathon, eq(Hackathon.id, JudgingRoom.hackathonId))
          .where(eq(JudgingRoom.id, access.roomId))
          .limit(1);
        return { ...access, ...room };
      }
      if (access.kind === "guest") {
        const [room] = await db
          .select({
            challengeLabel: ProjectChallenge.label,
            hackathonName: Hackathon.displayName,
            roomName: JudgingRoom.name,
          })
          .from(JudgingRoom)
          .innerJoin(Hackathon, eq(Hackathon.id, JudgingRoom.hackathonId))
          .innerJoin(
            ProjectChallenge,
            eq(ProjectChallenge.id, JudgingRoom.challengeId),
          )
          .where(eq(JudgingRoom.id, access.roomId))
          .limit(1);
        return { ...access, ...room };
      }

      const hackathon = await selectedHackathon(
        input.hackathonId,
        access.isOfficer,
      );
      if (!hackathon) {
        return {
          ...access,
          activeRoomId: null,
          hackathon: null,
          rooms: [],
        };
      }
      const rooms = await listActiveRooms(hackathon.id);
      const [presence] = await db
        .select({ roomId: JudgingRoomPresence.roomId })
        .from(Judge)
        .innerJoin(
          JudgingRoomPresence,
          eq(JudgingRoomPresence.judgeId, Judge.id),
        )
        .where(
          and(
            eq(Judge.hackathonId, hackathon.id),
            eq(Judge.userId, access.userId),
            isNull(JudgingRoomPresence.leftAt),
          ),
        )
        .limit(1);
      return {
        ...access,
        activeRoomId: presence?.roomId ?? null,
        hackathon,
        rooms,
      };
    }),

  completeGuest: publicProcedure
    .input(guestJudgeNameSchema)
    .mutation(({ ctx, input }) =>
      completeGuestJudge({
        displayName: input.displayName,
        headers: ctx.headers,
      }),
    ),

  endGuest: judgeProcedure.mutation(async ({ ctx }) => {
    if (ctx.judgePrincipal.kind !== "guest") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const guestSessionId = ctx.judgePrincipal.guestSessionId;
    return db.transaction(async (tx) => {
      const now = new Date();
      const [session] = await tx
        .update(GuestJudgeSession)
        .set({
          revokedAt: now,
          revocationReason: "guest-ended",
        })
        .where(
          and(
            eq(GuestJudgeSession.id, guestSessionId),
            isNull(GuestJudgeSession.revokedAt),
          ),
        )
        .returning({ judgeId: GuestJudgeSession.judgeId });
      if (!session) return { ended: false };
      if (session.judgeId) {
        await tx
          .update(JudgingRoomPresence)
          .set({ leftAt: now, leaveReason: "guest-ended" })
          .where(
            and(
              eq(JudgingRoomPresence.judgeId, session.judgeId),
              isNull(JudgingRoomPresence.leftAt),
            ),
          );
      }
      return { ended: true };
    });
  }),

  joinRoom: judgeProcedure
    .input(judgingRoomIdSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.judgePrincipal.kind !== "member") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return joinMemberRoom({
        displayName: ctx.judgePrincipal.displayName,
        roomId: input.roomId,
        userId: ctx.judgePrincipal.userId,
      });
    }),

  leaveRoom: judgeProcedure
    .input(judgingRoomIdSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.judgePrincipal.kind !== "member") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const now = new Date();
      const ended = await db
        .update(JudgingRoomPresence)
        .set({ leftAt: now, leaveReason: "left-room" })
        .where(
          and(
            eq(JudgingRoomPresence.roomId, input.roomId),
            isNull(JudgingRoomPresence.leftAt),
            sql`${JudgingRoomPresence.judgeId} IN (
            SELECT ${Judge.id} FROM ${Judge}
            WHERE ${Judge.userId} = ${ctx.judgePrincipal.userId}
          )`,
          ),
        )
        .returning({ id: JudgingRoomPresence.id });
      return { left: ended.length > 0 };
    }),

  heartbeat: judgeProcedure
    .input(judgingPresenceHeartbeatSchema)
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const judgeId =
        ctx.judgePrincipal.kind === "guest"
          ? ctx.judgePrincipal.judgeId
          : (
              await db
                .select({ id: Judge.id })
                .from(Judge)
                .innerJoin(
                  JudgingRoomPresence,
                  eq(JudgingRoomPresence.judgeId, Judge.id),
                )
                .where(
                  and(
                    eq(Judge.userId, ctx.judgePrincipal.userId),
                    eq(JudgingRoomPresence.roomId, input.roomId),
                    isNull(JudgingRoomPresence.leftAt),
                  ),
                )
                .limit(1)
            )[0]?.id;
      if (!judgeId) throw new TRPCError({ code: "NOT_FOUND" });
      const updated = await db
        .update(JudgingRoomPresence)
        .set({ lastSeenAt: now })
        .where(
          and(
            eq(JudgingRoomPresence.judgeId, judgeId),
            eq(JudgingRoomPresence.roomId, input.roomId),
            isNull(JudgingRoomPresence.leftAt),
          ),
        )
        .returning({ id: JudgingRoomPresence.id });
      if (ctx.judgePrincipal.kind === "guest") {
        await db
          .update(GuestJudgeSession)
          .set({ lastSeenAt: now })
          .where(eq(GuestJudgeSession.id, ctx.judgePrincipal.guestSessionId));
      }
      return { updated: updated.length > 0 };
    }),

  listAdmin: permProcedure
    .input(judgingHackathonIdSchema)
    .query(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const [hackathon] = await db
        .select({
          displayName: Hackathon.displayName,
          id: Hackathon.id,
          timezone: Hackathon.timezone,
        })
        .from(Hackathon)
        .where(eq(Hackathon.id, input.hackathonId))
        .limit(1);
      if (!hackathon) throw new TRPCError({ code: "NOT_FOUND" });
      const now = new Date();
      const recentPresenceCutoff = new Date(
        now.getTime() - RECENT_PRESENCE_WINDOW_MS,
      );
      const rooms = await db
        .select({
          archivedAt: JudgingRoom.archivedAt,
          challengeId: JudgingRoom.challengeId,
          challengeLabel: ProjectChallenge.label,
          id: JudgingRoom.id,
          name: JudgingRoom.name,
        })
        .from(JudgingRoom)
        .innerJoin(
          ProjectChallenge,
          eq(ProjectChallenge.id, JudgingRoom.challengeId),
        )
        .where(eq(JudgingRoom.hackathonId, input.hackathonId))
        .orderBy(asc(JudgingRoom.displayOrder), asc(JudgingRoom.name));
      const challenges = await db
        .select({ id: ProjectChallenge.id, label: ProjectChallenge.label })
        .from(ProjectChallenge)
        .where(eq(ProjectChallenge.hackathonId, input.hackathonId))
        .orderBy(
          sql`CASE WHEN ${ProjectChallenge.label} = 'General' THEN 0 ELSE 1 END`,
          asc(ProjectChallenge.label),
        );
      const links = await db
        .select({
          id: JudgingRoomAccessLink.id,
          roomId: JudgingRoomAccessLink.roomId,
        })
        .from(JudgingRoomAccessLink)
        .where(
          and(
            eq(JudgingRoomAccessLink.hackathonId, input.hackathonId),
            isNull(JudgingRoomAccessLink.revokedAt),
          ),
        );
      const roster = await db
        .select({
          displayName: Judge.displayName,
          guestSessionId: GuestJudgeSession.id,
          judgeId: Judge.id,
          joinedAt: JudgingRoomPresence.joinedAt,
          kind: Judge.kind,
          lastSeenAt: JudgingRoomPresence.lastSeenAt,
          roomId: JudgingRoomPresence.roomId,
        })
        .from(JudgingRoomPresence)
        .innerJoin(Judge, eq(Judge.id, JudgingRoomPresence.judgeId))
        .leftJoin(
          GuestJudgeSession,
          and(
            eq(GuestJudgeSession.judgeId, Judge.id),
            isNull(GuestJudgeSession.revokedAt),
          ),
        )
        .where(
          and(
            eq(JudgingRoomPresence.hackathonId, input.hackathonId),
            isNull(JudgingRoomPresence.leftAt),
            gte(JudgingRoomPresence.lastSeenAt, recentPresenceCutoff),
            or(eq(Judge.kind, "member"), gte(GuestJudgeSession.expiresAt, now)),
          ),
        )
        .orderBy(asc(Judge.displayName));
      const lock = await db.query.HackathonJudgingConfiguration.findFirst({
        columns: { projectInventoryLockedAt: true },
        where: eq(HackathonJudgingConfiguration.hackathonId, input.hackathonId),
      });
      return {
        hackathon,
        challenges,
        inventoryLockedAt: lock?.projectInventoryLockedAt ?? null,
        rooms: rooms.map((room) => ({
          ...room,
          activeLinkId:
            links.find((link) => link.roomId === room.id)?.id ?? null,
          judges: roster.filter((judge) => judge.roomId === room.id),
        })),
      };
    }),

  createRoom: permProcedure
    .input(judgingRoomCreateSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      return db.transaction(async (tx) => {
        const [hackathon] = await tx
          .select({ id: Hackathon.id })
          .from(Hackathon)
          .where(eq(Hackathon.id, input.hackathonId))
          .for("update")
          .limit(1);
        if (!hackathon) throw new TRPCError({ code: "NOT_FOUND" });
        const [challenge] = await tx
          .select({ id: ProjectChallenge.id })
          .from(ProjectChallenge)
          .where(
            and(
              eq(ProjectChallenge.id, input.challengeId),
              eq(ProjectChallenge.hackathonId, input.hackathonId),
            ),
          )
          .limit(1);
        if (!challenge) throw new TRPCError({ code: "BAD_REQUEST" });
        const [order] = await tx
          .select({ value: max(JudgingRoom.displayOrder) })
          .from(JudgingRoom)
          .where(eq(JudgingRoom.hackathonId, input.hackathonId));
        const [room] = await tx
          .insert(JudgingRoom)
          .values({
            challengeId: input.challengeId,
            displayOrder: (order?.value ?? -1) + 1,
            hackathonId: input.hackathonId,
            name: input.name,
          })
          .returning();
        if (!room) throw new Error("Judging room was not created.");
        await writeJudgingAudit(tx, {
          actionKey: "judging.room.created",
          actor,
          metadata: { challengeId: input.challengeId },
          roomId: room.id,
          roomName: room.name,
        });
        return room;
      });
    }),

  updateRoom: permProcedure
    .input(judgingRoomUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      return db.transaction(async (tx) => {
        const current = await lockRoomAggregate(tx, input.roomId, {
          active: true,
        });
        const [challenge] = await tx
          .select({ id: ProjectChallenge.id })
          .from(ProjectChallenge)
          .where(
            and(
              eq(ProjectChallenge.id, input.challengeId),
              eq(ProjectChallenge.hackathonId, current.hackathonId),
            ),
          )
          .limit(1);
        if (!challenge) throw new TRPCError({ code: "BAD_REQUEST" });
        let guestAccessRevoked = false;
        if (current.challengeId !== input.challengeId) {
          const activeLink = await tx.query.JudgingRoomAccessLink.findFirst({
            columns: { id: true },
            where: and(
              eq(JudgingRoomAccessLink.roomId, input.roomId),
              isNull(JudgingRoomAccessLink.revokedAt),
            ),
          });
          if (activeLink && input.confirmation !== current.name) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: `Type ${current.name} to revoke active guest access.`,
            });
          }
          if (activeLink) {
            await revokeRoomAccessWithDb(tx, {
              reason: "room-challenge-changed",
              roomId: input.roomId,
              userId: ctx.session.user.id,
            });
            guestAccessRevoked = true;
          }
        }
        const [room] = await tx
          .update(JudgingRoom)
          .set({ challengeId: input.challengeId, name: input.name })
          .where(eq(JudgingRoom.id, input.roomId))
          .returning();
        if (!room) throw new Error("Judging room was not updated.");
        await writeJudgingAudit(tx, {
          actionKey: "judging.room.updated",
          actor,
          metadata: {
            challengeId: input.challengeId,
            guestAccessRevoked,
          },
          roomId: room.id,
          roomName: room.name,
        });
        return room;
      });
    }),

  moveRoom: permProcedure
    .input(judgingRoomMoveSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      return db.transaction(async (tx) => {
        const current = await lockRoomAggregate(tx, input.roomId, {
          active: true,
        });
        const rooms = await tx
          .select({
            displayOrder: JudgingRoom.displayOrder,
            id: JudgingRoom.id,
          })
          .from(JudgingRoom)
          .where(
            and(
              eq(JudgingRoom.hackathonId, current.hackathonId),
              isNull(JudgingRoom.archivedAt),
            ),
          )
          .orderBy(asc(JudgingRoom.displayOrder), asc(JudgingRoom.name))
          .for("update");
        const currentIndex = rooms.findIndex((room) => room.id === current.id);
        const targetIndex =
          input.direction === "up" ? currentIndex - 1 : currentIndex + 1;
        const source = rooms[currentIndex];
        const target = rooms[targetIndex];
        if (!source || !target) return { moved: false };
        await tx
          .update(JudgingRoom)
          .set({ displayOrder: target.displayOrder })
          .where(eq(JudgingRoom.id, source.id));
        await tx
          .update(JudgingRoom)
          .set({ displayOrder: source.displayOrder })
          .where(eq(JudgingRoom.id, target.id));
        await writeJudgingAudit(tx, {
          actionKey: "judging.room.updated",
          actor,
          metadata: { displayOrder: input.direction },
          roomId: current.id,
          roomName: current.name,
        });
        return { moved: true };
      });
    }),

  archiveRoom: permProcedure
    .input(judgingRoomIdSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      return db.transaction(async (tx) => {
        const current = await lockRoomAggregate(tx, input.roomId, {
          active: true,
        });
        await revokeRoomAccessWithDb(tx, {
          reason: "room-archived",
          roomId: input.roomId,
          userId: ctx.session.user.id,
        });
        const now = new Date();
        await tx
          .update(JudgingRoomPresence)
          .set({ leftAt: now, leaveReason: "room-archived" })
          .where(
            and(
              eq(JudgingRoomPresence.roomId, input.roomId),
              isNull(JudgingRoomPresence.leftAt),
            ),
          );
        const [room] = await tx
          .update(JudgingRoom)
          .set({ archivedAt: now, archivedByUserId: ctx.session.user.id })
          .where(eq(JudgingRoom.id, input.roomId))
          .returning({ id: JudgingRoom.id, name: JudgingRoom.name });
        if (!room) throw new TRPCError({ code: "NOT_FOUND" });
        await writeJudgingAudit(tx, {
          actionKey: "judging.room.archived",
          actor,
          roomId: room.id,
          roomName: current.name,
        });
        return room;
      });
    }),

  generateRoomLink: permProcedure
    .input(judgingRoomIdSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      const link = await db.transaction(async (tx) => {
        const room = await lockRoomAggregate(tx, input.roomId, {
          active: true,
        });
        const existing = await tx.query.JudgingRoomAccessLink.findFirst({
          columns: { id: true },
          where: and(
            eq(JudgingRoomAccessLink.roomId, input.roomId),
            isNull(JudgingRoomAccessLink.revokedAt),
          ),
        });
        if (existing) {
          await writeJudgingAudit(tx, {
            actionKey: "judging.room_link.viewed",
            actor,
            roomId: input.roomId,
            roomName: room.name,
          });
          return existing;
        }
        const [created] = await tx
          .insert(JudgingRoomAccessLink)
          .values({
            createdByUserId: ctx.session.user.id,
            hackathonId: room.hackathonId,
            roomId: input.roomId,
          })
          .returning({ id: JudgingRoomAccessLink.id });
        if (!created) throw new Error("Room access link was not created.");
        const config = await tx.query.HackathonJudgingConfiguration.findFirst({
          where: eq(
            HackathonJudgingConfiguration.hackathonId,
            room.hackathonId,
          ),
        });
        if (!config) {
          await tx.insert(HackathonJudgingConfiguration).values({
            hackathonId: room.hackathonId,
            projectInventoryLockedAt: new Date(),
            projectInventoryLockedByUserId: ctx.session.user.id,
          });
        } else if (!config.projectInventoryLockedAt) {
          await tx
            .update(HackathonJudgingConfiguration)
            .set({
              projectInventoryLockedAt: new Date(),
              projectInventoryLockedByUserId: ctx.session.user.id,
            })
            .where(
              eq(HackathonJudgingConfiguration.hackathonId, room.hackathonId),
            );
        }
        await writeJudgingAudit(tx, {
          actionKey: "judging.room_link.generated",
          actor,
          roomId: input.roomId,
          roomName: room.name,
        });
        return created;
      });
      const url = judgingRoomActivationUrl(link.id);
      return {
        id: link.id,
        qrCodeUrl: await QRCode.toDataURL(url, {
          errorCorrectionLevel: "M",
          margin: 1,
          type: "image/png",
          width: 512,
        }),
        url,
      };
    }),

  revokeRoomLink: permProcedure
    .input(judgingRoomIdSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      return db.transaction(async (tx) => {
        const room = await lockRoomAggregate(tx, input.roomId);
        const result = await revokeRoomAccessWithDb(tx, {
          reason: "officer-revoked",
          roomId: input.roomId,
          userId: ctx.session.user.id,
        });
        if (result.revoked) {
          await writeJudgingAudit(tx, {
            actionKey: "judging.room_link.revoked",
            actor,
            roomId: input.roomId,
            roomName: room.name,
          });
        }
        return result;
      });
    }),

  rotateRoomLink: permProcedure
    .input(judgingRoomIdSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      const link = await db.transaction(async (tx) => {
        const room = await lockRoomAggregate(tx, input.roomId, {
          active: true,
        });
        await revokeRoomAccessWithDb(tx, {
          reason: "officer-rotated",
          roomId: input.roomId,
          userId: ctx.session.user.id,
        });
        const [created] = await tx
          .insert(JudgingRoomAccessLink)
          .values({
            createdByUserId: ctx.session.user.id,
            hackathonId: room.hackathonId,
            roomId: input.roomId,
          })
          .returning({ id: JudgingRoomAccessLink.id });
        if (!created) throw new Error("Room access link was not created.");
        await writeJudgingAudit(tx, {
          actionKey: "judging.room_link.rotated",
          actor,
          roomId: input.roomId,
          roomName: room.name,
        });
        return created;
      });
      const url = judgingRoomActivationUrl(link.id);
      return {
        id: link.id,
        qrCodeUrl: await QRCode.toDataURL(url, { margin: 1, width: 512 }),
        url,
      };
    }),

  revokeGuest: permProcedure
    .input(judgingGuestSessionIdSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      return db.transaction(async (tx) => {
        const [target] = await tx
          .select({ id: JudgingRoom.id, name: JudgingRoom.name })
          .from(GuestJudgeSession)
          .innerJoin(
            JudgingRoomAccessLink,
            eq(JudgingRoomAccessLink.id, GuestJudgeSession.accessLinkId),
          )
          .innerJoin(
            JudgingRoom,
            eq(JudgingRoom.id, JudgingRoomAccessLink.roomId),
          )
          .where(
            and(
              eq(GuestJudgeSession.id, input.guestSessionId),
              isNull(GuestJudgeSession.revokedAt),
            ),
          )
          .limit(1);
        if (!target) throw new TRPCError({ code: "NOT_FOUND" });
        const now = new Date();
        const [session] = await tx
          .update(GuestJudgeSession)
          .set({
            revokedAt: now,
            revokedByUserId: ctx.session.user.id,
            revocationReason: "officer-revoked",
          })
          .where(eq(GuestJudgeSession.id, input.guestSessionId))
          .returning({ judgeId: GuestJudgeSession.judgeId });
        if (session?.judgeId) {
          await tx
            .update(JudgingRoomPresence)
            .set({ leftAt: now, leaveReason: "guest-session-revoked" })
            .where(
              and(
                eq(JudgingRoomPresence.judgeId, session.judgeId),
                isNull(JudgingRoomPresence.leftAt),
              ),
            );
        }
        await writeJudgingAudit(tx, {
          actionKey: "judging.guest.revoked",
          actor,
          roomId: target.id,
          roomName: target.name,
        });
        return { revoked: true };
      });
    }),

  removeJudgeFromRoom: permProcedure
    .input(judgingJudgeIdSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      return db.transaction(async (tx) => {
        const [target] = await tx
          .select({
            presenceId: JudgingRoomPresence.id,
            roomId: JudgingRoom.id,
            roomName: JudgingRoom.name,
          })
          .from(JudgingRoomPresence)
          .innerJoin(
            JudgingRoom,
            eq(JudgingRoom.id, JudgingRoomPresence.roomId),
          )
          .where(
            and(
              eq(JudgingRoomPresence.judgeId, input.judgeId),
              isNull(JudgingRoomPresence.leftAt),
            ),
          )
          .for("update")
          .limit(1);
        if (!target) throw new TRPCError({ code: "NOT_FOUND" });
        await tx
          .update(JudgingRoomPresence)
          .set({ leftAt: new Date(), leaveReason: "officer-removed" })
          .where(eq(JudgingRoomPresence.id, target.presenceId));
        await writeJudgingAudit(tx, {
          actionKey: "judging.presence.removed",
          actor,
          roomId: target.roomId,
          roomName: target.roomName,
        });
        return { removed: true };
      });
    }),
});
