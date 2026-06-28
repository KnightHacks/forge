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
    member: {
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
    schools: ["University of Central Florida"],
  },
  members: [
    {
      company: "Knight Hacks",
      dateCreated: "2026-06-27",
      discordUser: "lenny-dragon",
      duesStatus: {
        paid: true,
      },
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
} as RouterOutputs["member"]["getAdminMembers"];

describe("MemberAdminDashboard", () => {
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
    expect(html).toContain("hidden overflow-x-auto md:block");
    expect(html).toContain("grid min-w-0 gap-2 p-2");
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
