import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AdminCheckInLoading from "~/app/admin/check-in/loading";

describe("Event check-in loading state", () => {
  it("exposes an accessible loading state while content loads", () => {
    const html = renderToStaticMarkup(createElement(AdminCheckInLoading));

    expect(html).toContain('data-testid="event-check-in-loading"');
    expect(html).toContain('aria-label="Loading event check-in"');
  });
});
