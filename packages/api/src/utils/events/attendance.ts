import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";

import { logger } from "@forge/utils";

import { assertClubEvent } from "./access";

interface AttendanceEvent {
  audience: "dues" | "public" | "roles";
  deletionIntentAt: Date | null;
  hackathonId: string | null;
  id: string;
  legacy: boolean;
  legacyDuesRequired: boolean;
  points: number;
  publishedAt: Date | null;
  roleIds: string[];
}

interface AttendanceMember {
  company: string | null;
  discordUsername: string;
  duesActive: boolean;
  firstName: string;
  guildProfileVisible: boolean;
  id: string;
  lastName: string;
  roleIds: string[];
  tagline: string | null;
  userId: string;
}

interface AttendanceRecord {
  checkedInAt: Date | null;
  checkedInBy: string | null;
  eventId: string;
  id: string;
  memberId: string;
  operatorName: string | null;
  pointsAwarded: number | null;
  pointsAwardedEstimated: boolean;
}

interface AttendanceState {
  findAttendance(
    eventId: string,
    memberId: string,
  ): Promise<AttendanceRecord | null>;
  getAttendance(attendanceId: string): Promise<AttendanceRecord | null>;
  getEvent(eventId: string): Promise<AttendanceEvent | null>;
  getMember(memberId: string): Promise<AttendanceMember | null>;
  getMemberByUserId(userId: string): Promise<AttendanceMember | null>;
  insertAttendanceAndIncrementPoints(
    row: AttendanceRecord,
    points: number,
  ): Promise<void>;
  removeAttendanceAndDecrementPoints(
    attendanceId: string,
    points: number,
  ): Promise<boolean>;
  withCheckInLock<T>(
    eventId: string,
    memberId: string,
    operation: () => Promise<T>,
  ): Promise<T>;
}

type AttendanceAudit = (entry: {
  action: "check_in" | "remove_attendance";
  actorId: string;
  eventId: string;
  memberId: string;
}) => Promise<unknown>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseQrPayload(value: string) {
  const raw = value.startsWith("user:") ? value.slice(5) : value;
  return UUID_PATTERN.test(raw) ? raw : null;
}

function eligibility(event: AttendanceEvent, member: AttendanceMember) {
  if (
    (event.audience === "dues" || event.legacyDuesRequired) &&
    !member.duesActive
  )
    return "dues_required" as const;
  if (
    (event.audience === "roles" ||
      (event.legacyDuesRequired && event.roleIds.length > 0)) &&
    !event.roleIds.some((roleId) => member.roleIds.includes(roleId))
  )
    return "role_required" as const;
  return null;
}

function memberSummary(member: AttendanceMember) {
  return {
    company: member.guildProfileVisible ? member.company : null,
    discordUsername: member.discordUsername,
    id: member.id,
    name: `${member.firstName} ${member.lastName}`.trim(),
    tagline: member.guildProfileVisible ? member.tagline : null,
  };
}

export function createAttendanceService({
  audit,
  clock,
  idFactory = randomUUID,
  reportAuditFailure = () =>
    logger.warn("Event attendance audit transport failed."),
  state,
}: {
  audit: AttendanceAudit;
  clock: () => Date;
  idFactory?: () => string;
  reportAuditFailure?: () => void;
  state: AttendanceState;
}) {
  const attemptAudit = async (entry: Parameters<AttendanceAudit>[0]) => {
    try {
      await audit(entry);
    } catch {
      try {
        reportAuditFailure();
      } catch {
        // Failure reporting must not affect committed product state.
      }
    }
  };

  return {
    async checkIn(input: {
      actorId: string;
      allowRepeat?: boolean;
      eventId: string;
      memberId?: string;
      qrPayload?: string;
    }) {
      const event = assertClubEvent(await state.getEvent(input.eventId));
      if (event.deletionIntentAt) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This event is being deleted.",
        });
      }
      if (!event.legacy && !event.publishedAt) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This event is not ready for check-in.",
        });
      }

      let member: AttendanceMember | null;
      if (input.memberId) member = await state.getMember(input.memberId);
      else if (input.qrPayload) {
        const userId = parseQrPayload(input.qrPayload);
        if (!userId) return { status: "invalid_qr" as const };
        member = await state.getMemberByUserId(userId);
      } else return { status: "invalid_qr" as const };
      if (!member) return { status: "member_not_found" as const };

      const result = await state.withCheckInLock(
        event.id,
        member.id,
        async () => {
          const currentEvent = assertClubEvent(await state.getEvent(event.id));
          if (currentEvent.deletionIntentAt) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "This event is being deleted.",
            });
          }
          const currentMember = await state.getMember(member.id);
          if (!currentMember) return { status: "member_not_found" as const };
          const safeMember = memberSummary(currentMember);
          const existingAttendance = await state.findAttendance(
            event.id,
            member.id,
          );
          if (!input.allowRepeat && existingAttendance) {
            return {
              member: safeMember,
              status: "already_checked_in" as const,
            };
          }
          const rejection = eligibility(currentEvent, currentMember);
          if (rejection) return { member: safeMember, status: rejection };
          const pointsAwarded = existingAttendance ? 0 : currentEvent.points;
          const row: AttendanceRecord = {
            checkedInAt: clock(),
            checkedInBy: input.actorId,
            eventId: currentEvent.id,
            id: idFactory(),
            memberId: currentMember.id,
            operatorName: null,
            pointsAwarded,
            pointsAwardedEstimated: false,
          };
          await state.insertAttendanceAndIncrementPoints(row, pointsAwarded);
          return {
            attendanceId: row.id,
            member: safeMember,
            pointsAwarded,
            status: "checked_in" as const,
          };
        },
      );
      if (result.status === "checked_in") {
        await attemptAudit({
          action: "check_in",
          actorId: input.actorId,
          eventId: event.id,
          memberId: member.id,
        });
      }
      return result;
    },

    async removeAttendance(input: { actorId: string; attendanceId: string }) {
      const row = await state.getAttendance(input.attendanceId);
      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Attendance not found.",
        });
      }
      if (row.pointsAwarded === null) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "The stored point award is unavailable.",
        });
      }
      const removed = await state.removeAttendanceAndDecrementPoints(
        row.id,
        row.pointsAwarded,
      );
      if (!removed) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Attendance was already removed.",
        });
      }
      await attemptAudit({
        action: "remove_attendance",
        actorId: input.actorId,
        eventId: row.eventId,
        memberId: row.memberId,
      });
      return { pointsRemoved: row.pointsAwarded, status: "removed" as const };
    },
  };
}

function csvCell(value: Date | number | string | null) {
  let text = value instanceof Date ? value.toISOString() : String(value ?? "");
  if (/^[\t\r\n ]*[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function serializeAttendanceCsv(
  rows: readonly {
    checkedInAt: Date | null;
    discordUsername: string;
    memberId: string;
    name: string;
    operatorId: string | null;
    operatorName: string | null;
    pointsAwarded: number | null;
    pointsAwardedEstimated: boolean;
  }[],
) {
  const header = [
    "Member UUID",
    "Name",
    "Discord Username",
    "Checked In At",
    "Operator UUID",
    "Operator",
    "Points Awarded",
    "Estimated",
  ].join(",");
  return [
    header,
    ...rows.map((row) =>
      [
        row.memberId,
        row.name,
        row.discordUsername,
        row.checkedInAt,
        row.operatorId,
        row.operatorName,
        row.pointsAwarded,
        row.pointsAwardedEstimated ? "Yes" : "No",
      ]
        .map(csvCell)
        .join(","),
    ),
  ].join("\n");
}
