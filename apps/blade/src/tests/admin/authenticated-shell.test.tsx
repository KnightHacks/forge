import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { Session } from "~/server/auth";
import { getAdminNavigationGroups } from "~/app/_components/shared/admin-navigation";
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

const session = {
  user: {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Admin Member",
  },
} as Session;

describe("AuthenticatedShell", () => {
  it("TC-004 groups permission-gated admin destinations by domain", () => {
    expect(
      getAdminNavigationGroups({
        alumni: true,
        analytics: true,
        companies: true,
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
        judgeProjects: true,
        judging: true,
        logs: true,
        members: true,
        projectAdmin: true,
        roles: true,
      }).map((group) => [group.label, group.items.map((item) => item.label)]),
    ).toEqual([
      [
        "Club",
        [
          "Analytics",
          "Members",
          "Alumni",
          "Companies",
          "Events",
          "Event Check-in",
        ],
      ],
      [
        "Team",
        ["Issues", "Forms", "Email", "Roles", "Discord archive", "Admin logs"],
      ],
      [
        "Hackathon",
        [
          "Hackathons",
          "Hackers",
          "Hackathon Events",
          "Hackathon Check-in",
          "Projects",
          "Command Center",
        ],
      ],
      ["External", ["Guild"]],
    ]);
  });

  it("TC-004 omits groups with no authorized destinations", () => {
    expect(
      getAdminNavigationGroups({ members: true }).map((group) => group.label),
    ).toEqual(["Club", "External"]);

    expect(
      getAdminNavigationGroups({ hackathon: true }).map((group) => group.label),
    ).toEqual(["Hackathon", "External"]);

    expect(getAdminNavigationGroups({}).map((group) => group.label)).toEqual([
      "External",
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
    expect(html).toContain('aria-label="Blade home"');
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
    // TC-003: the rail starts collapsed; desktop-admin-rail.test.tsx proves it
    // never expands on hover or focus.
    expect(html).toContain('data-expanded="false"');
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

  it("gives ordinary members header account controls instead of a rail or drawer", () => {
    const html = renderToStaticMarkup(
      createElement(AuthenticatedShell, {
        children: createElement("main", null, "Dashboard content"),
        session,
      }),
    );

    // TC-002: no icon rail and no mobile drawer for a member with no admin destinations.
    expect(html).not.toContain('data-testid="member-navigation-rail"');
    expect(html).not.toContain('data-testid="mobile-admin-menu-trigger"');
    expect(html).not.toContain("<aside");
    expect(html).not.toContain('href="/admin/');

    // Settings and Sign out sit together at the top right.
    expect(html).toContain('data-testid="account-settings-link"');
    expect(html).toContain('href="/member/settings"');
    expect(html).toContain("Sign out");
    expect(html.indexOf('data-testid="account-settings-link"')).toBeLessThan(
      html.indexOf("Sign out"),
    );

    // TC-001: the product mark links back to the public landing page.
    expect(html).toContain('aria-label="Blade home"');
    expect(html).toContain('href="/"');
  });

  it("uses a resolved member name when a judging shell provides one", () => {
    const html = renderToStaticMarkup(
      createElement(AuthenticatedShell, {
        children: createElement("main", null, "Judging workspace"),
        displayName: "Dylan Vidal",
        session: {
          ...session,
          user: { ...session.user, name: "dvidal1205" },
        },
      }),
    );

    expect(html).toContain("Dylan Vidal");
    expect(html).not.toContain("dvidal1205");
  });
});
