import type {
  EventAdminDashboardProps,
  EventAdminData,
  EventChannelChoice,
  EventDetailData,
  EventIntegrationHealth,
  EventListItem,
  EventTagItem,
} from "./types";

type EventAdminInput = EventAdminDashboardProps["input"];

interface Projection {
  health: EventIntegrationHealth;
  id: string | null;
}

interface EventRow {
  attendanceCount: number;
  audience: "dues" | "public" | "roles";
  deletionPending: boolean;
  description: string;
  discord: Projection;
  discordChannel?: { id: string; type?: "stage" | "voice" } | null;
  endAt: Date | string;
  google: Projection;
  id: string;
  internal: boolean;
  legacy: boolean;
  location: string;
  name: string;
  points: number;
  published: boolean;
  revision: number;
  roleIds: string[];
  startAt: Date | string;
  tag: string;
  tagColor: string;
}

interface MinimalAttendee {
  attendanceId: string;
  checkedInAt: Date | string | null;
  discordUsername: string;
  memberId: string;
  name: string;
  operatorName: string | null;
  pointsAwarded: number | null;
  pointsAwardedEstimated: boolean;
}

interface RoleChoice {
  id: string;
  name: string;
}

function dateString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

function desiredChannel(
  row: EventRow,
  channels: readonly EventChannelChoice[],
) {
  const live = channels.find(
    (channel) => channel.id === row.discordChannel?.id,
  );
  return live ?? row.discordChannel;
}

export function eventRowToListItem(
  row: EventRow,
  channels: readonly EventChannelChoice[] = [],
): EventListItem {
  const channel = desiredChannel(row, channels);
  return {
    attendanceCount: row.attendanceCount,
    audience: row.audience,
    channelId: channel?.id,
    channelType: channel?.type,
    description: row.description,
    deletionPending: row.deletionPending,
    discordHealth: row.discord.health,
    endDateTime: dateString(row.endAt),
    googleHealth: row.google.health,
    id: row.id,
    internal: row.internal,
    legacy: row.legacy,
    location: row.location,
    name: row.name,
    points: row.points,
    roleIds: row.roleIds,
    startDateTime: dateString(row.startAt),
    tag: row.tag,
    tagColor: row.tagColor,
  };
}

export function eventRowsToAdminData({
  input,
  channels = [],
  pagination,
  roles,
  rows,
  tags,
}: {
  input: EventAdminInput;
  channels?: EventChannelChoice[];
  pagination?: {
    page: number;
    pageCount: number;
    pageSize: number;
    totalCount: number;
  };
  roles: RoleChoice[];
  rows: EventRow[];
  tags: EventTagItem[];
}): EventAdminData {
  return {
    events: rows.map((row) => eventRowToListItem(row, channels)),
    filterOptions: {
      audiences: ["public", "dues", "roles"],
      health: ["synced", "pending", "error", "unknown"],
      roles,
      tags: tags.map(({ color, id, name }) => ({ color, id, name })),
    },
    pagination: pagination ?? {
      page: 1,
      pageCount: 1,
      pageSize: input.pageSize,
      totalCount: rows.length,
    },
  };
}

export function eventRowToDetail({
  attendees,
  attendeesError = false,
  channels = [],
  roles,
  row,
}: {
  attendees: MinimalAttendee[];
  attendeesError?: boolean;
  channels?: EventChannelChoice[];
  roles: RoleChoice[];
  row: EventRow;
}): EventDetailData {
  const rolesById = new Map(roles.map((role) => [role.id, role.name]));
  const channel = desiredChannel(row, channels);
  return {
    attendees: attendees.map((attendee) => ({
      attendanceId: attendee.attendanceId,
      checkedInAt: attendee.checkedInAt
        ? dateString(attendee.checkedInAt)
        : null,
      checkedInBy: attendee.operatorName,
      discordUsername: attendee.discordUsername,
      estimated: attendee.pointsAwardedEstimated,
      memberId: attendee.memberId,
      name: attendee.name,
      pointsAwarded: attendee.pointsAwarded,
    })),
    attendeesError,
    event: {
      attendanceCount: row.attendanceCount,
      audience: row.audience,
      channelId: channel?.id,
      channelType: channel?.type,
      description: row.description,
      deletionPending: row.deletionPending,
      endDateTime: dateString(row.endAt),
      id: row.id,
      internal: row.internal,
      legacy: row.legacy,
      location: row.location,
      name: row.name,
      points: row.points,
      roles: row.roleIds.map((id) => ({
        id,
        name: rolesById.get(id) ?? "Linked Discord role",
      })),
      startDateTime: dateString(row.startAt),
      tag: row.tag,
      tagColor: row.tagColor,
    },
    integrations: {
      discord: {
        health: row.discord.health,
        url: row.discord.id
          ? `https://discord.com/events/486628710443778071/${row.discord.id}`
          : null,
      },
      google: {
        health: row.google.health,
        url: null,
      },
    },
  };
}

export function eventQueryInput(input: EventAdminInput) {
  const integrationStates = [...new Set(input.health)];
  return {
    audiences: input.audiences,
    ...(input.calendarEnd && input.calendarStart
      ? {
          calendarEnd: explicitNewYorkInstant(input.calendarEnd),
          calendarStart: explicitNewYorkInstant(input.calendarStart),
        }
      : {}),
    integrationStates,
    ...(input.endDate ? { endDate: input.endDate } : {}),
    internal: input.internal === "all" ? [] : [input.internal === "internal"],
    page: input.page,
    pageSize: input.pageSize,
    roleIds: input.roleIds,
    search: input.query,
    sortDirection: input.direction,
    sortField: input.sort,
    ...(input.startDate ? { startDate: input.startDate } : {}),
    tags: input.tags,
    timing: input.timing,
    view: input.view,
  };
}

/** Converts an instant to the explicit New York offset required by event APIs. */
export function explicitNewYorkInstant(value: Date | string) {
  const instant = value instanceof Date ? value : new Date(value);
  const formatter = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "longOffset",
    year: "numeric",
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(instant)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const offset = (parts.timeZoneName ?? "GMT-05:00").replace("GMT", "");
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${offset}`;
}
