import type { EventAdminQuery } from "@forge/validators";
import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  getTableName,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  not,
  or,
  sql,
} from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, User } from "@forge/db/schemas/auth";
import {
  DuesPayment,
  Event,
  EventAttendee,
  EventTag,
  Member,
} from "@forge/db/schemas/knight-hacks";

import type { MemberDiscoveryRecord } from "./discovery";
import { buildDuesStatus } from "../dues/status";
import { toAdminEventDto } from "./admin-dto";
import { eventRowToWorkflowRecord } from "./database-state";
import { rankCheckInIdentityCandidates } from "./discovery";

const eventTableName = getTableName(Event);
const attendanceCount = sql<number>`(
  select count(*)::int
  from ${EventAttendee}
  where ${EventAttendee.eventId} =
    ${sql.identifier(eventTableName)}.${sql.identifier(Event.id.name)}
)`.mapWith(Number);

function mapDiscoveryRow(row: {
  attendanceCount: number;
  event: typeof Event.$inferSelect;
}) {
  return {
    ...eventRowToWorkflowRecord(row.event),
    attendanceCount: row.attendanceCount,
  };
}

function selectDiscoveryRows() {
  return db.select({
    attendanceCount,
    event: getTableColumns(Event),
  });
}

const emptyRoles = (column: typeof Event.roles) =>
  sql`cardinality(${column}) = 0`;

function varcharArray(values: readonly string[]) {
  return sql`ARRAY[${sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  )}]::varchar[]`;
}

export async function loadPublicClubEventRecords({
  limit,
  now,
}: {
  limit: number;
  now: Date;
}) {
  const rows = await selectDiscoveryRows()
    .from(Event)
    .where(
      and(
        isNull(Event.hackathonId),
        eq(Event.legacy, false),
        isNotNull(Event.publishedAt),
        isNull(Event.deletionIntentAt),
        gt(Event.end_datetime, now),
        eq(Event.isOperationsCalendar, false),
        emptyRoles(Event.roles),
        eq(Event.visibilityInternal, false),
        sql`cardinality(${Event.visibilityRoles}) = 0`,
      ),
    )
    .orderBy(asc(Event.start_datetime), asc(Event.id))
    .limit(limit);
  return rows.map(mapDiscoveryRow);
}

export async function loadReminderClubEventRecords(now: Date) {
  const horizon = new Date(now.getTime() + 9 * 24 * 60 * 60 * 1_000);
  const rows = await selectDiscoveryRows()
    .from(Event)
    .where(
      and(
        isNull(Event.hackathonId),
        eq(Event.legacy, false),
        isNotNull(Event.publishedAt),
        isNull(Event.deletionIntentAt),
        gt(Event.end_datetime, now),
        sql`${Event.start_datetime} < ${horizon}`,
        eq(Event.isOperationsCalendar, false),
        emptyRoles(Event.roles),
        eq(Event.visibilityInternal, false),
        sql`cardinality(${Event.visibilityRoles}) = 0`,
        isNotNull(Event.discordId),
        eq(Event.discordSyncState, "synced"),
        eq(Event.discordAppliedRevision, Event.syncRevision),
      ),
    )
    .orderBy(asc(Event.start_datetime), asc(Event.id));
  return rows.map(mapDiscoveryRow);
}

function memberAudienceVisible(
  duesColumn: typeof Event.dues_paying | typeof Event.visibilityDuesPaying,
  rolesColumn: typeof Event.roles | typeof Event.visibilityRoles,
  roleIds: readonly string[],
) {
  return or(
    eq(duesColumn, true),
    sql`cardinality(${rolesColumn}) = 0`,
    roleIds.length > 0
      ? sql`${rolesColumn} && ${varcharArray(roleIds)}`
      : sql`false`,
  );
}

export async function loadMemberClubEventRecords({
  memberRoleIds,
  now,
}: {
  memberRoleIds: readonly string[];
  now: Date;
}) {
  const rows = await selectDiscoveryRows()
    .from(Event)
    .where(
      and(
        isNull(Event.hackathonId),
        eq(Event.legacy, false),
        isNotNull(Event.publishedAt),
        isNull(Event.deletionIntentAt),
        gt(Event.end_datetime, now),
        memberAudienceVisible(Event.dues_paying, Event.roles, memberRoleIds),
        memberAudienceVisible(
          Event.visibilityDuesPaying,
          Event.visibilityRoles,
          memberRoleIds,
        ),
      ),
    )
    .orderBy(asc(Event.start_datetime), asc(Event.id))
    .limit(500);
  return rows.map(mapDiscoveryRow);
}

export async function loadEventDiscoveryRecordsByIds(
  eventIds: readonly string[],
) {
  if (eventIds.length === 0) return [];
  const rows = await selectDiscoveryRows()
    .from(Event)
    .where(inArray(Event.id, [...new Set(eventIds)]));
  return rows.map(mapDiscoveryRow);
}

