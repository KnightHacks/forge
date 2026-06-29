import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { Session } from "~/server/auth";
import { AuthenticatedShell } from "~/app/_components/member/authenticated-shell";

vi.mock("next/image", () => ({
  default: ({ priority: _priority, ...props }: Record<string, unknown>) =>
    createElement("img", props),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/member/dashboard",
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
    id: "00000000-0000-4000-8000-000000000001",
    name: "Admin Member",
  },
} as Session;

describe("AuthenticatedShell", () => {
  it("server-renders the integrated admin rail on member pages for admins", () => {
    const html = renderToStaticMarkup(
      createElement(AuthenticatedShell, {
        activeNavigation: "dashboard",
        adminNavigation: { members: true, roles: true },
        children: createElement("main", null, "Dashboard content"),
        session,
      }),
    );

    expect(html).toContain('data-testid="admin-navigation-rail"');
    expect(html).toContain('data-testid="admin-navigation-rail-header"');
    expect(html).toContain('data-testid="mobile-admin-menu-trigger"');
    expect(html).toContain('aria-label="Open navigation menu"');
    expect(html).toContain('href="/admin/members"');
    expect(html).toContain('href="/admin/roles"');
    expect(html).toContain('href="/member/dashboard"');
    expect(html).toContain('aria-current="page"');
  });

  it("shows only permission-available admin destinations", () => {
    const html = renderToStaticMarkup(
      createElement(AuthenticatedShell, {
        adminNavigation: { members: false, roles: true },
        children: createElement("main", null, "Dashboard content"),
        session,
      }),
    );

    expect(html).toContain('href="/admin/roles"');
    expect(html).not.toContain('href="/admin/members"');
  });

  it("does not expose admin navigation to ordinary members", () => {
    const html = renderToStaticMarkup(
      createElement(AuthenticatedShell, {
        children: createElement("main", null, "Dashboard content"),
        session,
      }),
    );

    expect(html).not.toContain('data-testid="admin-navigation-rail"');
    expect(html).not.toContain('data-testid="mobile-admin-menu-trigger"');
    expect(html).not.toContain('href="/admin/members"');
  });
});
