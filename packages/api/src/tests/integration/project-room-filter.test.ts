import { createHash, randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { Session } from "@forge/auth/server";
import type { DisposableDatabase } from "@forge/db/testing";
import {
  canRunDatabaseTests,
  provisionDisposableDatabase,
} from "@forge/db/testing";

import { permissionBitstring } from "../support/permissions";

describe.runIf(canRunDatabaseTests())("judge project room filter", () => {
  let disposable: DisposableDatabase;
  let database: typeof import("@forge/db/client").db;
  let schema: typeof import("@forge/db/schemas/knight-hacks");
  let auth: typeof import("@forge/db/schemas/auth");

  const hackathonId = randomUUID();
  const generalId = randomUUID();
  const mlhId = randomUUID();
  const memberUserId = randomUUID();
  const officerUserId = randomUUID();
  const memberJudgeId = randomUUID();
  const guestJudgeId = randomUUID();
  const roomIds: [string, string, string] = [
    randomUUID(),
    randomUUID(),
    randomUUID(),
  ];
  const mlhRoomId = randomUUID();
  const generalProjectIds = Array.from({ length: 13 }, randomUUID);
  const mlhProjectIds = Array.from({ length: 2 }, randomUUID);
  const session = {
    session: { id: "room-filter-member", userAgent: "vitest" },
    user: { id: memberUserId, name: "Room Judge" },
  } as unknown as Session;

  async function caller(input: { headers?: Headers; session: Session | null }) {
    const trpc = await import("../../trpc");
    const { projectsRouter } = await import("../../routers/projects");
    return trpc.createCallerFactory(
      trpc.createTRPCRouter({ projects: projectsRouter }),
    )({
      headers: input.headers ?? new Headers(),
      session: input.session,
      source: "project-room-filter-integration",
    });
  }

  const listInput = {
    challengeIds: [generalId],
    direction: "asc" as const,
    hackathonId,
    includeJudged: true,
    page: 1,
    pageSize: 10,
    query: "",
    showInRoomOnly: true,
    sort: "title" as const,
  };

  beforeAll(async () => {
    disposable = await provisionDisposableDatabase("project_room_filter");
    vi.stubEnv("DATABASE_URL", disposable.url);
    vi.stubEnv("JUDGING_ACCESS_SECRET", randomBytes(32).toString("hex"));
    // Other files in a full run may already have loaded the shared DB client.
    // Reload all runtime modules after installing the disposable URL.
    vi.resetModules();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-07T15:00:00Z"));
    database = (await import("@forge/db/client")).db;
    schema = await import("@forge/db/schemas/knight-hacks");
    auth = await import("@forge/db/schemas/auth");

    const memberRoleId = randomUUID();
    await database.insert(auth.User).values([
      {
        id: memberUserId,
        name: "Room Judge",
        discordUserId: "room-filter-judge",
      },
      {
        id: officerUserId,
        name: "Room Officer",
        discordUserId: "room-filter-officer",
      },
    ]);
    await database.insert(auth.Roles).values({
      id: memberRoleId,
      name: "Judges",
      discordRoleId: memberRoleId.replaceAll("-", ""),
      permissions: permissionBitstring("IS_OFFICER"),
    });
    await database.insert(auth.Permissions).values({
      roleId: memberRoleId,
      userId: memberUserId,
    });
    await database.insert(schema.Hackathon).values({
      id: hackathonId,
      name: `project-room-filter-${hackathonId}`,
      displayName: "Project room filter",
      theme: "Testing",
      startDate: new Date("2026-09-01T00:00:00Z"),
      endDate: new Date("2026-10-01T00:00:00Z"),
    });
    await database.insert(schema.ProjectChallenge).values([
      { id: generalId, hackathonId, label: "General" },
      { id: mlhId, hackathonId, label: "MLH Challenges" },
    ]);
    await database.insert(schema.JudgingRoom).values([
      ...roomIds.map((id, index) => ({
        id,
        hackathonId,
        challengeId: generalId,
        name: `General ${index + 1}`,
        displayOrder: index,
      })),
      {
        id: mlhRoomId,
        hackathonId,
        challengeId: mlhId,
        name: "MLH",
        displayOrder: 3,
      },
    ]);
    await database.insert(schema.Judge).values([
      {
        id: memberJudgeId,
        hackathonId,
        kind: "member",
        userId: memberUserId,
        displayName: "Room Judge",
      },
      {
        id: guestJudgeId,
        hackathonId,
        kind: "guest",
        displayName: "Guest Judge",
      },
    ]);
    const allProjects = [
      ...generalProjectIds.map((id, index) => ({
        challengeId: generalId,
        id,
        title: `General ${String(index).padStart(2, "0")}`,
      })),
      ...mlhProjectIds.map((id, index) => ({
        challengeId: mlhId,
        id,
        title: `MLH ${index}`,
      })),
    ];
    await database.insert(schema.Project).values(
      allProjects.map((project) => ({
        id: project.id,
        hackathonId,
        title: project.title,
        description: "Room filter test",
        participantCount: 1,
        submissionUrl: `https://${project.id}.example.test`,
        projectCreatedAt: new Date("2026-09-01T00:00:00Z"),
        submittedAt: new Date("2026-09-01T00:00:00Z"),
        prizeCategories:
          project.challengeId === mlhId ? ["MLH - Best Use of AI"] : [],
      })),
    );
    await database.insert(schema.ProjectToChallenge).values(
      allProjects.map((project) => ({
        projectId: project.id,
        challengeId: project.challengeId,
        hackathonId,
      })),
    );
  }, 120_000);

  afterAll(async () => {
    vi.useRealTimers();
    await database.$client.end();
    await disposable.drop();
    vi.unstubAllEnvs();
  });

  it("filters before count and pagination while preserving each fallback", async () => {
    const member = await caller({ session });

    const withoutSchedule = await member.projects.listJudge(listInput);
    expect(withoutSchedule.totalCount).toBe(13);

    const scheduleId = randomUUID();
    await database.insert(schema.JudgingSchedule).values({
      id: scheduleId,
      hackathonId,
      startsAt: new Date("2026-09-07T16:00:00Z"),
      endsAt: new Date("2026-09-07T18:00:00Z"),
      setupMinutes: 2,
      judgingMinutes: 6,
      teardownMinutes: 2,
      sameBuildingBreakMinutes: 10,
      differentBuildingBreakMinutes: 20,
      savedByUserId: officerUserId,
    });
    await database.insert(schema.JudgingAppointment).values(
      generalProjectIds.slice(0, 12).map((projectId, index) => {
        const roomId = roomIds.at(Math.floor(index / 4));
        if (!roomId) throw new Error("General room fixture missing.");
        const minute = String((index % 4) * 10).padStart(2, "0");
        const deadlineMinute = String((index % 4) * 10 + 6).padStart(2, "0");
        const endMinute = String((index % 4) * 10 + 9).padStart(2, "0");
        return {
          scheduleId,
          hackathonId,
          projectId,
          challengeId: generalId,
          roomId,
          startsAt: new Date(`2026-09-07T16:${minute}:00Z`),
          deadlineAt: new Date(`2026-09-07T16:${deadlineMinute}:00Z`),
          endsAt: new Date(`2026-09-07T16:${endMinute}:00Z`),
        };
      }),
    );

    const withoutRoom = await member.projects.listJudge(listInput);
    expect(withoutRoom.totalCount).toBe(13);
    expect(withoutRoom.roomFilterUnavailableReason).toMatch(
      /Choose a judging room/,
    );

    await database.insert(schema.JudgingRoomPresence).values({
      hackathonId,
      roomId: roomIds[0],
      judgeId: memberJudgeId,
    });
    const roomOnly = await member.projects.listJudge({
      ...listInput,
      page: 2,
    });
    expect(roomOnly.totalCount).toBe(4);
    expect(roomOnly.page).toBe(1);
    expect(roomOnly.projects.map((project) => project.id).sort()).toEqual(
      generalProjectIds.slice(0, 4).sort(),
    );

    const allRooms = await member.projects.listJudge({
      ...listInput,
      page: 2,
      showInRoomOnly: false,
    });
    expect(allRooms.totalCount).toBe(13);
    expect(allRooms.page).toBe(2);
    expect(allRooms.projects).toHaveLength(3);

    const mlh = await member.projects.listJudge({
      ...listInput,
      challengeIds: [mlhId],
    });
    expect(mlh.totalCount).toBe(2);
    expect(mlh.roomFilterUnavailableReason).toBe(
      "MLH judging is untimed, so room filtering is unavailable.",
    );
    expect(mlh.projects.map((project) => project.id).sort()).toEqual(
      mlhProjectIds.sort(),
    );

    const accessLinkId = randomUUID();
    const credential = randomBytes(32).toString("base64url");
    await database.insert(schema.JudgingRoomAccessLink).values({
      id: accessLinkId,
      hackathonId,
      roomId: roomIds[1],
      createdByUserId: officerUserId,
    });
    await database.insert(schema.GuestJudgeSession).values({
      hackathonId,
      accessLinkId,
      judgeId: guestJudgeId,
      tokenHash: createHash("sha256").update(credential).digest("hex"),
      completedAt: new Date(),
      expiresAt: new Date("2026-10-01T00:00:00Z"),
    });
    const guest = await caller({
      session: null,
      headers: new Headers({
        cookie: `blade_judging_guest=${credential}`,
      }),
    });
    const { hackathonId: _hackathonId, ...guestListInput } = listInput;
    const guestRoom = await guest.projects.listJudge(guestListInput);
    expect(guestRoom.totalCount).toBe(4);
    expect(guestRoom.projects.map((project) => project.id).sort()).toEqual(
      generalProjectIds.slice(4, 8).sort(),
    );
    const guestAllRooms = await guest.projects.listJudge({
      ...guestListInput,
      showInRoomOnly: false,
    });
    expect(guestAllRooms.totalCount).toBe(13);
  }, 120_000);
});