export async function loadClubEventDiscoveryRecord(eventId: string) {
  const [row] = await selectDiscoveryRows()
    .from(Event)
    .where(and(eq(Event.id, eventId), isNull(Event.hackathonId)))
    .limit(1);
  return row ? toAdminEventDto(mapDiscoveryRow(row)) : null;
}

function audienceCondition(audience: "dues" | "public" | "roles") {
  if (audience === "dues") return eq(Event.dues_paying, true);
  if (audience === "roles") return sql`cardinality(${Event.roles}) > 0`;
  return and(eq(Event.dues_paying, false), emptyRoles(Event.roles));
}

function healthyIntegrationCondition() {
  return and(
    eq(Event.legacy, false),
    eq(Event.discordSyncState, "synced"),
    eq(Event.discordAppliedRevision, Event.syncRevision),
    eq(Event.googleSyncState, "synced"),
    eq(Event.googleAppliedRevision, Event.syncRevision),
  );
}

function integrationCondition(states: readonly string[]) {
  if (states.length === 0) return undefined;
  const healthy = healthyIntegrationCondition() ?? sql`false`;
  return or(
    ...states.map((state) => {
      if (state === "healthy" || state === "synced") return healthy;
      if (state === "needs-attention" || state === "needs_attention") {
        return and(eq(Event.legacy, false), not(healthy));
      }
      if (state === "unknown") {
        return or(
          eq(Event.discordSyncState, "unknown"),
          eq(Event.googleSyncState, "unknown"),
        );
      }
      if (state === "pending" || state === "error") {
        return or(
          eq(Event.discordSyncState, state),
          eq(Event.googleSyncState, state),
        );
      }
      return sql`false`;
    }),
  );
}

export async function queryAdminEventRecords(
  input: EventAdminQuery,
  now: Date,
) {
  const normalizedSearch = input.search
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
  const escapedSearch = normalizedSearch.replace(/[\\%_]/g, "\\$&");
  const searchPattern = `%${escapedSearch}%`;
  const searchable = sql<string>`regexp_replace(
    translate(
      lower(concat_ws(' ', ${Event.name}, ${Event.description}, ${Event.location}, ${Event.tag})),
      'áàâäãåéèêëíìîïóòôöõúùûüñç',
      'aaaaaaeeeeiiiiooooouuuunc'
    ),
    '[^a-z0-9]+',
    ' ',
    'g'
  )`;
  const normalizedName = sql<string>`regexp_replace(
    translate(
      lower(${Event.name}),
      'áàâäãåéèêëíìîïóòôöõúùûüñç',
      'aaaaaaeeeeiiiiooooouuuunc'
    ),
    '[^a-z0-9]+',
    ' ',
    'g'
  )`;
  const internal = input.internal.length === 1 ? input.internal[0] : undefined;
  const where = and(
    isNull(Event.hackathonId),
    normalizedSearch ? ilike(searchable, searchPattern) : undefined,
    input.timing === "upcoming"
      ? gt(Event.end_datetime, now)
      : input.timing === "past"
        ? sql`${Event.end_datetime} <= ${now}`
        : undefined,
    input.startDate
      ? sql`(${Event.end_datetime} at time zone 'America/New_York')::date >= ${input.startDate}::date`
      : undefined,
    input.endDate
      ? sql`(${Event.start_datetime} at time zone 'America/New_York')::date <= ${input.endDate}::date`
      : undefined,
    input.tags.length > 0 ? inArray(Event.tag, input.tags) : undefined,
    input.audiences.length > 0
      ? or(...input.audiences.map(audienceCondition))
      : undefined,
    input.roleIds.length > 0
      ? sql`${Event.roles} && ${varcharArray(input.roleIds)}`
      : undefined,
    internal === undefined
      ? undefined
      : eq(Event.isOperationsCalendar, internal),
    integrationCondition(input.integrationStates),
    input.view === "calendar" && input.calendarStart
      ? gt(Event.end_datetime, new Date(input.calendarStart))
      : undefined,
    input.view === "calendar" && input.calendarEnd
      ? sql`${Event.start_datetime} < ${new Date(input.calendarEnd)}`
      : undefined,
  );
  const sortExpression =
    input.sortField === "attendance"
      ? attendanceCount
      : input.sortField === "name"
        ? normalizedName
        : input.sortField === "tag"
          ? sql`lower(${Event.tag})`
          : Event.start_datetime;
  const ordered = input.sortDirection === "asc" ? asc : desc;

  if (input.view === "calendar") {
    const rows = await selectDiscoveryRows()
      .from(Event)
      .where(where)
      .orderBy(ordered(sortExpression), asc(Event.id));
    return { rows: rows.map(mapDiscoveryRow).map(toAdminEventDto) };
  }

  const [totalRow] = await db
    .select({ value: count(Event.id) })
    .from(Event)
    .where(where);
  const totalCount = totalRow?.value ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / input.pageSize));
  const page = Math.min(Math.max(1, input.page), pageCount);
  const rows = await selectDiscoveryRows()
    .from(Event)
    .where(where)
    .orderBy(ordered(sortExpression), asc(Event.id))
    .limit(input.pageSize)
    .offset((page - 1) * input.pageSize);
  return {
    pagination: { page, pageCount, pageSize: input.pageSize, totalCount },
    rows: rows.map(mapDiscoveryRow).map(toAdminEventDto),
  };
}

