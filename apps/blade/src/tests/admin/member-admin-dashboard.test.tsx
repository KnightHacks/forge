import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { RouterOutputs } from "@forge/api";
import { adminMemberListSchema } from "@forge/validators";

import { MemberAdminDashboard } from "~/app/_components/admin/members/member-admin-dashboard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock("~/trpc/react", () => ({
  api: {
    memberAdmin: {
      exportAdminMembers: {
        useQuery: vi.fn(() => ({
          isFetching: false,
          refetch: vi.fn(),
        })),
      },
      setAdminDuesStatus: {
        useMutation: vi.fn(() => ({
          isPending: false,
          mutate: vi.fn(),
        })),
      },
    },
  },
}));

vi.mock("~/app/_components/admin/members/member-filters", () => ({
  MemberFilters: () => createElement("button", null, "Filters"),
}));

vi.mock("~/app/_components/admin/members/invalidate-dues-dialog", () => ({
  InvalidateDuesDialog: () =>
    createElement("button", null, "Invalidate all dues"),
}));

vi.mock("~/app/_components/admin/members/member-detail-dialog", () => ({
  MemberDetailDialog: () => createElement("div", null, "Member detail"),
}));

const input = adminMemberListSchema.parse({});
const data = {
  filterOptions: {
    companies: ["Knight Hacks"],
    genders: ["Prefer not to answer"],
    graduationYears: [2027],
    guildVisibilities: ["public"],
    levelsOfStudy: ["Undergraduate University (3+ year)"],
    majors: ["Computer Science"],
    racesOrEthnicities: ["Prefer not to answer"],
    roles: [
      {
        color: "#6D28D9",
        id: "00000000-0000-4000-8000-000000000101",
        name: "Development Team",
      },
    ],
    schools: ["University of Central Florida"],
  },
  members: [
    {
      alumniConfirmed: false,
      company: "Knight Hacks",
      dateCreated: "2026-06-27",
      discordUser: "lenny-dragon",
      duesStatus: {
        paid: true,
      },
      graduated: false,
      email: "lenny@example.test",
      firstName: "Lenny",
      graduation: { gradTerm: "Spring", gradYear: 2027 },
      id: "00000000-0000-4000-8000-000000000001",
      lastName: "Dragonson",
      school: "University of Central Florida",
    },
  ],
  pagination: {
    page: 1,
    pageCount: 1,
    pageSize: 25,
    totalCount: 1,
  },
} as RouterOutputs["memberAdmin"]["getAdminMembers"];

type DashboardMember = (typeof data)["members"][number];

function renderWith(overrides: Partial<DashboardMember>) {
  return renderToStaticMarkup(
    createElement(MemberAdminDashboard, {
      canEdit: false,
      data: {
        ...data,
        members: data.members.map((member) => ({ ...member, ...overrides })),
      },
      detail: null,
      input,
      isOfficer: false,
    }),
  );
}

describe("MemberAdminDashboard", () => {
  it("drills into a member from the name rather than a separate View control", () => {
    const html = renderWith({});

    expect(html).not.toContain(">View<");
    expect(html).not.toContain(">Actions<");
    expect(html).toContain('aria-label="View Lenny Dragonson"');
    // Real button, keyboard focusable, 44px hit target.
    expect(html).toContain("min-h-11");
  });

  // The two facts must stay separable in the markup: a graduated member tints
  // their own data gold, a confirmed one earns the badge, and the common case is
  // graduated *without* confirmation. A single assertion covering both would
  // pass if one silently stood in for the other.
  it("tints graduated members gold and badges only confirmed alumni", () => {
    const graduatedOnly = renderWith({
      alumniConfirmed: false,
      graduated: true,
    });
    const confirmed = renderWith({ alumniConfirmed: true, graduated: true });
    const currentStudent = renderWith({
      alumniConfirmed: false,
      graduated: false,
    });

    // Positive control: without this, the two `not.toContain`s below would pass
    // on markup that failed to render a member row at all.
    expect(graduatedOnly).toContain("Dragonson");

    // The affordance must be present at rest, not only on hover — the name is
    // the sole route into the detail dialog now the View button is gone.
    expect(graduatedOnly).toContain("underline");
    expect(graduatedOnly).toContain("text-[hsl(var(--guild-gold))]");
    expect(graduatedOnly).not.toContain(">Alumni<");

    expect(confirmed).toContain(">Alumni<");

    expect(currentStudent).toContain("Dragonson");
    expect(currentStudent).toContain("underline");
    expect(currentStudent).not.toContain("text-[hsl(var(--guild-gold))]");
    expect(currentStudent).not.toContain(">Alumni<");
  });

  it("renders desktop detail columns and the compact mobile member card", () => {
    const html = renderToStaticMarkup(
      createElement(MemberAdminDashboard, {
        canEdit: false,
        data,
        detail: null,
        input,
        isOfficer: false,
      }),
    );

    expect(html).toContain("Lenny Dragonson");
    expect(html).toContain("@lenny-dragon");
    expect(html).toContain("lenny@example.test");
    expect(html).toContain("University of Central Florida");
    expect(html).toContain("Spring 2027");
    expect(html).toContain("Showing 1-1 of 1 members");
  });

  it("shows mass invalidation only to officers", () => {
    const readerHtml = renderToStaticMarkup(
      createElement(MemberAdminDashboard, {
        canEdit: false,
        data,
        detail: null,
        input,
        isOfficer: false,
      }),
    );
    const officerHtml = renderToStaticMarkup(
      createElement(MemberAdminDashboard, {
        canEdit: true,
        data,
        detail: null,
        input,
        isOfficer: true,
      }),
    );

    expect(readerHtml).not.toContain("Invalidate all dues");
    expect(officerHtml).toContain("Invalidate all dues");
  });

  it("makes paid and unpaid badges directly toggleable only for editors", () => {
    const readerHtml = renderToStaticMarkup(
      createElement(MemberAdminDashboard, {
        canEdit: false,
        data,
        detail: null,
        input,
        isOfficer: false,
      }),
    );
    const editorHtml = renderToStaticMarkup(
      createElement(MemberAdminDashboard, {
        canEdit: true,
        data,
        detail: null,
        input,
        isOfficer: false,
      }),
    );

    expect(readerHtml).not.toContain("Revoke dues for Lenny Dragonson");
    expect(editorHtml).toContain("Revoke dues for Lenny Dragonson");
  });
});
