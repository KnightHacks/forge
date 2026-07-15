import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MarkdownContent } from "@forge/ui/markdown-content";

describe("MarkdownContent", () => {
  it("renders common event-description formatting and safe external links", () => {
    const html = renderToStaticMarkup(
      <MarkdownContent>
        {
          "Join **Knight Hacks**, meet *builders*, and [RSVP](https://example.com)."
        }
      </MarkdownContent>,
    );

    expect(html).toContain("<strong>Knight Hacks</strong>");
    expect(html).toContain("<em>builders</em>");
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("drops raw HTML and supports compact card previews", () => {
    const html = renderToStaticMarkup(
      <MarkdownContent compact>
        {"**Preview** <script>alert('nope')</script>"}
      </MarkdownContent>,
    );

    expect(html).toContain("<strong>Preview</strong>");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<p>");
  });
});
