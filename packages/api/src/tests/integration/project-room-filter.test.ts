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
  const firstTimeId = randomUUID();
  const mlhOptInId = randomUUID();
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
    const { hackathonRouter } = await import("../../routers/hackathon");
    const { judgingRouter } = await import("../../routers/judging");
    return trpc.createCallerFactory(
      trpc.createTRPCRouter({
        projects: projectsRouter,
        hackathon: hackathonRouter,
        judging: judgingRouter,
      }),
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
      {
        id: generalId,
        hackathonId,
        label: "Community awards",
        isGeneral: true,
        isGroup: true,
      },
      {
        id: mlhId,
        hackathonId,
        label: "Science fair",
        isScheduled: false,
        isGroup: true,
      },
      { id: firstTimeId, hackathonId, label: "First-time hacker" },
      { id: mlhOptInId, hackathonId, label: "MLH - Best Use of AI" },
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
    const firstGeneral = generalProjectIds[0];
    const otherRoomGeneral = generalProjectIds[4];
    const firstMlh = mlhProjectIds[0];
    if (!firstGeneral || !otherRoomGeneral || !firstMlh)
      throw new Error("Missing project fixtures.");
    await database.insert(schema.ProjectToChallenge).values([
      ...[firstGeneral, otherRoomGeneral].map((projectId) => ({
        projectId,
        challengeId: firstTimeId,
        hackathonId,
      })),
      { projectId: firstMlh, challengeId: mlhOptInId, hackathonId },
    ]);
  }, 120_000);

  afterAll(async () => {
    vi.useRealTimers();
    await database.$client.end();
    await disposable.drop();
    vi.unstubAllEnvs();
  });

  it("filters before count and pagination while preserving each fallback", async () => {
    const member = await caller({ session });

    await expect(
      member.projects.updateChallenge({
        hackathonId,
        challengeId: generalId,
        parentId: null,
        isScheduled: false,
      }),
    ).rejects.toThrow(/Use group settings/);

    await expect(
      member.projects.updateChallenge({
        hackathonId,
        challengeId: generalId,
        parentId: firstTimeId,
        isScheduled: true,
      }),
    ).rejects.toThrow(/judging group/);
    await expect(
      member.projects.updateChallenge({
        hackathonId,
        challengeId: firstTimeId,
        parentId: firstTimeId,
        isScheduled: true,
      }),
    ).rejects.toThrow(/judging group/);
    await member.projects.updateChallenge({
      hackathonId,
      challengeId: firstTimeId,
      parentId: generalId,
      isScheduled: true,
    });
    await member.projects.updateChallenge({
      hackathonId,
      challengeId: mlhOptInId,
      parentId: mlhId,
      isScheduled: true,
    });
    await expect(
      member.projects.updateChallenge({
        hackathonId,
        challengeId: mlhId,
        parentId: firstTimeId,
        isScheduled: false,
      }),
    ).rejects.toThrow(/judging group/);
    const customParent = { id: randomUUID() };
    await database.insert(schema.ProjectChallenge).values({
      id: customParent.id,
      hackathonId,
      label: "Imported awards",
      isGroup: true,
      isScheduled: false,
    });
    await member.projects.updateChallenge({
      hackathonId,
      challengeId: firstTimeId,
      parentId: customParent.id,
      isScheduled: true,
    });
    const underCustom = await member.projects.listJudge({
      ...listInput,
      challengeIds: [customParent.id],
    });
    expect(underCustom.totalCount).toBe(2);
    await member.projects.updateChallenge({
      hackathonId,
      challengeId: firstTimeId,
      parentId: null,
      isScheduled: true,
    });
    const ungrouped = await member.projects.listJudge({
      ...listInput,
      challengeIds: [customParent.id],
    });
    expect(ungrouped.totalCount).toBe(0);
    await member.projects.updateChallenge({
      hackathonId,
      challengeId: firstTimeId,
      parentId: generalId,
      isScheduled: true,
    });
    const ratingId = randomUUID();
    await member.judging.saveRubric({
      hackathonId,
      items: [
        {
          id: ratingId,
          kind: "rating",
          label: "Originality",
          required: true,
          memberVisibilityPolicy: null,
          guestVisibilityPolicy: null,
        },
      ],
    });
    const childWorkspace = await member.judging.getWorkspace({
      hackathonId,
      challengeId: firstTimeId,
    });
    expect(childWorkspace.challengeId).toBe(generalId);
    const childBeforeSchedule = await member.projects.listJudge({
      ...listInput,
      challengeIds: [firstTimeId],
    });
    expect(childBeforeSchedule.totalCount).toBe(2);
    expect(childBeforeSchedule.projects[0]?.challenges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: firstTimeId, parentId: generalId }),
      ]),
    );
    const { readScheduleSource } =
      await import("../../utils/judging-schedule/source");
    const source = await readScheduleSource(database, hackathonId);
    expect(source.tasks).toHaveLength(15);
    expect(source.tasks.every((task) => task.challengeId === generalId)).toBe(
      true,
    );
    expect(source.rooms.find((room) => room.id === mlhRoomId)?.scheduled).toBe(
      false,
    );

    const withoutSchedule = await member.projects.listJudge(listInput);
    expect(withoutSchedule.totalCount).toBe(15);

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

    await expect(
      member.projects.updateChallenge({
        hackathonId,
        challengeId: firstTimeId,
        parentId: null,
        isScheduled: true,
      }),
    ).rejects.toThrow(/saved schedule locks/);
    await expect(
      member.judging.createRoom({
        hackathonId,
        challengeId: generalId,
        name: "Late room",
      }),
    ).rejects.toThrow(/saved schedule locks/);
    await expect(
      member.judging.updateRoom({
        roomId: mlhRoomId,
        challengeId: mlhId,
        name: "Renamed untimed room",
      }),
    ).rejects.toThrow(/saved schedule locks/);
    await expect(
      member.judging.archiveRoom({ roomId: mlhRoomId }),
    ).rejects.toThrow(/saved schedule locks/);
    await expect(
      member.judging.saveRubric({ hackathonId, items: [] }),
    ).rejects.toThrow(/saved schedule locks/);
    await expect(
      member.projects.deleteGroup({ hackathonId, groupId: generalId }),
    ).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
      message:
        "A saved schedule locks judging setup. Drop the eligible schedule before making changes.",
    });

    const setup = await member.judging.listAdmin({ hackathonId });
    expect(setup.setupLocked).toBe(true);
    expect(setup.challengeSetupLocked).toBe(true);

    const withoutRoom = await member.projects.listJudge(listInput);
    expect(withoutRoom.totalCount).toBe(15);
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
    expect(allRooms.totalCount).toBe(15);
    expect(allRooms.page).toBe(2);
    expect(allRooms.projects).toHaveLength(5);

    const mlh = await member.projects.listJudge({
      ...listInput,
      challengeIds: [mlhId],
    });
    expect(mlh.totalCount).toBe(2);
    expect(mlh.roomFilterUnavailableReason).toBe(
      "This challenge is untimed, so room filtering is unavailable.",
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
    expect(guestAllRooms.totalCount).toBe(15);
    const guestChild = await guest.projects.listJudge({
      ...guestListInput,
      challengeIds: [firstTimeId],
    });
    expect(guestChild.totalCount).toBe(1);
    expect(guestChild.projects[0]?.id).toBe(generalProjectIds[4]);
    expect(
      guestChild.projects[0]?.challenges.map((challenge) => challenge.label),
    ).toContain("First-time hacker");
    expect(
      guestChild.challenges.map((challenge) => challenge.id),
    ).not.toContain(mlhOptInId);
    await expect(
      guest.projects.listJudge({
        ...guestListInput,
        challengeIds: [mlhOptInId],
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      guest.projects.listJudge({ ...guestListInput, challengeIds: [mlhId] }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    const scheduleView = await member.judging.listJudgeSchedule({
      hackathonId,
      challengeId: firstTimeId,
      challengeIds: [firstTimeId],
    });
    expect(scheduleView.appointments).toHaveLength(12);
    const scoredProjectId = generalProjectIds[0];
    if (!scoredProjectId) throw new Error("Missing scoring project fixture.");
    await member.judging.setJudgingState({ hackathonId, state: "open" });
    vi.setSystemTime(new Date("2026-09-07T16:00:00Z"));
    const savedEvaluation = await member.judging.saveEvaluation({
      hackathonId,
      challengeId: firstTimeId,
      projectId: scoredProjectId,
      ratings: [{ itemId: ratingId, value: 4 }],
      responses: [],
    });
    const { eq, and } = await import("@forge/db");
    const rows = await database
      .select()
      .from(schema.ProjectEvaluation)
      .where(eq(schema.ProjectEvaluation.projectId, scoredProjectId));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.challengeId).toBe(generalId);
    const remaining = await member.projects.listJudge({
      ...listInput,
      challengeIds: [firstTimeId],
      showInRoomOnly: false,
      includeJudged: false,
    });
    expect(remaining.totalCount).toBe(1);
    expect(remaining.projects[0]?.id).toBe(generalProjectIds[4]);
    vi.setSystemTime(new Date("2026-09-07T16:45:00Z"));
    const editedEvaluation = await member.judging.saveEvaluation({
      hackathonId,
      challengeId: generalId,
      projectId: scoredProjectId,
      ratings: [{ itemId: ratingId, value: 5 }],
      responses: [],
      expectedRevision: 1,
    });
    expect(editedEvaluation.evaluationId).toBe(savedEvaluation.evaluationId);
    expect(editedEvaluation.revision).toBe(2);
    const submissions = await member.judging.listMySubmissions({
      hackathonId,
      challengeId: generalId,
    });
    expect(
      submissions.find(
        (submission) => submission.id === savedEvaluation.evaluationId,
      )?.projectChallenges,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: firstTimeId, parentId: generalId }),
      ]),
    );
    const parentRows = await database
      .select()
      .from(schema.ProjectEvaluation)
      .where(
        and(
          eq(schema.ProjectEvaluation.projectId, scoredProjectId),
          eq(schema.ProjectEvaluation.challengeId, generalId),
        ),
      );
    expect(parentRows).toHaveLength(1);
    await expect(member.judging.dropSchedule({ hackathonId })).rejects.toThrow(
      /first scheduled result/,
    );
  }, 120_000);
  it("preserves editable group identities and MLH overrides across imports", async () => {
    const { eq, and } = await import("@forge/db");
    const { importDevpostProjects } =
      await import("../../projects-import.server");
    const member = await caller({ session });
    const eventId = randomUUID();
    await database.insert(schema.Hackathon).values({
      id: eventId,
      name: `group-import-${eventId}`,
      displayName: "Group imports",
      theme: "Testing",
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-10-01"),
    });
    const csvFor = (labels: string[]) =>
      [
        "Project Title,Submission Url,Project Status,Project Created At,Project Submitted At,Submitter First Name,Submitter Last Name,Submitter Email,Additional Team Member Count,Opt-In Prize",
        ...labels.map(
          (label) =>
            `Group project,https://example.devpost.com/project,Submitted (Gallery/Visible),2026-09-01 12:00:00,2026-09-01 13:00:00,Test,Hacker,test@example.test,0,${label}`,
        ),
      ].join("\n");
    const runImport = async (labels: string[]) => {
      const csvContent = csvFor(labels);
      return importDevpostProjects({
        actor: { id: memberUserId, name: "Room Judge" },
        csvContent,
        fileSize: Buffer.byteLength(csvContent),
        hackathonId: eventId,
      });
    };
    const challenge = async (label: string, isGroup: boolean) => {
      const row = await database.query.ProjectChallenge.findFirst({
        where: and(
          eq(schema.ProjectChallenge.hackathonId, eventId),
          eq(schema.ProjectChallenge.label, label),
          eq(schema.ProjectChallenge.isGroup, isGroup),
        ),
      });
      if (!row) throw new Error(`Missing fixture: ${label}`);
      return row;
    };
    await runImport(["MLH - Tool A", "First time"]);
    const general = await challenge("General", true);
    const mlh = await challenge("MLH Challenges", true);
    const first = await challenge("First time", false);
    const { AdminAuditEvent } = await import("@forge/db/schemas/audit");

    const toolA = await challenge("MLH - Tool A", false);
    expect(toolA.parentId).toBe(mlh.id);
    expect(mlh.tagColor).toBe("#e93227");
    await expect(
      member.projects.updateGroup({
        hackathonId: eventId,
        groupId: first.id,
        label: "Invented prize",
        isGeneral: false,
        isScheduled: true,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    const extra = await member.projects.createGroup({
      hackathonId: eventId,
      label: "Community",
      isGeneral: true,
      isScheduled: true,
    });
    expect(
      await database.query.ProjectToChallenge.findMany({
        where: eq(schema.ProjectToChallenge.challengeId, extra.id),
      }),
    ).toHaveLength(1);
    const defaultDirectory = await member.projects.listJudge({
      ...listInput,
      hackathonId: eventId,
      challengeIds: [],
      showInRoomOnly: false,
    });
    const defaultWorkspace = await member.judging.getWorkspace({
      hackathonId: eventId,
    });
    expect(defaultDirectory.selectedChallengeId).toBe(extra.id);
    expect(defaultWorkspace.challengeId).toBe(
      defaultDirectory.selectedChallengeId,
    );

    await member.projects.updateGroup({
      hackathonId: eventId,
      groupId: extra.id,
      label: "Optional community",
      isGeneral: false,
      isScheduled: true,
    });
    expect(
      await database.query.ProjectToChallenge.findMany({
        where: eq(schema.ProjectToChallenge.challengeId, extra.id),
      }),
    ).toHaveLength(0);
    await member.projects.updateGroup({
      hackathonId: eventId,
      groupId: mlh.id,
      label: "Partner fair",
      isGeneral: false,
      isScheduled: false,
    });
    await member.projects.updateChallenge({
      hackathonId: eventId,
      challengeId: toolA.id,
      parentId: null,
      isScheduled: true,
    });
    await runImport(["MLH - Tool A", "Best tool B (MLH)", "First time"]);
    const auditEvents = await database.select().from(AdminAuditEvent);
    expect(
      auditEvents.find(
        (event) =>
          event.actionKey === "judging.group.updated" &&
          event.metadata.groupId === mlh.id,
      )?.changes,
    ).toContainEqual({
      field: "label",
      before: "MLH Challenges",
      after: "Partner fair",
    });
    expect(
      auditEvents.find(
        (event) =>
          event.actionKey === "judging.challenge.updated" &&
          event.metadata.challengeId === toolA.id,
      )?.changes,
    ).toContainEqual({ field: "parentId", before: mlh.id, after: null });
    expect((await challenge("MLH - Tool A", false)).parentId).toBeNull();
    expect((await challenge("Best tool B (MLH)", false)).parentId).toBe(mlh.id);
    await member.projects.updateGroup({
      hackathonId: eventId,
      groupId: extra.id,
      label: "Optional community",
      isGeneral: false,
      isScheduled: false,
      isMlhImportDefault: true,
    });
    await runImport([
      "MLH - Tool A",
      "Best tool B (MLH)",
      "MLH - Tool D",
      "First time",
    ]);
    expect((await challenge("MLH - Tool D", false)).parentId).toBe(extra.id);
    expect((await challenge("Best tool B (MLH)", false)).parentId).toBe(mlh.id);
    expect((await challenge("Partner fair", true)).importLabelMatch).toBeNull();

    await member.projects.updateChallenge({
      hackathonId: eventId,
      challengeId: first.id,
      parentId: general.id,
      isScheduled: true,
    });
    await member.projects.deleteGroup({
      hackathonId: eventId,
      groupId: general.id,
    });
    expect((await challenge("First time", false)).parentId).toBeNull();
    await member.projects.deleteGroup({
      hackathonId: eventId,
      groupId: mlh.id,
    });
    await member.projects.deleteGroup({
      hackathonId: eventId,
      groupId: extra.id,
    });
    await runImport([
      "MLH - Tool A",
      "Best tool B (MLH)",
      "MLH - Tool C",
      "First time",
    ]);
    expect((await challenge("MLH - Tool C", false)).parentId).toBeNull();
    const remaining = await database.query.ProjectChallenge.findMany({
      where: eq(schema.ProjectChallenge.hackathonId, eventId),
    });
    expect(remaining.every((item) => !item.isGroup && !item.isGeneral)).toBe(
      true,
    );
    const { readScheduleSource } =
      await import("../../utils/judging-schedule/source");
    expect((await readScheduleSource(database, eventId)).tasks).toHaveLength(4);
    const optionalDirectory = await member.projects.listJudge({
      ...listInput,
      hackathonId: eventId,
      challengeIds: [],
      showInRoomOnly: false,
    });
    expect(optionalDirectory.selectedChallengeId).toBe(
      (await member.judging.getWorkspace({ hackathonId: eventId })).challengeId,
    );
    const duplicateGroup = await member.projects.createGroup({
      hackathonId: eventId,
      label: "First time",
      isGeneral: false,
      isScheduled: true,
    });
    await runImport(["First time"]);
    const importedWithGroupName = await challenge("First time", false);
    expect(importedWithGroupName.id).not.toBe(duplicateGroup.id);
    expect(
      await database.query.ProjectToChallenge.findMany({
        where: eq(schema.ProjectToChallenge.challengeId, duplicateGroup.id),
      }),
    ).toHaveLength(0);
    expect(
      await database.query.ProjectToChallenge.findMany({
        where: eq(
          schema.ProjectToChallenge.challengeId,
          importedWithGroupName.id,
        ),
      }),
    ).toHaveLength(1);
    const assignedRoom = await member.judging.createRoom({
      hackathonId: eventId,
      challengeId: first.id,
      name: "Source challenge room",
    });
    await expect(runImport(["MLH - Tool A"])).rejects.toThrow(
      /replacement omits First time/,
    );
    await member.judging.archiveRoom({ roomId: assignedRoom.id });
    await member.projects.deleteGroup({
      hackathonId: eventId,
      groupId: duplicateGroup.id,
    });
    await member.projects.dropAll({
      hackathonId: eventId,
      confirmation: "Group imports",
    });
    await runImport(["[MLH] New import"]);
    expect((await challenge("[MLH] New import", false)).parentId).toBeNull();
    const customMlh = await member.projects.createGroup({
      hackathonId: eventId,
      label: "Custom sponsor fair",
      isGeneral: true,
      isScheduled: false,
      isMlhImportDefault: true,
    });
    await member.projects.dropAll({
      hackathonId: eventId,
      confirmation: "Group imports",
    });
    expect(await challenge("Custom sponsor fair", true)).toMatchObject({
      id: customMlh.id,
      isGeneral: true,
      isScheduled: false,
      importLabelMatch: "MLH",
    });
    expect(
      await database.query.ProjectChallenge.findMany({
        where: eq(schema.ProjectChallenge.hackathonId, eventId),
      }),
    ).toHaveLength(1);
    await runImport(["Another tool (MLH)"]);
    expect((await challenge("Another tool (MLH)", false)).parentId).toBe(
      customMlh.id,
    );
    expect(
      await database.query.ProjectToChallenge.findMany({
        where: eq(schema.ProjectToChallenge.challengeId, customMlh.id),
      }),
    ).toHaveLength(1);

    const [existingProject] = await database
      .select()
      .from(schema.Project)
      .where(eq(schema.Project.hackathonId, eventId));
    if (!existingProject) throw new Error("Missing imported project");
    const optIn = await challenge("Another tool (MLH)", false);
    const [judge] = await database
      .insert(schema.Judge)
      .values({
        hackathonId: eventId,
        kind: "member",
        userId: memberUserId,
        displayName: "Review judge",
      })
      .returning();
    if (!judge) throw new Error("Missing judge fixture");
    const [feedback] = await database
      .insert(schema.ProjectEvaluation)
      .values({
        hackathonId: eventId,
        projectId: existingProject.id,
        challengeId: customMlh.id,
        judgeId: judge.id,
      })
      .returning();
    if (!feedback) throw new Error("Missing feedback fixture");
    await expect(
      member.projects.deleteGroup({
        hackathonId: eventId,
        groupId: customMlh.id,
      }),
    ).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
      message:
        "Challenge setup is locked because judging feedback has started.",
    });
    await member.projects.update({
      ...existingProject,
      projectId: existingProject.id,
      challengeIds: [optIn.id, optIn.id],
      members: [{ name: "Test Hacker", email: "test@example.test" }],
    });
    expect(
      await database.query.ProjectEvaluation.findFirst({
        where: eq(schema.ProjectEvaluation.id, feedback.id),
      }),
    ).toEqual(feedback);

    const [schedule] = await database
      .insert(schema.JudgingSchedule)
      .values({
        hackathonId: eventId,
        startsAt: new Date("2026-09-07T16:00:00Z"),
        endsAt: new Date("2026-09-07T18:00:00Z"),
        setupMinutes: 2,
        judgingMinutes: 6,
        teardownMinutes: 2,
        sameBuildingBreakMinutes: 10,
        differentBuildingBreakMinutes: 20,
        savedByUserId: officerUserId,
      })
      .returning();
    const storedProject = await database.query.Project.findFirst({
      where: eq(schema.Project.id, existingProject.id),
    });
    const memberships = await database.query.ProjectToChallenge.findMany({
      where: eq(schema.ProjectToChallenge.projectId, existingProject.id),
    });
    const lateRow = csvFor(["Another tool (MLH)"]).split("\n")[1];
    if (!lateRow) throw new Error("Missing CSV fixture row");
    const lateCsv =
      csvFor(["Another tool (MLH)"]) +
      "\n" +
      lateRow.replace(
        "Group project,https://example.devpost.com/project",
        "Late project,https://example.devpost.com/late",
      );
    const lateInput = {
      actor: { id: memberUserId, name: "Room Judge" },
      csvContent: lateCsv,
      fileSize: Buffer.byteLength(lateCsv),
      hackathonId: eventId,
    };
    await expect(importDevpostProjects(lateInput)).resolves.toMatchObject({
      addOnly: true,
      importedProjects: 1,
      skippedProjects: 1,
    });
    expect(
      await database.query.ProjectToChallenge.findMany({
        where: eq(schema.ProjectToChallenge.projectId, existingProject.id),
      }),
    ).toEqual(memberships);
    expect(
      await database.query.JudgingSchedule.findFirst({
        where: eq(schema.JudgingSchedule.hackathonId, eventId),
      }),
    ).toEqual(schedule);
    expect(
      await database.query.Project.findFirst({
        where: eq(schema.Project.id, existingProject.id),
      }),
    ).toEqual(storedProject);
    await expect(
      importDevpostProjects({
        ...lateInput,
        mode: "replace",
        confirmation: "Group imports",
      }),
    ).rejects.toThrow(/saved schedule exists/);
  });

  it("creates starter groups before any project import and initializes older hackathons only once", async () => {
    const { eq } = await import("@forge/db");
    const member = await caller({ session });
    const created = await member.hackathon.create({
      displayName: "New judging defaults",
      theme: "Testing",
      startDate: new Date("2026-10-01"),
      endDate: new Date("2026-10-03"),
      applicationOpen: new Date("2026-08-01"),
      applicationDeadline: new Date("2026-09-01"),
      confirmationDeadline: new Date("2026-09-15"),
      applicationUrl: null,
    });
    const groups = await database.query.ProjectChallenge.findMany({
      where: eq(schema.ProjectChallenge.hackathonId, created.id),
    });
    expect(groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "General",
          isGroup: true,
          isGeneral: true,
          isScheduled: true,
        }),
        expect.objectContaining({
          label: "MLH Challenges",
          isGroup: true,
          isGeneral: false,
          isScheduled: false,
          importLabelMatch: "MLH",
          tagColor: "#e93227",
        }),
      ]),
    );
    expect(groups).toHaveLength(2);
    const { readFile } = await import("node:fs/promises");
    const migration = await readFile(
      new URL(
        "../../../../db/drizzle/0053_challenge_groups.sql",
        import.meta.url,
      ),
      "utf8",
    );
    // Replay only the data backfill; the disposable database already has the schema.
    const backfill = migration.slice(
      migration.indexOf("-- Only initialize hackathons"),
    );
    expect(backfill).toContain("Only initialize hackathons");
    const oldId = randomUUID();
    await database.insert(schema.Hackathon).values({
      id: oldId,
      name: oldId,
      displayName: "Older uninitialized hackathon",
      theme: "Testing",
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-10-01"),
    });
    for (const statement of backfill.split("--> statement-breakpoint"))
      await database.$client.query(statement);
    expect(
      await database.query.ProjectChallenge.findMany({
        where: eq(schema.ProjectChallenge.hackathonId, oldId),
      }),
    ).toHaveLength(2);
    const mlh = groups.find((group) => group.importLabelMatch === "MLH");
    if (!mlh) throw new Error("Missing MLH fixture");
    await member.projects.deleteGroup({
      hackathonId: created.id,
      groupId: mlh.id,
    });
    for (const statement of backfill.split("--> statement-breakpoint"))
      await database.$client.query(statement);
    expect(
      await database.query.ProjectChallenge.findMany({
        where: eq(schema.ProjectChallenge.hackathonId, created.id),
      }),
    ).toHaveLength(1);
  });
});
