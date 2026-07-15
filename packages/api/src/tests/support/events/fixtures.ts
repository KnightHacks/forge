export const EVENT_IDS = {
  public: "00000000-0000-4000-8000-000000000101",
  dues: "00000000-0000-4000-8000-000000000102",
  role: "00000000-0000-4000-8000-000000000103",
  internal: "00000000-0000-4000-8000-000000000104",
  partial: "00000000-0000-4000-8000-000000000105",
  legacy: "00000000-0000-4000-8000-000000000106",
  hackathon: "00000000-0000-4000-8000-000000000107",
  ended: "00000000-0000-4000-8000-000000000108",
  deletionPending: "00000000-0000-4000-8000-000000000109",
} as const;

export const MEMBER_IDS = {
  member: "00000000-0000-4000-8000-000000000201",
  other: "00000000-0000-4000-8000-000000000202",
} as const;

export const USER_IDS = {
  member: "00000000-0000-4000-8000-000000000301",
  operator: "00000000-0000-4000-8000-000000000302",
  other: "00000000-0000-4000-8000-000000000303",
} as const;

export const ROLE_IDS = {
  cosmetic: "00000000-0000-4000-8000-000000000401",
  other: "00000000-0000-4000-8000-000000000402",
} as const;

export const TAG_IDS = {
  workshop: "00000000-0000-4000-8000-000000000501",
} as const;

export const NOW = new Date("2026-07-01T16:00:00.000Z");

export type TestAudience = "dues" | "public" | "roles";
export type TestProviderState = "error" | "pending" | "synced" | "unknown";

export interface TestVisibility {
  audience: TestAudience;
  internal: boolean;
  roleIds: string[];
}

export interface TestProviderProjection {
  appliedDestination: string | null;
  appliedRevision: number | null;
  attemptRevision: number | null;
  attemptToken: string | null;
  id: string | null;
  state: TestProviderState | null;
}

export interface TestEventRecord {
  attendanceCount: number;
  audience: TestAudience;
  creationKey: string | null;
  deletionIntentAt: Date | null;
  description: string;
  discord: TestProviderProjection;
  discordChannel: { id: string; type: "stage" | "voice" } | null;
  discordNoProjectionAcknowledgedAt?: Date | null;
  discordNoProjectionAcknowledgedBy?: string | null;
  endAt: Date;
  google: TestProviderProjection;
  hackathonId: string | null;
  id: string;
  internal: boolean;
  legacy: boolean;
  legacyDuesRequired: boolean;
  location: string;
  name: string;
  points: number;
  publishedAt: Date | null;
  revision: number;
  roleIds: string[];
  startAt: Date;
  synchronizedVisibility: TestVisibility | null;
  tag: string;
  tagColor: string;
}

export interface TestMemberRecord {
  company: string | null;
  discordUsername: string;
  duesActive: boolean;
  email: string;
  firstName: string;
  guildProfileVisible: boolean;
  id: string;
  lastName: string;
  points: number;
  roleIds: string[];
  tagline: string | null;
  userId: string;
}

export interface TestAttendanceRecord {
  checkedInAt: Date | null;
  checkedInBy: string | null;
  eventId: string;
  id: string;
  memberId: string;
  operatorName: string | null;
  pointsAwarded: number | null;
  pointsAwardedEstimated: boolean;
}

const synchronizedProjection = (
  id: string,
  destination: string,
): TestProviderProjection => ({
  appliedDestination: destination,
  appliedRevision: 1,
  attemptRevision: null,
  attemptToken: null,
  id,
  state: "synced",
});