async function loadDuesStatus(memberId: string, now: Date) {
  const rows = await db
    .select()
    .from(DuesPayment)
    .where(eq(DuesPayment.memberId, memberId));
  return buildDuesStatus({ duesRows: rows, referenceDate: now }).paid;
}

export async function loadMemberDiscoveryRecord(
  userId: string,
  now = new Date(),
): Promise<MemberDiscoveryRecord | null> {
  const member = await db.query.Member.findFirst({
    where: eq(Member.userId, userId),
  });
  if (!member) return null;
  const assignments = await db
    .select({ roleId: Permissions.roleId })
    .from(Permissions)
    .where(eq(Permissions.userId, userId));
  return {
    discordUsername: member.discordUser,
    duesActive: await loadDuesStatus(member.id, now),
    email: member.email,
    firstName: member.firstName,
    id: member.id,
    lastName: member.lastName,
    roleIds: [...new Set(assignments.map(({ roleId }) => roleId))],
    userId,
  };
}

export async function loadMemberAttendanceRows(memberId: string) {
  return db
    .select({
      attendanceId: EventAttendee.id,
      checkedInAt: EventAttendee.checkedInAt,
      eventId: EventAttendee.eventId,
      memberId: EventAttendee.memberId,
      pointsAwarded: EventAttendee.pointsAwarded,
      pointsAwardedEstimated: EventAttendee.pointsAwardedEstimated,
    })
    .from(EventAttendee)
    .where(eq(EventAttendee.memberId, memberId));
}

export async function loadMinimalAttendees(eventId: string) {
  return db
    .select({
      attendanceId: EventAttendee.id,
      checkedInAt: EventAttendee.checkedInAt,
      discordUsername: Member.discordUser,
      memberId: Member.id,
      name: sql<string>`${Member.firstName} || ' ' || ${Member.lastName}`,
      operatorId: EventAttendee.checkedInBy,
      operatorName: User.name,
      pointsAwarded: EventAttendee.pointsAwarded,
      pointsAwardedEstimated: EventAttendee.pointsAwardedEstimated,
    })
    .from(EventAttendee)
    .innerJoin(Member, eq(Member.id, EventAttendee.memberId))
    .leftJoin(User, eq(User.id, EventAttendee.checkedInBy))
    .where(eq(EventAttendee.eventId, eventId))
    .orderBy(asc(Member.firstName), asc(Member.lastName));
}

export async function loadEventTags(includeArchived: boolean) {
  const rows = includeArchived
    ? await db.select().from(EventTag).orderBy(asc(EventTag.name))
    : await db
        .select()
        .from(EventTag)
        .where(eq(EventTag.active, true))
        .orderBy(asc(EventTag.name));
  return rows;
}

