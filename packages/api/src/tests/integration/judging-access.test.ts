import { afterAll, beforeAll, describe, expect, it } from "vitest";

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
const HACKATHON = "30000000-0000-4000-8000-000000000901";
const GENERAL = "40000000-0000-4000-8000-000000000901";
const SPONSOR = "40000000-0000-4000-8000-000000000902";
const GENERAL_PROJECT = "50000000-0000-4000-8000-000000000901";
const SPONSOR_PROJECT = "50000000-0000-4000-8000-000000000902";

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

  beforeAll(async () => {
    disposable = await provisionDisposableDatabase("forge_api");
    // eslint-disable-next-line no-restricted-properties
    process.env.DATABASE_URL = disposable.url;
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
    const generalRoom = await officerCaller.judging.createRoom({
      challengeId: GENERAL,
      hackathonId: HACKATHON,
      name: "General room",
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
});
