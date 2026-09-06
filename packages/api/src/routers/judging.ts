import { TRPCError } from "@trpc/server";
import QRCode from "qrcode";
import { z } from "zod";

import type { AuditActionKey } from "@forge/validators";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  max,
  or,
  sql,
} from "@forge/db";
import { db } from "@forge/db/client";
import {
  GuestJudgeSession,
  Hackathon,
  HackathonJudgingConfiguration,
  Judge,
  JudgingAnnouncement,
  JudgingRoom,
  JudgingRoomAccessLink,
  JudgingRoomPresence,
  JudgingRubricItem,
  ProjectChallenge,
} from "@forge/db/schemas/knight-hacks";
import {
  guestJudgeNameSchema,
  judgingAnnouncementClearSchema,
  judgingAnnouncementPublishSchema,
  judgingCommsChannelSchema,
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
import type {
  GuestJudgePrincipal,
  MemberJudgePrincipal,
} from "../utils/judging/principal";
import {
  completeGuestJudge,
  judgingRoomActivationUrl,
  upsertMemberJudge,
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
import {
  deliverCurrentJudgingAnnouncement,
  deliverJudgingRoomNotice,
  ensureJudgingRoomThread,
  judgingDiscordGuildId,
  listJudgingDiscordChannels,
  provisionJudgingRoomThreads,
  validateJudgingDiscordChannel,
} from "../utils/judging/discord-comms";
import { resolveJudgeAccess } from "../utils/judging/principal";
import {
  resolveCurrentJudgeDisplayNames,
  resolveMemberDisplayNamesByUserId,
} from "../utils/member/display-name";
import { assertCanManageProjects } from "../utils/projects/access";
import { judgingScoresRouter } from "./judging-scores";

const contextInputSchema = z.object({
  hackathonId: z.string().uuid().optional(),
});

const RECENT_PRESENCE_WINDOW_MS = 15 * 60 * 1000;
const ACTIVE_ROOM_NAME_CONSTRAINT =
  "knight_hacks_judging_room_active_name_unique";

async function actorDisplayName(user: { id: string; name?: string | null }) {
  const memberNames = await resolveMemberDisplayNamesByUserId([user.id]);
  const memberName = memberNames.get(user.id)?.trim();
  if (memberName?.length) return memberName;
  const name = user.name?.trim();
  return name?.length ? name : "An officer";
}

async function renderRoomQr(linkId: string) {
  const url = judgingRoomActivationUrl(linkId);
  return {
    id: linkId,
    qrCodeUrl: await QRCode.toDataURL(url, {
      errorCorrectionLevel: "M",
      margin: 1,
      type: "image/png",
      width: 512,
    }),
    url,
  };
}

function throwRoomNameConflict(error: unknown, roomName: string): never {
  let current = error;
  const visited = new Set<unknown>();
  for (let depth = 0; depth < 6; depth += 1) {
    if (typeof current !== "object" || current === null) break;
    if (visited.has(current)) break;
    visited.add(current);
    const databaseError = current as { code?: unknown; constraint?: unknown };
    if (
      databaseError.code === "23505" &&
      databaseError.constraint === ACTIVE_ROOM_NAME_CONSTRAINT
    ) {
      throw new TRPCError({
        cause: error,
        code: "CONFLICT",
        message: `An active judging room already uses the name "${roomName}".`,
      });
    }
    current = "cause" in current ? current.cause : undefined;
  }
  throw error;
}

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

async function listVisibleAnnouncements(input: {
  hackathonId: string;
  isGuest: boolean;
  roomId: string | null;
}) {
  const rows = await db
    .select({
      id: JudgingAnnouncement.id,
      includeGuests: JudgingAnnouncement.includeGuests,
      isUrgent: JudgingAnnouncement.isUrgent,
      message: JudgingAnnouncement.message,
      publishedAt: JudgingAnnouncement.publishedAt,
      roomId: JudgingAnnouncement.roomId,
      roomName: JudgingRoom.name,
    })
    .from(JudgingAnnouncement)
    .leftJoin(JudgingRoom, eq(JudgingRoom.id, JudgingAnnouncement.roomId))
    .where(
      and(
        eq(JudgingAnnouncement.hackathonId, input.hackathonId),
        isNull(JudgingAnnouncement.clearedAt),
        input.isGuest ? eq(JudgingAnnouncement.includeGuests, true) : undefined,
        input.roomId
          ? or(
              isNull(JudgingAnnouncement.roomId),
              eq(JudgingAnnouncement.roomId, input.roomId),
            )
          : isNull(JudgingAnnouncement.roomId),
      ),
    );
  return rows.sort((left, right) => {
    if (left.roomId === null && right.roomId !== null) return -1;
    if (left.roomId !== null && right.roomId === null) return 1;
    return left.publishedAt.getTime() - right.publishedAt.getTime();
  });
}

async function announcementsForPrincipal(
  principal: GuestJudgePrincipal | MemberJudgePrincipal,
  requestedHackathonId?: string,
) {
  if (principal.kind === "guest") {
    return listVisibleAnnouncements({
      hackathonId: principal.hackathonId,
      isGuest: true,
      roomId: principal.roomId,
    });
  }
  const hackathon = await selectedHackathon(
    requestedHackathonId,
    principal.isOfficer,
  );
  if (!hackathon) return [];
  const [presence] = await db
    .select({ roomId: JudgingRoomPresence.roomId })
    .from(Judge)
    .innerJoin(JudgingRoomPresence, eq(JudgingRoomPresence.judgeId, Judge.id))
    .where(
      and(
        eq(Judge.hackathonId, hackathon.id),
        eq(Judge.userId, principal.userId),
        isNull(JudgingRoomPresence.leftAt),
      ),
    )
    .limit(1);
  return listVisibleAnnouncements({
    hackathonId: hackathon.id,
    isGuest: false,
    roomId: presence?.roomId ?? null,
  });
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
  if (!links.length) return { guestNames: [], revoked: false };
  const activeLink = links[0];
  if (!activeLink) return { guestNames: [], revoked: false };

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
  const guestNames = judgeIds.length
    ? (
        await tx
          .select({ displayName: Judge.displayName })
          .from(Judge)
          .where(inArray(Judge.id, judgeIds))
      ).map((judge) => judge.displayName)
    : [];
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
  return { guestNames, revoked: true };
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

    const judge = await upsertMemberJudge(tx, {
      displayName: input.displayName,
      hackathonId: room.hackathonId,
      userId: input.userId,
    });
    const now = new Date();
    const [currentPresence] = await tx
      .select({
        id: JudgingRoomPresence.id,
        roomId: JudgingRoomPresence.roomId,
      })
      .from(JudgingRoomPresence)
      .where(
        and(
          eq(JudgingRoomPresence.judgeId, judge.id),
          isNull(JudgingRoomPresence.leftAt),
        ),
      )
      .limit(1);
    if (currentPresence?.roomId === room.roomId) {
      await tx
        .update(JudgingRoomPresence)
        .set({ lastSeenAt: now })
        .where(eq(JudgingRoomPresence.id, currentPresence.id));
      return { ...room, newlyJoined: false };
    }
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
    return { ...room, newlyJoined: true };
  });
}

