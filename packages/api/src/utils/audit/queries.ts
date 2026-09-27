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
import {
  Hackathon,
  Hacker,
  HackerAttendee,
  HackerCheckInAttempt,
  Member,
} from "@forge/db/schemas/knight-hacks";
import { AUDIT_ACTION_CATALOG, AUDIT_ACTION_KEYS } from "@forge/validators";

import { resolveMemberDisplayNames } from "../member/display-name";

const DAY_MS = 24 * 60 * 60 * 1000;

function auditActionLabel(actionKey: string) {
  if (Object.hasOwn(AUDIT_ACTION_CATALOG, actionKey)) {
    return AUDIT_ACTION_CATALOG[actionKey as AuditActionKey].label;
  }
  return actionKey;
}

function searchCondition(search: string): SQL {
  const pattern = `%${search.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
  const normalized = search.toLocaleLowerCase("en-US");
  const matchingActionKeys = AUDIT_ACTION_KEYS.filter((actionKey) => {
    const policy = AUDIT_ACTION_CATALOG[actionKey];
    return (
      actionKey.toLocaleLowerCase("en-US").includes(normalized) ||
      policy.label.toLocaleLowerCase("en-US").includes(normalized)
    );
  });
  const actionLabelCondition =
    matchingActionKeys.length > 0
      ? sql`OR ${inArray(AdminAuditEvent.actionKey, matchingActionKeys)}`
      : sql``;
  return sql`(
    ${AdminAuditEvent.actorLabel} ILIKE ${pattern} ESCAPE '\\'
    OR ${AdminAuditEvent.actionKey} ILIKE ${pattern} ESCAPE '\\'
    OR ${AdminAuditEvent.domain} ILIKE ${pattern} ESCAPE '\\'
    OR ${AdminAuditEvent.id}::text ILIKE ${pattern} ESCAPE '\\'
    OR ${AdminAuditEvent.operationId}::text ILIKE ${pattern} ESCAPE '\\'
    OR ${AdminAuditEvent.actorUserId}::text ILIKE ${pattern} ESCAPE '\\'
    OR ${AdminAuditEvent.metadata}::text ILIKE ${pattern} ESCAPE '\\'
    ${actionLabelCondition}
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

function hackerAttendeeCondition(hackerAttendeeId: string): SQL {
  return sql`(
    EXISTS (
      SELECT 1
      FROM ${AdminAuditSubject} hacker_subject
      WHERE hacker_subject.event_id = ${AdminAuditEvent.id}
        AND hacker_subject.target_type = 'hacker_attendee'
        AND hacker_subject.target_id = ${hackerAttendeeId}
    )
    OR EXISTS (
      SELECT 1
      FROM ${AdminAuditSubject} attempt_subject
      INNER JOIN ${HackerCheckInAttempt} legacy_attempt
        ON attempt_subject.target_type = 'check_in_attempt'
        AND attempt_subject.target_id = legacy_attempt.id::text
      WHERE attempt_subject.event_id = ${AdminAuditEvent.id}
        AND legacy_attempt.hacker_attendee_id = ${hackerAttendeeId}::uuid
    )
  )`;
}

interface CheckInAttemptAuditContext {
  attendanceId: string | null;
  attendeeId: string | null;
  hackerName: string | null;
  hackathonId: string;
  hackathonName: string;
  id: string;
}

async function loadCheckInAttemptContexts(
  subjects: readonly (typeof AdminAuditSubject.$inferSelect)[],
) {
  const attemptIds = subjects
    .filter(({ targetType }) => targetType === "check_in_attempt")
    .map(({ targetId }) => targetId)
    .filter((id) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      ),
    );
  if (attemptIds.length === 0) {
    return new Map<string, CheckInAttemptAuditContext>();
  }
  const rows = await db
    .select({
      attendanceId: HackerCheckInAttempt.attendanceId,
      attendeeId: HackerCheckInAttempt.hackerAttendeeId,
      hackerName: HackerCheckInAttempt.hackerNameSnapshot,
      hackathonId: HackerCheckInAttempt.hackathonId,
      hackathonName: Hackathon.displayName,
      id: HackerCheckInAttempt.id,
    })
    .from(HackerCheckInAttempt)
    .innerJoin(Hackathon, eq(Hackathon.id, HackerCheckInAttempt.hackathonId))
    .where(inArray(HackerCheckInAttempt.id, attemptIds));
  return new Map(rows.map((row) => [row.id, row]));
}

function legacyCheckInContext(
  subjects: readonly (typeof AdminAuditSubject.$inferSelect)[],
  contexts: ReadonlyMap<string, CheckInAttemptAuditContext>,
) {
  const attemptSubject = subjects.find(
    ({ targetType }) => targetType === "check_in_attempt",
  );
  return attemptSubject ? contexts.get(attemptSubject.targetId) : undefined;
}

export function enrichLegacyCheckInSubjects(
  eventId: string,
  subjects: readonly (typeof AdminAuditSubject.$inferSelect)[],
  context: CheckInAttemptAuditContext | undefined,
) {
  if (!context?.attendeeId || !context.hackerName) return [...subjects];
  if (subjects.some(({ targetType }) => targetType === "hacker_attendee")) {
    return [...subjects];
  }
  const normalized = subjects.map((subject) =>
    subject.relation === "primary"
      ? { ...subject, relation: "secondary" as const }
      : subject,
  );
  return [
    {
      id: `derived-attendee:${eventId}`,
      eventId,
      memberId: null,
      metadata: {},
      position: 0,
      relation: "primary" as const,
      resultOutcome: null,
      targetId: context.attendeeId,
      targetLabel: context.hackerName,
      targetType: "hacker_attendee",
    },
    ...normalized,
    ...(subjects.some(({ targetType }) => targetType === "hackathon")
      ? []
      : [
          {
            id: `derived-hackathon:${eventId}`,
            eventId,
            memberId: null,
            metadata: {},
            position: normalized.length + 1,
            relation: "secondary" as const,
            resultOutcome: null,
            targetId: context.hackathonId,
            targetLabel: context.hackathonName,
            targetType: "hackathon",
          },
        ]),
    ...(context.attendanceId &&
    !subjects.some(({ targetType }) => targetType === "attendance")
      ? [
          {
            id: `derived-attendance:${eventId}`,
            eventId,
            memberId: null,
            metadata: {},
            position: normalized.length + 2,
            relation: "secondary" as const,
            resultOutcome: null,
            targetId: context.attendanceId,
            targetLabel: `Attendance for ${context.hackerName}`,
            targetType: "attendance",
          },
        ]
      : []),
  ];
}

function checkInOutcomeCondition(outcomes: readonly string[]): SQL {
  return sql`${AdminAuditEvent.metadata}->>'outcome' IN (${sql.join(
    outcomes.map((outcome) => sql`${outcome}`),
    sql`, `,
  )})`;
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
      AND target_subject.target_type IN (${sql.join(
        targetTypes.map((targetType) => sql`${targetType}`),
        sql`, `,
      )})
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
  if (input.checkInOutcomes?.length) {
    conditions.push(checkInOutcomeCondition(input.checkInOutcomes));
  }
  if (input.domains?.length) {
    conditions.push(inArray(AdminAuditEvent.domain, input.domains));
  }
  if (input.memberId) {
    conditions.push(memberCondition(input.memberId));
  }
  if (input.hackerAttendeeId) {
    conditions.push(hackerAttendeeCondition(input.hackerAttendeeId));
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
    const cursorCondition = or(
      lt(AdminAuditEvent.occurredAt, input.cursor.occurredAt),
      and(
        eq(AdminAuditEvent.occurredAt, input.cursor.occurredAt),
        lt(AdminAuditEvent.id, input.cursor.id),
      ),
    );
    if (cursorCondition) conditions.push(cursorCondition);
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
  const checkInContexts = await loadCheckInAttemptContexts(subjects);
  const currentNames = await resolveMemberDisplayNames(
    events.map((event) => event.actorMemberId),
  );

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
    const checkInContext = legacyCheckInContext(eventSubjects, checkInContexts);
    const primaryTarget =
      event.actionKey === "hackathon_event.checked_in" &&
      checkInContext?.attendeeId &&
      checkInContext.hackerName
        ? {
            memberId: null,
            targetId: checkInContext.attendeeId,
            targetLabel: checkInContext.hackerName,
            targetType: "hacker_attendee",
          }
        : eventSubjects.find((subject) => subject.relation === "primary");

    return {
      actionKey: event.actionKey as AuditActionKey,
      actionLabel: auditActionLabel(event.actionKey),
      actor: {
        discordUserId: event.actorDiscordUserId,
        label:
          (event.actorMemberId && currentNames.get(event.actorMemberId)) ??
          event.actorLabel,
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
  const contexts = await loadCheckInAttemptContexts(subjects);
  const enrichedSubjects =
    event.actionKey === "hackathon_event.checked_in"
      ? enrichLegacyCheckInSubjects(
          event.id,
          subjects,
          legacyCheckInContext(subjects, contexts),
        )
      : subjects;
  const outcome =
    event.outcome === "partial_external" ||
    enrichedSubjects.some(
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
    actionLabel: auditActionLabel(event.actionKey),
    outcome,
    subjects: enrichedSubjects,
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

export async function searchAuditHackers(search: string, limit: number) {
  const pattern = `%${search.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
  const conditions = search
    ? or(
        ilike(Hacker.firstName, pattern),
        ilike(Hacker.lastName, pattern),
        ilike(Hacker.email, pattern),
        ilike(Hacker.discordUser, pattern),
        ilike(User.name, pattern),
        ilike(Hackathon.displayName, pattern),
        sql`${HackerAttendee.id}::text ILIKE ${pattern} ESCAPE '\\'`,
        sql`${Hacker.id}::text ILIKE ${pattern} ESCAPE '\\'`,
        sql`${Hacker.userId}::text ILIKE ${pattern} ESCAPE '\\'`,
      )
    : undefined;

  return db
    .select({
      attendeeId: HackerAttendee.id,
      email: Hacker.email,
      firstName: Hacker.firstName,
      hackathonId: Hackathon.id,
      hackathonName: Hackathon.displayName,
      hackerId: Hacker.id,
      lastName: Hacker.lastName,
      userId: Hacker.userId,
    })
    .from(HackerAttendee)
    .innerJoin(Hacker, eq(Hacker.id, HackerAttendee.hackerId))
    .innerJoin(User, eq(User.id, Hacker.userId))
    .innerJoin(Hackathon, eq(Hackathon.id, HackerAttendee.hackathonId))
    .where(conditions)
    .orderBy(desc(Hackathon.startDate), Hacker.firstName, Hacker.lastName)
    .limit(limit);
}