export function eventRecord(
  overrides: Partial<
    Omit<TestEventRecord, "discord" | "google" | "synchronizedVisibility">
  > & {
    discord?: Partial<TestProviderProjection>;
    google?: Partial<TestProviderProjection>;
    synchronizedVisibility?: TestVisibility | null;
  } = {},
): TestEventRecord {
  const audience = overrides.audience ?? "public";
  const internal = overrides.internal ?? false;
  const roleIds = overrides.roleIds ?? [];
  const base: TestEventRecord = {
    attendanceCount: 0,
    audience,
    creationKey: "create-key-1",
    deletionIntentAt: null,
    description: "Build something useful.",
    discord: synchronizedProjection(
      "discord-event-1",
      internal ? "voice:discord-channel-1" : "external",
    ),
    discordChannel: internal
      ? { id: "discord-channel-1", type: "voice" }
      : null,
    endAt: new Date("2026-07-02T00:00:00.000Z"),
    google: synchronizedProjection(
      "google-event-1",
      internal ? "internal-calendar" : "public-calendar",
    ),
    hackathonId: null,
    id: EVENT_IDS.public,
    internal,
    legacy: false,
    legacyDuesRequired: false,
    location: "ENG2 102",
    name: "TypeScript Workshop",
    points: 25,
    publishedAt: new Date("2026-06-30T16:00:00.000Z"),
    revision: 1,
    roleIds,
    startAt: new Date("2026-07-01T22:00:00.000Z"),
    synchronizedVisibility: { audience, internal, roleIds },
    tag: "Workshop",
    tagColor: "#7c3aed",
  };

  return {
    ...base,
    ...overrides,
    discord: { ...base.discord, ...overrides.discord },
    google: { ...base.google, ...overrides.google },
    synchronizedVisibility:
      overrides.synchronizedVisibility === undefined
        ? base.synchronizedVisibility
        : overrides.synchronizedVisibility,
  };
}

export function memberRecord(
  overrides: Partial<TestMemberRecord> = {},
): TestMemberRecord {
  return {
    company: "Knight Hacks",
    discordUsername: "member-one",
    duesActive: false,
    email: "member@example.test",
    firstName: "Member",
    guildProfileVisible: true,
    id: MEMBER_IDS.member,
    lastName: "One",
    points: 10,
    roleIds: [ROLE_IDS.cosmetic],
    tagline: "Builder and mentor",
    userId: USER_IDS.member,
    ...overrides,
  };
}

export function attendanceRecord(
  overrides: Partial<TestAttendanceRecord> = {},
): TestAttendanceRecord {
  return {
    checkedInAt: new Date("2026-07-01T22:05:00.000Z"),
    checkedInBy: USER_IDS.operator,
    eventId: EVENT_IDS.public,
    id: "00000000-0000-4000-8000-000000000601",
    memberId: MEMBER_IDS.member,
    operatorName: "Check-in Operator",
    pointsAwarded: 25,
    pointsAwardedEstimated: false,
    ...overrides,
  };
}

export function safeEventFixtureSet(): TestEventRecord[] {
  return [
    eventRecord({ id: EVENT_IDS.public }),
    eventRecord({
      audience: "dues",
      id: EVENT_IDS.dues,
      name: "Dues Dinner",
      startAt: new Date("2026-07-01T23:00:00.000Z"),
      synchronizedVisibility: {
        audience: "dues",
        internal: false,
        roleIds: [],
      },
    }),
    eventRecord({
      audience: "roles",
      id: EVENT_IDS.role,
      name: "Cosmetic Role Meetup",
      roleIds: [ROLE_IDS.cosmetic],
      synchronizedVisibility: {
        audience: "roles",
        internal: false,
        roleIds: [ROLE_IDS.cosmetic],
      },
    }),
    eventRecord({
      id: EVENT_IDS.internal,
      internal: true,
      name: "Internal Operations",
      synchronizedVisibility: {
        audience: "public",
        internal: true,
        roleIds: [],
      },
    }),
    eventRecord({
      discord: { id: null, state: "error" },
      id: EVENT_IDS.partial,
      name: "Partial Event",
      publishedAt: null,
      synchronizedVisibility: null,
    }),
    eventRecord({
      id: EVENT_IDS.legacy,
      legacy: true,
      name: "Legacy Event",
      publishedAt: null,
      synchronizedVisibility: null,
    }),
    eventRecord({
      hackathonId: "00000000-0000-4000-8000-000000000701",
      id: EVENT_IDS.hackathon,
      name: "Hackathon Event",
    }),
    eventRecord({
      endAt: new Date("2026-06-30T22:00:00.000Z"),
      id: EVENT_IDS.ended,
      name: "Ended Event",
      startAt: new Date("2026-06-30T21:00:00.000Z"),
    }),
    eventRecord({
      deletionIntentAt: new Date("2026-07-01T15:00:00.000Z"),
      id: EVENT_IDS.deletionPending,
      name: "Deleting Event",
    }),
  ];
}
