/** @vitest-environment jsdom */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RouterOutputs } from "@forge/api";
import { roleManagementQuerySchema } from "@forge/validators";

import { RoleManagementDashboard } from "~/app/_components/admin/roles/role-management-dashboard";

const { batchMutate } = vi.hoisted(() => ({ batchMutate: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
}));

vi.mock("~/trpc/react", () => ({
  api: {
    roles: {
      batchAssign: {
        useMutation: vi.fn(() => ({
          isPending: false,
          mutate: batchMutate,
        })),
      },
      syncRole: {
        useMutation: vi.fn(() => ({ isPending: false, mutate: vi.fn() })),
      },
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

vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

Element.prototype.scrollIntoView = vi.fn();

const roles = [
  {
    assignmentCount: 7,
    dependencyCount: 0,
    discordRoleId: "100000000000000001",
    id: "00000000-0000-4000-8000-000000000001",
    isCosmetic: false,
    isMissing: false,
    memberCount: 8,
    name: "Design Team",
    permissions: ["READ_MEMBERS"],
    storedName: "Design Team",
    syncState: "linked",
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
    name: "Purple Cosmetic",
    permissions: [],
    storedName: "Purple Cosmetic",
    syncState: "linked",
    teamHexcodeColor: null,
  },
] as unknown as RouterOutputs["roles"]["listLinks"];

const users = {
  pagination: { page: 1, pageCount: 1, pageSize: 25, totalCount: 2 },
  users: [
    {
      discordUserId: "200000000000000001",
      email: "alice@example.test",
      id: "00000000-0000-4000-8000-000000000010",
      memberName: "Alice Archive",
      name: "alice",
      roleIds: [],
    },
    {
      discordUserId: "200000000000000002",
      email: "bob@example.test",
      id: "00000000-0000-4000-8000-000000000011",
      memberName: "Bob Builder",
      name: "bob",
      roleIds: [],
    },
  ],
} as unknown as RouterOutputs["roles"]["listUsers"];

function renderAssignments() {
  return render(
    <RoleManagementDashboard
      access={{ canAssign: true, canConfigure: false }}
      detail={null}
      input={roleManagementQuerySchema.parse({ view: "assignments" })}
      roles={roles}
      users={users}
    />,
  );
}

describe("role assignment flow", () => {
  beforeEach(() => batchMutate.mockClear());

  it("names the user filter and keeps role changes behind an explicit action", async () => {
    const user = userEvent.setup();
    renderAssignments();

    expect(
      screen.getByRole("button", { name: /filter users by role/i }),
    ).toBeVisible();
    expect(screen.queryByText("Assignment tray")).not.toBeInTheDocument();

    const start = screen.getByRole("button", {
      name: "Select people to assign roles",
    });
    expect(start).toBeDisabled();

    await user.click(
      screen.getAllByRole("checkbox", { name: "Select Alice Archive" })[0]!,
    );
    await user.click(
      screen.getByRole("button", { name: "Assign roles to 1 person" }),
    );

    const dialog = screen.getByRole("dialog", { name: "Assign roles" });
    expect(within(dialog).getByText("Alice Archive")).toBeVisible();
    expect(
      within(dialog).getByRole("button", { name: "Add roles" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(dialog).getByRole("button", { name: "Remove roles" }),
    ).toBeVisible();
  });

  it("shows role and person names before sending the exact batch", async () => {
    const user = userEvent.setup();
    renderAssignments();

    await user.click(
      screen.getAllByRole("checkbox", { name: "Select Alice Archive" })[0]!,
    );
    await user.click(
      screen.getAllByRole("checkbox", { name: "Select Bob Builder" })[0]!,
    );
    await user.click(
      screen.getByRole("button", { name: "Assign roles to 2 people" }),
    );

    await user.click(screen.getByRole("combobox", { name: "Roles" }));
    await user.click(screen.getByRole("option", { name: /Purple Cosmetic/ }));
    await user.keyboard("{Escape}");
    await user.click(
      screen.getByRole("button", { name: "Add 1 role to 2 people" }),
    );

    const confirmation = screen.getByRole("dialog", {
      name: "Confirm role changes",
    });
    expect(within(confirmation).getByText("Purple Cosmetic")).toBeVisible();
    expect(within(confirmation).getByText("Alice Archive")).toBeVisible();
    expect(within(confirmation).getByText("Bob Builder")).toBeVisible();

    await user.click(
      within(confirmation).getByRole("button", {
        name: "Confirm: Add 1 role to 2 people",
      }),
    );

    expect(batchMutate).toHaveBeenCalledWith({
      action: "grant",
      roleIds: ["00000000-0000-4000-8000-000000000002"],
      userIds: [
        "00000000-0000-4000-8000-000000000010",
        "00000000-0000-4000-8000-000000000011",
      ],
    });
  });
});
