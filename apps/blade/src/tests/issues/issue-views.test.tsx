import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { IssueWorkspaceItem } from "~/app/_components/admin/issues/types";
import {
  IssueCalendarView,
  IssueKanbanView,
  IssueListView,
} from "~/app/_components/admin/issues/issue-views";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("~/trpc/react", () => ({
  api: {
    issues: {
      update: {
        useMutation: vi.fn(() => ({
          isPending: false,
          mutateAsync: vi.fn(),
        })),
      },
    },
  },
}));

const statuses = ["Backlog", "Planning", "In Progress", "Finished"] as const;

const issues: IssueWorkspaceItem[] = Array.from({ length: 64 }, (_, index) => ({
  archiveBatchId: null,
  archivedAt: null,
  assignees: [{ id: `user-${index}`, name: `Member ${index}` }],
  canEdit: index % 3 === 0,
  createdAt: new Date("2026-07-01T12:00:00.000Z"),
  description: `Coordinate operations task ${index}`,
  dueAt: new Date(
    `2026-07-${String((index % 28) + 1).padStart(2, "0")}T23:00:00-04:00`,
  ),
  eventId: null,
  id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
  links: [],
  name: `Operations task ${index}`,
  parentId: null,
  priority: index % 4 === 0 ? "Highest" : "Medium",
  revision: 1,
  status: statuses[index % statuses.length] ?? "Backlog",
  team: { color: "#7c3aed", id: "team-a", name: "Operations" },
  updatedAt: new Date("2026-07-02T12:00:00.000Z"),
  visibleTeams: [],
}));

describe("Issues workspace views", () => {
  it("TC-UI-003 renders a desktop month grid and mobile agenda from the same rows", () => {
    const html = renderToStaticMarkup(
      createElement(IssueCalendarView, {
        issues,
        month: new Date("2026-07-15T12:00:00.000Z"),
      }),
    );
    expect(html).toContain('data-issue-calendar="month-grid"');
    expect(html).toContain('data-issue-calendar="agenda"');
    expect(html).toContain("Operations task 0");
  });

  it("TC-UI-004 renders all legacy status lanes without silent truncation", () => {
    const html = renderToStaticMarkup(
      createElement(IssueKanbanView, { issues }),
    );
    for (const status of statuses) expect(html).toContain(status);
    expect(html.match(/aria-label="Open Operations task \d+"/g)).toHaveLength(
      64,
    );
  });

  it("TC-UI-005 renders the dense operational list with accessible issue links", () => {
    const html = renderToStaticMarkup(createElement(IssueListView, { issues }));
    expect(html).toContain('aria-label="Open Operations task 0"');
    expect(html).toContain("Owning team");
    expect(html).toContain("Due");
  });
});
