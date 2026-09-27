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
  usePathname: () => "/admin/hackathon",
}));

vi.mock("~/app/_components/auth/sign-out-button", () => ({
  SignOutButton: () => createElement("button", null, "Sign out"),
}));

const session = {
  user: {
    id: "00000000-0000-4000-8000-000000000501",
    name: "Hackathon Officer",
  },
} as Session;

describe("hackathon admin navigation", () => {
  it("gives hackathon configuration its own officer-gated destination", () => {
    const html = renderToStaticMarkup(
      // No `activeNavigation` prop: the highlight comes from
      // `isAdminNavigationActive(item.id, usePathname())`, which is the code
      // path this test exists to cover. Passing it would prove the prop works,
      // not that the nav item resolves its own route.
      createElement(AuthenticatedShell, {
        adminNavigation: {
          hackathon: true,
        },
        children: createElement("main", null, "Hackathon configuration"),
        session,
      }),
    );

    expect(html).toContain('href="/admin/hackathon"');
    expect(html).toContain(">Hackathons<");
    expect(html).toContain('aria-current="page"');
  });

  // `isAdminNavigationActive` takes `id: string`, so a missing branch is not a
  // type error — it silently returns false and the sidebar highlights nothing.
  // That is exactly what happened when this nav item was first added, so the
  // detail route is pinned alongside the index.
  it("stays highlighted on the detail route", () => {
    expect(isAdminNavigationActive("hackathon", "/admin/hackathon")).toBe(true);
    expect(
      isAdminNavigationActive(
        "hackathon",
        "/admin/hackathon/b78a0186-f509-4b01-8710-cffe6d98e519",
      ),
    ).toBe(true);
    expect(isAdminNavigationActive("hackathon", "/admin/members")).toBe(false);
    expect(isAdminNavigationActive("members", "/admin/hackathon")).toBe(false);
  });

  it("does not let the configuration prefix steal event routes", () => {
    expect(
      isAdminNavigationActive("hackathonEvents", "/admin/hackathon-events"),
    ).toBe(true);
    expect(
      isAdminNavigationActive("hackathonCheckIn", "/admin/hackathon-check-in"),
    ).toBe(true);
    expect(
      isAdminNavigationActive("hackathon", "/admin/hackathon-events"),
    ).toBe(false);
    expect(
      isAdminNavigationActive("hackathon", "/admin/hackathon-check-in"),
    ).toBe(false);
  });

  it("highlights the judge workspace and merged project command center", () => {
    expect(isAdminNavigationActive("judgeProjects", "/judge/projects")).toBe(
      true,
    );
    expect(isAdminNavigationActive("judging", "/admin/judging")).toBe(true);
    expect(isAdminNavigationActive("judging", "/admin/projects")).toBe(true);
    expect(isAdminNavigationActive("judgeProjects", "/admin/projects")).toBe(
      false,
    );
  });
});
