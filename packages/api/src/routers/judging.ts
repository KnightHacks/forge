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
  JudgeDeliberationEntry,
  JudgeDeliberationSection,
  JudgingAnnouncement,
  JudgingBuilding,
  JudgingRoom,
  JudgingRoomAccessLink,
  JudgingRoomPresence,
  JudgingRubricItem,
  JudgingSchedule,
  JudgingScheduleJob,
  Project,
  ProjectChallenge,
  ProjectClaim,
  ProjectClaimLink,
  ProjectEvaluation,
  ProjectEvaluationDraft,
  ProjectMember,
  ProjectToChallenge,
} from "@forge/db/schemas/knight-hacks";
import {
  guestJudgeNameSchema,
  judgingAnnouncementClearSchema,
  judgingAnnouncementPublishSchema,
  judgingCommsChannelSchema,
  judgingDestructiveActionSchema,
  judgingGuestSessionIdSchema,
  judgingHackathonIdSchema,
  judgingJudgeIdSchema,
  judgingPresenceHeartbeatSchema,
  judgingRoomCreateSchema,
  judgingRoomDeleteSchema,
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
import { assertNoRoomReservations } from "../utils/judging-schedule/appointments";
import {
  deliverCurrentJudgingAnnouncement,
  deliverJudgingRoomNotice,
  ensureJudgingRoomThread,
  judgingDiscordGuildId,
  listJudgingDiscordChannels,
  provisionJudgingRoomThreads,
  serializeJudgingAnnouncement,
  validateJudgingDiscordChannel,
} from "../utils/judging/discord-comms";
import { resolveJudgeAccess } from "../utils/judging/principal";
import {
  notifyJudgingChanged,
  watchJudgingChanges,
} from "../utils/judging/realtime";
import {
  resolveCurrentJudgeDisplayNames,
  resolveMemberDisplayNamesByUserId,
} from "../utils/member/display-name";
import { assertCanManageProjects } from "../utils/projects/access";
import {
  assertChallengeSetupEditable,
  assertJudgingSetupEditable,
  challengeSelection,
  rebuildParentMemberships,
} from "../utils/projects/challenge-configuration";
import { initializeJudgingGroups } from "../utils/projects/initialize-judging-groups";
import { judgingAppointmentResultsRouter } from "./judging-appointment-results";
import { judgingDraftsRouter } from "./judging-drafts";
import { judgingScheduleRouter } from "./judging-schedule";
import { judgingScheduleViewRouter } from "./judging-schedule-view";
import { judgingScoresRouter } from "./judging-scores";
import { projectClaimsRouter } from "./project-claims";

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
      (databaseError.constraint === ACTIVE_ROOM_NAME_CONSTRAINT ||
        databaseError.constraint ===
          "knight_hacks_judging_room_active_location_unique")
    ) {
      throw new TRPCError({
        cause: error,
        code: "CONFLICT",
        message:
          databaseError.constraint === ACTIVE_ROOM_NAME_CONSTRAINT
            ? `An active judging room already uses the name "${roomName}".`
            : `An active judging room already exists at that building and room "${roomName}".`,
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

async function lockConfirmedHackathon(
  tx: WriteDb,
  input: { confirmation: string; hackathonId: string },
) {
  const [hackathon] = await tx
    .select({ displayName: Hackathon.displayName, id: Hackathon.id })
    .from(Hackathon)
    .where(eq(Hackathon.id, input.hackathonId))
    .for("update")
    .limit(1);
  if (!hackathon)
    throw new TRPCError({ code: "NOT_FOUND", message: "Hackathon not found." });
  if (input.confirmation !== hackathon.displayName)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The confirmation does not match the hackathon name.",
    });
  return hackathon;
}

async function selectedHackathon(hackathonId?: string, allowFuture = false) {
  const now = new Date();
  const [active] = await db
    .select({ displayName: Hackathon.displayName, id: Hackathon.id })
    .from(Hackathon)
    .where(and(lte(Hackathon.startDate, now), gte(Hackathon.endDate, now)))
    .orderBy(desc(Hackathon.startDate))
    .limit(1);
  const selected =
    active ??
    (
      await db
        .select({ displayName: Hackathon.displayName, id: Hackathon.id })
        .from(Hackathon)
        .where(gte(Hackathon.startDate, now))
        .orderBy(asc(Hackathon.startDate), asc(Hackathon.id))
        .limit(1)
    )[0] ??
    null;
  if (!hackathonId) return selected;
  const requested = await db.query.Hackathon.findFirst({
    columns: { displayName: true, endDate: true, id: true },
    where: eq(Hackathon.id, hackathonId),
  });
  if (!requested) return null;
  if (requested.id !== selected?.id && requested.endDate >= now && !allowFuture)
    throw new TRPCError({ code: "FORBIDDEN" });
  return { displayName: requested.displayName, id: requested.id };
}

async function listActiveRooms(hackathonId: string) {
  return db
    .select({
      challengeId: JudgingRoom.challengeId,
      challengeLabel: ProjectChallenge.label,
      id: JudgingRoom.id,
      name: JudgingRoom.name,
      buildingId: JudgingRoom.buildingId,
      buildingName: JudgingBuilding.name,
    })
    .from(JudgingRoom)
    .leftJoin(JudgingBuilding, eq(JudgingBuilding.id, JudgingRoom.buildingId))
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
      buildingId: JudgingRoom.buildingId,
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
  const hackathon = await selectedHackathon();
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
    if (room.hackathonId !== hackathon?.id)
      throw new TRPCError({ code: "FORBIDDEN" });

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
    await notifyJudgingChanged(tx, room.hackathonId);
    return { ...room, newlyJoined: true };
  });
}

