import type { AdminEventInput } from "./params";

export interface EventAdminAccess {
  canEdit: boolean;
  canRead: boolean;
  isOfficer: boolean;
}

export type EventAudience = "dues" | "public" | "roles";
export type EventIntegrationHealth = "error" | "pending" | "synced" | "unknown";

export interface EventListItem {
  attendanceCount: number;
  audience: EventAudience;
  channelId?: string;
  channelType?: "stage" | "voice";
  description?: string;
  deletionPending?: boolean;
  discordHealth: EventIntegrationHealth;
  endDateTime: string;
  googleHealth: EventIntegrationHealth;
  id: string;
  internal: boolean;
  legacy: boolean;
  location: string;
  name: string;
  points?: number;
  revision: number;
  roleIds?: string[];
  startDateTime: string;
  tag: string;
  tagColor: string;
}

export interface EventFilterOptions {
  audiences: string[];
  health: string[];
  roles: { id: string; name: string }[];
  tags: { color: string; id?: string; name: string }[];
}

export interface EventAdminData {
  events: EventListItem[];
  filterOptions: EventFilterOptions;
  pagination: {
    page: number;
    pageCount: number;
    pageSize: number;
    totalCount: number;
  };
}

export interface EventAttendeeItem {
  attendanceId?: string;
  checkedInAt: string | null;
  checkedInBy: string | null;
  discordUsername: string;
  estimated: boolean;
  memberId: string;
  name: string;
  pointsAwarded: number | null;
}

export interface EventDetailData {
  attendees: EventAttendeeItem[];
  attendeesError?: boolean;
  event: {
    attendanceCount: number;
    audience: EventAudience;
    channelId?: string;
    channelType?: "stage" | "voice";
    description: string;
    deletionPending: boolean;
    endDateTime: string;
    id: string;
    internal: boolean;
    legacy?: boolean;
    location: string;
    name: string;
    points: number;
    revision: number;
    roles: { id: string; name: string }[];
    startDateTime: string;
    tag: string;
    tagColor: string;
  };
  integrations: {
    discord: {
      health: EventIntegrationHealth;
      message?: string | null;
      url: string | null;
    };
    google: {
      health: EventIntegrationHealth;
      message?: string | null;
      url: string | null;
    };
  };
}

export interface CheckInEventChoice {
  id: string;
  startAt: string;
  title: string;
}

export interface EventChannelChoice {
  id: string;
  name: string;
  type: "stage" | "voice";
}

export interface CheckInEventGroups {
  current: CheckInEventChoice[];
  older: CheckInEventChoice[];
  recent: CheckInEventChoice[];
}

export interface EventAdminDashboardProps {
  access: EventAdminAccess;
  channels?: EventChannelChoice[];
  data: EventAdminData | null;
  detail: EventDetailData | null;
  input: AdminEventInput;
}

export interface EventTagItem {
  active: boolean;
  color: string;
  defaultPoints: number;
  id: string;
  name: string;
}
