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
  usePathname: () => "/admin/events",
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
    name: "Event Operator",
  },
} as Session;

describe("event admin navigation", () => {
  it("TC-005 TC-030 server-renders the admin shell for an event-only user", () => {
    const html = renderToStaticMarkup(
      createElement(AuthenticatedShell, {
        activeNavigation: "events",
        adminNavigation: { events: true, members: false, roles: false },
        children: createElement("main", null, "Event administration"),
        session,
      }),
    );

    expect(html).toContain('data-testid="admin-navigation-rail"');
    expect(html).toContain('data-testid="blade-shell-header"');
    expect(html).toContain('data-testid="mobile-admin-menu-trigger"');
    expect(html).toContain('href="/admin/events"');
    expect(html).toContain('href="/member/dashboard"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("Event admin");
  });

  it("TC-005 hides the Events destination when event access is absent", () => {
    const html = renderToStaticMarkup(
      createElement(AuthenticatedShell, {
        adminNavigation: { events: false, members: true, roles: false },
        children: createElement("main", null, "Member administration"),
        session,
      }),
    );

    expect(html).toContain('href="/admin/members"');
    expect(html).not.toContain('href="/admin/events"');
  });
});
