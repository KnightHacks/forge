import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { Session } from "@forge/auth/server";
import type { DisposableDatabase } from "@forge/db/testing";
import { eq } from "@forge/db";
import {
  canRunDatabaseTests,
  provisionDisposableDatabase,
} from "@forge/db/testing";

import { permissionBitstring } from "../support/permissions";

describe.runIf(canRunDatabaseTests())("judging reset operations", () => {
  let disposable: DisposableDatabase;
  let client: typeof import("@forge/db/client").db;
  let schema: typeof import("@forge/db/schemas/knight-hacks");
  let caller: Awaited<ReturnType<typeof createOfficerCaller>>;
  let unauthorizedCaller: Awaited<ReturnType<typeof createCaller>>;

  const officerId = randomUUID();
  const unauthorizedUserId = randomUUID();
  const hackathonId = randomUUID();
  const challengeId = randomUUID();
  const projectId = randomUUID();
  const memberId = randomUUID();
  const roomId = randomUUID();
  const spareRoomId = randomUUID();
  const judgeId = randomUUID();
  const spareJudgeId = randomUUID();
  const spareLinkId = randomUUID();
  const scheduleId = randomUUID();
  const appointmentId = randomUUID();
  const scheduleJobId = randomUUID();
  const evaluationId = randomUUID();
  const rubricId = randomUUID();
  const responseRubricId = randomUUID();
  const buildingId = randomUUID();

  async function createCaller(userId: string, name: string) {
    const trpc = await import("../../trpc");
    const { judgingRouter } = await import("../../routers/judging");
    return trpc.createCallerFactory(
      trpc.createTRPCRouter({ judging: judgingRouter }),
    )({
      headers: new Headers(),
      session: {
        session: { id: "judging-reset", userAgent: "vitest" },
        user: { id: userId, name },
      } as unknown as Session,
      source: "judging-reset-integration",
    });
  }

  function createOfficerCaller() {
    return createCaller(officerId, "Reset Officer");
  }

  async function insertEvaluation() {
    await client.insert(schema.ProjectEvaluation).values({
      appointmentId,
      challengeId,
      hackathonId,
      id: evaluationId,
      judgeId,
      projectId,
    });
    await client.insert(schema.ProjectEvaluationDraft).values({
      appointmentId,
      baseEvaluationRevision: 1,
      challengeId,
      evaluationId,
      hackathonId,
      judgeId,
      projectId,
    });
    await client.insert(schema.ProjectEvaluationRevision).values({
      actorKind: "member",
      evaluationId,
      hackathonId,
      revision: 1,
    });
    await client.insert(schema.ProjectEvaluationRating).values({
      evaluationId,
      hackathonId,
      rubricItemId: rubricId,
      value: 4,
    });
    await client.insert(schema.ProjectEvaluationResponse).values({
      evaluationId,
      hackathonId,
      isPublic: true,
      rubricItemId: responseRubricId,
      value: "Reset feedback",
    });
  }

  beforeAll(async () => {
    disposable = await provisionDisposableDatabase("judging_reset");
    vi.stubEnv("DATABASE_URL", disposable.url);
    client = (await import("@forge/db/client")).db;
    schema = await import("@forge/db/schemas/knight-hacks");
    const auth = await import("@forge/db/schemas/auth");
    const roleId = randomUUID();
    await client.insert(auth.User).values([
      {
        discordUserId: "reset-officer",
        id: officerId,
        name: "Reset Officer",
      },
      {
        discordUserId: "reset-unauthorized",
        id: unauthorizedUserId,
        name: "Reset Unauthorized",
      },
    ]);
    await client.insert(auth.Roles).values({
      discordRoleId: "991000000000000001",
      id: roleId,
      name: "Reset officers",
      permissions: permissionBitstring("IS_OFFICER"),
    });
    await client.insert(auth.Permissions).values({ roleId, userId: officerId });
    await client.insert(schema.Hackathon).values({
      displayName: "Reset Test Hackathon",
      endDate: new Date("2026-10-02T00:00:00Z"),
      id: hackathonId,
      name: "reset-test",
      startDate: new Date("2026-10-01T00:00:00Z"),
      theme: "Reset",
    });
    await client.insert(schema.HackathonJudgingConfiguration).values({
      challengeGroupsInitializedAt: new Date(),
      displayAllResultsToMembers: true,
      hackerScheduleEmergency: true,
      hackerSchedulePublished: true,
      hackathonId,
      projectClaimUrl: "https://example.test/claim",
      projectClaimsStartedAt: new Date(),
      projectInventoryLockedAt: new Date(),
      state: "open",
    });
    await client.insert(schema.JudgingBuilding).values({
      id: buildingId,
      name: "Reset Test Building",
    });
    await client.insert(schema.ProjectChallenge).values({
      hackathonId,
      id: challengeId,
      isGeneral: true,
      isGroup: true,
      label: "Custom General",
    });
    await client.insert(schema.Project).values({
      description: "Reset this project",
      hackathonId,
      id: projectId,
      participantCount: 1,
      projectCreatedAt: new Date(),
      submissionUrl: "https://reset.example.test",
      submittedAt: new Date(),
      title: "Reset project",
    });
    await client.insert(schema.ProjectMember).values({
      displayOrder: 0,
      email: "reset@example.test",
      id: memberId,
      name: "Reset Hacker",
      projectId,
    });
    await client.insert(schema.ProjectClaim).values({
      hackathonId,
      memberId,
      projectId,
      userId: officerId,
    });
    await client.insert(schema.ProjectClaimLink).values({
      memberId,
      sentAt: new Date(),
      token: "a".repeat(64),
    });
    await client.insert(schema.ProjectToChallenge).values({
      challengeId,
      hackathonId,
      isOptIn: false,
      projectId,
    });
    await client.insert(schema.JudgingRubricItem).values([
      {
        displayOrder: 0,
        hackathonId,
        id: rubricId,
        kind: "rating",
        label: "Reset rating",
      },
      {
        displayOrder: 1,
        guestVisibilityPolicy: "private",
        hackathonId,
        id: responseRubricId,
        kind: "short_response",
        label: "Reset response",
        memberVisibilityPolicy: "public",
      },
    ]);
    await client.insert(schema.JudgingRoom).values([
      { challengeId, hackathonId, id: roomId, name: "Scheduled room" },
      { challengeId, hackathonId, id: spareRoomId, name: "Spare room" },
    ]);
    await client.insert(schema.JudgingRoomAccessLink).values({
      createdByUserId: officerId,
      hackathonId,
      id: spareLinkId,
      roomId: spareRoomId,
    });
    await client.insert(schema.Judge).values([
      {
        displayName: "Reset Judge",
        hackathonId,
        id: judgeId,
        kind: "member",
        userId: officerId,
      },
      {
        displayName: "Spare Guest",
        hackathonId,
        id: spareJudgeId,
        kind: "guest",
      },
    ]);
    await client.insert(schema.GuestJudgeSession).values({
      accessLinkId: spareLinkId,
      completedAt: new Date(),
      expiresAt: new Date("2027-01-01T00:00:00Z"),
      hackathonId,
      judgeId: spareJudgeId,
      tokenHash: "b".repeat(64),
    });
    await client.insert(schema.JudgingRoomPresence).values([
      { hackathonId, judgeId, roomId },
      { hackathonId, judgeId: spareJudgeId, roomId: spareRoomId },
    ]);
    await client.insert(schema.JudgingSchedule).values({
      differentBuildingBreakMinutes: 20,
      endsAt: new Date("2026-10-01T18:00:00Z"),
      firstResultAt: new Date(),
      hackathonId,
      id: scheduleId,
      judgingMinutes: 6,
      sameBuildingBreakMinutes: 10,
      savedByUserId: officerId,
      setupMinutes: 2,
      startsAt: new Date("2026-10-01T17:00:00Z"),
      teardownMinutes: 2,
    });
    await client.insert(schema.JudgingScheduleJob).values({
      checkpoint: {},
      createdByUserId: officerId,
      expiresAt: new Date("2026-10-01T19:00:00Z"),
      hackathonId,
      id: scheduleJobId,
      problem: {},
      sourceFingerprint: "reset-fixture",
      timing: {},
    });
    await client.insert(schema.JudgingAppointment).values({
      challengeId,
      deadlineAt: new Date("2026-10-01T17:08:00Z"),
      endsAt: new Date("2026-10-01T17:10:00Z"),
      hackathonId,
      id: appointmentId,
      projectId,
      roomId,
      scheduleId,
      startsAt: new Date("2026-10-01T17:00:00Z"),
    });
    await insertEvaluation();
    const deliberationSectionId = randomUUID();
    await client.insert(schema.JudgeDeliberationSection).values({
      displayOrder: 0,
      hackathonId,
      id: deliberationSectionId,
      judgeId,
      name: "Finalists",
    });
    await client.insert(schema.JudgeDeliberationEntry).values({
      displayOrder: 0,
      hackathonId,
      projectId,
      sectionId: deliberationSectionId,
    });
    await client.insert(schema.JudgingAnnouncement).values([
      {
        hackathonId,
        message: "Reset announcement",
        publishedByUserId: officerId,
        roomId,
      },
      {
        hackathonId,
        message: "Spare room announcement",
        publishedByUserId: officerId,
        roomId: spareRoomId,
      },
    ]);
    caller = await createOfficerCaller();
    unauthorizedCaller = await createCaller(
      unauthorizedUserId,
      "Reset Unauthorized",
    );
  }, 120_000);

  afterAll(async () => {
    await client.$client.end().catch(() => undefined);
    await disposable.drop();
  }, 30_000);

  it("rejects every destructive judging operation without project-management access", async () => {
    const operations = [
      () =>
        unauthorizedCaller.judging.dropEvaluations({
          confirmation: "Reset Test Hackathon",
          hackathonId,
        }),
      () =>
        unauthorizedCaller.judging.dropRooms({
          confirmation: "Reset Test Hackathon",
          hackathonId,
        }),
      () => unauthorizedCaller.judging.dropSchedule({ hackathonId }),
      () =>
        unauthorizedCaller.judging.resetProjects({
          confirmation: "Reset Test Hackathon",
          hackathonId,
        }),
      () =>
        unauthorizedCaller.judging.resetSetup({
          confirmation: "Reset Test Hackathon",
          hackathonId,
        }),
      () =>
        unauthorizedCaller.judging.resetLaunch({
          confirmation: "Reset Test Hackathon",
          hackathonId,
        }),
      () =>
        unauthorizedCaller.judging.resetHackathon({
          confirmation: "Reset Test Hackathon",
          hackathonId,
        }),
      () =>
        unauthorizedCaller.judging.deleteRoom({
          confirmation: "Spare room",
          roomId: spareRoomId,
        }),
    ];

    for (const operation of operations)
      await expect(operation()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("drops saved and preview-only schedule jobs with the schedule slice", async () => {
    const savedHackathonId = randomUUID();
    const previewHackathonId = randomUUID();
    const savedScheduleId = randomUUID();
    await client.insert(schema.Hackathon).values([
      {
        displayName: "Saved Schedule Reset Hackathon",
        endDate: new Date("2030-10-02T00:00:00Z"),
        id: savedHackathonId,
        name: `saved-schedule-reset-${savedHackathonId}`,
        startDate: new Date("2030-10-01T00:00:00Z"),
        theme: "Reset",
      },
      {
        displayName: "Preview Schedule Reset Hackathon",
        endDate: new Date("2031-10-02T00:00:00Z"),
        id: previewHackathonId,
        name: `preview-schedule-reset-${previewHackathonId}`,
        startDate: new Date("2031-10-01T00:00:00Z"),
        theme: "Reset",
      },
    ]);

    try {
      await client.insert(schema.JudgingSchedule).values({
        differentBuildingBreakMinutes: 20,
        endsAt: new Date("2030-10-01T18:00:00Z"),
        hackathonId: savedHackathonId,
        id: savedScheduleId,
        judgingMinutes: 6,
        sameBuildingBreakMinutes: 10,
        savedByUserId: officerId,
        setupMinutes: 2,
        startsAt: new Date("2030-10-01T17:00:00Z"),
        teardownMinutes: 2,
      });
      await client.insert(schema.JudgingScheduleJob).values([
        {
          checkpoint: {},
          createdByUserId: officerId,
          expiresAt: new Date("2030-10-01T19:00:00Z"),
          hackathonId: savedHackathonId,
          problem: {},
          sourceFingerprint: "saved-reset-fixture",
          status: "saved",
          timing: {},
        },
        {
          checkpoint: {},
          createdByUserId: officerId,
          expiresAt: new Date("2031-10-01T19:00:00Z"),
          hackathonId: previewHackathonId,
          problem: {},
          sourceFingerprint: "preview-reset-fixture",
          status: "feasible",
          timing: {},
        },
      ]);

      await caller.judging.dropSchedule({ hackathonId: savedHackathonId });
      await caller.judging.dropSchedule({ hackathonId: previewHackathonId });

      await expect(
        client
          .select()
          .from(schema.JudgingSchedule)
          .where(eq(schema.JudgingSchedule.hackathonId, savedHackathonId)),
      ).resolves.toHaveLength(0);
      for (const scopedHackathonId of [savedHackathonId, previewHackathonId]) {
        await expect(
          client
            .select()
            .from(schema.JudgingScheduleJob)
            .where(
              eq(schema.JudgingScheduleJob.hackathonId, scopedHackathonId),
            ),
        ).resolves.toHaveLength(0);
      }
    } finally {
      await client
        .delete(schema.Hackathon)
        .where(eq(schema.Hackathon.id, savedHackathonId));
      await client
        .delete(schema.Hackathon)
        .where(eq(schema.Hackathon.id, previewHackathonId));
    }
  });

  it("drops evaluations without disturbing the saved schedule", async () => {
    await expect(
      caller.judging.dropEvaluations({
        confirmation: "Reset Test Hackathon",
        hackathonId,
      }),
    ).resolves.toEqual({ draftCount: 1, evaluationCount: 1 });
    await expect(
      client
        .select()
        .from(schema.ProjectEvaluation)
        .where(eq(schema.ProjectEvaluation.hackathonId, hackathonId)),
    ).resolves.toHaveLength(0);
    for (const table of [
      schema.ProjectEvaluationDraft,
      schema.ProjectEvaluationRating,
      schema.ProjectEvaluationResponse,
      schema.ProjectEvaluationRevision,
    ]) {
      await expect(
        client.select().from(table).where(eq(table.hackathonId, hackathonId)),
      ).resolves.toHaveLength(0);
    }
    await expect(
      client
        .select({ firstResultAt: schema.JudgingSchedule.firstResultAt })
        .from(schema.JudgingSchedule)
        .where(eq(schema.JudgingSchedule.hackathonId, hackathonId)),
    ).resolves.toEqual([{ firstResultAt: null }]);
    await insertEvaluation();
  });

  it("permanently deletes an unreserved room and its access data", async () => {
    await expect(
      caller.judging.deleteRoom({
        confirmation: "Scheduled room",
        roomId,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      caller.judging.deleteRoom({
        confirmation: "Spare room",
        roomId: spareRoomId,
      }),
    ).resolves.toEqual({ id: spareRoomId, name: "Spare room" });
    await expect(
      client
        .select()
        .from(schema.JudgingRoomAccessLink)
        .where(eq(schema.JudgingRoomAccessLink.roomId, spareRoomId)),
    ).resolves.toHaveLength(0);
    await expect(
      client
        .select()
        .from(schema.GuestJudgeSession)
        .where(eq(schema.GuestJudgeSession.accessLinkId, spareLinkId)),
    ).resolves.toHaveLength(0);
    await expect(
      client
        .select()
        .from(schema.JudgingRoomPresence)
        .where(eq(schema.JudgingRoomPresence.roomId, spareRoomId)),
    ).resolves.toHaveLength(0);
    await expect(
      client
        .select()
        .from(schema.JudgingAnnouncement)
        .where(eq(schema.JudgingAnnouncement.roomId, spareRoomId)),
    ).resolves.toHaveLength(0);
  });

  it("enforces dependencies and resets rooms, setup, and launch independently", async () => {
    await expect(
      caller.judging.dropRooms({
        confirmation: "Reset Test Hackathon",
        hackathonId,
      }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    await expect(
      caller.judging.resetSetup({
        confirmation: "Reset Test Hackathon",
        hackathonId,
      }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });

    const roomsHackathonId = randomUUID();
    const roomsChallengeId = randomUUID();
    const roomsRoomId = randomUUID();
    await client.insert(schema.Hackathon).values({
      displayName: "Rooms Reset Hackathon",
      endDate: new Date("2027-10-02T00:00:00Z"),
      id: roomsHackathonId,
      name: `rooms-reset-${roomsHackathonId}`,
      startDate: new Date("2027-10-01T00:00:00Z"),
      theme: "Reset",
    });
    await client.insert(schema.ProjectChallenge).values({
      hackathonId: roomsHackathonId,
      id: roomsChallengeId,
      isGroup: true,
      label: "Rooms group",
    });
    await client.insert(schema.JudgingRoom).values({
      challengeId: roomsChallengeId,
      hackathonId: roomsHackathonId,
      id: roomsRoomId,
      name: "Room to drop",
    });
    await client.insert(schema.JudgingAnnouncement).values({
      hackathonId: roomsHackathonId,
      message: "Room reset announcement",
      publishedByUserId: officerId,
      roomId: roomsRoomId,
    });
    await expect(
      caller.judging.dropRooms({
        confirmation: "Rooms Reset Hackathon",
        hackathonId: roomsHackathonId,
      }),
    ).resolves.toEqual({ roomCount: 1 });
    await expect(
      client
        .select()
        .from(schema.JudgingRoom)
        .where(eq(schema.JudgingRoom.hackathonId, roomsHackathonId)),
    ).resolves.toHaveLength(0);
    await expect(
      client
        .select()
        .from(schema.JudgingAnnouncement)
        .where(eq(schema.JudgingAnnouncement.hackathonId, roomsHackathonId)),
    ).resolves.toHaveLength(0);

    const setupHackathonId = randomUUID();
    const setupGroupId = randomUUID();
    const setupChallengeId = randomUUID();
    const setupProjectId = randomUUID();
    const setupRubricId = randomUUID();
    await client.insert(schema.Hackathon).values({
      displayName: "Setup Reset Hackathon",
      endDate: new Date("2028-10-02T00:00:00Z"),
      id: setupHackathonId,
      name: `setup-reset-${setupHackathonId}`,
      startDate: new Date("2028-10-01T00:00:00Z"),
      theme: "Reset",
    });
    await client.insert(schema.HackathonJudgingConfiguration).values({
      challengeGroupsInitializedAt: new Date(),
      hackathonId: setupHackathonId,
    });
    await client.insert(schema.ProjectChallenge).values({
      hackathonId: setupHackathonId,
      id: setupGroupId,
      isGroup: true,
      label: "Custom setup group",
    });
    await client.insert(schema.ProjectChallenge).values({
      hackathonId: setupHackathonId,
      id: setupChallengeId,
      isGroup: false,
      isScheduled: false,
      label: "Imported sponsor challenge",
      parentId: setupGroupId,
    });
    await client.insert(schema.Project).values({
      description: "Project preserved through setup reset",
      hackathonId: setupHackathonId,
      id: setupProjectId,
      participantCount: 1,
      projectCreatedAt: new Date(),
      submissionUrl: "https://setup-reset.example.test",
      submittedAt: new Date(),
      title: "Setup reset project",
    });
    await client.insert(schema.ProjectToChallenge).values({
      challengeId: setupChallengeId,
      hackathonId: setupHackathonId,
      isOptIn: true,
      projectId: setupProjectId,
    });
    await client.insert(schema.JudgingRubricItem).values({
      displayOrder: 0,
      hackathonId: setupHackathonId,
      id: setupRubricId,
      kind: "rating",
      label: "Setup rating",
    });
    await expect(
      caller.judging.resetSetup({
        confirmation: "Setup Reset Hackathon",
        hackathonId: setupHackathonId,
      }),
    ).resolves.toEqual({ groupCount: 1, rubricItemCount: 1 });
    await expect(
      client
        .select()
        .from(schema.JudgingRubricItem)
        .where(eq(schema.JudgingRubricItem.hackathonId, setupHackathonId)),
    ).resolves.toHaveLength(0);
    const setupGroups = await client
      .select({ label: schema.ProjectChallenge.label })
      .from(schema.ProjectChallenge)
      .where(eq(schema.ProjectChallenge.hackathonId, setupHackathonId));
    expect(setupGroups).toEqual(
      expect.arrayContaining([
        { label: "General" },
        { label: "MLH Challenges" },
      ]),
    );
    await expect(
      client
        .select({
          isScheduled: schema.ProjectChallenge.isScheduled,
          parentId: schema.ProjectChallenge.parentId,
        })
        .from(schema.ProjectChallenge)
        .where(eq(schema.ProjectChallenge.id, setupChallengeId)),
    ).resolves.toEqual([{ isScheduled: true, parentId: null }]);
    const generalGroup = await client.query.ProjectChallenge.findFirst({
      columns: { id: true },
      where: (challenge, { and, eq }) =>
        and(
          eq(challenge.hackathonId, setupHackathonId),
          eq(challenge.isGeneral, true),
          eq(challenge.isGroup, true),
        ),
    });
    if (!generalGroup) throw new Error("Reset did not restore General.");
    await expect(
      client
        .select({
          challengeId: schema.ProjectToChallenge.challengeId,
          isOptIn: schema.ProjectToChallenge.isOptIn,
        })
        .from(schema.ProjectToChallenge)
        .where(eq(schema.ProjectToChallenge.projectId, setupProjectId)),
    ).resolves.toEqual(
      expect.arrayContaining([
        { challengeId: setupChallengeId, isOptIn: true },
        { challengeId: generalGroup.id, isOptIn: false },
      ]),
    );

    const launchHackathonId = randomUUID();
    const launchProjectId = randomUUID();
    const launchMemberId = randomUUID();
    await client.insert(schema.Hackathon).values({
      displayName: "Launch Reset Hackathon",
      endDate: new Date("2029-10-02T00:00:00Z"),
      id: launchHackathonId,
      name: `launch-reset-${launchHackathonId}`,
      startDate: new Date("2029-10-01T00:00:00Z"),
      theme: "Reset",
    });
    await client.insert(schema.HackathonJudgingConfiguration).values({
      displayAllResultsToMembers: true,
      hackerScheduleEmergency: true,
      hackerSchedulePublished: true,
      hackathonId: launchHackathonId,
      projectClaimUrl: "https://example.test/launch-claim",
      projectClaimsStartedAt: new Date(),
      state: "open",
    });
    await client.insert(schema.Project).values({
      description: "Launch reset project",
      hackathonId: launchHackathonId,
      id: launchProjectId,
      participantCount: 1,
      projectCreatedAt: new Date(),
      submissionUrl: "https://launch-reset.example.test",
      submittedAt: new Date(),
      title: "Launch reset project",
    });
    await client.insert(schema.ProjectMember).values({
      displayOrder: 0,
      email: "launch-reset@example.test",
      id: launchMemberId,
      name: "Launch Reset Hacker",
      projectId: launchProjectId,
    });
    await client.insert(schema.ProjectClaim).values({
      hackathonId: launchHackathonId,
      memberId: launchMemberId,
      projectId: launchProjectId,
      userId: officerId,
    });
    await client.insert(schema.ProjectClaimLink).values({
      memberId: launchMemberId,
      token: "c".repeat(64),
    });
    await expect(
      caller.judging.resetLaunch({
        confirmation: "Launch Reset Hackathon",
        hackathonId: launchHackathonId,
      }),
    ).resolves.toEqual({ claimCount: 1, claimLinkCount: 1 });
    await expect(
      client
        .select()
        .from(schema.ProjectClaim)
        .where(eq(schema.ProjectClaim.hackathonId, launchHackathonId)),
    ).resolves.toHaveLength(0);
    await expect(
      client
        .select()
        .from(schema.ProjectClaimLink)
        .where(eq(schema.ProjectClaimLink.memberId, launchMemberId)),
    ).resolves.toHaveLength(0);
    const [launchConfiguration] = await client
      .select()
      .from(schema.HackathonJudgingConfiguration)
      .where(
        eq(schema.HackathonJudgingConfiguration.hackathonId, launchHackathonId),
      );
    expect(launchConfiguration).toMatchObject({
      displayAllResultsToMembers: false,
      hackerScheduleEmergency: false,
      hackerSchedulePublished: false,
      projectClaimUrl: null,
      projectClaimsStartedAt: null,
      state: "draft",
    });
    for (const [extraHackathonId, confirmation] of [
      [roomsHackathonId, "Rooms Reset Hackathon"],
      [setupHackathonId, "Setup Reset Hackathon"],
      [launchHackathonId, "Launch Reset Hackathon"],
    ] as const) {
      await caller.judging.resetHackathon({
        confirmation,
        hackathonId: extraHackathonId,
      });
    }
  });

  it("resets claimed project inventory after every downstream slice is cleared", async () => {
    const targetHackathonId = randomUUID();
    const targetGroupId = randomUUID();
    const targetChallengeId = randomUUID();
    const targetProjectId = randomUUID();
    const targetMemberId = randomUUID();
    const targetRoomId = randomUUID();
    const targetScheduleId = randomUUID();
    const targetJobId = randomUUID();
    const targetAppointmentId = randomUUID();
    const targetJudgeId = randomUUID();
    const targetEvaluationId = randomUUID();
    const targetSectionId = randomUUID();

    await client.insert(schema.Hackathon).values({
      displayName: "Project Reset Hackathon",
      endDate: new Date("2030-10-02T00:00:00Z"),
      id: targetHackathonId,
      name: `project-reset-${targetHackathonId}`,
      startDate: new Date("2030-10-01T00:00:00Z"),
      theme: "Reset",
    });

    try {
      await client.insert(schema.HackathonJudgingConfiguration).values({
        hackathonId: targetHackathonId,
        projectClaimUrl: "https://example.test/project-reset-claim",
        projectClaimsStartedAt: new Date(),
        projectInventoryLockedAt: new Date(),
        projectInventoryLockedByUserId: officerId,
      });
      await client.insert(schema.ProjectChallenge).values([
        {
          hackathonId: targetHackathonId,
          id: targetGroupId,
          isGroup: true,
          label: "Project reset group",
        },
        {
          hackathonId: targetHackathonId,
          id: targetChallengeId,
          label: "Imported challenge",
          parentId: targetGroupId,
        },
      ]);
      await client.insert(schema.Project).values({
        description: "Project reset fixture",
        hackathonId: targetHackathonId,
        id: targetProjectId,
        participantCount: 1,
        projectCreatedAt: new Date(),
        submissionUrl: "https://project-reset.example.test",
        submittedAt: new Date(),
        title: "Project reset fixture",
      });
      await client.insert(schema.ProjectMember).values({
        displayOrder: 0,
        email: "project-reset@example.test",
        id: targetMemberId,
        name: "Project Reset Hacker",
        projectId: targetProjectId,
      });
      await client.insert(schema.ProjectToChallenge).values({
        challengeId: targetChallengeId,
        hackathonId: targetHackathonId,
        isOptIn: false,
        projectId: targetProjectId,
      });
      await client.insert(schema.ProjectClaim).values({
        hackathonId: targetHackathonId,
        memberId: targetMemberId,
        projectId: targetProjectId,
        userId: officerId,
      });
      await client.insert(schema.ProjectClaimLink).values({
        memberId: targetMemberId,
        token: "d".repeat(64),
      });
      await client.insert(schema.JudgingRoom).values({
        challengeId: targetGroupId,
        hackathonId: targetHackathonId,
        id: targetRoomId,
        name: "Project reset room",
      });
      await client.insert(schema.Judge).values({
        displayName: "Project Reset Judge",
        hackathonId: targetHackathonId,
        id: targetJudgeId,
        kind: "member",
        userId: officerId,
      });
      await client.insert(schema.JudgingSchedule).values({
        differentBuildingBreakMinutes: 20,
        endsAt: new Date("2030-10-01T18:00:00Z"),
        hackathonId: targetHackathonId,
        id: targetScheduleId,
        judgingMinutes: 6,
        sameBuildingBreakMinutes: 10,
        savedByUserId: officerId,
        setupMinutes: 2,
        startsAt: new Date("2030-10-01T17:00:00Z"),
        teardownMinutes: 2,
      });
      await client.insert(schema.JudgingScheduleJob).values({
        checkpoint: {},
        createdByUserId: officerId,
        expiresAt: new Date("2030-10-01T19:00:00Z"),
        hackathonId: targetHackathonId,
        id: targetJobId,
        problem: {},
        sourceFingerprint: "project-reset-fixture",
        timing: {},
      });
      await client.insert(schema.JudgingAppointment).values({
        challengeId: targetChallengeId,
        deadlineAt: new Date("2030-10-01T17:08:00Z"),
        endsAt: new Date("2030-10-01T17:10:00Z"),
        hackathonId: targetHackathonId,
        id: targetAppointmentId,
        projectId: targetProjectId,
        roomId: targetRoomId,
        scheduleId: targetScheduleId,
        startsAt: new Date("2030-10-01T17:00:00Z"),
      });
      await client.insert(schema.ProjectEvaluation).values({
        appointmentId: targetAppointmentId,
        challengeId: targetChallengeId,
        hackathonId: targetHackathonId,
        id: targetEvaluationId,
        judgeId: targetJudgeId,
        projectId: targetProjectId,
      });
      await client.insert(schema.JudgeDeliberationSection).values({
        displayOrder: 0,
        hackathonId: targetHackathonId,
        id: targetSectionId,
        judgeId: targetJudgeId,
        name: "Project reset finalists",
      });
      await client.insert(schema.JudgeDeliberationEntry).values({
        displayOrder: 0,
        hackathonId: targetHackathonId,
        projectId: targetProjectId,
        sectionId: targetSectionId,
      });

      await expect(
        caller.judging.resetProjects({
          confirmation: "Project Reset Hackathon",
          hackathonId: targetHackathonId,
        }),
      ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });

      await caller.judging.dropEvaluations({
        confirmation: "Project Reset Hackathon",
        hackathonId: targetHackathonId,
      });
      await expect(
        caller.judging.resetProjects({
          confirmation: "Project Reset Hackathon",
          hackathonId: targetHackathonId,
        }),
      ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
      await expect(
        caller.judging.dropSchedule({ hackathonId: targetHackathonId }),
      ).resolves.toEqual({ dropped: true, jobCount: 1 });
      await expect(
        caller.judging.resetProjects({
          confirmation: "Project Reset Hackathon",
          hackathonId: targetHackathonId,
        }),
      ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
      await caller.judging.dropRooms({
        confirmation: "Project Reset Hackathon",
        hackathonId: targetHackathonId,
      });
      await client.insert(schema.JudgingScheduleJob).values({
        checkpoint: {},
        createdByUserId: officerId,
        expiresAt: new Date("2030-10-01T20:00:00Z"),
        hackathonId: targetHackathonId,
        problem: {},
        sourceFingerprint: "project-reset-unsaved-fixture",
        timing: {},
      });
      await expect(
        caller.judging.resetProjects({
          confirmation: "Project Reset Hackathon",
          hackathonId: targetHackathonId,
        }),
      ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
      await expect(
        caller.judging.dropSchedule({ hackathonId: targetHackathonId }),
      ).resolves.toEqual({ dropped: false, jobCount: 1 });
      await expect(
        caller.judging.resetProjects({
          confirmation: "Project Reset Hackathon",
          hackathonId: targetHackathonId,
        }),
      ).resolves.toEqual({ projectCount: 1 });

      await expect(
        client
          .select({ id: schema.Project.id })
          .from(schema.Project)
          .where(eq(schema.Project.hackathonId, targetHackathonId)),
      ).resolves.toEqual([]);
      await expect(
        client
          .select({ id: schema.ProjectClaim.memberId })
          .from(schema.ProjectClaim)
          .where(eq(schema.ProjectClaim.hackathonId, targetHackathonId)),
      ).resolves.toEqual([]);
      await expect(
        client
          .select({ id: schema.JudgeDeliberationEntry.id })
          .from(schema.JudgeDeliberationEntry)
          .where(
            eq(schema.JudgeDeliberationEntry.hackathonId, targetHackathonId),
          ),
      ).resolves.toEqual([]);
      await expect(
        client
          .select({ id: schema.JudgeDeliberationSection.id })
          .from(schema.JudgeDeliberationSection)
          .where(
            eq(schema.JudgeDeliberationSection.hackathonId, targetHackathonId),
          ),
      ).resolves.toEqual([{ id: targetSectionId }]);
      await expect(
        client
          .select({ id: schema.ProjectChallenge.id })
          .from(schema.ProjectChallenge)
          .where(eq(schema.ProjectChallenge.hackathonId, targetHackathonId)),
      ).resolves.toEqual([{ id: targetGroupId }]);
      const [configuration] = await client
        .select({
          projectClaimUrl: schema.HackathonJudgingConfiguration.projectClaimUrl,
          projectClaimsStartedAt:
            schema.HackathonJudgingConfiguration.projectClaimsStartedAt,
          projectInventoryLockedAt:
            schema.HackathonJudgingConfiguration.projectInventoryLockedAt,
          projectInventoryLockedByUserId:
            schema.HackathonJudgingConfiguration.projectInventoryLockedByUserId,
        })
        .from(schema.HackathonJudgingConfiguration)
        .where(
          eq(
            schema.HackathonJudgingConfiguration.hackathonId,
            targetHackathonId,
          ),
        );
      expect(configuration).toEqual({
        projectClaimUrl: null,
        projectClaimsStartedAt: null,
        projectInventoryLockedAt: null,
        projectInventoryLockedByUserId: null,
      });
    } finally {
      await caller.judging.resetHackathon({
        confirmation: "Project Reset Hackathon",
        hackathonId: targetHackathonId,
      });
      await client
        .delete(schema.Hackathon)
        .where(eq(schema.Hackathon.id, targetHackathonId));
    }
  });

  it("resets the full hackathon while preserving starter configuration", async () => {
    const preservedAuditId = randomUUID();
    await disposable.client.query(
      `INSERT INTO audit_event
        (id, action_key, domain, outcome, actor_user_id, actor_label)
       VALUES ($1, 'judging.fixture', 'judging', 'committed', $2, 'Reset Officer')`,
      [preservedAuditId, officerId],
    );
    const roomCount = await client
      .select()
      .from(schema.JudgingRoom)
      .where(eq(schema.JudgingRoom.hackathonId, hackathonId));
    await expect(
      caller.judging.resetHackathon({
        confirmation: "wrong name",
        hackathonId,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.judging.resetHackathon({
        confirmation: "Reset Test Hackathon",
        hackathonId,
      }),
    ).resolves.toMatchObject({
      evaluationCount: 1,
      projectCount: 1,
      roomCount: roomCount.length,
    });
    for (const table of [
      "knight_hacks_guest_judge_session",
      "knight_hacks_judge",
      "knight_hacks_judge_deliberation_entry",
      "knight_hacks_judge_deliberation_section",
      "knight_hacks_judging_announcement",
      "knight_hacks_judging_appointment",
      "knight_hacks_judging_room",
      "knight_hacks_judging_room_access_link",
      "knight_hacks_judging_room_presence",
      "knight_hacks_judging_rubric_item",
      "knight_hacks_judging_schedule",
      "knight_hacks_judging_schedule_job",
      "knight_hacks_project",
      "knight_hacks_project_claim",
      "knight_hacks_project_claim_link",
      "knight_hacks_project_evaluation",
      "knight_hacks_project_evaluation_draft",
      "knight_hacks_project_evaluation_rating",
      "knight_hacks_project_evaluation_response",
      "knight_hacks_project_evaluation_revision",
      "knight_hacks_project_member",
      "knight_hacks_project_to_challenge",
    ]) {
      const result = await disposable.client.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM ${table}`,
      );
      expect(result.rows[0]?.count, table).toBe("0");
    }
    const groups = await client
      .select({
        isGroup: schema.ProjectChallenge.isGroup,
        label: schema.ProjectChallenge.label,
      })
      .from(schema.ProjectChallenge)
      .where(eq(schema.ProjectChallenge.hackathonId, hackathonId));
    expect(groups).toEqual(
      expect.arrayContaining([
        { isGroup: true, label: "General" },
        { isGroup: true, label: "MLH Challenges" },
      ]),
    );
    const [configuration] = await client
      .select()
      .from(schema.HackathonJudgingConfiguration)
      .where(eq(schema.HackathonJudgingConfiguration.hackathonId, hackathonId));
    expect(configuration).toMatchObject({
      displayAllResultsToMembers: false,
      hackerScheduleEmergency: false,
      hackerSchedulePublished: false,
      projectClaimUrl: null,
      projectClaimsStartedAt: null,
      projectInventoryLockedAt: null,
      state: "draft",
    });
    await expect(
      client
        .select({ id: schema.Hackathon.id })
        .from(schema.Hackathon)
        .where(eq(schema.Hackathon.id, hackathonId)),
    ).resolves.toEqual([{ id: hackathonId }]);
    await expect(
      client
        .select({ id: schema.JudgingBuilding.id })
        .from(schema.JudgingBuilding)
        .where(eq(schema.JudgingBuilding.id, buildingId)),
    ).resolves.toEqual([{ id: buildingId }]);
    const preservedAudit = await disposable.client.query<{ id: string }>(
      "SELECT id::text FROM audit_event WHERE id = $1",
      [preservedAuditId],
    );
    expect(preservedAudit.rows).toEqual([{ id: preservedAuditId }]);
  });
});
