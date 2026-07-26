import { describe, expect, it } from "vitest";

import {
  buildAlumniRecap,
  getAlumniDashboardMode,
  listActiveBulletinPosts,
  listCurrentAlumniOfficers,
} from "../../utils/alumni/dashboard";

const now = new Date("2026-07-25T12:00:00.000Z");

describe("alumni dashboard domain behavior", () => {
  it("TC-001 requires a one-time decision after the graduation date passes", () => {
    expect(
      getAlumniDashboardMode(
        {
          alumniConfirmedAt: null,
          gradDate: "2026-05-02",
        },
        now,
      ),
    ).toBe("needs_confirmation");
  });

  it("TC-003 shows the alumni experience only after confirmation", () => {
    expect(
      getAlumniDashboardMode(
        {
          alumniConfirmedAt: new Date("2026-05-03T00:00:00.000Z"),
          gradDate: "2026-05-02",
        },
        now,
      ),
    ).toBe("alumni");

    expect(
      getAlumniDashboardMode(
        {
          alumniConfirmedAt: null,
          gradDate: "2027-05-02",
        },
        now,
      ),
    ).toBe("current");
  });

  it("TC-006 calculates meaningful club-only recap fields without N/A values", () => {
    expect(
      buildAlumniRecap({
        attendances: [
          {
            eventName: "Intro to Git",
            eventType: "workshop",
            startAt: "2024-02-12T18:00:00.000Z",
            tagName: "Technical",
          },
          {
            eventName: "Resume Review",
            eventType: "professional",
            startAt: "2024-03-18T18:00:00.000Z",
            tagName: "Career",
          },
          {
            eventName: "GitHub Foundations",
            eventType: "workshop",
            startAt: "2024-09-10T18:00:00.000Z",
            tagName: "Technical",
          },
          {
            eventName: "Knight Hacks IX",
            eventType: "hackathon",
            startAt: "2024-10-20T18:00:00.000Z",
            tagName: "Hackathon",
          },
        ],
        member: {
          dateCreated: "2023-08-01T00:00:00.000Z",
          gradDate: "2025-05-02",
          points: 125,
        },
      }),
    ).toEqual({
      classOf: 2025,
      clubEventCount: 3,
      firstClubEvent: {
        name: "Intro to Git",
        occurredAt: "2024-02-12T18:00:00.000Z",
      },
      lifetimePoints: 125,
      memberSince: 2023,
      mostActiveSemester: "Spring 2024",
      mostAttendedTag: "Technical",
    });
  });

  it("TC-007 omits optional recap fields when no club history exists", () => {
    expect(
      buildAlumniRecap({
        attendances: [],
        member: {
          dateCreated: "2025-01-01T00:00:00.000Z",
          gradDate: "2026-05-02",
          points: 0,
        },
      }),
    ).toEqual({
      classOf: 2026,
      memberSince: 2025,
    });
  });

  it("TC-005 infers current officers in fixed order and supports co-officers", () => {
    expect(
      listCurrentAlumniOfficers([
        {
          discordUserId: "treasurer-discord",
          name: "Taylor Treasurer",
          profilePictureUrl: "https://example.com/taylor.webp",
          roleName: "Treasurer",
          userId: "treasurer-1",
        },
        {
          discordUserId: null,
          name: "Parker President",
          profilePictureUrl: null,
          roleName: "President",
          userId: "president-1",
        },
        {
          discordUserId: "president-discord",
          name: "Priya President",
          profilePictureUrl: null,
          roleName: "President",
          userId: "president-2",
        },
        {
          discordUserId: "dev-discord",
          name: "Dev Lead",
          profilePictureUrl: null,
          roleName: "Development Director",
          userId: "dev-1",
        },
      ]),
    ).toEqual([
      {
        discordUserId: null,
        email: "president@knighthacks.org",
        name: "Parker President",
        office: "President",
        profilePictureUrl: null,
        userId: "president-1",
      },
      {
        discordUserId: "president-discord",
        email: "president@knighthacks.org",
        name: "Priya President",
        office: "President",
        profilePictureUrl: null,
        userId: "president-2",
      },
      {
        discordUserId: "treasurer-discord",
        email: "treasurer@knighthacks.org",
        name: "Taylor Treasurer",
        office: "Treasurer",
        profilePictureUrl: "https://example.com/taylor.webp",
        userId: "treasurer-1",
      },
    ]);
  });

  it("TC-011 derives the active bulletin from state, schedule, expiry, and order", () => {
    const posts = [
      {
        archivedAt: null,
        displayOrder: 2,
        expiresAt: null,
        id: "second",
        publishAt: null,
        state: "published" as const,
      },
      {
        archivedAt: null,
        displayOrder: 1,
        expiresAt: "2026-07-26T00:00:00.000Z",
        id: "first",
        publishAt: "2026-07-01T00:00:00.000Z",
        state: "published" as const,
      },
      {
        archivedAt: null,
        displayOrder: 0,
        expiresAt: null,
        id: "draft",
        publishAt: null,
        state: "draft" as const,
      },
      {
        archivedAt: null,
        displayOrder: 0,
        expiresAt: null,
        id: "future",
        publishAt: "2026-08-01T00:00:00.000Z",
        state: "published" as const,
      },
      {
        archivedAt: null,
        displayOrder: 0,
        expiresAt: "2026-07-01T00:00:00.000Z",
        id: "expired",
        publishAt: null,
        state: "published" as const,
      },
    ];

    expect(listActiveBulletinPosts(posts, now).map((post) => post.id)).toEqual([
      "first",
      "second",
    ]);
  });
});
