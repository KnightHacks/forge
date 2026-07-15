import { NextResponse } from "next/server";

import { PERMISSIONS } from "@forge/consts";
import { eq, inArray } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, Roles, User } from "@forge/db/schemas/auth";
import { Event, EventAttendee, Member } from "@forge/db/schemas/knight-hacks";

import { isE2EAuthEnabled } from "~/server/auth";

const ids = {
  events: {
    ambiguousId: "e7000000-0000-4000-8000-000000000004",
    attendedId: "e7000000-0000-4000-8000-000000000001",
    deletableId: "e7000000-0000-4000-8000-000000000005",
    duesId: "e7000000-0000-4000-8000-000000000006",
    partialId: "e7000000-0000-4000-8000-000000000002",
    pastId: "e7000000-0000-4000-8000-000000000007",
    publishedId: "e7000000-0000-4000-8000-000000000003",
  },
  member: "e7000000-0000-4000-8000-000000000010",
  roles: {
    checkIn: "e7000000-0000-4000-8000-000000000021",
    editor: "e7000000-0000-4000-8000-000000000022",
    reader: "e7000000-0000-4000-8000-000000000023",
  },
  users: {
    checkInId: "e7000000-0000-4000-8000-000000000041",
    editorId: "e7000000-0000-4000-8000-000000000042",
    memberId: "e7000000-0000-4000-8000-000000000043",
    readerId: "e7000000-0000-4000-8000-000000000044",
    unauthorizedId: "e7000000-0000-4000-8000-000000000045",
  },
} as const;

const fixtureEventIds = Object.values(ids.events);
const fixtureRoleIds = Object.values(ids.roles);
const fixtureUserIds = Object.values(ids.users);

function permissionBitstring(...keys: PERMISSIONS.PermissionKey[]) {
  const length =
    Math.max(
      ...Object.values(PERMISSIONS.PERMISSION_DATA).map(({ idx }) => idx),
    ) + 1;
  const bits = Array.from({ length }, () => "0");
  for (const key of keys) {
    const permission = PERMISSIONS.PERMISSION_DATA[key];
    if (!permission) throw new Error(`Unknown permission: ${key}`);
    bits[permission.idx] = "1";
  }
  return bits.join("");
}

function atOffset(days: number, hour: number) {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + days);
  value.setUTCHours(hour, 0, 0, 0);
  return value;
}

async function cleanup() {
  await db
    .delete(EventAttendee)
    .where(inArray(EventAttendee.eventId, fixtureEventIds));
  await db
    .delete(Permissions)
    .where(inArray(Permissions.userId, fixtureUserIds));
  await db.delete(Member).where(eq(Member.id, ids.member));
  await db.delete(Event).where(inArray(Event.id, fixtureEventIds));
  await db.delete(Roles).where(inArray(Roles.id, fixtureRoleIds));
  await db.delete(User).where(inArray(User.id, fixtureUserIds));
}