export const judgingRouter = createTRPCRouter({
  ...projectClaimsRouter,
  ...judgingScoresRouter,
  ...judgingDraftsRouter,
  ...judgingScheduleRouter,
  ...judgingAppointmentResultsRouter,
  ...judgingScheduleViewRouter,
  getContext: publicProcedure
    .input(contextInputSchema)
    .query(async ({ ctx, input }) => {
      const access = await resolveJudgeAccess(ctx);
      if (access.kind === "none") return { kind: "none" as const };
      if (access.kind === "incomplete-guest") {
        const [room] = await db
          .select({
            hackathonName: Hackathon.displayName,
            roomName: sql<string>`concat_ws(' ', ${JudgingBuilding.name}, ${JudgingRoom.name})`,
          })
          .from(JudgingRoom)
          .leftJoin(
            JudgingBuilding,
            eq(JudgingBuilding.id, JudgingRoom.buildingId),
          )
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
              roomName: sql<string>`concat_ws(' ', ${JudgingBuilding.name}, ${JudgingRoom.name})`,
            })
            .from(JudgingRoom)
            .leftJoin(
              JudgingBuilding,
              eq(JudgingBuilding.id, JudgingRoom.buildingId),
            )
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

  onChange: judgeProcedure
    .input(contextInputSchema)
    .subscription(async function* ({ ctx, input, signal }) {
      const hackathonId =
        ctx.judgePrincipal.kind === "guest"
          ? ctx.judgePrincipal.hackathonId
          : (
              await selectedHackathon(
                input.hackathonId,
                ctx.judgePrincipal.isOfficer,
              )
            )?.id;
      if (!hackathonId) throw new TRPCError({ code: "NOT_FOUND" });
      if (
        ctx.judgePrincipal.kind === "guest" &&
        input.hackathonId &&
        input.hackathonId !== hackathonId
      )
        throw new TRPCError({ code: "FORBIDDEN" });

      for await (const changed of watchJudgingChanges(hackathonId, signal)) {
        // Recheck live permissions and guest revocation throughout the stream.
        const principal = await resolveJudgeAccess(ctx);
        if (principal.kind !== "member" && principal.kind !== "guest")
          throw new TRPCError({ code: "UNAUTHORIZED" });
        if (ctx.session && ctx.session.session.expiresAt <= new Date())
          throw new TRPCError({ code: "UNAUTHORIZED" });
        if (principal.kind === "member") {
          if (!(await selectedHackathon(hackathonId, principal.isOfficer)))
            throw new TRPCError({ code: "NOT_FOUND" });
        } else if (principal.hackathonId !== hackathonId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        // Fetch data through the existing room/guest-filtered queries.
        if (changed) yield { changed: true };
      }
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
    const hackathonId = ctx.judgePrincipal.hackathonId;
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
      await notifyJudgingChanged(tx, hackathonId);
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
        : ("skipped" as const);
      return { ...room, discordDelivery };
    }),

  leaveRoom: judgeProcedure
    .input(judgingRoomIdSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.judgePrincipal.kind !== "member") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const now = new Date();
      const userId = ctx.judgePrincipal.userId;
      const ended = await db.transaction(async (tx) => {
        const ended = await tx
          .update(JudgingRoomPresence)
          .set({ leftAt: now, leaveReason: "left-room" })
          .where(
            and(
              eq(JudgingRoomPresence.roomId, input.roomId),
              isNull(JudgingRoomPresence.leftAt),
              sql`${JudgingRoomPresence.judgeId} IN (
            SELECT ${Judge.id} FROM ${Judge}
            WHERE ${Judge.userId} = ${userId}
          )`,
            ),
          )
          .returning({
            id: JudgingRoomPresence.id,
            hackathonId: JudgingRoomPresence.hackathonId,
          });
        if (ended[0]) await notifyJudgingChanged(tx, ended[0].hackathonId);
        return ended;
      });
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
      if (input.channelId) {
        const validation = await validateJudgingDiscordChannel(input.channelId);
        if (validation === "invalid") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Choose a text channel from the configured Knight Hacks server.",
          });
        }
        if (validation === "unavailable") {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              "Discord could not verify that channel right now. Try again.",
          });
        }
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
      return serializeJudgingAnnouncement(input.hackathonId, async () => {
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
          await notifyJudgingChanged(tx, input.hackathonId);
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
      });
    }),

  clearAnnouncement: permProcedure
    .input(judgingAnnouncementClearSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      const [scope] = await db
        .select({ hackathonId: JudgingAnnouncement.hackathonId })
        .from(JudgingAnnouncement)
        .where(eq(JudgingAnnouncement.id, input.announcementId))
        .limit(1);
      if (!scope) throw new TRPCError({ code: "NOT_FOUND" });
      return serializeJudgingAnnouncement(scope.hackathonId, () =>
        db.transaction(async (tx) => {
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
            .leftJoin(
              JudgingRoom,
              eq(JudgingRoom.id, JudgingAnnouncement.roomId),
            )
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
          await notifyJudgingChanged(tx, current.hackathonId);
          return { cleared: true };
        }),
      );
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
          buildingId: JudgingRoom.buildingId,
          buildingName: JudgingBuilding.name,
          id: JudgingRoom.id,
          name: JudgingRoom.name,
        })
        .from(JudgingRoom)
        .leftJoin(
          JudgingBuilding,
          eq(JudgingBuilding.id, JudgingRoom.buildingId),
        )
        .innerJoin(
          ProjectChallenge,
          eq(ProjectChallenge.id, JudgingRoom.challengeId),
        )
        .where(eq(JudgingRoom.hackathonId, input.hackathonId))
        .orderBy(asc(JudgingRoom.displayOrder), asc(JudgingRoom.name));
      const challenges = await db
        .select(challengeSelection)
        .from(ProjectChallenge)
        .where(eq(ProjectChallenge.hackathonId, input.hackathonId))
        .orderBy(
          sql`${ProjectChallenge.isGeneral} DESC`,
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
            hackerSchedulePublished: true,
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
      const [savedSchedule, scheduleJob, feedback, draft, inventory] =
        await Promise.all([
          db.query.JudgingSchedule.findFirst({
            columns: { firstResultAt: true, id: true },
            where: eq(JudgingSchedule.hackathonId, input.hackathonId),
          }),
          db.query.JudgingScheduleJob.findFirst({
            columns: { id: true },
            where: eq(JudgingScheduleJob.hackathonId, input.hackathonId),
          }),
          db.query.ProjectEvaluation.findFirst({
            columns: { id: true },
            where: eq(ProjectEvaluation.hackathonId, input.hackathonId),
          }),
          db.query.ProjectEvaluationDraft.findFirst({
            columns: { id: true },
            where: eq(ProjectEvaluationDraft.hackathonId, input.hackathonId),
          }),
          db
            .select({
              memberCount: sql<number>`count(${ProjectMember.id})::int`,
              projectCount: sql<number>`count(distinct ${Project.id})::int`,
              sentMemberCount: sql<number>`count(${ProjectClaimLink.sentAt})::int`,
            })
            .from(Project)
            .leftJoin(ProjectMember, eq(ProjectMember.projectId, Project.id))
            .leftJoin(
              ProjectClaimLink,
              eq(ProjectClaimLink.memberId, ProjectMember.id),
            )
            .where(
              and(
                eq(Project.hackathonId, input.hackathonId),
                isNull(Project.deletedAt),
              ),
            )
            .then((rows) => rows[0]),
        ]);
      const discordGuildId = await judgingDiscordGuildId();
      return {
        setupLocked: !!savedSchedule,
        challengeSetupLocked: !!savedSchedule || !!feedback || !!draft,
        hasEvaluationData: !!feedback || !!draft,
        hasScheduleData: !!savedSchedule || !!scheduleJob,
        hasSavedSchedule: !!savedSchedule,
        scheduleDropLocked: !!savedSchedule?.firstResultAt,
        hackathon,
        challenges,
        configuration: {
          closedAt: configuration?.closedAt ?? null,
          displayAllResults: configuration?.displayAllResultsToMembers ?? false,
          hackerSchedulePublished:
            configuration?.hackerSchedulePublished ?? false,
          judgingCommsChannelId: configuration?.judgingCommsChannelId ?? null,
          openedAt: configuration?.openedAt ?? null,
          state: configuration?.state ?? ("draft" as const),
        },
        inventoryLockedAt: configuration?.projectInventoryLockedAt ?? null,
        inventory: {
          claimLinksSent:
            (inventory?.memberCount ?? 0) > 0 &&
            (inventory?.sentMemberCount ?? 0) === (inventory?.memberCount ?? 0),
          memberCount: inventory?.memberCount ?? 0,
          projectCount: inventory?.projectCount ?? 0,
        },
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

  dropEvaluations: permProcedure
    .input(judgingDestructiveActionSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      return db.transaction(async (tx) => {
        const hackathon = await lockConfirmedHackathon(tx, input);
        await notifyJudgingChanged(tx, hackathon.id);
        const drafts = await tx
          .delete(ProjectEvaluationDraft)
          .where(eq(ProjectEvaluationDraft.hackathonId, hackathon.id))
          .returning({ id: ProjectEvaluationDraft.id });
        const evaluations = await tx
          .delete(ProjectEvaluation)
          .where(eq(ProjectEvaluation.hackathonId, hackathon.id))
          .returning({ id: ProjectEvaluation.id });
        await tx
          .update(JudgingSchedule)
          .set({ firstResultAt: null })
          .where(eq(JudgingSchedule.hackathonId, hackathon.id));
        await createAdminAuditEvent(
          {
            actionKey: "judging.evaluations.dropped",
            actor,
            metadata: {
              draftCount: drafts.length,
              evaluationCount: evaluations.length,
            },
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
        return {
          draftCount: drafts.length,
          evaluationCount: evaluations.length,
        };
      });
    }),

  resetProjects: permProcedure
    .input(judgingDestructiveActionSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      return db.transaction(async (tx) => {
        const hackathon = await lockConfirmedHackathon(tx, input);
        await notifyJudgingChanged(tx, hackathon.id);
        const [schedule, scheduleJob, room, evaluation, draft] =
          await Promise.all([
            tx.query.JudgingSchedule.findFirst({
              columns: { id: true },
              where: eq(JudgingSchedule.hackathonId, hackathon.id),
            }),
            tx.query.JudgingScheduleJob.findFirst({
              columns: { id: true },
              where: eq(JudgingScheduleJob.hackathonId, hackathon.id),
            }),
            tx.query.JudgingRoom.findFirst({
              columns: { id: true },
              where: eq(JudgingRoom.hackathonId, hackathon.id),
            }),
            tx.query.ProjectEvaluation.findFirst({
              columns: { id: true },
              where: eq(ProjectEvaluation.hackathonId, hackathon.id),
            }),
            tx.query.ProjectEvaluationDraft.findFirst({
              columns: { id: true },
              where: eq(ProjectEvaluationDraft.hackathonId, hackathon.id),
            }),
          ]);
        if (schedule || scheduleJob || room || evaluation || draft)
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Reset evaluations, schedule, and rooms before resetting projects.",
          });
        await tx
          .delete(JudgeDeliberationEntry)
          .where(eq(JudgeDeliberationEntry.hackathonId, hackathon.id));
        await tx
          .delete(ProjectClaim)
          .where(eq(ProjectClaim.hackathonId, hackathon.id));
        const projects = await tx
          .delete(Project)
          .where(eq(Project.hackathonId, hackathon.id))
          .returning({ id: Project.id });
        await tx
          .delete(ProjectChallenge)
          .where(
            and(
              eq(ProjectChallenge.hackathonId, hackathon.id),
              eq(ProjectChallenge.isGroup, false),
            ),
          );
        await tx
          .update(HackathonJudgingConfiguration)
          .set({
            projectClaimsStartedAt: null,
            projectClaimUrl: null,
            projectInventoryLockedAt: null,
            projectInventoryLockedByUserId: null,
          })
          .where(eq(HackathonJudgingConfiguration.hackathonId, hackathon.id));
        await createAdminAuditEvent(
          {
            actionKey: "project.inventory_dropped",
            actor,
            metadata: { projectCount: projects.length },
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
        return { projectCount: projects.length };
      });
    }),

  dropRooms: permProcedure
    .input(judgingDestructiveActionSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      return db.transaction(async (tx) => {
        const hackathon = await lockConfirmedHackathon(tx, input);
        await notifyJudgingChanged(tx, hackathon.id);
        await assertJudgingSetupEditable(tx, hackathon.id);
        await tx
          .delete(JudgingAnnouncement)
          .where(eq(JudgingAnnouncement.hackathonId, hackathon.id));
        const rooms = await tx
          .delete(JudgingRoom)
          .where(eq(JudgingRoom.hackathonId, hackathon.id))
          .returning({ id: JudgingRoom.id });
        await createAdminAuditEvent(
          {
            actionKey: "judging.rooms.dropped",
            actor,
            metadata: { roomCount: rooms.length },
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
        return { roomCount: rooms.length };
      });
    }),

  resetSetup: permProcedure
    .input(judgingDestructiveActionSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      return db.transaction(async (tx) => {
        const hackathon = await lockConfirmedHackathon(tx, input);
        await notifyJudgingChanged(tx, hackathon.id);
        await assertChallengeSetupEditable(tx, hackathon.id);
        const room = await tx.query.JudgingRoom.findFirst({
          columns: { id: true },
          where: eq(JudgingRoom.hackathonId, hackathon.id),
        });
        if (room)
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Drop all room configuration before resetting setup.",
          });
        await tx
          .delete(ProjectToChallenge)
          .where(
            and(
              eq(ProjectToChallenge.hackathonId, hackathon.id),
              eq(ProjectToChallenge.isOptIn, false),
            ),
          );
        await tx
          .update(ProjectChallenge)
          .set({ isScheduled: true, parentId: null })
          .where(
            and(
              eq(ProjectChallenge.hackathonId, hackathon.id),
              eq(ProjectChallenge.isGroup, false),
            ),
          );
        const groups = await tx
          .delete(ProjectChallenge)
          .where(
            and(
              eq(ProjectChallenge.hackathonId, hackathon.id),
              eq(ProjectChallenge.isGroup, true),
            ),
          )
          .returning({ id: ProjectChallenge.id });
        const rubric = await tx
          .delete(JudgingRubricItem)
          .where(eq(JudgingRubricItem.hackathonId, hackathon.id))
          .returning({ id: JudgingRubricItem.id });
        await tx
          .update(HackathonJudgingConfiguration)
          .set({ challengeGroupsInitializedAt: null })
          .where(eq(HackathonJudgingConfiguration.hackathonId, hackathon.id));
        await initializeJudgingGroups(tx, hackathon.id);
        await rebuildParentMemberships(tx, hackathon.id);
        await createAdminAuditEvent(
          {
            actionKey: "judging.setup.reset",
            actor,
            metadata: {
              groupCount: groups.length,
              rubricItemCount: rubric.length,
            },
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
        return { groupCount: groups.length, rubricItemCount: rubric.length };
      });
    }),

  resetLaunch: permProcedure
    .input(judgingDestructiveActionSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      return db.transaction(async (tx) => {
        const hackathon = await lockConfirmedHackathon(tx, input);
        await notifyJudgingChanged(tx, hackathon.id);
        const claims = await tx
          .delete(ProjectClaim)
          .where(eq(ProjectClaim.hackathonId, hackathon.id))
          .returning({ memberId: ProjectClaim.memberId });
        const memberIds = tx
          .select({ id: ProjectMember.id })
          .from(ProjectMember)
          .innerJoin(Project, eq(Project.id, ProjectMember.projectId))
          .where(eq(Project.hackathonId, hackathon.id));
        const links = await tx
          .delete(ProjectClaimLink)
          .where(inArray(ProjectClaimLink.memberId, memberIds))
          .returning({ id: ProjectClaimLink.id });
        await tx
          .insert(HackathonJudgingConfiguration)
          .values({ hackathonId: hackathon.id })
          .onConflictDoUpdate({
            target: HackathonJudgingConfiguration.hackathonId,
            set: {
              closedAt: null,
              displayAllResultsToMembers: false,
              hackerScheduleEmergency: false,
              hackerSchedulePublished: false,
              openedAt: null,
              projectClaimsStartedAt: null,
              projectClaimUrl: null,
              state: "draft",
            },
          });
        await createAdminAuditEvent(
          {
            actionKey: "judging.launch.reset",
            actor,
            metadata: {
              claimCount: claims.length,
              claimLinkCount: links.length,
            },
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
        return { claimCount: claims.length, claimLinkCount: links.length };
      });
    }),

  resetHackathon: permProcedure
    .input(judgingDestructiveActionSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      return db.transaction(async (tx) => {
        const hackathon = await lockConfirmedHackathon(tx, input);
        await notifyJudgingChanged(tx, hackathon.id);
        const drafts = await tx
          .delete(ProjectEvaluationDraft)
          .where(eq(ProjectEvaluationDraft.hackathonId, hackathon.id))
          .returning({ id: ProjectEvaluationDraft.id });
        const evaluations = await tx
          .delete(ProjectEvaluation)
          .where(eq(ProjectEvaluation.hackathonId, hackathon.id))
          .returning({ id: ProjectEvaluation.id });
        await tx
          .delete(JudgeDeliberationSection)
          .where(eq(JudgeDeliberationSection.hackathonId, hackathon.id));
        const schedules = await tx
          .delete(JudgingSchedule)
          .where(eq(JudgingSchedule.hackathonId, hackathon.id))
          .returning({ id: JudgingSchedule.id });
        await tx
          .delete(JudgingScheduleJob)
          .where(eq(JudgingScheduleJob.hackathonId, hackathon.id));
        await tx
          .delete(JudgingAnnouncement)
          .where(eq(JudgingAnnouncement.hackathonId, hackathon.id));
        const rooms = await tx
          .delete(JudgingRoom)
          .where(eq(JudgingRoom.hackathonId, hackathon.id))
          .returning({ id: JudgingRoom.id });
        await tx.delete(Judge).where(eq(Judge.hackathonId, hackathon.id));
        await tx
          .delete(ProjectClaim)
          .where(eq(ProjectClaim.hackathonId, hackathon.id));
        const projects = await tx
          .delete(Project)
          .where(eq(Project.hackathonId, hackathon.id))
          .returning({ id: Project.id });
        await tx
          .delete(ProjectChallenge)
          .where(eq(ProjectChallenge.hackathonId, hackathon.id));
        await tx
          .delete(JudgingRubricItem)
          .where(eq(JudgingRubricItem.hackathonId, hackathon.id));
        await tx
          .delete(HackathonJudgingConfiguration)
          .where(eq(HackathonJudgingConfiguration.hackathonId, hackathon.id));
        await initializeJudgingGroups(tx, hackathon.id);
        await createAdminAuditEvent(
          {
            actionKey: "judging.reset",
            actor,
            metadata: {
              draftCount: drafts.length,
              evaluationCount: evaluations.length,
              hadSchedule: schedules.length > 0,
              projectCount: projects.length,
              roomCount: rooms.length,
            },
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
        return {
          evaluationCount: evaluations.length,
          projectCount: projects.length,
          roomCount: rooms.length,
        };
      });
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
          await assertJudgingSetupEditable(tx, input.hackathonId);
          const [challenge] = await tx
            .select({ id: ProjectChallenge.id })
            .from(ProjectChallenge)
            .where(
              and(
                eq(ProjectChallenge.id, input.challengeId),
                isNull(ProjectChallenge.parentId),
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
              buildingId: input.buildingId ?? null,
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
          await notifyJudgingChanged(tx, input.hackathonId);
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
          await assertJudgingSetupEditable(tx, current.hackathonId);
          if (
            current.challengeId !== input.challengeId ||
            (input.buildingId !== undefined &&
              current.buildingId !== input.buildingId) ||
            current.name !== input.name
          ) {
            await assertNoRoomReservations(tx, current.id);
          }
          const [challenge] = await tx
            .select({ id: ProjectChallenge.id })
            .from(ProjectChallenge)
            .where(
              and(
                eq(ProjectChallenge.id, input.challengeId),
                isNull(ProjectChallenge.parentId),
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
            .set({
              challengeId: input.challengeId,
              name: input.name,
              buildingId: input.buildingId,
            })
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
          await notifyJudgingChanged(tx, current.hackathonId);
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
        await assertJudgingSetupEditable(tx, current.hackathonId);
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
        await notifyJudgingChanged(tx, current.hackathonId);
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
        await assertJudgingSetupEditable(tx, current.hackathonId);
        await assertNoRoomReservations(tx, current.id);
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
        await notifyJudgingChanged(tx, current.hackathonId);
        return room;
      });
    }),

  deleteRoom: permProcedure
    .input(judgingRoomDeleteSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      return db.transaction(async (tx) => {
        const room = await lockRoomAggregate(tx, input.roomId);
        await assertNoRoomReservations(tx, room.id);
        if (input.confirmation !== room.name)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "The confirmation does not match the room name.",
          });
        await tx.delete(JudgingRoom).where(eq(JudgingRoom.id, room.id));
        await writeJudgingAudit(tx, {
          actionKey: "judging.room.deleted",
          actor,
          roomId: room.id,
          roomName: room.name,
        });
        await notifyJudgingChanged(tx, room.hackathonId);
        return { id: room.id, name: room.name };
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
        await notifyJudgingChanged(tx, room.hackathonId);
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
        : ("skipped" as const);
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
      const { link, room } = await db.transaction(async (tx) => {
        const room = await lockRoomAggregate(tx, input.roomId, {
          active: true,
        });
        const link = await tx.query.JudgingRoomAccessLink.findFirst({
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
        return { link, room };
      });
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
        await notifyJudgingChanged(tx, room.hackathonId);
        return result;
      });
      const discordDelivery = result.revoked
        ? await deliverJudgingRoomNotice(input.roomId, {
            actorName: await actorDisplayName(ctx.session.user),
            guestNames: result.guestNames,
            kind: "room_link_revoked",
          })
        : ("skipped" as const);
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
        await notifyJudgingChanged(tx, room.hackathonId);
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
            hackathonId: JudgingRoom.hackathonId,
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
        await notifyJudgingChanged(tx, target.hackathonId);
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
            hackathonId: JudgingRoom.hackathonId,
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
        await notifyJudgingChanged(tx, target.hackathonId);
        const [currentTarget] = await resolveCurrentJudgeDisplayNames(
          [
            {
              displayName: target.judgeDisplayName,
              kind: target.judgeKind,
              userId: target.judgeUserId,
            },
          ],
          tx,
        );
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
