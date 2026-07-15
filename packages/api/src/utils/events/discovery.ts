import { DISCORD } from "@forge/consts";

interface ProviderProjection {
  appliedRevision: number | null;
  id: string | null;
  state: "error" | "pending" | "synced" | "unknown" | null;
}

type Audience = "dues" | "public" | "roles";

interface Visibility {
  audience: Audience;
  internal: boolean;
  roleIds: string[];
}

export interface EventDiscoveryRecord {
  attendanceCount: number;
  audience: Audience;
  deletionIntentAt: Date | null;
  description: string;
  discord: ProviderProjection;
  endAt: Date;
  google: ProviderProjection;
  hackathonId: string | null;
  id: string;
  internal: boolean;
  legacy: boolean;
  location: string;
  name: string;
  points: number;
  publishedAt: Date | null;
  revision: number;
  roleIds: string[];
  startAt: Date;
  synchronizedVisibility: Visibility | null;
  tag: string;
  tagColor: string;
}

export interface MemberDiscoveryRecord {
  discordUsername: string;
  duesActive: boolean;
  email: string;
  firstName: string;
  id: string;
  lastName: string;
  roleIds: string[];
  userId: string;
}

interface AttendanceDiscoveryRecord {
  attendanceId?: string;
  checkedInAt: Date | null;
  eventId: string;
  memberId: string;
  pointsAwarded: number | null;
  pointsAwardedEstimated: boolean;
  id?: string;
}

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/\s+/g, " ")
    .trim();
}

function editDistance(left: string, right: string) {
  const prior = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const next = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      next[rightIndex] = Math.min(
        (prior[rightIndex] ?? 0) + 1,
        (next[rightIndex - 1] ?? 0) + 1,
        (prior[rightIndex - 1] ?? 0) + cost,
      );
    }
    prior.splice(0, prior.length, ...next);
  }
  return prior[right.length] ?? Number.POSITIVE_INFINITY;
}

function isActivePublished(event: EventDiscoveryRecord, now: Date) {
  return (
    event.hackathonId === null &&
    (event.legacy || event.publishedAt !== null) &&
    event.deletionIntentAt === null &&
    event.endAt > now
  );
}

function desiredVisibility(event: EventDiscoveryRecord): Visibility {
  return {
    audience: event.audience,
    internal: event.internal,
    roleIds: event.roleIds,
  };
}

function effectivePolicies(event: EventDiscoveryRecord) {
  const desired = [desiredVisibility(event)];
  if (event.legacy && event.audience === "dues" && event.roleIds.length > 0) {
    desired.push({
      audience: "roles",
      internal: event.internal,
      roleIds: event.roleIds,
    });
  }
  return [...desired, event.synchronizedVisibility].filter(
    (visibility): visibility is Visibility => visibility !== null,
  );
}

function memberPolicy(member: MemberDiscoveryRecord, visibility: Visibility) {
  if (visibility.audience === "public") return { locked: false, visible: true };
  if (visibility.audience === "dues") {
    return { locked: !member.duesActive, visible: true };
  }
  return {
    locked: false,
    visible: visibility.roleIds.some((roleId) =>
      member.roleIds.includes(roleId),
    ),
  };
}

function safeEvent(event: EventDiscoveryRecord) {
  return {
    description: event.description,
    endAt: event.endAt.toISOString(),
    id: event.id,
    location: event.location,
    name: event.name,
    startAt: event.startAt.toISOString(),
    tag: event.tag,
    tagColor: event.tagColor,
  };
}

export function listPublicClubEvents(
  events: readonly EventDiscoveryRecord[],
  { limit, now }: { limit: number; now: Date },
) {
  return events
    .filter((event) => {
      if (!isActivePublished(event, now)) return false;
      const policies = effectivePolicies(event);
      return policies.every(
        (visibility) => !visibility.internal && visibility.audience !== "roles",
      );
    })
    .sort(
      (left, right) =>
        left.startAt.getTime() - right.startAt.getTime() ||
        left.id.localeCompare(right.id),
    )
    .slice(0, Math.max(0, limit))
    .map((event) => ({
      ...safeEvent(event),
      requiresDues: effectivePolicies(event).some(
        (visibility) => visibility.audience === "dues",
      ),
    }));
}

export function listMemberEvents(
  events: readonly EventDiscoveryRecord[],
  { member, now }: { member: MemberDiscoveryRecord; now: Date },
) {
  return events
    .flatMap((event) => {
      if (!isActivePublished(event, now)) return [];
      const policies = effectivePolicies(event).map((visibility) =>
        memberPolicy(member, visibility),
      );
      if (!policies.every(({ visible }) => visible)) return [];
      const locked = policies.some((policy) => policy.locked);
      return [
        {
          ...safeEvent(event),
          attendanceCount: event.attendanceCount,
          audience: event.audience,
          discordUrl: event.discord.id
            ? `https://discord.com/events/${DISCORD.KNIGHTHACKS_GUILD}/${event.discord.id}`
            : null,
          internal: event.internal,
          locked,
          lockReason: locked ? ("dues_required" as const) : null,
          points: event.points,
        },
      ];
    })
    .sort(
      (left, right) =>
        left.startAt.localeCompare(right.startAt) ||
        left.id.localeCompare(right.id),
    );
}