export async function POST(request: Request) {
  if (!isE2EAuthEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as {
    scenario?: string;
  } | null;
  if (body?.scenario !== "event-management") {
    return NextResponse.json({ error: "Unknown scenario" }, { status: 400 });
  }

  await cleanup();

  await db.insert(User).values([
    {
      discordUserId: "e2e-event-reader",
      email: "event-reader@e2e.local",
      id: ids.users.readerId,
      name: "Event Reader",
    },
    {
      discordUserId: "e2e-event-editor",
      email: "event-editor@e2e.local",
      id: ids.users.editorId,
      name: "Event Editor",
    },
    {
      discordUserId: "e2e-event-checkin",
      email: "event-checkin@e2e.local",
      id: ids.users.checkInId,
      name: "Check-in Operator",
    },
    {
      discordUserId: "e2e-event-unauthorized",
      email: "event-unauthorized@e2e.local",
      id: ids.users.unauthorizedId,
      name: "No Event Access",
    },
    {
      discordUserId: "e2e-event-member",
      email: "ada@e2e.local",
      id: ids.users.memberId,
      name: "Ada Lovelace",
    },
  ]);

  await db.insert(Roles).values([
    {
      discordRoleId: "fixture-event-reader-role",
      id: ids.roles.reader,
      name: "Event Reader",
      permissions: permissionBitstring("READ_CLUB_EVENT"),
    },
    {
      discordRoleId: "fixture-event-editor-role",
      id: ids.roles.editor,
      name: "Event Editor",
      permissions: permissionBitstring("EDIT_CLUB_EVENT"),
    },
    {
      discordRoleId: "fixture-event-checkin-role",
      id: ids.roles.checkIn,
      name: "Check-in Operator",
      permissions: permissionBitstring("CHECKIN_CLUB_EVENT"),
    },
  ]);

  await db.insert(Permissions).values([
    { roleId: ids.roles.reader, userId: ids.users.readerId },
    { roleId: ids.roles.editor, userId: ids.users.editorId },
    { roleId: ids.roles.checkIn, userId: ids.users.checkInId },
  ]);

  await db.insert(Member).values({
    age: 30,
    discordUser: "ada",
    dob: "1995-12-10",
    email: "ada@e2e.local",
    firstName: "Ada",
    gender: "Prefer not to answer",
    gradDate: "2027-05-01",
    id: ids.member,
    lastName: "Lovelace",
    levelOfStudy: "Graduate University (Masters, Professional, Doctoral, etc)",
    major: "Computer Science",
    points: 10,
    raceOrEthnicity: "Prefer not to answer",
    school: "University of Central Florida",
    shirtSize: "M",
    userId: ids.users.memberId,
  });

  const publishedAt = new Date();
  const common = {
    description: "Build a typed API client with the Knight Hacks community.",
    dues_paying: false,
    googleAppliedCalendarId: "e2e-public-calendar",
    googleAppliedDestination: "public" as const,
    hackathonId: null,
    isOperationsCalendar: false,
    legacy: false,
    location: "ENG2 102",
    points: 10,
    publishedAt,
    roles: [] as string[],
    syncRevision: 1,
    tag: "Workshop",
    tagColor: "#CCA4F4",
    visibilityDuesPaying: false,
    visibilityInternal: false,
    visibilityRevision: 1,
    visibilityRoles: [] as string[],
  };
  await db.insert(Event).values([
    {
      ...common,
      creationKey: "e7000000-0000-4000-8000-000000000051",
      creationPayloadHash: "1".repeat(64),
      discordAppliedEntityType: "external",
      discordAppliedRevision: 1,
      discordId: "e2e-discord-attended",
      discordSyncState: "synced",
      end_datetime: atOffset(1, 23),
      googleAppliedRevision: 1,
      googleId: "e2e-google-attended",
      googleSyncState: "synced",
      id: ids.events.attendedId,
      name: "Check-in Workshop",
      start_datetime: atOffset(1, 21),
    },
    {
      ...common,
      creationKey: "e7000000-0000-4000-8000-000000000052",
      creationPayloadHash: "2".repeat(64),
      discordAppliedEntityType: "external",
      discordAppliedRevision: 1,
      discordId: "e2e-discord-partial",
      discordSyncState: "synced",
      end_datetime: atOffset(3, 23),
      googleAppliedCalendarId: null,
      googleAppliedDestination: null,
      googleAppliedRevision: null,
      googleId: null,
      googleLastError: "Calendar provider unavailable",
      googleSyncState: "error",
      id: ids.events.partialId,
      name: "Partial Sync Workshop",
      publishedAt: null,
      start_datetime: atOffset(3, 21),
    },
    {
      ...common,
      creationKey: "e7000000-0000-4000-8000-000000000053",
      creationPayloadHash: "3".repeat(64),
      discordAppliedEntityType: "external",
      discordAppliedRevision: 1,
      discordId: "e2e-discord-current",
      discordSyncState: "synced",
      end_datetime: atOffset(2, 23),
      googleAppliedRevision: 1,
      googleId: "e2e-google-current",
      googleSyncState: "synced",
      id: ids.events.publishedId,
      name: "Current Workshop",
      start_datetime: atOffset(2, 21),
    },
    {
      ...common,
      creationKey: "e7000000-0000-4000-8000-000000000054",
      creationPayloadHash: "4".repeat(64),
      discordOutboundAttemptedAt: new Date(),
      discordOutboundAttemptRevision: 1,
      discordOutboundAttemptToken: "e7000000-0000-4000-8000-000000000064",
      discordSyncState: "unknown",
      end_datetime: atOffset(4, 23),
      googleAppliedRevision: 1,
      googleId: "e2e-google-ambiguous",
      googleSyncState: "synced",
      id: ids.events.ambiguousId,
      name: "Ambiguous Discord Workshop",
      publishedAt: null,
      start_datetime: atOffset(4, 21),
    },
    {
      ...common,
      creationKey: "e7000000-0000-4000-8000-000000000055",
      creationPayloadHash: "5".repeat(64),
      discordAppliedEntityType: "external",
      discordAppliedRevision: 1,
      discordId: "e2e-discord-deletable",
      discordSyncState: "synced",
      end_datetime: atOffset(5, 23),
      googleAppliedRevision: 1,
      googleId: "e2e-google-deletable",
      googleSyncState: "synced",
      id: ids.events.deletableId,
      name: "Deletable Workshop",
      start_datetime: atOffset(5, 21),
    },
    {
      ...common,
      creationKey: "e7000000-0000-4000-8000-000000000056",
      creationPayloadHash: "6".repeat(64),
      discordAppliedEntityType: "external",
      discordAppliedRevision: 1,
      discordId: "e2e-discord-dues",
      discordSyncState: "synced",
      dues_paying: true,
      end_datetime: atOffset(6, 23),
      googleAppliedRevision: 1,
      googleId: "e2e-google-dues",
      googleSyncState: "synced",
      id: ids.events.duesId,
      name: "Dues Member Workshop",
      start_datetime: atOffset(6, 21),
      visibilityDuesPaying: true,
    },
    {
      ...common,
      creationKey: "e7000000-0000-4000-8000-000000000057",
      creationPayloadHash: "7".repeat(64),
      discordAppliedEntityType: "external",
      discordAppliedRevision: 1,
      discordId: "e2e-discord-past",
      discordLastError: "Discord discarded the completed event",
      discordSyncState: "error",
      end_datetime: atOffset(-1, 23),
      googleAppliedRevision: 1,
      googleId: "e2e-google-past",
      googleLastError: "Historical provider state",
      googleSyncState: "error",
      id: ids.events.pastId,
      name: "Past Workshop",
      start_datetime: atOffset(-1, 21),
    },
  ]);

  await db.insert(EventAttendee).values({
    checkedInAt: atOffset(-1, 21),
    checkedInBy: ids.users.checkInId,
    eventId: ids.events.publishedId,
    id: "e7000000-0000-4000-8000-000000000070",
    memberId: ids.member,
    pointsAwarded: 10,
    pointsAwardedEstimated: true,
  });

  return NextResponse.json(
    {
      events: ids.events,
      member: { id: ids.member, name: "Ada Lovelace" },
      users: {
        checkInId: ids.users.checkInId,
        editorId: ids.users.editorId,
        memberId: ids.users.memberId,
        readerId: ids.users.readerId,
        unauthorizedId: ids.users.unauthorizedId,
      },
    },
    { status: 201 },
  );
}

export async function DELETE() {
  if (!isE2EAuthEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await cleanup();
  return new NextResponse(null, { status: 204 });
}
