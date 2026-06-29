import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  EVENT_DISCORD_NO_PROJECTION_CONFIRMATION,
  eventAdminPageSizes,
  eventAdminQuerySchema,
  eventAttendanceRemovalSchema,
  eventAudienceSchema,
  eventCheckInMemberSchema,
  eventCheckInSearchSchema,
  eventCreateSchema,
  eventDiscordResolutionSchema,
  eventIdSchema,
  eventQrPayloadSchema,
  eventScheduleSchema,
  eventTagCreateSchema,
  eventTagUpdateSchema,
  eventUpdateSchema,
} from "../event-management";

const EVENT_ID = "00000000-0000-4000-8000-000000000001";
const MEMBER_ID = "00000000-0000-4000-8000-000000000002";
const ROLE_ID = "00000000-0000-4000-8000-000000000003";
const TAG_ID = "00000000-0000-4000-8000-000000000004";
const CANDIDATE_ID = "1459204271655489567";

const validCreateInput = {
  audience: { type: "public" as const },
  creationKey: "00000000-0000-4000-8000-000000000005",
  description: "Build together and meet the project teams.",
  end: "2026-07-12T20:00:00-04:00",
  internalTarget: { internal: false as const },
  location: "UCF Business Administration I, Room 107",
  name: "Project Launch",
  pointsOverride: 0,
  start: "2026-07-12T18:00:00-04:00",
  tagId: TAG_ID,
};

