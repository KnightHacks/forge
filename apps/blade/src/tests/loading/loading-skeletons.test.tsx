import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HackerRosterSkeleton } from "~/app/_components/admin/hackathon/hackers/hacker-roster-skeleton";
import { RespondentFormSkeleton } from "~/app/_components/forms/generic-form-respondent";
import { DashboardSkeleton } from "~/app/_components/member/dashboard-client";
import { MemberDuesSkeleton } from "~/app/_components/member/member-dues-payment";
import { MemberProfileSettingsSkeleton } from "~/app/_components/member/member-profile-settings-form";
import { AuthenticatedShellSkeleton } from "~/app/_components/shared/authenticated-shell-skeleton";

describe("Blade loading skeletons", () => {
  it.each([
    ["Member dashboard loading", "member-dashboard", DashboardSkeleton],
    ["Member dues loading", "member-dues", MemberDuesSkeleton],
    [
      "Member settings loading",
      "member-settings",
      MemberProfileSettingsSkeleton,
    ],
    ["Form loading", "respondent-form", RespondentFormSkeleton],
    ["Hacker roster loading", "hacker-roster", HackerRosterSkeleton],
  ])(
    "renders a busy, structurally populated %s surface",
    (label, surface, Component) => {
      const html = renderToStaticMarkup(createElement(Component));

      expect(html).toContain(`aria-label="${label}"`);
      expect(html).toContain('aria-busy="true"');
      expect(html).toContain(`data-loading-surface="${surface}"`);
      expect(html.match(/animate-pulse/g)?.length ?? 0).toBeGreaterThan(5);
    },
  );

  it("keeps authenticated navigation geometry around route fallbacks", () => {
    const html = renderToStaticMarkup(
      createElement(
        AuthenticatedShellSkeleton,
        null,
        createElement("main", null, "Route loading"),
      ),
    );

    expect(html).toContain('data-testid="authenticated-shell-skeleton"');
    expect(html).toContain('aria-label="Blade workspace loading"');
    expect(html).toContain("Route loading");
    expect(html.match(/animate-pulse/g)?.length ?? 0).toBeGreaterThan(8);
  });
});
