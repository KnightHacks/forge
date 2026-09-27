import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Session } from "@forge/auth/server";
import type { DisposableDatabase } from "@forge/db/testing";
import { eq } from "@forge/db";
import {
  canRunDatabaseTests,
  provisionDisposableDatabase,
} from "@forge/db/testing";

import { permissionBitstring } from "../support/permissions";

type DatabaseClient = typeof import("@forge/db/client").db;
type AuthSchemas = typeof import("@forge/db/schemas/auth");
type KnightHacksSchemas = typeof import("@forge/db/schemas/knight-hacks");

const OFFICER_USER = "10000000-0000-4000-8000-000000000527";
const OFFICER_ROLE = "30000000-0000-4000-8000-000000000527";
const TARGET_HACKATHON = "50000000-0000-4000-8000-000000000527";
const OTHER_HACKATHON = "50000000-0000-4000-8000-000000000528";
const TARGET_PROJECT = "60000000-0000-4000-8000-000000000527";
const OTHER_PROJECT = "60000000-0000-4000-8000-000000000528";
const TARGET_CHALLENGE = "70000000-0000-4000-8000-000000000527";
const OTHER_CHALLENGE = "70000000-0000-4000-8000-000000000528";

describe.runIf(canRunDatabaseTests())("project inventory hard deletion", () => {
  let disposable: DisposableDatabase | undefined;
  let client: DatabaseClient | undefined;
  let auth: AuthSchemas;
  let schemas: KnightHacksSchemas;
  let caller: Awaited<ReturnType<typeof officerCaller>>;

  async function officerCaller() {
    const trpc = await import("../../trpc");
    const { projectsRouter } = await import("../../routers/projects");
    return trpc.createCallerFactory(
      trpc.createTRPCRouter({ projects: projectsRouter }),
    )({
      headers: new Headers(),
      session: {
        session: { id: "projects-drop-all", userAgent: "vitest" },
        user: { id: OFFICER_USER, name: "Officer" },
      } as unknown as Session,
      source: "projects-drop-all-integration",
    });
  }

  beforeAll(async () => {
    disposable = await provisionDisposableDatabase("forge_api");
    // eslint-disable-next-line no-restricted-properties
    process.env.DATABASE_URL = disposable.url;

    const databaseModule = await import("@forge/db/client");
    client = databaseModule.db;
    const database = client;
    auth = await import("@forge/db/schemas/auth");
    schemas = await import("@forge/db/schemas/knight-hacks");

    await database.insert(auth.User).values({
      discordUserId: "discord-project-officer",
      id: OFFICER_USER,
    });
    await database.insert(auth.Roles).values({
      discordRoleId: "990000000000000527",
      id: OFFICER_ROLE,
      name: "Officers",
      permissions: permissionBitstring("IS_OFFICER"),
    });
    await database
      .insert(auth.Permissions)
      .values({ roleId: OFFICER_ROLE, userId: OFFICER_USER });

    const window = {
      endDate: new Date("2026-10-03T00:00:00Z"),
      startDate: new Date("2026-10-01T00:00:00Z"),
      theme: "Projects",
    };
    await database.insert(schemas.Hackathon).values([
      {
        ...window,
        displayName: "Target Hackathon",
        id: TARGET_HACKATHON,
        name: "target-hackathon",
      },
      {
        ...window,
        displayName: "Other Hackathon",
        id: OTHER_HACKATHON,
        name: "other-hackathon",
      },
    ]);
    const projectDefaults = {
      description: "Test project",
      participantCount: 1,
      projectCreatedAt: new Date("2026-09-01T00:00:00Z"),
      submittedAt: new Date("2026-09-02T00:00:00Z"),
    };
    await database.insert(schemas.Project).values([
      {
        ...projectDefaults,
        hackathonId: TARGET_HACKATHON,
        id: TARGET_PROJECT,
        submissionUrl: "https://target.example.test",
        title: "Target project",
      },
      {
        ...projectDefaults,
        hackathonId: OTHER_HACKATHON,
        id: OTHER_PROJECT,
        submissionUrl: "https://other.example.test",
        title: "Other project",
      },
    ]);
    await database.insert(schemas.ProjectMember).values([
      {
        displayOrder: 0,
        email: "target@example.test",
        name: "Target member",
        projectId: TARGET_PROJECT,
      },
      {
        displayOrder: 0,
        email: "other@example.test",
        name: "Other member",
        projectId: OTHER_PROJECT,
      },
    ]);
    await database.insert(schemas.ProjectChallenge).values([
      {
        hackathonId: TARGET_HACKATHON,
        id: TARGET_CHALLENGE,
        label: "General",
      },
      {
        hackathonId: OTHER_HACKATHON,
        id: OTHER_CHALLENGE,
        label: "General",
      },
    ]);
    await database.insert(schemas.ProjectToChallenge).values([
      {
        challengeId: TARGET_CHALLENGE,
        hackathonId: TARGET_HACKATHON,
        projectId: TARGET_PROJECT,
      },
      {
        challengeId: OTHER_CHALLENGE,
        hackathonId: OTHER_HACKATHON,
        projectId: OTHER_PROJECT,
      },
    ]);
    await database.insert(schemas.JudgingRoom).values({
      archivedAt: new Date("2026-09-03T00:00:00Z"),
      challengeId: TARGET_CHALLENGE,
      displayOrder: 0,
      hackathonId: TARGET_HACKATHON,
      name: "Archived sponsor room",
    });

    caller = await officerCaller();
  }, 120_000);

  afterAll(async () => {
    await client?.$client.end().catch(() => undefined);
    await disposable?.drop();
  }, 30_000);

  it("deletes only the selected hackathon and cascades its dependent rows", async () => {
    if (!client)
      throw new Error("The disposable database was not provisioned.");
    await expect(
      caller.projects.dropAll({
        confirmation: "Target Hackathon",
        hackathonId: TARGET_HACKATHON,
      }),
    ).resolves.toEqual({
      hackathonId: TARGET_HACKATHON,
      projectCount: 1,
    });

    await expect(
      client
        .select()
        .from(schemas.Project)
        .where(eq(schemas.Project.hackathonId, TARGET_HACKATHON)),
    ).resolves.toHaveLength(0);
    await expect(client.select().from(schemas.ProjectMember)).resolves.toEqual([
      expect.objectContaining({
        name: "Other member",
        projectId: OTHER_PROJECT,
      }),
    ]);
    await expect(
      client
        .select()
        .from(schemas.ProjectChallenge)
        .where(eq(schemas.ProjectChallenge.hackathonId, TARGET_HACKATHON)),
    ).resolves.toHaveLength(0);
    await expect(
      client
        .select()
        .from(schemas.JudgingRoom)
        .where(eq(schemas.JudgingRoom.hackathonId, TARGET_HACKATHON)),
    ).resolves.toHaveLength(0);
    await expect(
      client.select().from(schemas.ProjectToChallenge),
    ).resolves.toEqual([
      expect.objectContaining({
        challengeId: OTHER_CHALLENGE,
        hackathonId: OTHER_HACKATHON,
        projectId: OTHER_PROJECT,
      }),
    ]);
    await expect(
      client
        .select()
        .from(schemas.Project)
        .where(eq(schemas.Project.hackathonId, OTHER_HACKATHON)),
    ).resolves.toHaveLength(1);
  });
});
