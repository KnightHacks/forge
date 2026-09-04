import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Session } from "@forge/auth/server";
import { Project, ProjectChallenge } from "@forge/db/schemas/knight-hacks";

const HACKATHON_ID = "00000000-0000-4000-8000-000000000527";

const mocks = vi.hoisted(() => ({
  captureAdminAuditActor: vi.fn(),
  createAdminAuditEvent: vi.fn().mockResolvedValue({ id: "audit-event" }),
  deleteTable: vi.fn(),
  deleteWhere: vi.fn().mockResolvedValue(undefined),
  findJudgingConfiguration: vi.fn().mockResolvedValue(undefined),
  findJudgingRoom: vi.fn().mockResolvedValue(undefined),
  permissions: { IS_OFFICER: true },
  select: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@forge/db/client", () => ({
  db: {
    transaction: mocks.transaction,
  },
}));

vi.mock("../../utils/permissions-db", () => ({
  loadPermissionsForUser: vi.fn(() => Promise.resolve(mocks.permissions)),
}));

vi.mock("../../utils/audit/service", () => ({
  captureAdminAuditActor: mocks.captureAdminAuditActor,
  createAdminAuditEvent: mocks.createAdminAuditEvent,
}));

const { projectsRouter } = await import("../../routers/projects");
const { createCallerFactory, createTRPCRouter } = await import("../../trpc");

const callerFactory = createCallerFactory(
  createTRPCRouter({ projects: projectsRouter }),
);
const session = {
  user: {
    id: "00000000-0000-4000-8000-000000000001",
    name: "project-admin",
  },
} as Session;

function createCaller() {
  return callerFactory({
    headers: new Headers(),
    session,
    source: "project-drop-all-test",
  });
}

function selectHackathon() {
  return {
    from: () => ({
      where: () => ({
        for: () => ({
          limit: () =>
            Promise.resolve([
              { displayName: "Knight Hacks IX", id: HACKATHON_ID },
            ]),
        }),
      }),
    }),
  };
}

function selectProjectCount() {
  return {
    from: () => ({
      where: () => Promise.resolve([{ projectCount: 3 }]),
    }),
  };
}

describe("project inventory hard deletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.select.mockReset();
    mocks.permissions.IS_OFFICER = true;
    mocks.captureAdminAuditActor.mockResolvedValue(session.user);
    mocks.findJudgingConfiguration.mockResolvedValue(undefined);
    mocks.findJudgingRoom.mockResolvedValue(undefined);
    mocks.select
      .mockImplementationOnce(selectHackathon)
      .mockImplementationOnce(selectProjectCount);

    const tx = {
      delete: mocks.deleteTable.mockImplementation(() => ({
        where: mocks.deleteWhere,
      })),
      query: {
        HackathonJudgingConfiguration: {
          findFirst: mocks.findJudgingConfiguration,
        },
        JudgingRoom: { findFirst: mocks.findJudgingRoom },
      },
      select: mocks.select,
    };
    mocks.transaction.mockImplementation(
      (callback: (database: typeof tx) => unknown) =>
        Promise.resolve(callback(tx)),
    );
  });

  it("requires the selected hackathon name before deleting anything", async () => {
    await expect(
      createCaller().projects.dropAll({
        confirmation: " Knight Hacks IX ",
        hackathonId: HACKATHON_ID,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(mocks.deleteTable).not.toHaveBeenCalled();
    expect(mocks.createAdminAuditEvent).not.toHaveBeenCalled();
  });

  it("deletes the selected inventory and writes one aggregate audit event", async () => {
    await expect(
      createCaller().projects.dropAll({
        confirmation: "Knight Hacks IX",
        hackathonId: HACKATHON_ID,
      }),
    ).resolves.toEqual({ hackathonId: HACKATHON_ID, projectCount: 3 });

    expect(mocks.deleteTable).toHaveBeenNthCalledWith(1, Project);
    expect(mocks.deleteTable).toHaveBeenNthCalledWith(2, ProjectChallenge);
    expect(mocks.createAdminAuditEvent).toHaveBeenCalledOnce();
    expect(mocks.createAdminAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actionKey: "project.inventory_dropped",
        metadata: { projectCount: 3 },
        subjects: [
          expect.objectContaining({
            targetId: HACKATHON_ID,
            targetType: "hackathon",
          }),
        ],
      }),
      expect.anything(),
    );
  });

  it("rejects judges before opening a transaction", async () => {
    mocks.permissions.IS_OFFICER = false;

    await expect(
      createCaller().projects.dropAll({
        confirmation: "Knight Hacks IX",
        hackathonId: HACKATHON_ID,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("requires active rooms to be archived before dropping inventory", async () => {
    mocks.findJudgingRoom.mockResolvedValue({ name: "Sponsor suite" });

    await expect(
      createCaller().projects.dropAll({
        confirmation: "Knight Hacks IX",
        hackathonId: HACKATHON_ID,
      }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(mocks.deleteTable).not.toHaveBeenCalled();
  });
});
