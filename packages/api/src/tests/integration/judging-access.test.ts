import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { Session } from "@forge/auth/server";
import type { DisposableDatabase } from "@forge/db/testing";
import { and, eq } from "@forge/db";
import {
  canRunDatabaseTests,
  provisionDisposableDatabase,
} from "@forge/db/testing";

import { permissionBitstring } from "../support/permissions";

type DatabaseClient = typeof import("@forge/db/client").db;
type AuthSchemas = typeof import("@forge/db/schemas/auth");
type KnightHacksSchemas = typeof import("@forge/db/schemas/knight-hacks");

const OFFICER_USER = "10000000-0000-4000-8000-000000000901";
const OFFICER_ROLE = "20000000-0000-4000-8000-000000000901";
const MEMBER_USER = "10000000-0000-4000-8000-000000000902";
const MEMBER_ROLE = "20000000-0000-4000-8000-000000000902";
const HACKATHON = "30000000-0000-4000-8000-000000000901";
const GENERAL = "40000000-0000-4000-8000-000000000901";
const SPONSOR = "40000000-0000-4000-8000-000000000902";
const GENERAL_PROJECT = "50000000-0000-4000-8000-000000000901";
const SPONSOR_PROJECT = "50000000-0000-4000-8000-000000000902";
const RATING_ONE = "60000000-0000-4000-8000-000000000901";
const RATING_TWO = "60000000-0000-4000-8000-000000000902";
const PUBLIC_RESPONSE = "60000000-0000-4000-8000-000000000903";
const OPTIONAL_RESPONSE = "60000000-0000-4000-8000-000000000904";
const PRIVATE_RESPONSE = "60000000-0000-4000-8000-000000000905";

function importCsv() {
  const headers = [
    "Opt-In Prize",
    "Project Title",
    "Submission Url",
    "Project Status",
    "Project Created At",
    "Project Submitted At",
    "About The Project",
    "Submitter First Name",
    "Submitter Last Name",
    "Submitter Email",
    "Additional Team Member Count",
  ];
  const rows = [
    [
      "Acme Challenge",
      "Overwrite attempt",
      "https://sponsor.devpost.com/",
      "Submitted",
      "2026-09-01",
      "2026-09-02",
      "Must not overwrite",
      "Test",
      "Sponsor",
      "sponsor@example.test",
      "0",
    ],
    [
      "Acme Challenge",
      "Brand new project",
      "https://new-project.devpost.com/",
      "Submitted",
      "2026-09-01",
      "2026-09-02",
      "A newly arrived project",
      "Test",
      "Hacker",
      "hacker@example.test",
      "0",
    ],
  ];
  return [headers, ...rows]
    .map((row) => row.map((value) => `"${value}"`).join(","))
    .join("\n");
}

