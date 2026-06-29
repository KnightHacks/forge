import { describe, expect, it } from "vitest";

import {
  listAdminEvents,
  listCheckInEvents,
  listMemberAttendance,
  listMemberEvents,
  listPublicClubEvents,
  searchCheckInMembers,
} from "../../utils/events/discovery";
import {
  attendanceRecord,
  EVENT_IDS,
  eventRecord,
  MEMBER_IDS,
  memberRecord,
  NOW,
  ROLE_IDS,
  safeEventFixtureSet,
} from "../support/events/fixtures";

describe("event discovery policy", () => {
  it("[TC-001] returns only bounded, safe, eligible public Club events", () => {
    const rows = safeEventFixtureSet();
    const result = listPublicClubEvents(rows, { limit: 25, now: NOW });

    expect(result.map((event) => event.id)).toEqual([
      EVENT_IDS.public,
      EVENT_IDS.dues,
    ]);
    expect(result[1]).toMatchObject({ requiresDues: true });
    for (const event of result) {
      expect(Object.keys(event).sort()).toEqual(
        [
          "description",
          "endAt",
          "id",
          "location",
          "name",
          "requiresDues",
          "startAt",
          "tag",
          "tagColor",
        ].sort(),
      );
      expect(event).not.toHaveProperty("discord");
      expect(event).not.toHaveProperty("google");
      expect(event).not.toHaveProperty("roleIds");
      expect(event).not.toHaveProperty("attendanceCount");
      expect(event).not.toHaveProperty("points");
    }
  });

  it("[TC-001] orders public results by start and applies the caller limit", () => {
    const rows = [
      eventRecord({
        id: "00000000-0000-4000-8000-000000000121",
        startAt: new Date("2026-07-01T23:00:00.000Z"),
      }),
      eventRecord({
        id: "00000000-0000-4000-8000-000000000120",
        startAt: new Date("2026-07-01T22:00:00.000Z"),
      }),
    ];

    expect(
      listPublicClubEvents(rows, { limit: 1, now: NOW }).map(
        (event) => event.id,
      ),
    ).toEqual(["00000000-0000-4000-8000-000000000120"]);
  });

  it("[TC-002] shows dues locked, matching roles, and eligible Internal events to a member", () => {
    const member = memberRecord();
    const events = [
      ...safeEventFixtureSet(),
      eventRecord({
        audience: "roles",
        id: "00000000-0000-4000-8000-000000000122",
        internal: true,
        roleIds: [ROLE_IDS.cosmetic],
        synchronizedVisibility: {
          audience: "roles",
          internal: true,
          roleIds: [ROLE_IDS.cosmetic],
        },
      }),
      eventRecord({
        audience: "roles",
        id: "00000000-0000-4000-8000-000000000123",
        roleIds: [ROLE_IDS.other],
        synchronizedVisibility: {
          audience: "roles",
          internal: false,
          roleIds: [ROLE_IDS.other],
        },
      }),
    ];

    const result = listMemberEvents(events, { member, now: NOW });

    expect(new Set(result.map((event) => event.id))).toEqual(
      new Set([
        EVENT_IDS.public,
        EVENT_IDS.dues,
        EVENT_IDS.role,
        EVENT_IDS.internal,
        "00000000-0000-4000-8000-000000000122",
      ]),
    );
    expect(result.find((event) => event.id === EVENT_IDS.dues)).toMatchObject({
      locked: true,
      lockReason: "dues_required",
    });
    for (const event of result) {
      expect(event).not.toHaveProperty("discord");
      expect(event).not.toHaveProperty("google");
      expect(event).not.toHaveProperty("integrationState");
    }
  });

  it("[TC-003] uses effective dues rather than stale or inactive rows", () => {
    const duesEvent = eventRecord({
      audience: "dues",
      id: EVENT_IDS.dues,
      synchronizedVisibility: {
        audience: "dues",
        internal: false,
        roleIds: [],
      },
    });

    expect(
      listMemberEvents([duesEvent], {
        member: memberRecord({ duesActive: true }),
        now: NOW,
      })[0],
    ).toMatchObject({ locked: false });
    expect(
      listMemberEvents([duesEvent], {
        member: memberRecord({ duesActive: false }),
        now: NOW,
      })[0],
    ).toMatchObject({ locked: true, lockReason: "dues_required" });
  });

  it("[TC-004, TC-029] preserves member-owned attendance history after eligibility changes", () => {
    const event = eventRecord({
      audience: "roles",
      endAt: new Date("2025-01-01T17:00:00.000Z"),
      id: EVENT_IDS.legacy,
      legacy: true,
      publishedAt: null,
      roleIds: [ROLE_IDS.other],
      startAt: new Date("2025-01-01T16:00:00.000Z"),
      synchronizedVisibility: null,
    });
    const attendance = attendanceRecord({
      checkedInAt: null,
      checkedInBy: null,
      eventId: event.id,
      operatorName: null,
      pointsAwarded: 35,
      pointsAwardedEstimated: true,
    });

    const result = listMemberAttendance([attendance], [event], {
      memberId: MEMBER_IDS.member,
    });

    expect(result).toEqual([
      expect.objectContaining({
        eventId: event.id,
        legacy: true,
        pointsAwarded: 35,
        pointsAwardedEstimated: true,
      }),
    ]);
  });

  it("[TC-006] combines normalized search and filter categories deterministically", () => {
    const rows = [
      eventRecord({
        attendanceCount: 3,
        audience: "dues",
        description: "Résumé review",
        id: "00000000-0000-4000-8000-000000000131",
        name: "Career Night",
        synchronizedVisibility: {
          audience: "dues",
          internal: false,
          roleIds: [],
        },
        tag: "Career",
      }),
      eventRecord({
        attendanceCount: 3,
        audience: "public",
        description: "Resume review",
        id: "00000000-0000-4000-8000-000000000132",
        name: "Career Night",
        tag: "Workshop",
      }),
      eventRecord({
        attendanceCount: 9,
        audience: "roles",
        description: "Resume review",
        id: "00000000-0000-4000-8000-000000000133",
        name: "Private Career Night",
        roleIds: [ROLE_IDS.other],
        synchronizedVisibility: {
          audience: "roles",
          internal: false,
          roleIds: [ROLE_IDS.other],
        },
        tag: "Career",
      }),
    ];

    const result = listAdminEvents(rows, {
      direction: "asc",
      filters: {
        audiences: ["dues", "roles"],
        health: ["healthy"],
        internal: null,
        roleIds: [ROLE_IDS.other],
        tags: ["Career", "Workshop"],
        timing: "upcoming",
      },
      mode: "list",
      now: NOW,
      page: 1,
      pageSize: 25,
      search: "resume",
      sort: "attendance",
    });

    expect(result.rows.map((event) => event.id)).toEqual([
      "00000000-0000-4000-8000-000000000133",
    ]);
    expect(result.pagination).toEqual({
      page: 1,
      pageCount: 1,
      pageSize: 25,
      totalCount: 1,
    });
  });

  it("[TC-006] applies exact pagination and Event UUID tie-breaking", () => {
    const rows = Array.from({ length: 27 }, (_, index) =>
      eventRecord({
        id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
        name: "Same name",
      }),
    );

    const result = listAdminEvents(rows, {
      direction: "asc",
      filters: {
        audiences: [],
        health: [],
        internal: null,
        roleIds: [],
        tags: [],
        timing: "upcoming",
      },
      mode: "list",
      now: NOW,
      page: 2,
      pageSize: 25,
      search: "",
      sort: "name",
    });

    expect(result.pagination).toEqual({
      page: 2,
      pageCount: 2,
      pageSize: 25,
      totalCount: 27,
    });
    expect(result.rows.map((event) => event.id)).toEqual([
      "00000000-0000-4000-8000-000000000026",
      "00000000-0000-4000-8000-000000000027",
    ]);
  });

  it("[TC-006] returns all calendar intersections without list pagination", () => {
    const rows = Array.from({ length: 30 }, (_, index) => {
      const startAt = new Date(
        `2026-07-${String((index % 15) + 1).padStart(2, "0")}T22:00:00.000Z`,
      );
      return eventRecord({
        endAt: new Date(startAt.getTime() + 60 * 60 * 1_000),
        id: `00000000-0000-4000-8001-${String(index + 1).padStart(12, "0")}`,
        startAt,
      });
    });

    const result = listAdminEvents(rows, {
      direction: "asc",
      filters: {
        audiences: [],
        health: [],
        internal: null,
        roleIds: [],
        tags: [],
        timing: "all",
      },
      mode: "calendar",
      now: NOW,
      page: 2,
      pageSize: 25,
      search: "",
      sort: "start",
      windowEnd: new Date("2026-08-01T04:00:00.000Z"),
      windowStart: new Date("2026-07-01T04:00:00.000Z"),
    });

    expect(result.rows).toHaveLength(30);
    expect(result).not.toHaveProperty("pagination");
  });

  it("[TC-014] applies visibility narrowing immediately and delays broadening", () => {
    const narrowing = eventRecord({
      audience: "dues",
      discord: { appliedRevision: 1, state: "pending" },
      google: { appliedRevision: 1, state: "pending" },
      revision: 2,
      synchronizedVisibility: {
        audience: "public",
        internal: false,
        roleIds: [],
      },
    });
    const broadening = eventRecord({
      audience: "public",
      discord: { appliedRevision: 1, state: "pending" },
      google: { appliedRevision: 1, state: "pending" },
      revision: 2,
      synchronizedVisibility: {
        audience: "dues",
        internal: false,
        roleIds: [],
      },
    });

    expect(
      listMemberEvents([narrowing], {
        member: memberRecord({ duesActive: false }),
        now: NOW,
      })[0],
    ).toMatchObject({ locked: true, lockReason: "dues_required" });
    expect(
      listMemberEvents([broadening], {
        member: memberRecord({ duesActive: false }),
        now: NOW,
      })[0],
    ).toMatchObject({ locked: true, lockReason: "dues_required" });
  });

  it("[TC-020] limits manual check-in lookup to minimal identity", () => {
    const members = [
      memberRecord(),
      memberRecord({
        discordUsername: "other-discord",
        email: "other@example.test",
        firstName: "Other",
        id: MEMBER_IDS.other,
        lastName: "Member",
      }),
    ];

    for (const query of ["Member One", "member-one", "member@example.test"]) {
      const result = searchCheckInMembers(members, { limit: 10, query });
      expect(result).toEqual([
        {
          discordUsername: "member-one",
          email: "member@example.test",
          memberId: MEMBER_IDS.member,
          name: "Member One",
          userId: memberRecord().userId,
        },
      ]);
      expect(result[0]).not.toHaveProperty("points");
      expect(result[0]).not.toHaveProperty("roleIds");
      expect(result[0]).not.toHaveProperty("duesActive");
    }
  });

  it("[TC-032] prioritizes current/recent choices while keeping older and Legacy Club events searchable", () => {
    const current = eventRecord({ id: EVENT_IDS.public, name: "Current" });
    const recent = eventRecord({
      endAt: new Date("2026-07-01T15:00:00.000Z"),
      id: EVENT_IDS.ended,
      name: "Recent",
      startAt: new Date("2026-07-01T14:00:00.000Z"),
    });
    const old = eventRecord({
      endAt: new Date("2025-01-01T17:00:00.000Z"),
      id: "00000000-0000-4000-8000-000000000125",
      name: "Old but published",
      startAt: new Date("2025-01-01T16:00:00.000Z"),
    });
    const legacy = eventRecord({
      endAt: new Date("2024-01-01T17:00:00.000Z"),
      id: EVENT_IDS.legacy,
      legacy: true,
      name: "Legacy searchable",
      publishedAt: null,
      startAt: new Date("2024-01-01T16:00:00.000Z"),
      synchronizedVisibility: null,
    });
    const excluded = [
      eventRecord({
        id: EVENT_IDS.partial,
        publishedAt: null,
        synchronizedVisibility: null,
      }),
      eventRecord({
        deletionIntentAt: NOW,
        id: EVENT_IDS.deletionPending,
      }),
      eventRecord({
        hackathonId: "00000000-0000-4000-8000-000000000701",
        id: EVENT_IDS.hackathon,
      }),
    ];

    const defaultChoices = listCheckInEvents(
      [current, recent, old, legacy, ...excluded],
      { now: NOW, olderSearch: "" },
    );
    expect(defaultChoices).toEqual(
      expect.objectContaining({
        current: [
          expect.objectContaining({ id: current.id, title: "Current" }),
        ],
        recent: [expect.objectContaining({ id: recent.id, title: "Recent" })],
      }),
    );
    expect(defaultChoices).not.toHaveProperty("eventDetails");

    const olderChoices = listCheckInEvents(
      [current, recent, old, legacy, ...excluded],
      { now: NOW, olderSearch: "searchable" },
    );
    expect(olderChoices.older).toEqual([
      expect.objectContaining({ id: legacy.id, title: "Legacy searchable" }),
    ]);
    expect(JSON.stringify(olderChoices)).not.toContain(EVENT_IDS.partial);
    expect(JSON.stringify(olderChoices)).not.toContain(EVENT_IDS.hackathon);
    expect(JSON.stringify(olderChoices)).not.toContain(
      EVENT_IDS.deletionPending,
    );
  });
});
