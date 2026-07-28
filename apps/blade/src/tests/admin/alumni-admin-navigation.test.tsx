import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { Session } from "~/server/auth";
import { isAdminNavigationActive } from "~/app/_components/shared/admin-navigation";
import { AuthenticatedShell } from "~/app/_components/shared/authenticated-shell";

vi.mock("next/image", () => ({
  default: ({ priority: _priority, ...props }: Record<string, unknown>) =>
    createElement("img", props),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/alumni",
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
    id: "00000000-0000-4000-8000-000000000401",
    name: "Alumni Operator",
  },
} as Session;

describe("alumni admin navigation", () => {
  it("TC-009 gives the bulletin workspace its own permissioned destination", () => {
    const html = renderToStaticMarkup(
      createElement(AuthenticatedShell, {
        activeNavigation: "alumni",
        adminNavigation: {
          alumni: true,
        },
        children: createElement("main", null, "Alumni administration"),
        session,
      }),
    );

    expect(html).toContain('href="/admin/alumni"');
    expect(html).toContain(">Alumni<");
    expect(html).toContain('aria-current="page"');
    expect(isAdminNavigationActive("alumni", "/admin/alumni")).toBe(true);
    expect(isAdminNavigationActive("alumni", "/admin/members")).toBe(false);
  });
});