export async function searchCheckInMemberCandidates({
  limit,
  query,
}: {
  limit: number;
  query: string;
}) {
  const normalized = query
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
  const grams = (size: number) =>
    Array.from(
      { length: Math.max(0, normalized.length - size + 1) },
      (_, index) => normalized.slice(index, index + size),
    );
  const bigrams =
    normalized.length <= 1
      ? [normalized]
      : normalized.length === 2
        ? grams(1)
        : grams(2);
  const boundedBigrams =
    bigrams.length <= 12
      ? bigrams
      : bigrams.filter(
          (_, index) => index % Math.ceil(bigrams.length / 12) === 0,
        );
  const patterns = [
    ...new Set(
      boundedBigrams
        .filter(Boolean)
        .map((fragment) => `%${fragment.replace(/[\\%_]/g, "\\$&")}%`),
    ),
  ];
  const searchable = sql<string>`regexp_replace(
    translate(
      lower(concat_ws(' ', ${Member.firstName}, ${Member.lastName}, ${Member.discordUser}, ${Member.email})),
      'áàâäãåéèêëíìîïóòôöõúùûüñç',
      'aaaaaaeeeeiiiiooooouuuunc'
    ),
    '[^a-z0-9]+',
    ' ',
    'g'
  )`;
  const firstName = sql<string>`regexp_replace(translate(lower(${Member.firstName}), 'áàâäãåéèêëíìîïóòôöõúùûüñç', 'aaaaaaeeeeiiiiooooouuuunc'), '[^a-z0-9]+', '', 'g')`;
  const lastName = sql<string>`regexp_replace(translate(lower(${Member.lastName}), 'áàâäãåéèêëíìîïóòôöõúùûüñç', 'aaaaaaeeeeiiiiooooouuuunc'), '[^a-z0-9]+', '', 'g')`;
  const discord = sql<string>`regexp_replace(translate(lower(${Member.discordUser}), 'áàâäãåéèêëíìîïóòôöõúùûüñç', 'aaaaaaeeeeiiiiooooouuuunc'), '[^a-z0-9]+', '', 'g')`;
  const email = sql<string>`regexp_replace(translate(lower(${Member.email}), 'áàâäãåéèêëíìîïóòôöõúùûüñç', 'aaaaaaeeeeiiiiooooouuuunc'), '[^a-z0-9]+', '', 'g')`;
  const exactTier = sql<number>`case
    when ${normalized} in (${firstName}, ${lastName}, ${discord}, ${email}) then 3
    when ${firstName} like ${`${normalized}%`} or ${lastName} like ${`${normalized}%`} or ${discord} like ${`${normalized}%`} or ${email} like ${`${normalized}%`} then 2
    when replace(${searchable}, ' ', '') like ${`%${normalized}%`} then 1
    else 0
  end`;
  const typoPatterns =
    normalized.length >= 2 && normalized.length <= 4
      ? Array.from(
          { length: normalized.length },
          (_, index) =>
            `${normalized.slice(0, index)}_${normalized.slice(index + 1)}`,
        )
      : [];
  const typoTier = sql<number>`case when ${
    typoPatterns.length > 0
      ? or(
          ...typoPatterns.flatMap((pattern) => [
            sql`${firstName} like ${pattern}`,
            sql`${lastName} like ${pattern}`,
            sql`${discord} like ${pattern}`,
            sql`${email} like ${pattern}`,
          ]),
        )
      : sql`false`
  } then 1 else 0 end`;
  const gramScore =
    patterns.length > 0
      ? sql<number>`(${sql.join(
          patterns.map(
            (pattern) =>
              sql`case when ${searchable} ilike ${pattern} then 1 else 0 end`,
          ),
          sql` + `,
        )})`
      : sql<number>`0`;
  const candidates = await db
    .select({
      discordUsername: Member.discordUser,
      email: Member.email,
      firstName: Member.firstName,
      lastName: Member.lastName,
      memberId: Member.id,
      userId: Member.userId,
    })
    .from(Member)
    .where(
      patterns.length > 0
        ? or(...patterns.map((pattern) => ilike(searchable, pattern)))
        : undefined,
    )
    .orderBy(
      desc(exactTier),
      desc(typoTier),
      desc(gramScore),
      asc(Member.firstName),
      asc(Member.lastName),
      asc(Member.id),
    )
    .limit(Math.min(300, Math.max(100, limit * 20)));
  return rankCheckInIdentityCandidates(candidates, { limit, query });
}

export async function queryCheckInEventChoices({
  now,
  olderSearch,
}: {
  now: Date;
  olderSearch: string;
}) {
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1_000);
  const common = and(
    isNull(Event.hackathonId),
    isNull(Event.deletionIntentAt),
    or(eq(Event.legacy, true), isNotNull(Event.publishedAt)),
  );
  const choiceColumns = { id: Event.id, title: Event.name };
  const [current, recent] = await Promise.all([
    db
      .select(choiceColumns)
      .from(Event)
      .where(and(common, eq(Event.legacy, false), gte(Event.end_datetime, now)))
      .orderBy(
        asc(sql`case when ${Event.start_datetime} <= ${now} then 0 else 1 end`),
        asc(Event.start_datetime),
        asc(Event.id),
      ),
    db
      .select(choiceColumns)
      .from(Event)
      .where(
        and(
          common,
          eq(Event.legacy, false),
          gte(Event.end_datetime, sevenDaysAgo),
          sql`${Event.end_datetime} < ${now}`,
        ),
      )
      .orderBy(desc(Event.start_datetime), asc(Event.id)),
  ]);
  const normalizedSearch = olderSearch.trim();
  const older = normalizedSearch
    ? await db
        .select(choiceColumns)
        .from(Event)
        .where(
          and(
            common,
            or(
              eq(Event.legacy, true),
              sql`${Event.end_datetime} < ${sevenDaysAgo}`,
            ),
            ilike(
              Event.name,
              `%${normalizedSearch.replace(/[\\%_]/g, "\\$&")}%`,
            ),
          ),
        )
        .orderBy(desc(Event.start_datetime), asc(Event.id))
        .limit(100)
    : [];
  return { current, older, recent };
}
