import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Session } from "@forge/auth/server";
import { getTableName } from "@forge/db";
import { ClubTeam, ClubTeamRole } from "@forge/db/schemas/club-team";
import {
  clubClassificationUpdateSchema,
  discordConfigUpdateSchema,
} from "@forge/validators";

import { permissionBitstring } from "../support/permissions";

interface ClassificationRow {
  calloutLabel: string | null;
  kind: "director" | "executive" | "team";
  rank: number;
  roleId: string;
  rosterLabel: string | null;
  teamId: string | null;
  updatedAt: Date;
}

interface RoleRow {
  id: string;
  name: string;
  teamHexcodeColor: string | null;
}

const mocks = vi.hoisted(() => ({
  classificationRows: [] as unknown[],
  db: { select: vi.fn(), transaction: vi.fn() },
  permissionRows: [] as { permissions: string }[],
  roleRows: [] as unknown[],
  teamRows: [] as unknown[],
}));

vi.mock("@forge/db/client", () => ({ db: mocks.db }));

const { clubTeamsRouter } = await import("../../routers/club-teams");
const { createCallerFactory } = await import("../../trpc");

const callerFactory = createCallerFactory(clubTeamsRouter);
const SESSION = {
  user: { id: "00000000-0000-4000-8000-000000000001", name: "console-test" },
} as Session;

const DESIGN_TEAM = {
  displayOrder: 5,
  heading: "Design Team",
  id: "team-design",
  kind: "team" as const,
  label: "Design",
  slug: "design",
};
const EXECUTIVE_BUCKET = {
  displayOrder: 0,
  heading: "Executive Officers",
  id: "team-executive",
  kind: "executive" as const,
  label: "Executive",
  slug: "executive",
};

function createCaller(session: Session | null = SESSION) {
  return callerFactory({
    headers: new Headers(),
    session,
    source: "club-teams-test",
  });
}

function classification(
  overrides: Partial<ClassificationRow> & { roleId: string },
): ClassificationRow {
  return {
    calloutLabel: null,
    kind: "team",
    rank: 1,
    rosterLabel: null,
    teamId: DESIGN_TEAM.id,
    updatedAt: new Date("2026-07-28T00:00:00.000Z"),
    ...overrides,
  };
}

