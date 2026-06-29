import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ClubEventAccessBadge } from "../app/_components/club-event-access-badge";

describe("ClubEventAccessBadge", () => {
  it("TC-001 renders a clear badge for a public dues-paying event", () => {
    const html = renderToStaticMarkup(
      createElement(ClubEventAccessBadge, { requiresDues: true }),
    );

    expect(html).toContain("Dues required");
    expect(html).toContain('aria-label="Dues required event"');
  });

  it("TC-001 renders no access badge for a public event", () => {
    const html = renderToStaticMarkup(
      createElement(ClubEventAccessBadge, { requiresDues: false }),
    );

    expect(html).toBe("");
  });
});
