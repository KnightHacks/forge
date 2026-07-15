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
  it("TC-005 TC-030 server-renders only event management for a reader", () => {
    const html = renderToStaticMarkup(
      createElement(AuthenticatedShell, {
        activeNavigation: "events",
        adminNavigation: {
          eventCheckIn: false,
          events: true,
          members: false,
          roles: false,
        },
        children: createElement("main", null, "Event administration"),
        session,
      }),
    );

    expect(html).toContain('data-testid="admin-navigation-rail"');
    expect(html).toContain('data-testid="blade-shell-header"');
    expect(html).toContain('data-testid="mobile-admin-menu-trigger"');
    expect(html).toContain('href="/admin/events"');
    expect(html).not.toContain('href="/admin/check-in"');
    expect(html).toContain('href="/member/dashboard"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("Event admin");
  });

  it("TC-005 TC-033 gives a check-in-only operator a distinct destination", () => {
    const html = renderToStaticMarkup(
      createElement(AuthenticatedShell, {
        adminNavigation: {
          eventCheckIn: true,
          events: false,
          members: false,
          roles: false,
        },
        children: createElement("main", null, "Event check-in"),
        session,
      }),
    );

    expect(html).toContain('href="/admin/check-in"');
    expect(html).toContain("Event Check-in");
    expect(html).not.toContain('href="/admin/events"');
    expect(html).not.toContain('href="/admin/members"');
  });

  it("TC-005 shows both event destinations when both capabilities are present", () => {
    const html = renderToStaticMarkup(
      createElement(AuthenticatedShell, {
        adminNavigation: {
          eventCheckIn: true,
          events: true,
          members: false,
          roles: false,
        },
        children: createElement("main", null, "Event administration"),
        session,
      }),
    );

    expect(html).toContain('href="/admin/events"');
    expect(html).toContain('href="/admin/check-in"');
  });

  it("TC-030 tracks management and check-in as independent active routes", () => {
    expect(isAdminNavigationActive("events", "/admin/events")).toBe(true);
    expect(isAdminNavigationActive("events", "/admin/check-in")).toBe(false);
    expect(isAdminNavigationActive("eventCheckIn", "/admin/check-in")).toBe(
      true,
    );
    expect(isAdminNavigationActive("eventCheckIn", "/admin/events")).toBe(
      false,
    );
  });
});