export function listMemberAttendance(
  attendance: readonly AttendanceDiscoveryRecord[],
  events: readonly EventDiscoveryRecord[],
  { memberId }: { memberId: string },
) {
  const eventById = new Map(events.map((event) => [event.id, event]));
  return attendance
    .filter((row) => row.memberId === memberId)
    .flatMap((row) => {
      const event = eventById.get(row.eventId);
      if (event?.hackathonId !== null) return [];
      const attendanceId = row.attendanceId ?? row.id;
      if (!attendanceId) return [];
      return [
        {
          attendanceCount: event.attendanceCount,
          attendanceId,
          checkedInAt: row.checkedInAt?.toISOString() ?? null,
          description: event.description,
          endAt: event.endAt.toISOString(),
          eventId: event.id,
          location: event.location,
          name: event.name,
          pointsAwarded: row.pointsAwarded,
          startAt: event.startAt.toISOString(),
          tag: event.tag,
          tagColor: event.tagColor,
        },
      ];
    })
    .sort((left, right) => right.startAt.localeCompare(left.startAt));
}

type AdminQuery =
  | {
      direction: "asc" | "desc";
      filters: AdminFilters;
      mode: "calendar";
      now: Date;
      page: number;
      pageSize: number;
      search: string;
      sort: AdminSort;
      windowEnd: Date;
      windowStart: Date;
    }
  | {
      direction: "asc" | "desc";
      filters: AdminFilters;
      mode: "list";
      now: Date;
      page: number;
      pageSize: number;
      search: string;
      sort: AdminSort;
    };

interface AdminFilters {
  audiences: Audience[];
  endDate?: string;
  health: string[];
  internal: boolean | null;
  roleIds: string[];
  startDate?: string;
  tags: string[];
  timing: "all" | "past" | "upcoming";
}

type AdminSort = "attendance" | "name" | "start" | "tag";

function health(event: EventDiscoveryRecord) {
  if (event.legacy) return "legacy";
  return event.discord.state === "synced" &&
    event.discord.appliedRevision === event.revision &&
    event.google.state === "synced" &&
    event.google.appliedRevision === event.revision
    ? "healthy"
    : "needs_attention";
}

function matchesHealthFilter(
  event: EventDiscoveryRecord,
  filters: readonly string[],
) {
  if (filters.length === 0) return true;
  const aggregate = health(event);
  return filters.some((filter) => {
    if (filter === "healthy" || filter === "synced") {
      return aggregate === "healthy";
    }
    if (filter === "needs_attention" || filter === "needs-attention") {
      return aggregate === "needs_attention";
    }
    if (filter === "unknown") {
      return (
        event.discord.state === "unknown" || event.google.state === "unknown"
      );
    }
    if (filter === "pending" || filter === "error") {
      return event.discord.state === filter || event.google.state === filter;
    }
    return false;
  });
}

function compareEvents(
  left: EventDiscoveryRecord,
  right: EventDiscoveryRecord,
  sort: AdminSort,
) {
  if (sort === "attendance")
    return left.attendanceCount - right.attendanceCount;
  if (sort === "name")
    return normalize(left.name).localeCompare(normalize(right.name));
  if (sort === "tag")
    return normalize(left.tag).localeCompare(normalize(right.tag));
  return left.startAt.getTime() - right.startAt.getTime();
}

const newYorkDateFormatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/New_York",
  year: "numeric",
});

function newYorkDate(value: Date) {
  const parts = Object.fromEntries(
    newYorkDateFormatter
      .formatToParts(value)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function listAdminEvents(
  events: readonly EventDiscoveryRecord[],
  query: AdminQuery,
) {
  const search = normalize(query.search);
  const rows = events
    .filter((event) => event.hackathonId === null)
    .filter((event) => {
      const searchable = normalize(
        [event.name, event.description, event.location, event.tag].join(" "),
      );
      if (search && !searchable.includes(search)) return false;
      if (query.filters.timing === "upcoming" && event.endAt <= query.now)
        return false;
      if (query.filters.timing === "past" && event.endAt > query.now)
        return false;
      if (
        query.filters.startDate &&
        newYorkDate(event.endAt) < query.filters.startDate
      )
        return false;
      if (
        query.filters.endDate &&
        newYorkDate(event.startAt) > query.filters.endDate
      )
        return false;
      if (
        query.filters.tags.length > 0 &&
        !query.filters.tags.includes(event.tag)
      )
        return false;
      if (
        query.filters.audiences.length > 0 &&
        !query.filters.audiences.includes(event.audience)
      )
        return false;
      if (
        query.filters.roleIds.length > 0 &&
        !query.filters.roleIds.some((roleId) => event.roleIds.includes(roleId))
      )
        return false;
      if (
        query.filters.timing !== "past" &&
        !matchesHealthFilter(event, query.filters.health)
      )
        return false;
      if (
        query.filters.internal !== null &&
        event.internal !== query.filters.internal
      )
        return false;
      if (
        query.mode === "calendar" &&
        !(event.startAt < query.windowEnd && event.endAt > query.windowStart)
      )
        return false;
      return true;
    })
    .sort((left, right) => {
      const compared = compareEvents(left, right, query.sort);
      return (
        (query.direction === "asc" ? compared : -compared) ||
        left.id.localeCompare(right.id)
      );
    });

  if (query.mode === "calendar") return { rows };
  const totalCount = rows.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / query.pageSize));
  const page = Math.min(Math.max(1, query.page), pageCount);
  const start = (page - 1) * query.pageSize;
  return {
    pagination: { page, pageCount, pageSize: query.pageSize, totalCount },
    rows: rows.slice(start, start + query.pageSize),
  };
}

