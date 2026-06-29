import { AsyncLocalStorage } from "node:async_hooks";

import { and, eq, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions } from "@forge/db/schemas/auth";
import {
  DuesPayment,
  Event,
  EventAttendee,
  Member,
} from "@forge/db/schemas/knight-hacks";

import { buildDuesStatus } from "../dues/status";
import { eventRowToWorkflowRecord } from "./database-state";

type DbExecutor =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

export function createDbAttendanceState({
  channelTypes = new Map<string, "stage" | "voice">(),
}: {
  channelTypes?: ReadonlyMap<string, "stage" | "voice">;
} = {}) {
  const context = new AsyncLocalStorage<DbExecutor>();
  const executor = () => context.getStore() ?? db;

  const getMemberRecord = async (memberId: string) => {
    const member = await executor().query.Member.findFirst({
      where: eq(Member.id, memberId),
    });
    if (!member) return null;
    const [assignments, duesRows] = await Promise.all([
      executor()
        .select({ roleId: Permissions.roleId })
        .from(Permissions)
        .where(eq(Permissions.userId, member.userId)),
      executor()
        .select()
        .from(DuesPayment)
        .where(eq(DuesPayment.memberId, member.id)),
    ]);
    return {
      duesActive: buildDuesStatus({ duesRows }).paid,
      id: member.id,
      roleIds: [...new Set(assignments.map(({ roleId }) => roleId))],
      userId: member.userId,
    };
  };

  return {
    async findAttendance(eventId: string, memberId: string) {
      const row = await executor().query.EventAttendee.findFirst({
        where: and(
          eq(EventAttendee.eventId, eventId),
          eq(EventAttendee.memberId, memberId),
        ),
      });
      return row ? { ...row, operatorName: null } : null;
    },

    async getAttendance(attendanceId: string) {
      const row = await executor().query.EventAttendee.findFirst({
        where: eq(EventAttendee.id, attendanceId),
      });
      return row ? { ...row, operatorName: null } : null;
    },

    async getEvent(eventId: string) {
      const row = await executor().query.Event.findFirst({
        where: eq(Event.id, eventId),
      });
      if (!row) return null;
      const mapped = eventRowToWorkflowRecord(
        row,
        row.discordChannelId
          ? (channelTypes.get(row.discordChannelId) ?? null)
          : null,
      );
      return {
        audience: mapped.audience,
        deletionIntentAt: mapped.deletionIntentAt,
        hackathonId: mapped.hackathonId,
        id: mapped.id,
        legacy: mapped.legacy,
        legacyDuesRequired: mapped.legacyDuesRequired,
        points: mapped.points,
        publishedAt: mapped.publishedAt,
        roleIds: mapped.roleIds,
      };
    },

    getMember: getMemberRecord,

    async getMemberByUserId(userId: string) {
      const member = await executor().query.Member.findFirst({
        columns: { id: true },
        where: eq(Member.userId, userId),
      });
      return member ? getMemberRecord(member.id) : null;
    },

    async insertAttendanceAndIncrementPoints(
      row: {
        checkedInAt: Date | null;
        checkedInBy: string | null;
        eventId: string;
        id: string;
        memberId: string;
        pointsAwarded: number | null;
        pointsAwardedEstimated: boolean;
      },
      points: number,
    ) {
      const current = executor();
      await current.insert(EventAttendee).values(row);
      await current
        .update(Member)
        .set({ points: sql`${Member.points} + ${points}` })
        .where(eq(Member.id, row.memberId));
    },

    async removeAttendanceAndDecrementPoints(
      attendanceId: string,
      points: number,
    ) {
      return db.transaction(async (tx) => {
        const [removed] = await tx
          .delete(EventAttendee)
          .where(eq(EventAttendee.id, attendanceId))
          .returning({ memberId: EventAttendee.memberId });
        if (!removed) return false;
        await tx
          .update(Member)
          .set({ points: sql`${Member.points} - ${points}` })
          .where(eq(Member.id, removed.memberId));
        return true;
      });
    },

    async withCheckInLock<T>(
      eventId: string,
      memberId: string,
      operation: () => Promise<T>,
    ) {
      return db.transaction(async (tx) => {
        await tx.execute(
          sql`select ${Event.id} from ${Event} where ${Event.id} = ${eventId} for share`,
        );
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${`${memberId}:${eventId}`}, 0))`,
        );
        return context.run(tx, operation);
      });
    },
  };
}
