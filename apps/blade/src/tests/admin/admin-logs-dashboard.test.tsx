import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AdminLogsDashboard } from "~/app/_components/admin/logs/admin-logs-dashboard";

vi.mock("~/trpc/react", () => ({
  api: {
    audit: {
      detail: {
        useQuery: () => ({
          data: undefined,
          error: null,
          isPending: false,
        }),
      },
      list: {
        useQuery: () => ({
          data: {
            items: [
              {
                actionKey: "member.profile.updated",
                actionLabel: "Updated member",
                actor: {
                  discordUserId: "123",
                  label: "Officer Example",
                  memberId: "00000000-0000-4000-8000-000000000001",
                  roleColor: "#A855F7",
                  roleLabel: "President",
                  userId: "00000000-0000-4000-8000-000000000002",
                },
                domain: "members",
                id: "00000000-0000-4000-8000-000000000003",
                occurredAt: new Date("2026-07-25T20:00:00.000Z"),
                operationId: null,
                outcome: "committed",
                primaryTarget: {
                  id: "00000000-0000-4000-8000-000000000004",
                  label: "Target Member",
                  memberId: "00000000-0000-4000-8000-000000000004",
                  type: "member",
                },
                resultCount: 0,
              },
            ],
            nextCursor: undefined,
          },
          error: null,
          isFetching: false,
          isPending: false,
        }),
      },
      searchMembers: {
        useQuery: () => ({
          data: [],
          isPending: false,
        }),
      },
    },
  },
}));

describe("AdminLogsDashboard", () => {
  it("renders search/member/action filters and role-colored actors", () => {
    const html = renderToStaticMarkup(createElement(AdminLogsDashboard));

    expect(html).toContain("Search actor, action, target, or ID");
    expect(html).toContain("Member involved");
    expect(html).toContain("Action");
    expect(html).toContain("Officer Example");
    expect(html).toContain("President");
    expect(html).toContain("color:#A855F7");
    expect(html).toContain("Target Member");
    expect(html).toContain("Updated member");
  });
});
