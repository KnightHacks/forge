import type { SQL } from "@forge/db";
import type { AuditActionKey, AuditListInput } from "@forge/validators";
import {
  and,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lt,
  lte,
  or,
  sql,
} from "@forge/db";
import { db } from "@forge/db/client";
import { AdminAuditEvent, AdminAuditSubject } from "@forge/db/schemas/audit";
import { User } from "@forge/db/schemas/auth";
import { Member } from "@forge/db/schemas/knight-hacks";
import { AUDIT_ACTION_CATALOG } from "@forge/validators";

const DAY_MS = 24 * 60 * 60 * 1000;

function searchCondition(search: string): SQL {
  const pattern = `%${search.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
  return sql`(
    ${AdminAuditEvent.actorLabel} ILIKE ${pattern} ESCAPE '\\'
    OR ${AdminAuditEvent.actionKey} ILIKE ${pattern} ESCAPE '\\'
    OR ${AdminAuditEvent.domain} ILIKE ${pattern} ESCAPE '\\'
    OR ${AdminAuditEvent.actorUserId}::text ILIKE ${pattern} ESCAPE '\\'
    OR EXISTS (
      SELECT 1
      FROM ${AdminAuditSubject} search_subject
      WHERE search_subject.event_id = ${AdminAuditEvent.id}
        AND (
          search_subject.target_label ILIKE ${pattern} ESCAPE '\\'
          OR search_subject.target_id ILIKE ${pattern} ESCAPE '\\'
        )
    )
  )`;
}

function memberCondition(memberId: string): SQL {
  return sql`(
    ${AdminAuditEvent.actorMemberId} = ${memberId}::uuid
    OR EXISTS (
      SELECT 1
      FROM ${AdminAuditSubject} member_subject
      WHERE member_subject.event_id = ${AdminAuditEvent.id}
        AND member_subject.member_id = ${memberId}::uuid
    )
  )`;
}

function targetTypeCondition(targetTypes: readonly string[]): SQL {
  return sql`EXISTS (
    SELECT 1
    FROM ${AdminAuditSubject} target_subject
    WHERE target_subject.event_id = ${AdminAuditEvent.id}
      AND target_subject.target_type IN ${targetTypes}
  )`;
}

function derivedPartialCondition(): SQL {
  return sql`(
    ${AdminAuditEvent.outcome} = 'partial_external'
    OR EXISTS (
      SELECT 1
      FROM ${AdminAuditSubject} result_subject
      WHERE result_subject.event_id = ${AdminAuditEvent.id}
        AND result_subject.relation = 'result'
        AND result_subject.result_outcome IN ('failed_external', 'failed_internal')
    )
  )`;
}

function outcomeCondition(outcomes: readonly string[]): SQL | undefined {
  if (outcomes.length === 0 || outcomes.length === 2) return undefined;
  const partial = derivedPartialCondition();
  return outcomes[0] === "partial_external" ? partial : sql`NOT (${partial})`;
}

export async function listAdminAuditEvents(input: AuditListInput) {
  const conditions: SQL[] = [];
  const from = input.from ?? new Date(Date.now() - 30 * DAY_MS);
  const to = input.to ?? new Date();
  conditions.push(gte(AdminAuditEvent.occurredAt, from));
  conditions.push(lte(AdminAuditEvent.occurredAt, to));

  if (input.actionKeys?.length) {
    conditions.push(inArray(AdminAuditEvent.actionKey, input.actionKeys));
  }
  if (input.actorUserId) {
    conditions.push(eq(AdminAuditEvent.actorUserId, input.actorUserId));
  }
  if (input.domains?.length) {
    conditions.push(inArray(AdminAuditEvent.domain, input.domains));
  }
  if (input.memberId) {
    conditions.push(memberCondition(input.memberId));
  }
  if (input.outcomes?.length) {
    const condition = outcomeCondition(input.outcomes);
    if (condition) conditions.push(condition);
  }
  if (input.search) {
    conditions.push(searchCondition(input.search));
  }
  if (input.targetTypes?.length) {
    conditions.push(targetTypeCondition(input.targetTypes));
  }
  if (input.cursor) {
    conditions.push(
      or(
        lt(AdminAuditEvent.occurredAt, input.cursor.occurredAt),
        and(
          eq(AdminAuditEvent.occurredAt, input.cursor.occurredAt),
          lt(AdminAuditEvent.id, input.cursor.id),
        ),
      )!,
    );
  }

  const rows = await db
    .select()
    .from(AdminAuditEvent)
    .where(and(...conditions))
    .orderBy(desc(AdminAuditEvent.occurredAt), desc(AdminAuditEvent.id))
    .limit(input.limit + 1);
  const hasMore = rows.length > input.limit;
  const events = rows.slice(0, input.limit);
  const eventIds = events.map((event) => event.id);
  const subjects =
    eventIds.length === 0
      ? []
      : await db
          .select()
          .from(AdminAuditSubject)
          .where(inArray(AdminAuditSubject.eventId, eventIds))
          .orderBy(
            AdminAuditSubject.eventId,
            AdminAuditSubject.position,
            AdminAuditSubject.id,
          );
  const subjectsByEventId = new Map<
    string,
    (typeof AdminAuditSubject.$inferSelect)[]
  >();
  for (const subject of subjects) {
    const values = subjectsByEventId.get(subject.eventId) ?? [];
    values.push(subject);
    subjectsByEventId.set(subject.eventId, values);
  }

  const items = events.map((event) => {
    const eventSubjects = subjectsByEventId.get(event.id) ?? [];
    const derivedOutcome =
      event.outcome === "partial_external" ||
      eventSubjects.some(
        (subject) =>
          subject.relation === "result" &&
          (subject.resultOutcome === "failed_external" ||
            subject.resultOutcome === "failed_internal"),
      )
        ? ("partial_external" as const)
        : ("committed" as const);
    const primaryTarget = eventSubjects.find(
      (subject) => subject.relation === "primary",
    );

    return {
      actionKey: event.actionKey as AuditActionKey,
      actionLabel:
        AUDIT_ACTION_CATALOG[event.actionKey as AuditActionKey]?.label ??
        event.actionKey,
      actor: {
        discordUserId: event.actorDiscordUserId,
        label: event.actorLabel,
        memberId: event.actorMemberId,
        roleColor: event.actorRoleColor,
        roleLabel: event.actorRoleLabel,
        userId: event.actorUserId,
      },
      domain: event.domain,
      id: event.id,
      occurredAt: event.occurredAt,
      operationId: event.operationId,
      outcome: derivedOutcome,
      primaryTarget: primaryTarget
        ? {
            id: primaryTarget.targetId,
            label: primaryTarget.targetLabel,
            memberId: primaryTarget.memberId,
            type: primaryTarget.targetType,
          }
        : null,
      resultCount: eventSubjects.filter(
        (subject) => subject.relation === "result",
      ).length,
    };
  });
  const last = items.at(-1);

  return {
    items,
    nextCursor:
      hasMore && last
        ? { id: last.id, occurredAt: last.occurredAt }
        : undefined,
  };
}

export async function getAdminAuditEvent(eventId: string) {
  const [event] = await db
    .select()
    .from(AdminAuditEvent)
    .where(eq(AdminAuditEvent.id, eventId))
    .limit(1);
  if (!event) return null;

  const subjects = await db
    .select()
    .from(AdminAuditSubject)
    .where(eq(AdminAuditSubject.eventId, event.id))
    .orderBy(AdminAuditSubject.position, AdminAuditSubject.id);
  const outcome =
    event.outcome === "partial_external" ||
    subjects.some(
      (subject) =>
        subject.relation === "result" &&
        (subject.resultOutcome === "failed_external" ||
          subject.resultOutcome === "failed_internal"),
    )
      ? ("partial_external" as const)
      : ("committed" as const);

  return {
    ...event,
    actionKey: event.actionKey as AuditActionKey,
    actionLabel:
      AUDIT_ACTION_CATALOG[event.actionKey as AuditActionKey]?.label ??
      event.actionKey,
    outcome,
    subjects,
  };
}

export async function searchAuditMembers(search: string, limit: number) {
  const pattern = `%${search.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
  const conditions = search
    ? or(
        ilike(Member.firstName, pattern),
        ilike(Member.lastName, pattern),
        ilike(User.name, pattern),
        sql`${Member.id}::text ILIKE ${pattern} ESCAPE '\\'`,
        sql`${Member.userId}::text ILIKE ${pattern} ESCAPE '\\'`,
      )
    : undefined;

  return db
    .select({
      firstName: Member.firstName,
      id: Member.id,
      lastName: Member.lastName,
      userId: Member.userId,
    })
    .from(Member)
    .innerJoin(User, eq(User.id, Member.userId))
    .where(conditions)
    .orderBy(Member.firstName, Member.lastName, Member.id)
    .limit(limit);
}