describe("event management validators", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-29T19:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("TC-006 accepts exactly the approved page sizes and URL defaults", () => {
    expect(eventAdminPageSizes).toEqual([25, 50, 100, 250, 500]);
    expect(eventAdminQuerySchema.parse({})).toMatchObject({
      audiences: [],
      integrationStates: [],
      internal: [],
      page: 1,
      pageSize: 25,
      roleIds: [],
      search: "",
      sortDirection: "asc",
      sortField: "start",
      tags: [],
      timing: "upcoming",
      view: "list",
    });

    for (const pageSize of eventAdminPageSizes) {
      expect(eventAdminQuerySchema.parse({ pageSize }).pageSize).toBe(pageSize);
    }

    for (const pageSize of [0, 10, 24, 26, 501]) {
      expect(() => eventAdminQuerySchema.parse({ pageSize })).toThrow();
    }
  });

  it("TC-006 parses compound list filters without collapsing OR categories", () => {
    const parsed = eventAdminQuerySchema.parse({
      audiences: ["public", "dues", "roles"],
      event: EVENT_ID,
      integrationStates: ["healthy", "needs-attention", "unknown"],
      internal: [true, false],
      page: 3,
      pageSize: 100,
      roleIds: [ROLE_ID],
      search: "  launch  ",
      sortDirection: "desc",
      sortField: "attendance",
      tags: ["GBM", "Workshop"],
      timing: "past",
      view: "list",
    });

    expect(parsed).toMatchObject({
      audiences: ["public", "dues", "roles"],
      event: EVENT_ID,
      integrationStates: ["healthy", "needs-attention", "unknown"],
      internal: [true, false],
      page: 3,
      pageSize: 100,
      roleIds: [ROLE_ID],
      search: "launch",
      sortDirection: "desc",
      sortField: "attendance",
      tags: ["GBM", "Workshop"],
      timing: "past",
      view: "list",
    });
    expect(eventAdminQuerySchema.parse({ timing: "upcoming" })).toMatchObject({
      sortDirection: "asc",
      sortField: "start",
    });
    expect(eventAdminQuerySchema.parse({ timing: "past" })).toMatchObject({
      sortDirection: "desc",
      sortField: "start",
    });
  });

  it("TC-006 rejects malformed query state and reversed calendar windows", () => {
    expect(
      eventAdminQuerySchema.parse({
        calendarEnd: "2026-08-01T04:00:00.000Z",
        calendarStart: "2026-07-01T04:00:00.000Z",
        endDate: "2026-08-31",
        startDate: "2026-08-01",
        view: "calendar",
      }),
    ).toMatchObject({
      calendarEnd: "2026-08-01T04:00:00.000Z",
      calendarStart: "2026-07-01T04:00:00.000Z",
      endDate: "2026-08-31",
      startDate: "2026-08-01",
    });
    expect(() =>
      eventAdminQuerySchema.parse({ roleIds: ["not-a-role"] }),
    ).toThrow();
    expect(() =>
      eventAdminQuerySchema.parse({ sortField: "provider-id" }),
    ).toThrow();
    expect(() => eventAdminQuerySchema.parse({ view: "unknown" })).toThrow();
    expect(() => eventAdminQuerySchema.parse({ view: "calendar" })).toThrow();
    expect(() =>
      eventAdminQuerySchema.parse({ internal: [true, true] }),
    ).toThrow();
    expect(() =>
      eventAdminQuerySchema.parse({ audiences: ["dues", "dues"] }),
    ).toThrow();
    expect(() =>
      eventAdminQuerySchema.parse({
        calendarEnd: "2026-07-01T00:00:00-04:00",
        calendarStart: "2026-08-01T00:00:00-04:00",
        view: "calendar",
      }),
    ).toThrow();
    expect(() =>
      eventAdminQuerySchema.parse({
        calendarStart: "not-a-date",
        view: "calendar",
      }),
    ).toThrow();
    expect(() =>
      eventAdminQuerySchema.parse({
        calendarStart: "2026-07-01T00:00:00-04:00",
        view: "calendar",
      }),
    ).toThrow();
    expect(() =>
      eventAdminQuerySchema.parse({
        calendarEnd: "2027-01-01T00:00:00Z",
        calendarStart: "2026-07-01T00:00:00Z",
        view: "calendar",
      }),
    ).toThrow();
    expect(() =>
      eventAdminQuerySchema.parse({
        endDate: "2026-07-01",
        startDate: "2026-08-01",
      }),
    ).toThrow();
    expect(() =>
      eventAdminQuerySchema.parse({ startDate: "2026-02-30" }),
    ).toThrow();
  });

  it("TC-006 and TC-007 validate shareable event UUID state", () => {
    expect(eventIdSchema.parse({ eventId: EVENT_ID })).toEqual({
      eventId: EVENT_ID,
    });
    expect(() => eventIdSchema.parse({ eventId: "event-1" })).toThrow();
    expect(() =>
      eventIdSchema.parse({ eventId: EVENT_ID, hackathonId: EVENT_ID }),
    ).toThrow();
  });

  it("TC-002 accepts exactly one new-event audience encoding", () => {
    expect(eventAudienceSchema.parse({ type: "public" })).toEqual({
      type: "public",
    });
    expect(eventAudienceSchema.parse({ type: "dues" })).toEqual({
      type: "dues",
    });
    expect(
      eventAudienceSchema.parse({ type: "roles", roleIds: [ROLE_ID] }),
    ).toEqual({ type: "roles", roleIds: [ROLE_ID] });
  });

  it("TC-NEG-004 rejects empty, malformed, duplicate, and combined audiences", () => {
    expect(() =>
      eventAudienceSchema.parse({ type: "roles", roleIds: [] }),
    ).toThrow();
    expect(() =>
      eventAudienceSchema.parse({ type: "roles", roleIds: ["not-a-uuid"] }),
    ).toThrow();
    expect(() =>
      eventAudienceSchema.parse({
        roleIds: [ROLE_ID, ROLE_ID],
        type: "roles",
      }),
    ).toThrow();
    expect(() =>
      eventAudienceSchema.parse({
        duesPaying: true,
        roleIds: [ROLE_ID],
        type: "dues",
      }),
    ).toThrow();
  });

  it("TC-NEG-003 accepts timed single-day and cross-DST multi-day ranges", () => {
    expect(
      eventScheduleSchema.parse({
        end: "2026-07-12T20:00:00-04:00",
        start: "2026-07-12T18:00:00-04:00",
      }),
    ).toMatchObject({
      end: "2026-07-12T20:00:00-04:00",
      start: "2026-07-12T18:00:00-04:00",
    });

    expect(
      eventScheduleSchema.parse({
        end: "2026-11-01T03:30:00-05:00",
        start: "2026-10-31T23:30:00-04:00",
      }),
    ).toBeDefined();
  });

  it("TC-NEG-003 requires explicit valid New York offsets at DST boundaries", () => {
    expect(() =>
      eventScheduleSchema.parse({
        end: "2026-03-08T04:00:00-04:00",
        start: "2026-03-08T02:30:00-05:00",
      }),
    ).toThrow();
    expect(() =>
      eventScheduleSchema.parse({
        end: "2026-11-01T02:30:00-05:00",
        start: "2026-11-01T01:30:00",
      }),
    ).toThrow();

    expect(
      eventScheduleSchema.parse({
        end: "2026-11-01T02:30:00-05:00",
        start: "2026-11-01T01:30:00-04:00",
      }),
    ).toBeDefined();
    expect(
      eventScheduleSchema.parse({
        end: "2026-11-01T02:30:00-05:00",
        start: "2026-11-01T01:30:00-05:00",
      }),
    ).toBeDefined();
  });

  it("TC-NEG-003 rejects malformed, unordered, and unsupported schedules", () => {
    for (const input of [
      {
        end: "2026-07-12T18:00:00-04:00",
        start: "2026-07-12T18:00:00-04:00",
      },
      {
        end: "2026-07-12T17:00:00-04:00",
        start: "2026-07-12T18:00:00-04:00",
      },
      { end: "tomorrow", start: "today" },
      {
        allDay: true,
        end: "2026-07-12T20:00:00-04:00",
        start: "2026-07-12T18:00:00-04:00",
      },
      {
        end: "2026-07-12T20:00:00-04:00",
        recurrence: "weekly",
        start: "2026-07-12T18:00:00-04:00",
      },
    ]) {
      expect(() => eventScheduleSchema.parse(input)).toThrow();
    }
  });

  it("TC-009 accepts a future create with zero-point override", () => {
    expect(eventCreateSchema.parse(validCreateInput)).toMatchObject({
      creationKey: validCreateInput.creationKey,
      pointsOverride: 0,
      tagId: TAG_ID,
    });
  });

  it("TC-NEG-003 rejects past creation and immutable/hackathon client fields", () => {
    expect(() =>
      eventCreateSchema.parse({
        ...validCreateInput,
        end: "2026-06-28T20:00:00-04:00",
        start: "2026-06-28T18:00:00-04:00",
      }),
    ).toThrow();
    expect(() =>
      eventCreateSchema.parse({
        ...validCreateInput,
        hackathonId: EVENT_ID,
      }),
    ).toThrow();
    expect(() =>
      eventCreateSchema.parse({
        ...validCreateInput,
        googleId: "client-controlled",
      }),
    ).toThrow();
  });

  it("TC-014 permits editing an existing historical event", () => {
    const { creationKey: _creationKey, ...editableFields } = validCreateInput;
    expect(
      eventUpdateSchema.parse({
        ...editableFields,
        end: "2025-06-28T20:00:00-04:00",
        eventId: EVENT_ID,
        start: "2025-06-28T18:00:00-04:00",
      }),
    ).toMatchObject({ eventId: EVENT_ID });
  });

  it("TC-009 enforces provider-compatible text and integer limits", () => {
    expect(() =>
      eventCreateSchema.parse({ ...validCreateInput, name: "x".repeat(101) }),
    ).toThrow();
    expect(() =>
      eventCreateSchema.parse({
        ...validCreateInput,
        description: "x".repeat(1001),
      }),
    ).toThrow();
    expect(() =>
      eventCreateSchema.parse({
        ...validCreateInput,
        location: "x".repeat(101),
      }),
    ).toThrow();
    expect(() =>
      eventCreateSchema.parse({ ...validCreateInput, pointsOverride: -1 }),
    ).toThrow();
    expect(() =>
      eventCreateSchema.parse({ ...validCreateInput, pointsOverride: 2.5 }),
    ).toThrow();
    expect(() =>
      eventCreateSchema.parse({
        ...validCreateInput,
        pointsOverride: 2_147_483_648,
      }),
    ).toThrow();
  });

  it("TC-010 validates voice and stage internal targets", () => {
    for (const channelType of ["voice", "stage"] as const) {
      expect(
        eventCreateSchema.parse({
          ...validCreateInput,
          internalTarget: {
            channelId: CANDIDATE_ID,
            channelType,
            internal: true,
          },
        }),
      ).toMatchObject({
        internalTarget: {
          channelId: CANDIDATE_ID,
          channelType,
          internal: true,
        },
      });
    }
  });

  it("TC-NEG-005 rejects absent, malformed, and unsupported internal targets", () => {
    for (const internalTarget of [
      { internal: true },
      { channelId: "not-a-snowflake", channelType: "voice", internal: true },
      { channelId: CANDIDATE_ID, channelType: "text", internal: true },
      { channelId: CANDIDATE_ID, channelType: "voice", internal: false },
    ]) {
      expect(() =>
        eventCreateSchema.parse({ ...validCreateInput, internalTarget }),
      ).toThrow();
    }
  });

  it("TC-016 validates normalized tag creation and safe updates", () => {
    expect(
      eventTagCreateSchema.parse({
        color: "#A855F7",
        defaultPoints: 0,
        name: "  Community Night  ",
      }),
    ).toMatchObject({
      color: "#A855F7",
      defaultPoints: 0,
      name: "Community Night",
    });

    expect(
      eventTagUpdateSchema.parse({
        color: "#22C55E",
        defaultPoints: 5,
        name: "Community Meetup",
        tagId: TAG_ID,
      }),
    ).toMatchObject({ tagId: TAG_ID });
  });

  it("TC-NEG-006 rejects malformed tags and client-owned normalized fields", () => {
    for (const input of [
      { color: "purple", defaultPoints: 10, name: "Workshop" },
      { color: "#A855F7", defaultPoints: -1, name: "Workshop" },
      { color: "#A855F7", defaultPoints: 1.5, name: "Workshop" },
      {
        color: "#A855F7",
        defaultPoints: 2_147_483_648,
        name: "Workshop",
      },
      { color: "#A855F7", defaultPoints: 10, name: "   " },
      {
        color: "#A855F7",
        defaultPoints: 10,
        name: "Workshop",
        normalizedName: "client-owned",
      },
    ]) {
      expect(() => eventTagCreateSchema.parse(input)).toThrow();
    }
    expect(() => eventTagUpdateSchema.parse({ tagId: TAG_ID })).toThrow();
  });

  it("TC-018 and TC-019 normalize raw and legacy QR account IDs", () => {
    expect(eventQrPayloadSchema.parse(EVENT_ID)).toEqual({ userId: EVENT_ID });
    expect(eventQrPayloadSchema.parse(`user:${EVENT_ID}`)).toEqual({
      userId: EVENT_ID,
    });
  });

  it("TC-NEG-008 rejects malformed, unknown-prefix, and padded QR payloads", () => {
    for (const payload of [
      "arbitrary text",
      "not-a-uuid",
      `member:${EVENT_ID}`,
      `user:not-a-uuid`,
    ]) {
      expect(() => eventQrPayloadSchema.parse(payload)).toThrow();
    }
  });

  it("TC-020 bounds and normalizes manual check-in search", () => {
    expect(
      eventCheckInSearchSchema.parse({ query: "  lenny  " }),
    ).toMatchObject({ query: "lenny" });
    expect(() => eventCheckInSearchSchema.parse({ query: "   " })).toThrow();
    expect(() =>
      eventCheckInSearchSchema.parse({ query: "x".repeat(101) }),
    ).toThrow();
    expect(() =>
      eventCheckInSearchSchema.parse({ limit: 501, query: "lenny" }),
    ).toThrow();
  });

  it("TC-NEG-007 keeps points and eligibility out of check-in input", () => {
    expect(
      eventCheckInMemberSchema.parse({
        eventId: EVENT_ID,
        memberId: MEMBER_ID,
      }),
    ).toEqual({ eventId: EVENT_ID, memberId: MEMBER_ID });

    for (const forged of [
      { points: 999 },
      { duesPaid: true },
      { eligibleRoleIds: [ROLE_ID] },
    ]) {
      expect(() =>
        eventCheckInMemberSchema.parse({
          eventId: EVENT_ID,
          memberId: MEMBER_ID,
          ...forged,
        }),
      ).toThrow();
    }
  });

  it("TC-024 validates attendance correction identity and acknowledgement", () => {
    expect(
      eventAttendanceRemovalSchema.parse({ attendanceId: EVENT_ID }),
    ).toEqual({ attendanceId: EVENT_ID, acknowledgeEstimated: false });
    expect(
      eventAttendanceRemovalSchema.parse({
        acknowledgeEstimated: true,
        attendanceId: EVENT_ID,
      }),
    ).toEqual({ acknowledgeEstimated: true, attendanceId: EVENT_ID });
    expect(() =>
      eventAttendanceRemovalSchema.parse({ attendanceId: "not-a-uuid" }),
    ).toThrow();
  });

  it("TC-013 and TC-034 validate explicit Discord projection resolution", () => {
    expect(
      eventDiscordResolutionSchema.parse({
        candidateId: CANDIDATE_ID,
        eventId: EVENT_ID,
        mode: "link-existing",
      }),
    ).toMatchObject({ mode: "link-existing" });
    expect(
      eventDiscordResolutionSchema.parse({
        eventId: EVENT_ID,
        mode: "confirm-create-new",
      }),
    ).toMatchObject({ mode: "confirm-create-new" });
    expect(
      eventDiscordResolutionSchema.parse({
        candidateSnapshotToken: "fresh-candidate-read-token",
        confirmation: EVENT_DISCORD_NO_PROJECTION_CONFIRMATION,
        eventId: EVENT_ID,
        mode: "confirm-no-projection",
      }),
    ).toMatchObject({ mode: "confirm-no-projection" });
  });

  it("TC-013 and TC-034 reject implicit, incompatible, and unsafe resolution", () => {
    expect(EVENT_DISCORD_NO_PROJECTION_CONFIRMATION).toBe(
      "I understand an unlinked Discord event may remain",
    );
    expect(() =>
      eventDiscordResolutionSchema.parse({
        eventId: EVENT_ID,
        mode: "link-existing",
      }),
    ).toThrow();
    expect(() =>
      eventDiscordResolutionSchema.parse({
        candidateId: CANDIDATE_ID,
        eventId: EVENT_ID,
        mode: "confirm-create-new",
      }),
    ).toThrow();
    expect(() =>
      eventDiscordResolutionSchema.parse({
        candidateSnapshotToken: "fresh-candidate-read-token",
        confirmation: "I am sure",
        eventId: EVENT_ID,
        mode: "confirm-no-projection",
      }),
    ).toThrow();
    expect(() =>
      eventDiscordResolutionSchema.parse({
        confirmation: EVENT_DISCORD_NO_PROJECTION_CONFIRMATION,
        eventId: EVENT_ID,
        mode: "confirm-no-projection",
      }),
    ).toThrow();
  });
});