describe("clubTeams procedures (TC-002, TC-017, TC-019, TC-NEG-010)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.permissionRows = [];
    mocks.teamRows = [EXECUTIVE_BUCKET, DESIGN_TEAM];
    mocks.roleRows = [
      { id: "role-officers", name: "Officers", teamHexcodeColor: "#ffffff" },
      { id: "role-design", name: "KH Design", teamHexcodeColor: "#00ff00" },
      { id: "role-unclassified", name: "Aardvark", teamHexcodeColor: null },
    ] satisfies RoleRow[];
    mocks.classificationRows = [
      classification({
        calloutLabel: "Officer",
        kind: "executive",
        rank: 6,
        roleId: "role-officers",
        teamId: null,
      }),
      classification({ roleId: "role-design" }),
    ];

    mocks.db.select.mockImplementation(() => ({
      from: (table: Parameters<typeof getTableName>[0]) => {
        const name = getTableName(table);
        if (name === getTableName(ClubTeam)) {
          return { orderBy: () => Promise.resolve([...mocks.teamRows]) };
        }
        if (name === getTableName(ClubTeamRole)) {
          return Promise.resolve([...mocks.classificationRows]);
        }
        // `auth_roles` is read two ways: awaited directly for the role list,
        // and through `innerJoin(...).where(...)` by `loadPermissionsForUser`.
        // One thenable serves both without the two colliding.
        return {
          innerJoin: () => ({
            where: () => Promise.resolve(mocks.permissionRows),
          }),
          then: (resolve: (rows: unknown[]) => unknown) =>
            Promise.resolve([...mocks.roleRows]).then(resolve),
        };
      },
    }));
  });

  it("exposes exactly two procedures, neither of which creates or deletes", () => {
    // TC-019.
    expect(Object.keys(clubTeamsRouter._def.procedures).sort()).toEqual([
      "listConfiguration",
      "updateClassification",
    ]);
  });

  it("refuses an unauthenticated caller before loading permissions", async () => {
    await expect(createCaller(null).listConfiguration()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(mocks.db.select).not.toHaveBeenCalled();
  });

  it.each([["CONFIGURE_ROLES"], ["ASSIGN_ROLES"], ["READ_CLUB_DATA"]] as const)(
    "refuses a %s holder, who is not an officer",
    async (permission) => {
      mocks.permissionRows = [{ permissions: permissionBitstring(permission) }];

      await expect(createCaller().listConfiguration()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      await expect(
        createCaller().updateClassification({
          calloutLabel: null,
          kind: "team",
          rank: 1,
          roleId: "00000000-0000-4000-8000-000000000009",
          rosterLabel: null,
          teamId: "00000000-0000-4000-8000-00000000000a",
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(mocks.db.transaction).not.toHaveBeenCalled();
    },
  );

  it("lists every linked role, classified first and unclassified last", async () => {
    mocks.permissionRows = [{ permissions: permissionBitstring("IS_OFFICER") }];

    const result = await createCaller().listConfiguration();

    // Every linked role, not only the classified ones: that is what makes a
    // first classification possible from this screen.
    expect(result.roles.map((role) => role.roleId)).toEqual([
      "role-officers",
      "role-design",
      "role-unclassified",
    ]);
    expect(result.roles.at(-1)).toMatchObject({
      classification: null,
      resolvedCalloutLabel: null,
      resolvedRosterLabel: null,
    });
  });

  it("resolves the labels a NULL override produces today", async () => {
    mocks.permissionRows = [{ permissions: permissionBitstring("IS_OFFICER") }];

    const result = await createCaller().listConfiguration();
    const [officers, design] = result.roles;

    // A plain team member falls back to the team's label; everyone else falls
    // back to the role name. The two overrides are independent, which is the
    // row an officer gets wrong.
    expect(design).toMatchObject({
      resolvedCalloutLabel: "Design Team",
      resolvedRosterLabel: "Design",
    });
    expect(officers).toMatchObject({
      resolvedCalloutLabel: "Officer",
      resolvedRosterLabel: "Officers",
    });
  });

  it("reports teams as read-only context with their classified role counts", async () => {
    // TC-017: teams carry no editable field here and no procedure accepts one.
    mocks.permissionRows = [{ permissions: permissionBitstring("IS_OFFICER") }];

    const result = await createCaller().listConfiguration();

    expect(result.teams).toEqual([
      { ...EXECUTIVE_BUCKET, classifiedRoleCount: 0 },
      { ...DESIGN_TEAM, classifiedRoleCount: 1 },
    ]);
  });

  it("refuses team fields and the feedback flag through the strict schemas", () => {
    // Positive control first: a typo'd fixture would make every rejection below
    // trivially true.
    expect(
      clubClassificationUpdateSchema.parse({
        calloutLabel: "",
        kind: "team",
        rank: 1,
        roleId: "00000000-0000-4000-8000-000000000009",
        rosterLabel: "",
        teamId: "00000000-0000-4000-8000-00000000000a",
      }),
    ).toMatchObject({ calloutLabel: null, rosterLabel: null });

    for (const extra of [
      { label: "Design" },
      { heading: "Design Team" },
      { slug: "design" },
      { displayOrder: 3 },
      // TC-NEG-010: one column, one write path.
      { eventFeedbackExcluded: true },
    ]) {
      expect(() =>
        clubClassificationUpdateSchema.parse({
          calloutLabel: null,
          kind: "team",
          rank: 1,
          roleId: "00000000-0000-4000-8000-000000000009",
          rosterLabel: null,
          teamId: "00000000-0000-4000-8000-00000000000a",
          ...extra,
        }),
      ).toThrow();
    }

    expect(() =>
      discordConfigUpdateSchema.parse({
        acknowledgeGuildRepoint: false,
        description: "Anything",
        developmentId: "",
        eventFeedbackExcluded: true,
        key: "vip_role",
        label: "Anything",
        productionId: "990000000000000001",
      }),
    ).toThrow();
  });
});
