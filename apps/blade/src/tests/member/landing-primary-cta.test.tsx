import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import {
  ClosingCallToAction,
  LandingPrimaryCta,
} from "~/app/_components/public/member-landing-support";

// TC-001: the public landing CTA adapts to the session instead of redirecting.
describe("Landing page session-aware CTAs", () => {
  it("offers Discord sign-in to unauthenticated visitors", () => {
    const html = renderToStaticMarkup(
      createElement(LandingPrimaryCta, { isAuthenticated: false }),
    );

    expect(html).toContain("Sign in with Discord");
    expect(html).toContain("/api/auth/signin?provider=discord");
    expect(html).not.toContain("Go to your dashboard");
  });

  it("offers the member dashboard to authenticated visitors", () => {
    const html = renderToStaticMarkup(
      createElement(LandingPrimaryCta, { isAuthenticated: true }),
    );

    expect(html).toContain("Go to your dashboard");
    expect(html).toContain(`href="${MEMBER_DASHBOARD_PATH}"`);
    expect(html).not.toContain("/api/auth/signin");
  });

  it("keeps the closing call to action a sign-in surface when signed out", () => {
    const html = renderToStaticMarkup(
      createElement(ClosingCallToAction, { isAuthenticated: false }),
    );

    expect(html).toContain("Sign in to Blade");
    expect(html).toContain("Continue with Discord");
    expect(html).toContain("/api/auth/signin?provider=discord");
  });

  it("points the closing call to action at the dashboard when signed in", () => {
    const html = renderToStaticMarkup(
      createElement(ClosingCallToAction, { isAuthenticated: true }),
    );

    expect(html).toContain("Go to your dashboard");
    expect(html).toContain(`href="${MEMBER_DASHBOARD_PATH}"`);
    expect(html).not.toContain("Sign in to Blade");
    expect(html).not.toContain("/api/auth/signin");
  });
});
