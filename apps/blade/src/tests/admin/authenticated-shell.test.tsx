import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { Session } from "~/server/auth";
import { getVisibleAdminNavigation } from "~/app/_components/shared/admin-navigation";
import { AuthenticatedShell } from "~/app/_components/shared/authenticated-shell";
import { GUILD_URL } from "~/lib/guild-urls";

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

vi.mock("~/app/_components/shared/route-transition-link", () => ({
  RouteTransitionSurface: ({ children }: { children: React.ReactNode }) =>
    createElement("div", null, children),
}));

const session = {
  user: {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Admin Member",
  },
} as Session;

describe("AuthenticatedShell", () => {
  it("orders permission-gated admin destinations alphabetically", () => {
    expect(
      getVisibleAdminNavigation({
        alumni: true,
        analytics: true,
        discordArchive: true,
        email: true,
        eventCheckIn: true,
        events: true,
        forms: true,
        hackathon: true,
        hackathonCheckIn: true,
        hackathonEvents: true,
        hackers: true,
        issues: true,
        logs: true,
        members: true,
        roles: true,
      }).map((item) => item.label),
    ).toEqual([
      "Admin logs",
      "Alumni",
      "Analytics",
      "Companies",
      "Discord archive",
      "Email",
      "Event Check-in",
      "Events",
      "Forms",
      "Hackathon Check-in",
      "Hackathon Events",
      "Hackathons",
      "Hackers",
      "Issues",
      "Members",
      "Roles",
    ]);
  });

  it("server-renders member destinations before permission-gated admin pages", () => {
    const html = renderToStaticMarkup(
      createElement(AuthenticatedShell, {
        activeNavigation: "dashboard",
        adminNavigation: { issues: true, members: true, roles: true },
        children: createElement("main", null, "Dashboard content"),
        session,
      }),
    );

    expect(html).toContain('data-testid="member-navigation-rail"');
    expect(html).toContain('data-testid="member-navigation-rail-header"');
    expect(html).toContain('data-testid="mobile-admin-menu-trigger"');
    expect(html).toContain('aria-label="Open navigation menu"');
    expect(html).toContain('href="/admin/members"');
    expect(html).toContain('href="/admin/roles"');
    expect(html).toContain('href="/admin/issues/calendar"');
    expect(html).toContain('href="/member/dashboard"');
    expect(html).toContain(`href="${GUILD_URL}"`);
    expect(html).toContain('href="/member/settings"');
    expect(html).toContain('aria-current="page"');
    expect(html.indexOf('href="/member/dashboard"')).toBeLessThan(
      html.indexOf('href="/admin/members"'),
    );
    expect(html.indexOf('href="/admin/roles"')).toBeLessThan(
      html.indexOf('href="/member/settings"'),
    );
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

  it("renders independently permissioned hackathon event destinations", () => {
    const html = renderToStaticMarkup(
      createElement(AuthenticatedShell, {
        adminNavigation: {
          hackathonCheckIn: true,
          hackathonEvents: false,
        },
        children: createElement("main", null, "Hackathon check-in"),
        session,
      }),
    );

    expect(html).toContain('href="/admin/hackathon-check-in"');
    expect(html).not.toContain('href="/admin/hackathon-events"');
    expect(html).not.toContain('href="/admin/hackathon"');
  });

  it("gives ordinary members Dashboard, Guild, and bottom-pinned Settings", () => {
    const html = renderToStaticMarkup(
      createElement(AuthenticatedShell, {
        children: createElement("main", null, "Dashboard content"),
        session,
      }),
    );

    expect(html).toContain('data-testid="member-navigation-rail"');
    expect(html).toContain('data-testid="mobile-admin-menu-trigger"');
    expect(html).toContain('href="/member/dashboard"');
    expect(html).toContain(`href="${GUILD_URL}"`);
    expect(html).toContain('href="/member/settings"');
    expect(html).not.toContain('href="/admin/members"');
    expect(html).not.toContain('href="/admin/roles"');
  });
});
