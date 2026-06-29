import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { RouterOutputs } from "@forge/api";
import { roleManagementQuerySchema } from "@forge/validators";

import { RoleManagementDashboard } from "~/app/_components/admin/roles/role-management-dashboard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
}));

vi.mock("~/trpc/react", () => ({
  api: {
    roles: {
      batchAssign: { useMutation: vi.fn(() => ({ mutate: vi.fn() })) },
      createLink: { useMutation: vi.fn(() => ({ mutate: vi.fn() })) },
      listDiscordOptions: {
        useQuery: vi.fn(() => ({ data: [], isLoading: false })),
      },
      previewDiscordRole: {
        useQuery: vi.fn(() => ({ data: undefined, isFetching: false })),
      },
      syncRole: { useMutation: vi.fn(() => ({ mutate: vi.fn() })) },
      unlinkRole: { useMutation: vi.fn(() => ({ mutate: vi.fn() })) },
      updatePermissions: { useMutation: vi.fn(() => ({ mutate: vi.fn() })) },
    },
    useUtils: () => ({
      roles: {
        getRole: { invalidate: vi.fn() },
        listLinks: { invalidate: vi.fn() },
        listUsers: { invalidate: vi.fn() },
      },
    }),
  },
}));

const roles = [
  {
    assignmentCount: 7,
    dependencyCount: 0,
    discordRoleId: "100000000000000001",
    id: "00000000-0000-4000-8000-000000000001",
    isCosmetic: false,
    isMissing: false,
    memberCount: 8,
    name: "Design",
    permissions: ["READ_MEMBERS"],
    storedName: "Design",
    teamHexcodeColor: "#6d28d9",
  },
  {
    assignmentCount: 2,
    dependencyCount: 0,
    discordRoleId: "100000000000000002",
    id: "00000000-0000-4000-8000-000000000002",
    isCosmetic: true,
    isMissing: false,
    memberCount: 2,
    name: "Purple",
    permissions: [],
    storedName: "Purple",
    teamHexcodeColor: null,
  },
  {
    assignmentCount: 0,
    dependencyCount: 0,
    discordRoleId: "100000000000000003",
    id: "00000000-0000-4000-8000-000000000003",
    isCosmetic: true,
    isMissing: true,
    memberCount: null,
    name: "Former role",
    permissions: [],
    storedName: "Former role",
    teamHexcodeColor: null,
  },
] as RouterOutputs["roles"]["listLinks"];

const users = {
  pagination: { page: 1, pageCount: 1, pageSize: 25, totalCount: 1 },
  users: [
    {
      discordUserId: "200000000000000001",
      email: "alice@example.test",
      id: "00000000-0000-4000-8000-000000000010",
      memberName: "Alice Archive",
      name: "admin-target-00",
      roleIds: ["00000000-0000-4000-8000-000000000001"],
    },
  ],
} as unknown as RouterOutputs["roles"]["listUsers"];

describe("RoleManagementDashboard", () => {
  it("shows linked role states and configure controls", () => {
    const html = renderToStaticMarkup(
      createElement(RoleManagementDashboard, {
        access: { canAssign: true, canConfigure: true },
        detail: null,
        input: roleManagementQuerySchema.parse({}),
        roles,
        users: null,
      }),
    );

    expect(html).toContain('data-role-management-layout="responsive"');
    expect(html).toContain("Roles");
    expect(html).toContain("Assignments");
    expect(html).toContain("Create role");
    expect(html).toContain("Design");
    expect(html).toContain("Cosmetic");
    expect(html).toContain("Discord role missing");
    expect(html).toContain("Sync Design");
  });

  it("omits configuration controls for assignment-only users", () => {
    const html = renderToStaticMarkup(
      createElement(RoleManagementDashboard, {
        access: { canAssign: true, canConfigure: false },
        detail: null,
        input: roleManagementQuerySchema.parse({ view: "assignments" }),
        roles,
        users,
      }),
    );

    expect(html).toContain("Assignments");
    expect(html).not.toContain("Create role");
    expect(html).not.toContain("Sync Design");
    expect(html).toContain("Alice Archive");
    expect(html).toContain("Select Alice Archive");
    expect(html).not.toMatch(/<th[^>]*>Email<\/th>/);
  });

  it("omits assignment UI for configure-only users", () => {
    const html = renderToStaticMarkup(
      createElement(RoleManagementDashboard, {
        access: { canAssign: false, canConfigure: true },
        detail: null,
        input: roleManagementQuerySchema.parse({}),
        roles,
        users: null,
      }),
    );

    expect(html).not.toContain('href="/admin/roles?view=assignments"');
    expect(html).not.toContain("Select Alice Archive");
  });
});
