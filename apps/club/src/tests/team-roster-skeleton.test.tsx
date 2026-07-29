import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import TeamsClient, {
  TeamFilterSkeleton,
  TeamPickerSkeleton,
} from "../app/teams/teams-client";

describe("team roster loading placeholders", () => {
  it("hides the mobile picker placeholder from assistive tech and offers nothing to operate", () => {
    const html = renderToStaticMarkup(createElement(TeamPickerSkeleton));

    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain("<select");
    expect(html).not.toContain("<button");
    // The reserved box has to match the real picker's height or the header
    // still grows by 44px plus the column gap when the roster lands.
    expect(html).toContain("h-11");
  });

  it("hides the desktop filter placeholder from assistive tech and never labels itself as controls", () => {
    const html = renderToStaticMarkup(createElement(TeamFilterSkeleton));

    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain("<button");
    expect(html).not.toContain("aria-label");
  });

  it("renders no team controls at all while the roster is still loading", () => {
    const html = renderToStaticMarkup(
      createElement(TeamsClient, { bladeUrl: "http://localhost:3000" }),
    );

    expect(html).not.toContain("<select");
    expect(html).not.toContain('aria-label="Choose team"');
    expect(html).not.toContain('aria-label="Team filters"');
    expect(html).toContain("Loading team members");
  });
});
