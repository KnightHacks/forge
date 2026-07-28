import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { Session } from "~/server/auth";
import { AuthenticatedShell } from "~/app/_components/shared/authenticated-shell";
import { getAdminNavigationAccess } from "~/lib/admin-access";

vi.mock("next/image", () => ({
  default: ({ priority: _priority, ...props }: Record<string, unknown>) =>
    createElement("img", props),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/email",
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
    name: "Email Admin",
  },
} as Session;

describe("Email Portal admin entry", () => {
  it("TC-001 exposes Email to an EMAIL_PORTAL-only administrator", () => {
    const permissions = {
      ASSIGN_ROLES: false,
      CHECKIN_CLUB_EVENT: false,
      CONFIGURE_ROLES: false,
      EDIT_CLUB_EVENT: false,
      EDIT_FORMS: false,
      EDIT_ISSUES: false,
      EDIT_MEMBERS: false,
      EMAIL_PORTAL: true,
      IS_OFFICER: false,
      READ_CLUB_DATA: false,
      READ_CLUB_EVENT: false,
      READ_FORM_RESPONSES: false,
      READ_FORMS: false,
      READ_ISSUES: false,
      READ_MEMBERS: false,
    } as const;
    const access = getAdminNavigationAccess(
      permissions as unknown as Parameters<typeof getAdminNavigationAccess>[0],
    );
    const html = renderToStaticMarkup(
      createElement(AuthenticatedShell, {
        activeNavigation: "email",
        adminNavigation: access,
        children: createElement("main", null, "Templates Compose Sends"),
        session,
      }),
    );

    expect(access.email).toBe(true);
    expect(html).toContain('href="/admin/email"');
    expect(html).toContain("Email");
    expect(html).toContain("Templates Compose Sends");
  });
});
