import type { ReactNode } from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { RouterOutputs } from "@forge/api";

import { RoleDetailDialog } from "~/app/_components/admin/roles/role-detail-dialog";

vi.mock("@forge/ui/dialog", async () => {
  const { createElement } = await import("react");
  const Container = ({ children, ...props }: { children: ReactNode }) =>
    createElement("div", props, children);
  return {
    Dialog: ({ children }: { children: ReactNode }) =>
      createElement("div", { role: "dialog" }, children),
    DialogContent: Container,
    DialogDescription: Container,
    DialogFooter: Container,
    DialogHeader: Container,
    DialogTitle: Container,
  };
});

vi.mock("~/trpc/react", () => ({
  api: {
    roles: {
      syncRole: {
        useMutation: vi.fn(() => ({ isPending: false, mutate: vi.fn() })),
      },
      unlinkRole: {
        useMutation: vi.fn(() => ({ isPending: false, mutate: vi.fn() })),
      },
      updatePermissions: {
        useMutation: vi.fn(() => ({ isPending: false, mutate: vi.fn() })),
      },
    },
  },
}));

const detail = {
  assignmentCount: 7,
  canRemoveAdmin: true,
  dependencies: {
    eventBlockers: [],
    events: 0,
    formResponses: 2,
    formSections: 1,
    issueVisibility: 4,
    issues: 3,
    total: 10,
  },
  dependencyCount: 10,
  discordRoleId: "990000000000000001",
  id: "00000000-0000-4000-8000-000000000001",
  isCosmetic: false,
  isMissing: false,
  memberCount: 12,
  name: "Design",
  permissions: ["READ_MEMBERS"],
  position: 4,
  storedName: "Design",
  syncState: "available",
  teamHexcodeColor: "#6d28d9",
} as RouterOutputs["roles"]["getRole"];

describe("RoleDetailDialog", () => {
  it("organizes metadata, dependencies, permissions, sync, and unlink controls", () => {
    const html = renderToStaticMarkup(
      createElement(RoleDetailDialog, {
        detail,
        onChanged: vi.fn(),
        onClose: vi.fn(),
      }),
    );

    expect(html).toContain('data-role-detail-layout="sectioned"');
    expect(html).toContain("Design");
    expect(html).toContain("Discord members");
    expect(html).toContain("Blade assignments");
    expect(html).toContain("Downstream use");
    expect(html).toContain("Form sections");
    expect(html).toContain("Issue visibility rules");
    expect(html).toContain("Blade permissions");
    expect(html).toContain("Sync now");
    expect(html).toContain("Unlink role");
  });

  it("explains final-administrator protection", () => {
    const html = renderToStaticMarkup(
      createElement(RoleDetailDialog, {
        detail: { ...detail, canRemoveAdmin: false, dependencies: null },
        onChanged: vi.fn(),
        onClose: vi.fn(),
      }),
    );

    expect(html).toContain(
      "This is the final assigned role administrator and cannot be unlinked.",
    );
  });
});
