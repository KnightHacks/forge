/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { RouterOutputs } from "@forge/api";

import { HackerRoster } from "~/app/_components/admin/hackathon/hackers/hacker-roster";

const selection = vi.hoisted(() => ({
  clear: vi.fn(),
  deselect: vi.fn(),
  resetAnchor: vi.fn(),
  selectRange: vi.fn(),
  selected: new Set(["attendee-1"]),
  setAllShown: vi.fn(),
  toggle: vi.fn(),
}));

vi.mock(
  "~/app/_components/admin/hackathon/hackers/bulk-confirm-dialog",
  () => ({
    BulkConfirmDialog: () => null,
  }),
);
vi.mock(
  "~/app/_components/admin/hackathon/hackers/filter-change-dialog",
  () => ({
    FilterChangeDialog: () => null,
  }),
);
vi.mock(
  "~/app/_components/admin/hackathon/hackers/hacker-detail-dialog",
  () => ({
    HackerDetailDialog: () => null,
  }),
);
vi.mock("~/app/_components/admin/hackathon/hackers/hacker-filters", () => ({
  FilterChips: () => null,
  HackerFilters: () => null,
  StatusTabs: () => null,
}));
vi.mock("~/app/_components/admin/hackathon/hackers/hacker-table", () => ({
  HackerTable: () => null,
}));
vi.mock("~/app/_components/admin/hackathon/hackers/use-filter-flow", () => ({
  useFilterFlow: () => ({
    busy: false,
    cancelPrompt: vi.fn(),
    flow: { kind: "idle" },
    proceedWithPrompt: vi.fn(),
    requestFilter: vi.fn(),
    search: "",
    setSearch: vi.fn(),
  }),
}));
vi.mock(
  "~/app/_components/admin/hackathon/hackers/use-hacker-selection",
  () => ({
    useHackerSelection: () => selection,
  }),
);
vi.mock(
  "~/app/_components/admin/hackathon/hackers/use-roster-url-state",
  () => ({
    useRosterUrlState: () => ({
      filter: {},
      hackerId: null,
      navigating: false,
      projectFilter: vi.fn(),
      setFilter: vi.fn(),
      setHackathonId: vi.fn(),
      setHackerId: vi.fn(),
      setShowAll: vi.fn(),
      showAll: false,
      wouldMove: vi.fn(),
    }),
  }),
);
vi.mock("~/trpc/react", () => ({
  api: {
    hacker: {
      filterOptions: {
        useQuery: () => ({ data: undefined, isError: false, isPending: false }),
      },
      listForHackathon: {
        useQuery: () => ({
          data: { hackers: [], nextCursor: null },
          error: null,
          isError: false,
          isFetching: false,
          isPending: false,
        }),
      },
      statusCounts: {
        useQuery: () => ({
          data: { byStatus: {}, total: 0 },
          error: null,
          isError: false,
          isFetching: false,
          isPending: false,
        }),
      },
    },
    useUtils: () => ({
      hacker: {
        invalidate: vi.fn(),
        selectionSurvival: { fetch: vi.fn() },
      },
    }),
  },
}));

type Hackathon =
  RouterOutputs["hacker"]["listHackathonOptions"]["hackathons"][number];

const hackathon = {
  displayName: "Knight Hacks",
  endDate: new Date("2026-10-05T00:00:00.000Z"),
  hasEnded: false,
  id: "hackathon-1",
  startDate: new Date("2026-10-03T00:00:00.000Z"),
} satisfies Hackathon;

describe("hacker roster bulk actions", () => {
  it("places Delete after a separate Actions label", () => {
    render(
      <HackerRoster
        canEdit
        hackathons={[hackathon]}
        isOfficer
        selected={hackathon}
      />,
    );

    const moveTo = screen.getByText("Move to");
    const actions = screen.getByText("Actions");
    const remove = screen.getByRole("button", { name: "Delete" });

    expect(actions).not.toBe(moveTo);
    expect(actions.parentElement).toBe(moveTo.parentElement);
    expect(actions.nextElementSibling).toBe(remove);
  });
});