export const judgingRouter = createTRPCRouter({
  ...judgingScoresRouter,
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
        const [[room], announcements] = await Promise.all([
          db
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
            .limit(1),
          announcementsForPrincipal(access),
        ]);
        return { ...access, ...room, announcements };
      }

      const hackathon = await selectedHackathon(
        input.hackathonId,
        access.isOfficer,
      );
      if (!hackathon) {
        return {
          ...access,
          activeRoomId: null,
          announcements: [],
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
        announcements: await listVisibleAnnouncements({
          hackathonId: hackathon.id,
          isGuest: false,
          roomId: presence?.roomId ?? null,
        }),
        hackathon,
        rooms,
      };
    }),

  listAnnouncements: judgeProcedure
    .input(contextInputSchema)
    .query(({ ctx, input }) =>
      announcementsForPrincipal(ctx.judgePrincipal, input.hackathonId),
    ),

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
      const room = await joinMemberRoom({
        displayName: ctx.judgePrincipal.displayName,
        roomId: input.roomId,
        userId: ctx.judgePrincipal.userId,
      });
      const discordDelivery = room.newlyJoined
        ? await deliverJudgingRoomNotice(room.roomId, {
            discordUserId: ctx.judgePrincipal.discordUserId,
            kind: "member_joined",
            memberName: ctx.judgePrincipal.displayName,
          })
        : ("not_configured" as const);
      return { ...room, discordDelivery };
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

  listDiscordChannels: permProcedure.query(async ({ ctx }) => {
    assertCanManageProjects(ctx);
    return listJudgingDiscordChannels();
  }),

  setCommsChannel: permProcedure
    .input(judgingCommsChannelSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      if (
        input.channelId &&
        !(await validateJudgingDiscordChannel(input.channelId))
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Choose a text channel from the configured Knight Hacks server.",
        });
      }
      const actor = await captureAdminAuditActor(ctx.session.user);
      const changed = await db.transaction(async (tx) => {
        const [hackathon] = await tx
          .select({
            displayName: Hackathon.displayName,
            id: Hackathon.id,
          })
          .from(Hackathon)
          .where(eq(Hackathon.id, input.hackathonId))
          .for("update")
          .limit(1);
        if (!hackathon) throw new TRPCError({ code: "NOT_FOUND" });
        const current = await tx.query.HackathonJudgingConfiguration.findFirst({
          columns: { judgingCommsChannelId: true },
          where: eq(
            HackathonJudgingConfiguration.hackathonId,
            input.hackathonId,
          ),
        });
        const channelChanged =
          (current?.judgingCommsChannelId ?? null) !== input.channelId;
        await tx
          .insert(HackathonJudgingConfiguration)
          .values({
            hackathonId: input.hackathonId,
            judgingCommsChannelId: input.channelId,
          })
          .onConflictDoUpdate({
            set: { judgingCommsChannelId: input.channelId },
            target: HackathonJudgingConfiguration.hackathonId,
          });
        if (channelChanged) {
          await tx
            .update(JudgingRoom)
            .set({ discordThreadId: null })
            .where(
              and(
                eq(JudgingRoom.hackathonId, input.hackathonId),
                isNull(JudgingRoom.archivedAt),
              ),
            );
        }
        await createAdminAuditEvent(
          {
            actionKey: "judging.comms.updated",
            actor,
            metadata: { channelId: input.channelId ?? "disconnected" },
            subjects: [
              {
                relation: "primary",
                targetId: hackathon.id,
                targetLabel: hackathon.displayName,
                targetType: "hackathon",
              },
            ],
          },
          tx,
        );
        return channelChanged;
      });
      if (!input.channelId) {
        return {
          channelChanged: changed,
          failedRooms: [],
          provisionedCount: 0,
        };
      }
      return {
        channelChanged: changed,
        ...(await provisionJudgingRoomThreads(input.hackathonId)),
      };
    }),

  provisionRoomThreads: permProcedure
    .input(judgingHackathonIdSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      const [hackathon] = await db
        .select({ displayName: Hackathon.displayName, id: Hackathon.id })
        .from(Hackathon)
        .where(eq(Hackathon.id, input.hackathonId))
        .limit(1);
      if (!hackathon) throw new TRPCError({ code: "NOT_FOUND" });
      const result = await provisionJudgingRoomThreads(input.hackathonId);
      await createAdminAuditEvent({
        actionKey: "judging.comms.threads_provisioned",
        actor,
        metadata: {
          failedRoomCount: result.failedRooms.length,
          provisionedCount: result.provisionedCount,
        },
        subjects: [
          {
            relation: "primary",
            targetId: hackathon.id,
            targetLabel: hackathon.displayName,
            targetType: "hackathon",
          },
        ],
      });
      return result;
    }),

  publishAnnouncement: permProcedure
    .input(judgingAnnouncementPublishSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      const announcement = await db.transaction(async (tx) => {
        const [hackathon] = await tx
          .select({ displayName: Hackathon.displayName, id: Hackathon.id })
          .from(Hackathon)
          .where(eq(Hackathon.id, input.hackathonId))
          .for("update")
          .limit(1);
        if (!hackathon) throw new TRPCError({ code: "NOT_FOUND" });

        let roomName: string | null = null;
        if (input.roomId) {
          const [room] = await tx
            .select({ name: JudgingRoom.name })
            .from(JudgingRoom)
            .where(
              and(
                eq(JudgingRoom.id, input.roomId),
                eq(JudgingRoom.hackathonId, input.hackathonId),
                isNull(JudgingRoom.archivedAt),
              ),
            )
            .limit(1);
          if (!room) throw new TRPCError({ code: "NOT_FOUND" });
          roomName = room.name;
        }

        const now = new Date();
        await tx
          .update(JudgingAnnouncement)
          .set({
            clearedAt: now,
            clearedByUserId: ctx.session.user.id,
          })
          .where(
            and(
              eq(JudgingAnnouncement.hackathonId, input.hackathonId),
              input.roomId
                ? eq(JudgingAnnouncement.roomId, input.roomId)
                : isNull(JudgingAnnouncement.roomId),
              isNull(JudgingAnnouncement.clearedAt),
            ),
          );
        const [created] = await tx
          .insert(JudgingAnnouncement)
          .values({
            hackathonId: input.hackathonId,
            includeGuests: input.includeGuests,
            isUrgent: input.isUrgent,
            message: input.message,
            publishedByUserId: ctx.session.user.id,
            roomId: input.roomId,
          })
          .returning();
        if (!created) throw new Error("Announcement was not published.");
        await createAdminAuditEvent(
          {
            actionKey: "judging.announcement.published",
            actor,
            metadata: {
              includeGuests: input.includeGuests,
              isUrgent: input.isUrgent,
              scope: input.roomId ? "room" : "global",
            },
            subjects: [
              {
                relation: "primary",
                targetId: input.roomId ?? hackathon.id,
                targetLabel: roomName ?? hackathon.displayName,
                targetType: input.roomId ? "judging_room" : "hackathon",
              },
            ],
          },
          tx,
        );
        return created;
      });
      const discordDelivery = await deliverCurrentJudgingAnnouncement({
        announcementId: announcement.id,
        hackathonId: announcement.hackathonId,
        isUrgent: announcement.isUrgent,
        message: announcement.message,
        roomId: announcement.roomId,
      });
      return { ...announcement, discordDelivery };
    }),

  clearAnnouncement: permProcedure
    .input(judgingAnnouncementClearSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      return db.transaction(async (tx) => {
        const [current] = await tx
          .select({
            hackathonId: JudgingAnnouncement.hackathonId,
            hackathonName: Hackathon.displayName,
            roomId: JudgingAnnouncement.roomId,
            roomName: JudgingRoom.name,
          })
          .from(JudgingAnnouncement)
          .innerJoin(
            Hackathon,
            eq(Hackathon.id, JudgingAnnouncement.hackathonId),
          )
          .leftJoin(JudgingRoom, eq(JudgingRoom.id, JudgingAnnouncement.roomId))
          .where(
            and(
              eq(JudgingAnnouncement.id, input.announcementId),
              isNull(JudgingAnnouncement.clearedAt),
            ),
          )
          .limit(1);
        if (!current) throw new TRPCError({ code: "NOT_FOUND" });
        await tx
          .select({ id: Hackathon.id })
          .from(Hackathon)
          .where(eq(Hackathon.id, current.hackathonId))
          .for("update");
        const [cleared] = await tx
          .update(JudgingAnnouncement)
          .set({
            clearedAt: new Date(),
            clearedByUserId: ctx.session.user.id,
          })
          .where(
            and(
              eq(JudgingAnnouncement.id, input.announcementId),
              isNull(JudgingAnnouncement.clearedAt),
            ),
          )
          .returning({ id: JudgingAnnouncement.id });
        if (!cleared) throw new TRPCError({ code: "NOT_FOUND" });
        await createAdminAuditEvent(
          {
            actionKey: "judging.announcement.cleared",
            actor,
            metadata: { scope: current.roomId ? "room" : "global" },
            subjects: [
              {
                relation: "primary",
                targetId: current.roomId ?? current.hackathonId,
                targetLabel: current.roomName ?? current.hackathonName,
                targetType: current.roomId ? "judging_room" : "hackathon",
              },
            ],
          },
          tx,
        );
        return { cleared: true };
      });
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
          discordThreadId: JudgingRoom.discordThreadId,
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
          userId: Judge.userId,
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
      const currentRoster = (await resolveCurrentJudgeDisplayNames(roster))
        .map(({ userId: _userId, ...judge }) => judge)
        .sort((left, right) =>
          left.displayName.localeCompare(right.displayName),
        );
      const [announcements, configuration, rubric] = await Promise.all([
        db
          .select({
            id: JudgingAnnouncement.id,
            includeGuests: JudgingAnnouncement.includeGuests,
            isUrgent: JudgingAnnouncement.isUrgent,
            message: JudgingAnnouncement.message,
            publishedAt: JudgingAnnouncement.publishedAt,
            roomId: JudgingAnnouncement.roomId,
          })
          .from(JudgingAnnouncement)
          .where(
            and(
              eq(JudgingAnnouncement.hackathonId, input.hackathonId),
              isNull(JudgingAnnouncement.clearedAt),
            ),
          ),
        db.query.HackathonJudgingConfiguration.findFirst({
          columns: {
            closedAt: true,
            displayAllResultsToMembers: true,
            judgingCommsChannelId: true,
            openedAt: true,
            projectInventoryLockedAt: true,
            state: true,
          },
          where: eq(
            HackathonJudgingConfiguration.hackathonId,
            input.hackathonId,
          ),
        }),
        db
          .select({
            description: JudgingRubricItem.description,
            guestVisibilityPolicy: JudgingRubricItem.guestVisibilityPolicy,
            id: JudgingRubricItem.id,
            kind: JudgingRubricItem.kind,
            label: JudgingRubricItem.label,
            memberVisibilityPolicy: JudgingRubricItem.memberVisibilityPolicy,
            required: JudgingRubricItem.required,
          })
          .from(JudgingRubricItem)
          .where(eq(JudgingRubricItem.hackathonId, input.hackathonId))
          .orderBy(asc(JudgingRubricItem.displayOrder)),
      ]);
      const discordGuildId = await judgingDiscordGuildId();
      return {
        hackathon,
        challenges,
        configuration: {
          closedAt: configuration?.closedAt ?? null,
          displayAllResults: configuration?.displayAllResultsToMembers ?? false,
          judgingCommsChannelId: configuration?.judgingCommsChannelId ?? null,
          openedAt: configuration?.openedAt ?? null,
          state: configuration?.state ?? ("draft" as const),
        },
        inventoryLockedAt: configuration?.projectInventoryLockedAt ?? null,
        discordGuildId,
        globalAnnouncement:
          announcements.find((announcement) => announcement.roomId === null) ??
          null,
        rubric,
        rooms: rooms.map((room) => ({
          ...room,
          announcement:
            announcements.find(
              (announcement) => announcement.roomId === room.id,
            ) ?? null,
          activeLinkId:
            links.find((link) => link.roomId === room.id)?.id ?? null,
          judges: currentRoster.filter((judge) => judge.roomId === room.id),
        })),
      };
    }),

  createRoom: permProcedure
    .input(judgingRoomCreateSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      try {
        const room = await db.transaction(async (tx) => {
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
        try {
          await ensureJudgingRoomThread(room.id);
        } catch {
          // The room is durable. The officer can retry Discord provisioning.
        }
        return room;
      } catch (error) {
        throwRoomNameConflict(error, input.name);
      }
    }),

  updateRoom: permProcedure
    .input(judgingRoomUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      try {
        const room = await db.transaction(async (tx) => {
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
        try {
          await ensureJudgingRoomThread(room.id);
        } catch {
          // The room edit is durable. The officer can retry Discord provisioning.
        }
        return room;
      } catch (error) {
        throwRoomNameConflict(error, input.name);
      }
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
          return { ...existing, created: false };
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
        return { ...created, created: true };
      });
      const qr = await renderRoomQr(link.id);
      const discordDelivery = link.created
        ? await deliverJudgingRoomNotice(input.roomId, {
            kind: "qr",
            qrCodeUrl: qr.qrCodeUrl,
            reason: "generated",
            url: qr.url,
          })
        : ("not_configured" as const);
      return {
        ...qr,
        created: link.created,
        discordDelivery,
      };
    }),

  sendRoomQr: permProcedure
    .input(judgingRoomIdSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      const room = await lockRoomAggregate(db, input.roomId, { active: true });
      const link = await db.query.JudgingRoomAccessLink.findFirst({
        columns: { id: true },
        where: and(
          eq(JudgingRoomAccessLink.roomId, room.id),
          isNull(JudgingRoomAccessLink.revokedAt),
        ),
      });
      if (!link) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Generate this room's QR before sending it.",
        });
      }
      const qr = await renderRoomQr(link.id);
      const discordDelivery = await deliverJudgingRoomNotice(room.id, {
        kind: "qr",
        qrCodeUrl: qr.qrCodeUrl,
        reason: "sent",
        url: qr.url,
      });
      await writeJudgingAudit(db, {
        actionKey: "judging.room_qr.sent",
        actor,
        metadata: { discordDelivery },
        roomId: room.id,
        roomName: room.name,
      });
      return { ...qr, discordDelivery };
    }),

  revokeRoomLink: permProcedure
    .input(judgingRoomIdSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      const result = await db.transaction(async (tx) => {
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
      const discordDelivery = result.revoked
        ? await deliverJudgingRoomNotice(input.roomId, {
            actorName: await actorDisplayName(ctx.session.user),
            guestNames: result.guestNames,
            kind: "room_link_revoked",
          })
        : ("not_configured" as const);
      return { ...result, discordDelivery };
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
      const qr = await renderRoomQr(link.id);
      const discordDelivery = await deliverJudgingRoomNotice(input.roomId, {
        kind: "qr",
        qrCodeUrl: qr.qrCodeUrl,
        reason: "rotated",
        url: qr.url,
      });
      return {
        ...qr,
        discordDelivery,
      };
    }),

  revokeGuest: permProcedure
    .input(judgingGuestSessionIdSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      const result = await db.transaction(async (tx) => {
        const [target] = await tx
          .select({
            id: JudgingRoom.id,
            judgeDisplayName: Judge.displayName,
            name: JudgingRoom.name,
          })
          .from(GuestJudgeSession)
          .innerJoin(Judge, eq(Judge.id, GuestJudgeSession.judgeId))
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
          metadata: {
            guestSessionId: input.guestSessionId,
            judgeDisplayName: target.judgeDisplayName,
          },
          roomId: target.id,
          roomName: target.name,
        });
        return {
          guestName: target.judgeDisplayName,
          revoked: true,
          roomId: target.id,
        };
      });
      const discordDelivery = await deliverJudgingRoomNotice(result.roomId, {
        actorName: await actorDisplayName(ctx.session.user),
        guestName: result.guestName,
        kind: "guest_revoked",
      });
      return { revoked: result.revoked, discordDelivery };
    }),

  removeJudgeFromRoom: permProcedure
    .input(judgingJudgeIdSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      return db.transaction(async (tx) => {
        const [target] = await tx
          .select({
            judgeDisplayName: Judge.displayName,
            judgeKind: Judge.kind,
            judgeUserId: Judge.userId,
            presenceId: JudgingRoomPresence.id,
            roomId: JudgingRoom.id,
            roomName: JudgingRoom.name,
          })
          .from(JudgingRoomPresence)
          .innerJoin(Judge, eq(Judge.id, JudgingRoomPresence.judgeId))
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
        const [currentTarget] = await resolveCurrentJudgeDisplayNames([
          {
            displayName: target.judgeDisplayName,
            kind: target.judgeKind,
            userId: target.judgeUserId,
          },
        ]);
        const judgeDisplayName =
          currentTarget?.displayName ?? target.judgeDisplayName;
        await tx
          .update(JudgingRoomPresence)
          .set({ leftAt: new Date(), leaveReason: "officer-removed" })
          .where(eq(JudgingRoomPresence.id, target.presenceId));
        await writeJudgingAudit(tx, {
          actionKey: "judging.presence.removed",
          actor,
          metadata: {
            judgeDisplayName,
            judgeId: input.judgeId,
          },
          roomId: target.roomId,
          roomName: target.roomName,
        });
        return { removed: true };
      });
    }),
});
