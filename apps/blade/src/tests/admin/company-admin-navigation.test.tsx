import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { Session } from "~/server/auth";
import { isAdminNavigationActive } from "~/app/_components/member/admin-navigation";
import { AuthenticatedShell } from "~/app/_components/member/authenticated-shell";

vi.mock("next/image", () => ({
  default: ({ priority: _priority, ...props }: Record<string, unknown>) =>
    createElement("img", props),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/companies",
}));

vi.mock("~/app/_components/auth/sign-out-button", () => ({
  SignOutButton: () => createElement("button", null, "Sign out"),
}));

vi.mock("~/app/_components/member/member-route-transition-link", () => ({
  MemberRouteTransitionSurface: ({ children }: { children: React.ReactNode }) =>
    createElement("div", null, children),
}));

const session = {
  user: {
    id: "00000000-0000-4000-8000-000000000401",
    name: "Company Operator",
  },
} as Session;

describe("company admin navigation", () => {
  it("gives companies a dedicated top-level admin destination", () => {
    const html = renderToStaticMarkup(
      createElement(AuthenticatedShell, {
        adminNavigation: {
          members: true,
          roles: false,
        },
        children: createElement("main", null, "Company administration"),
        session,
      }),
    );

    expect(html).toContain('href="/admin/companies"');
    expect(html).toContain(">Companies<");
    expect(html).toContain('href="/admin/members"');
    expect(html).toContain(">Members<");
    expect(html).toContain('aria-current="page"');
  });

  it("keeps company and member active routes independent", () => {
    expect(isAdminNavigationActive("companies", "/admin/companies")).toBe(true);
    expect(
      isAdminNavigationActive(
        "companies",
        "/admin/companies/00000000-0000-4000-8000-000000000123",
      ),
    ).toBe(true);
    expect(isAdminNavigationActive("companies", "/admin/members")).toBe(false);
    expect(isAdminNavigationActive("members", "/admin/companies")).toBe(false);
  });
});