export function searchCheckInMembers(
  members: readonly MemberDiscoveryRecord[],
  { limit, query }: { limit: number; query: string },
) {
  return rankCheckInIdentityCandidates(
    members.map((member) => ({
      discordUsername: member.discordUsername,
      email: member.email,
      firstName: member.firstName,
      lastName: member.lastName,
      memberId: member.id,
      userId: member.userId,
    })),
    { limit, query },
  );
}

export function rankCheckInIdentityCandidates<
  Candidate extends {
    discordUsername: string;
    email: string;
    firstName: string;
    lastName: string;
    memberId: string;
    userId: string;
  },
>(
  candidates: readonly Candidate[],
  { limit, query }: { limit: number; query: string },
) {
  const search = normalize(query)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const tokens = search ? search.split(" ") : [];
  const ranked = candidates.flatMap((candidate) => {
    const searchable = normalize(
      [
        candidate.firstName,
        candidate.lastName,
        `${candidate.firstName} ${candidate.lastName}`,
        candidate.discordUsername,
        candidate.email,
      ].join(" "),
    )
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    const words = searchable.split(" ");
    const scores = tokens.map((token) => {
      if (searchable === token) return 1_000;
      if (words.includes(token)) return 950;
      if (words.some((word) => word.startsWith(token))) return 850;
      if (searchable.includes(token)) return 800;
      const distance = Math.min(
        ...words.map((word) => editDistance(token, word)),
      );
      const allowed = token.length <= 4 ? 1 : 2;
      return distance <= allowed ? 600 - distance * 50 : null;
    });
    if (scores.some((score) => score === null)) return [];
    return [
      {
        candidate,
        direct: searchable.includes(search),
        score: scores.reduce<number>((total, score) => total + (score ?? 0), 0),
      },
    ];
  });
  const relevant = ranked.some(({ direct }) => direct)
    ? ranked.filter(({ direct }) => direct)
    : ranked;
  return relevant
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.candidate.firstName.localeCompare(right.candidate.firstName) ||
        left.candidate.lastName.localeCompare(right.candidate.lastName) ||
        left.candidate.memberId.localeCompare(right.candidate.memberId),
    )
    .slice(0, limit)
    .map(({ candidate }) => ({
      discordUsername: candidate.discordUsername,
      email: candidate.email,
      memberId: candidate.memberId,
      name: `${candidate.firstName} ${candidate.lastName}`,
      userId: candidate.userId,
    }));
}

export function listCheckInEvents(
  events: readonly EventDiscoveryRecord[],
  { now }: { now: Date; olderSearch?: string },
) {
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1_000);
  const groups = {
    current: [] as { id: string; startAt: string; title: string }[],
    older: [] as { id: string; startAt: string; title: string }[],
    recent: [] as { id: string; startAt: string; title: string }[],
  };
  for (const event of events) {
    if (
      event.hackathonId !== null ||
      event.deletionIntentAt !== null ||
      (!event.legacy && event.publishedAt === null)
    )
      continue;
    const choice = {
      id: event.id,
      startAt: event.startAt.toISOString(),
      title: event.name,
    };
    if (event.endAt >= now) groups.current.push(choice);
    else if (event.endAt >= sevenDaysAgo) groups.recent.push(choice);
    else groups.older.push(choice);
  }
  const byId = new Map(events.map((event) => [event.id, event]));
  const newestFirst = (left: { id: string }, right: { id: string }) => {
    const leftEvent = byId.get(left.id);
    const rightEvent = byId.get(right.id);
    if (!leftEvent || !rightEvent) return left.id.localeCompare(right.id);
    return (
      rightEvent.startAt.getTime() - leftEvent.startAt.getTime() ||
      left.id.localeCompare(right.id)
    );
  };
  groups.current.sort(newestFirst);
  groups.recent.sort(newestFirst);
  groups.older.sort(newestFirst);
  return groups;
}