describe.runIf(canRunDatabaseTests())("judging room access", () => {
  let disposable: DisposableDatabase | undefined;
  let client: DatabaseClient;
  let authSchemas: AuthSchemas;
  let schemas: KnightHacksSchemas;
  let officer: Session;
  let member: Session;

  beforeAll(async () => {
    disposable = await provisionDisposableDatabase("forge_api");
    vi.stubEnv("DATABASE_URL", disposable.url);
    vi.stubEnv("JUDGING_ACCESS_SECRET", randomBytes(32).toString("hex"));
    client = (await import("@forge/db/client")).db;
    authSchemas = await import("@forge/db/schemas/auth");
    schemas = await import("@forge/db/schemas/knight-hacks");

    await client.insert(authSchemas.User).values({
      discordUserId: "judging-officer",
      id: OFFICER_USER,
      name: "Jordan Officer",
    });
    await client.insert(authSchemas.Roles).values({
      discordRoleId: "900000000000000901",
      id: OFFICER_ROLE,
      name: "Judging officers",
      permissions: permissionBitstring("IS_OFFICER"),
    });
    await client.insert(authSchemas.Permissions).values({
      roleId: OFFICER_ROLE,
      userId: OFFICER_USER,
    });
    officer = {
      session: { id: "judging-officer-session", userAgent: "vitest" },
      user: { id: OFFICER_USER, name: "Jordan Officer" },
    } as unknown as Session;
    await client.insert(authSchemas.User).values({
      discordUserId: "judging-member",
      id: MEMBER_USER,
      name: "Morgan Judge",
    });
    await client.insert(authSchemas.Roles).values({
      discordRoleId: "900000000000000902",
      id: MEMBER_ROLE,
      name: "Judges",
      permissions: permissionBitstring("IS_JUDGE"),
    });
    await client.insert(authSchemas.Permissions).values({
      roleId: MEMBER_ROLE,
      userId: MEMBER_USER,
    });
    member = {
      session: { id: "judging-member-session", userAgent: "vitest" },
      user: { id: MEMBER_USER, name: "Morgan Judge" },
    } as unknown as Session;

    await client.insert(schemas.Hackathon).values({
      displayName: "Knight Hacks IX",
      endDate: new Date("2026-10-01T00:00:00Z"),
      id: HACKATHON,
      name: "knight-hacks-ix",
      startDate: new Date("2026-09-01T00:00:00Z"),
      theme: "Judging",
    });
    await client.insert(schemas.ProjectChallenge).values([
      { hackathonId: HACKATHON, id: GENERAL, label: "General" },
      { hackathonId: HACKATHON, id: SPONSOR, label: "Acme Challenge" },
    ]);
    const projectDefaults = {
      description: "Project",
      hackathonId: HACKATHON,
      participantCount: 1,
      projectCreatedAt: new Date("2026-09-01T00:00:00Z"),
      submittedAt: new Date("2026-09-02T00:00:00Z"),
    };
    await client.insert(schemas.Project).values([
      {
        ...projectDefaults,
        id: GENERAL_PROJECT,
        submissionUrl: "https://general.devpost.com/",
        title: "General only",
      },
      {
        ...projectDefaults,
        id: SPONSOR_PROJECT,
        submissionUrl: "https://sponsor.devpost.com/",
        title: "Sponsor project",
      },
    ]);
    await client.insert(schemas.ProjectToChallenge).values([
      {
        challengeId: GENERAL,
        hackathonId: HACKATHON,
        projectId: GENERAL_PROJECT,
      },
      {
        challengeId: GENERAL,
        hackathonId: HACKATHON,
        projectId: SPONSOR_PROJECT,
      },
      {
        challengeId: SPONSOR,
        hackathonId: HACKATHON,
        projectId: SPONSOR_PROJECT,
      },
    ]);
  }, 120_000);

  afterAll(async () => {
    await client.$client.end().catch(() => undefined);
    await disposable?.drop();
    vi.unstubAllEnvs();
  }, 30_000);

  async function caller(session: Session | null, headers = new Headers()) {
    const trpc = await import("../../trpc");
    const { judgingRouter } = await import("../../routers/judging");
    const { projectsRouter } = await import("../../routers/projects");
    return trpc.createCallerFactory(
      trpc.createTRPCRouter({
        judging: judgingRouter,
        projects: projectsRouter,
      }),
    )({ headers, session, source: "judging-integration" });
  }

  it("provisions rooms, scopes a guest, reports presence, and revokes access", async () => {
    const officerCaller = await caller(officer);
    const room = await officerCaller.judging.createRoom({
      challengeId: SPONSOR,
      hackathonId: HACKATHON,
      name: "Acme room A",
    });
    const secondRoom = await officerCaller.judging.createRoom({
      challengeId: SPONSOR,
      hackathonId: HACKATHON,
      name: "Acme room B",
    });
    await expect(
      officerCaller.judging.createRoom({
        challengeId: SPONSOR,
        hackathonId: HACKATHON,
        name: "Acme room A",
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: 'An active judging room already uses the name "Acme room A".',
    });
    const generalRoom = await officerCaller.judging.createRoom({
      challengeId: GENERAL,
      hackathonId: HACKATHON,
      name: "General room",
    });
    await expect(
      officerCaller.judging.updateRoom({
        challengeId: GENERAL,
        name: "Acme room B",
        roomId: generalRoom.id,
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: 'An active judging room already uses the name "Acme room B".',
    });
    await expect(
      officerCaller.judging.moveRoom({
        direction: "up",
        roomId: secondRoom.id,
      }),
    ).resolves.toEqual({ moved: true });
    const orderedRooms = await officerCaller.judging.listAdmin({
      hackathonId: HACKATHON,
    });
    expect(orderedRooms.rooms.slice(0, 2).map((item) => item.id)).toEqual([
      secondRoom.id,
      room.id,
    ]);
    const link = await officerCaller.judging.generateRoomLink({
      roomId: room.id,
    });
    expect(link.url).toContain(`/judge/activate/${link.id}`);
    const viewedLink = await officerCaller.judging.generateRoomLink({
      roomId: room.id,
    });
    expect(viewedLink.id).toBe(link.id);
    const audit = await import("@forge/db/schemas/audit");
    await expect(
      client
        .select({ actionKey: audit.AdminAuditEvent.actionKey })
        .from(audit.AdminAuditEvent)
        .where(
          and(
            eq(audit.AdminAuditEvent.actorUserId, OFFICER_USER),
            eq(audit.AdminAuditEvent.actionKey, "judging.room_link.viewed"),
          ),
        ),
    ).resolves.toHaveLength(1);
    const configurations = await client
      .select()
      .from(schemas.HackathonJudgingConfiguration)
      .where(eq(schemas.HackathonJudgingConfiguration.hackathonId, HACKATHON));
    expect(configurations).toHaveLength(1);
    expect(configurations[0]?.projectInventoryLockedAt).toBeInstanceOf(Date);

    const { importDevpostProjects, ProjectImportError } =
      await import("../../projects-import.server");
    const csvContent = importCsv();
    const addOnly = await importDevpostProjects({
      actor: officer.user,
      csvContent,
      fileSize: csvContent.length,
      hackathonId: HACKATHON,
    });
    expect(addOnly).toMatchObject({
      addOnly: true,
      importedProjects: 1,
      skippedProjects: 1,
    });
    await expect(
      client
        .select({ title: schemas.Project.title })
        .from(schemas.Project)
        .where(eq(schemas.Project.id, SPONSOR_PROJECT)),
    ).resolves.toEqual([{ title: "Sponsor project" }]);
    await expect(
      importDevpostProjects({
        actor: officer.user,
        confirmation: "Knight Hacks IX",
        csvContent: importCsv().replaceAll("Acme Challenge", "General"),
        fileSize: csvContent.length,
        hackathonId: HACKATHON,
        mode: "replace",
      }),
    ).rejects.toBeInstanceOf(ProjectImportError);

    const activationUrl = new URL(link.url);
    const { activateJudgingRoom } = await import("../../judging-access.server");
    const activation = await activateJudgingRoom({
      linkId: link.id,
      session: null,
      signature: activationUrl.searchParams.get("signature") ?? "",
    });
    expect(activation.kind).toBe("guest");
    if (activation.kind !== "guest") throw new Error("Expected guest access.");
    const headers = new Headers({
      cookie: `blade_judging_guest=${activation.credential}`,
    });
    const guestCaller = await caller(null, headers);
    await expect(
      guestCaller.projects.listJudge({
        challengeIds: [GENERAL],
        direction: "asc",
        page: 1,
        pageSize: 25,
        query: "",
        sort: "title",
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    await guestCaller.judging.completeGuest({ displayName: "Casey Sponsor" });
    const scoped = await guestCaller.projects.listJudge({
      challengeIds: [GENERAL],
      direction: "asc",
      page: 1,
      pageSize: 25,
      query: "",
      sort: "title",
    });
    expect(scoped.projects.map((project) => project.id)).toEqual(
      expect.arrayContaining([SPONSOR_PROJECT]),
    );
    expect(scoped.projects).toHaveLength(2);
    expect(scoped.challenges).toEqual([
      { id: SPONSOR, label: "Acme Challenge" },
    ]);

    const control = await officerCaller.judging.listAdmin({
      hackathonId: HACKATHON,
    });
    const activeRoom = control.rooms.find(
      (candidate) => candidate.id === room.id,
    );
    expect(activeRoom?.judges).toEqual([
      expect.objectContaining({ displayName: "Casey Sponsor", kind: "guest" }),
    ]);
    await client
      .update(schemas.JudgingRoomPresence)
      .set({ lastSeenAt: new Date(Date.now() - 16 * 60 * 1000) })
      .where(eq(schemas.JudgingRoomPresence.roomId, room.id));
    const staleControl = await officerCaller.judging.listAdmin({
      hackathonId: HACKATHON,
    });
    expect(
      staleControl.rooms.find((candidate) => candidate.id === room.id)?.judges,
    ).toEqual([]);
    await officerCaller.judging.revokeRoomLink({ roomId: room.id });
    await expect(
      guestCaller.projects.listJudge({
        challengeIds: [],
        direction: "asc",
        page: 1,
        pageSize: 25,
        query: "",
        sort: "title",
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    const generalLink = await officerCaller.judging.generateRoomLink({
      roomId: generalRoom.id,
    });
    const generalUrl = new URL(generalLink.url);
    const generalActivation = await activateJudgingRoom({
      linkId: generalLink.id,
      session: null,
      signature: generalUrl.searchParams.get("signature") ?? "",
    });
    if (generalActivation.kind !== "guest") {
      throw new Error("Expected General guest access.");
    }
    const generalCaller = await caller(
      null,
      new Headers({
        cookie: `blade_judging_guest=${generalActivation.credential}`,
      }),
    );
    await generalCaller.judging.completeGuest({
      displayName: "General Sponsor",
    });
    const generalProjects = await generalCaller.projects.listJudge({
      challengeIds: [SPONSOR],
      direction: "asc",
      page: 1,
      pageSize: 25,
      query: "",
      sort: "title",
    });
    expect(generalProjects.projects).toHaveLength(3);
    await expect(generalCaller.judging.endGuest()).resolves.toEqual({
      ended: true,
    });
    await expect(
      generalCaller.projects.listJudge({
        challengeIds: [],
        direction: "asc",
        page: 1,
        pageSize: 25,
        query: "",
        sort: "title",
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    const memberActivation = await activateJudgingRoom({
      linkId: generalLink.id,
      session: officer,
      signature: generalUrl.searchParams.get("signature") ?? "",
    });
    expect(memberActivation).toMatchObject({
      challengeId: GENERAL,
      kind: "member",
      roomId: generalRoom.id,
    });
    const memberContext = await officerCaller.judging.getContext({
      hackathonId: HACKATHON,
    });
    expect(memberContext).toMatchObject({
      activeRoomId: generalRoom.id,
      kind: "member",
    });
  }, 60_000);

  it("scores, edits, gates feedback, and keeps deliberation private", async () => {
    const officerCaller = await caller(officer);
    const memberCaller = await caller(member);
    const sponsorRoom = await officerCaller.judging.createRoom({
      challengeId: SPONSOR,
      hackathonId: HACKATHON,
      name: "Scoring sponsor room",
    });
    await officerCaller.judging.saveRubric({
      hackathonId: HACKATHON,
      items: [
        {
          description: "Assess the technical choices.",
          guestVisibilityPolicy: null,
          id: RATING_ONE,
          kind: "rating",
          label: "Technical understanding",
          memberVisibilityPolicy: null,
          required: true,
        },
        {
          description: "Assess how ready the product feels.",
          guestVisibilityPolicy: null,
          id: RATING_TWO,
          kind: "rating",
          label: "Product readiness",
          memberVisibilityPolicy: null,
          required: true,
        },
        {
          description: "Visible deliberation note.",
          guestVisibilityPolicy: "public",
          id: PUBLIC_RESPONSE,
          kind: "short_response",
          label: "Shared feedback",
          memberVisibilityPolicy: "public",
          required: true,
        },
        {
          description: "The guest decides whether to share this.",
          guestVisibilityPolicy: "public_optional",
          id: OPTIONAL_RESPONSE,
          kind: "short_response",
          label: "Optional feedback",
          memberVisibilityPolicy: "public",
          required: false,
        },
        {
          description: "Private judge note.",
          guestVisibilityPolicy: "private",
          id: PRIVATE_RESPONSE,
          kind: "short_response",
          label: "Private feedback",
          memberVisibilityPolicy: "public",
          required: false,
        },
      ],
    });
    await expect(
      officerCaller.judging.setJudgingState({
        hackathonId: HACKATHON,
        state: "open",
      }),
    ).resolves.toEqual({ state: "open" });

    const first = await officerCaller.judging.saveEvaluation({
      challengeId: SPONSOR,
      hackathonId: HACKATHON,
      projectId: SPONSOR_PROJECT,
      ratings: [
        { itemId: RATING_ONE, value: 5 },
        { itemId: RATING_TWO, value: 5 },
      ],
      responses: [
        {
          isPublic: false,
          itemId: PUBLIC_RESPONSE,
          value: "Strong member feedback",
        },
      ],
    });
    expect(first).toMatchObject({ revision: 1, score: 5 });
    const edited = await officerCaller.judging.saveEvaluation({
      challengeId: SPONSOR,
      hackathonId: HACKATHON,
      projectId: SPONSOR_PROJECT,
      ratings: [
        { itemId: RATING_ONE, value: 4 },
        { itemId: RATING_TWO, value: 2 },
      ],
      responses: [
        {
          isPublic: false,
          itemId: PUBLIC_RESPONSE,
          value: "Updated member feedback",
        },
      ],
    });
    expect(edited).toMatchObject({
      evaluationId: first.evaluationId,
      revision: 2,
      score: 3,
    });
    const revisions = await officerCaller.judging.getEvaluationRevisions({
      evaluationId: first.evaluationId,
    });
    expect(revisions.revisions).toHaveLength(2);
    expect(revisions.revisions[0]).toMatchObject({
      responseAnswers: [
        expect.objectContaining({
          isPublic: true,
          value: "Updated member feedback",
        }),
      ],
      revision: 2,
    });

    const link = await officerCaller.judging.generateRoomLink({
      roomId: sponsorRoom.id,
    });
    const activationUrl = new URL(link.url);
    const { activateJudgingRoom } = await import("../../judging-access.server");
    const activation = await activateJudgingRoom({
      linkId: link.id,
      session: null,
      signature: activationUrl.searchParams.get("signature") ?? "",
    });
    if (activation.kind !== "guest") throw new Error("Expected guest access.");
    const guestCaller = await caller(
      null,
      new Headers({
        cookie: `blade_judging_guest=${activation.credential}`,
      }),
    );
    const guestIdentity = await guestCaller.judging.completeGuest({
      displayName: "Taylor Sponsor",
    });

    const beforeGuestSubmission =
      await guestCaller.judging.getProjectJudgingDetails({
        challengeId: GENERAL,
        hackathonId: "30000000-0000-4000-8000-000000000999",
        projectId: SPONSOR_PROJECT,
      });
    expect(beforeGuestSubmission).toEqual({
      count: 0,
      feedback: [],
      feedbackPage: 1,
      feedbackPageSize: 25,
      feedbackTotal: 0,
      hasOwnEvaluation: false,
      value: null,
    });
    await expect(
      guestCaller.judging.saveEvaluation({
        challengeId: GENERAL,
        hackathonId: "30000000-0000-4000-8000-000000000999",
        projectId: GENERAL_PROJECT,
        ratings: [
          { itemId: RATING_ONE, value: 2 },
          { itemId: RATING_TWO, value: 2 },
        ],
        responses: [
          { itemId: PUBLIC_RESPONSE, value: "Should stay out of scope" },
        ],
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    const guestEvaluation = await guestCaller.judging.saveEvaluation({
      challengeId: GENERAL,
      hackathonId: "30000000-0000-4000-8000-000000000999",
      projectId: SPONSOR_PROJECT,
      ratings: [
        { itemId: RATING_ONE, value: 2 },
        { itemId: RATING_TWO, value: 2 },
      ],
      responses: [
        {
          isPublic: false,
          itemId: PUBLIC_RESPONSE,
          value: "Public guest response",
        },
        {
          isPublic: false,
          itemId: OPTIONAL_RESPONSE,
          value: "Private optional response",
        },
        {
          isPublic: true,
          itemId: PRIVATE_RESPONSE,
          value: "Always private response",
        },
      ],
    });
    expect(guestEvaluation.score).toBe(2);
    const hiddenJudgedProject = await guestCaller.projects.listJudge({
      challengeIds: [],
      direction: "asc",
      page: 1,
      pageSize: 25,
      query: "Sponsor project",
      sort: "title",
    });
    expect(hiddenJudgedProject.projects).toEqual([]);
    const restoredJudgedProject = await guestCaller.projects.listJudge({
      challengeIds: [],
      direction: "asc",
      includeJudged: true,
      page: 1,
      pageSize: 25,
      query: "Sponsor project",
      sort: "title",
    });
    expect(restoredJudgedProject.projects).toEqual([
      expect.objectContaining({ challenges: [], id: SPONSOR_PROJECT }),
    ]);
    await expect(
      guestCaller.projects.listJudge({
        challengeIds: [],
        direction: "desc",
        includeJudged: true,
        page: 1,
        pageSize: 25,
        query: "",
        sort: "rating",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const guestScores = await guestCaller.judging.getProjectScores({
      challengeId: GENERAL,
      hackathonId: "30000000-0000-4000-8000-000000000999",
      projectIds: [SPONSOR_PROJECT],
    });
    expect(guestScores[0]).toMatchObject({
      hasOwnEvaluation: true,
      scoped: { count: 2, value: 2.5 },
    });
    expect(guestScores[0]?.overall).toBeUndefined();
    const guestDetails = await guestCaller.judging.getProjectJudgingDetails({
      challengeId: GENERAL,
      hackathonId: "30000000-0000-4000-8000-000000000999",
      projectId: SPONSOR_PROJECT,
    });
    expect(guestDetails).toMatchObject({ count: 2, feedback: [], value: 2.5 });

    const memberBeforeReveal = await memberCaller.judging.getProjectScores({
      challengeId: SPONSOR,
      projectIds: [SPONSOR_PROJECT],
    });
    expect(memberBeforeReveal[0]?.scoped).toEqual({ count: 0, value: null });
    await expect(
      memberCaller.projects.listJudge({
        challengeIds: [SPONSOR],
        direction: "desc",
        includeJudged: true,
        page: 1,
        pageSize: 25,
        query: "",
        sort: "challengeRating",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await officerCaller.judging.setDisplayAllResults({
      displayAllResults: true,
      hackathonId: HACKATHON,
    });
    const memberAfterReveal = await memberCaller.judging.getProjectScores({
      challengeId: SPONSOR,
      projectIds: [SPONSOR_PROJECT],
    });
    expect(memberAfterReveal[0]).toMatchObject({
      hasOwnEvaluation: false,
      overall: { count: 2, value: 2.5 },
      scoped: { count: 2, value: 2.5 },
    });
    const sortedByChallengeRating = await memberCaller.projects.listJudge({
      challengeIds: [SPONSOR],
      direction: "desc",
      includeJudged: true,
      page: 1,
      pageSize: 25,
      query: "",
      sort: "challengeRating",
    });
    expect(sortedByChallengeRating.projects[0]?.id).toBe(SPONSOR_PROJECT);
    expect(
      sortedByChallengeRating.projects[0]?.challenges.find(
        (challenge) => challenge.id === SPONSOR,
      ),
    ).toMatchObject({ evaluationCount: 2, id: SPONSOR });
    const sortedByRating = await memberCaller.projects.listJudge({
      challengeIds: [SPONSOR],
      direction: "desc",
      includeJudged: true,
      page: 1,
      pageSize: 25,
      query: "",
      sort: "rating",
    });
    expect(sortedByRating.projects[0]?.id).toBe(SPONSOR_PROJECT);
    const memberDetails = await memberCaller.judging.getProjectJudgingDetails({
      challengeId: SPONSOR,
      projectId: SPONSOR_PROJECT,
    });
    expect(memberDetails.feedback.map((item) => item.value).sort()).toEqual(
      [
        "Always private response",
        "Private optional response",
        "Public guest response",
        "Updated member feedback",
      ].sort(),
    );
    expect(
      memberDetails.feedback
        .filter((item) =>
          ["Always private response", "Private optional response"].includes(
            item.value,
          ),
        )
        .every((item) => item.isPublic === false),
    ).toBe(true);

    const audit = await import("@forge/db/schemas/audit");
    const [guestSession] = await client
      .select({ id: schemas.GuestJudgeSession.id })
      .from(schemas.GuestJudgeSession)
      .where(eq(schemas.GuestJudgeSession.judgeId, guestIdentity.judgeId))
      .limit(1);
    if (!guestSession) throw new Error("Expected completed guest session.");
    const evaluationAudit = await client
      .select({
        actorUserId: audit.AdminAuditEvent.actorUserId,
        metadata: audit.AdminAuditEvent.metadata,
        targetId: audit.AdminAuditSubject.targetId,
        targetType: audit.AdminAuditSubject.targetType,
      })
      .from(audit.AdminAuditEvent)
      .innerJoin(
        audit.AdminAuditSubject,
        eq(audit.AdminAuditSubject.eventId, audit.AdminAuditEvent.id),
      )
      .where(eq(audit.AdminAuditEvent.actionKey, "judging.evaluation.saved"));
    expect(evaluationAudit).toHaveLength(3);
    expect(evaluationAudit.map((event) => event.actorUserId)).toEqual(
      expect.arrayContaining([OFFICER_USER, guestSession.id]),
    );
    expect(
      evaluationAudit.map((event) => ({
        evaluationId: event.metadata.evaluationId,
        projectId: event.metadata.projectId,
        revision: event.metadata.revision,
        targetId: event.targetId,
        targetType: event.targetType,
      })),
    ).toEqual(
      expect.arrayContaining([
        {
          evaluationId: first.evaluationId,
          projectId: SPONSOR_PROJECT,
          revision: 1,
          targetId: SPONSOR_PROJECT,
          targetType: "project",
        },
        {
          evaluationId: first.evaluationId,
          projectId: SPONSOR_PROJECT,
          revision: 2,
          targetId: SPONSOR_PROJECT,
          targetType: "project",
        },
        expect.objectContaining({
          evaluationId: guestEvaluation.evaluationId,
          revision: 1,
        }),
      ]),
    );
    expect(JSON.stringify(evaluationAudit)).not.toContain(
      "Updated member feedback",
    );
    expect(JSON.stringify(evaluationAudit)).not.toContain(
      "Public guest response",
    );

    const evaluationList = await officerCaller.judging.listEvaluationAudit({
      hackathonId: HACKATHON,
    });
    expect(evaluationList).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: first.evaluationId, revision: 2 }),
        expect.objectContaining({
          id: guestEvaluation.evaluationId,
          revision: 1,
        }),
      ]),
    );
    await expect(
      memberCaller.judging.listEvaluationAudit({ hackathonId: HACKATHON }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await client
      .update(schemas.Project)
      .set({ deletedAt: new Date(), deletedByUserId: OFFICER_USER })
      .where(eq(schemas.Project.id, SPONSOR_PROJECT));
    expect(
      (
        await guestCaller.judging.getProjectScores({
          projectIds: [SPONSOR_PROJECT],
        })
      )[0],
    ).toMatchObject({
      hasOwnEvaluation: false,
      scoped: { count: 0, value: null },
    });
    expect(
      (
        await memberCaller.judging.getProjectScores({
          challengeId: SPONSOR,
          projectIds: [SPONSOR_PROJECT],
        })
      )[0],
    ).toMatchObject({
      overall: { count: 0, value: null },
      scoped: { count: 0, value: null },
    });
    expect(
      (await guestCaller.judging.listMySubmissions({}))[0]?.projectAvailable,
    ).toBe(false);
    await client
      .update(schemas.Project)
      .set({ deletedAt: null, deletedByUserId: null })
      .where(eq(schemas.Project.id, SPONSOR_PROJECT));

    await expect(
      client
        .delete(schemas.ProjectToChallenge)
        .where(
          and(
            eq(schemas.ProjectToChallenge.projectId, SPONSOR_PROJECT),
            eq(schemas.ProjectToChallenge.challengeId, SPONSOR),
          ),
        ),
    ).rejects.toThrow(/Failed query: delete from/);
    expect(
      (await guestCaller.judging.listMySubmissions({}))[0]?.projectAvailable,
    ).toBe(true);

    const section = await guestCaller.judging.createDeliberationSection({
      hackathonId: "30000000-0000-4000-8000-000000000999",
      name: "Finalists",
    });
    if (!section) throw new Error("Expected deliberation section.");
    await guestCaller.judging.addDeliberationProject({
      hackathonId: "30000000-0000-4000-8000-000000000999",
      projectId: SPONSOR_PROJECT,
      sectionId: section.id,
    });
    await expect(
      guestCaller.judging.addDeliberationProject({
        projectId: SPONSOR_PROJECT,
        sectionId: section.id,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await guestCaller.judging.listMyDeliberation({})).toHaveLength(1);
    expect(await memberCaller.judging.listMyDeliberation({})).toEqual([]);

    await officerCaller.judging.setJudgingState({
      hackathonId: HACKATHON,
      state: "closed",
    });
    await expect(
      guestCaller.judging.renameDeliberationSection({
        name: "Locked",
        sectionId: section.id,
      }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    await expect(
      guestCaller.judging.saveEvaluation({
        projectId: SPONSOR_PROJECT,
        ratings: [
          { itemId: RATING_ONE, value: 1 },
          { itemId: RATING_TWO, value: 1 },
        ],
        responses: [{ itemId: PUBLIC_RESPONSE, value: "Closed" }],
      }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    await officerCaller.judging.setJudgingState({
      hackathonId: HACKATHON,
      state: "open",
    });
    await expect(
      officerCaller.judging.saveRubric({
        hackathonId: HACKATHON,
        items: [],
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    const retainedEvaluation = await memberCaller.judging.saveEvaluation({
      challengeId: GENERAL,
      projectId: GENERAL_PROJECT,
      ratings: [
        { itemId: RATING_ONE, value: 4 },
        { itemId: RATING_TWO, value: 3 },
      ],
      responses: [
        { itemId: PUBLIC_RESPONSE, value: "Historical member feedback" },
      ],
    });
    await client
      .delete(authSchemas.Permissions)
      .where(eq(authSchemas.Permissions.userId, MEMBER_USER));
    await client
      .delete(authSchemas.User)
      .where(eq(authSchemas.User.id, MEMBER_USER));
    const [retainedJudge] = await client
      .select({
        kind: schemas.Judge.kind,
        userId: schemas.Judge.userId,
      })
      .from(schemas.Judge)
      .innerJoin(
        schemas.ProjectEvaluation,
        eq(schemas.ProjectEvaluation.judgeId, schemas.Judge.id),
      )
      .where(eq(schemas.ProjectEvaluation.id, retainedEvaluation.evaluationId));
    expect(retainedJudge).toEqual({ kind: "member", userId: null });
    await expect(
      client
        .select({ revision: schemas.ProjectEvaluationRevision.revision })
        .from(schemas.ProjectEvaluationRevision)
        .where(
          eq(
            schemas.ProjectEvaluationRevision.evaluationId,
            retainedEvaluation.evaluationId,
          ),
        ),
    ).resolves.toEqual([{ revision: 1 }]);
  }, 60_000);
});
