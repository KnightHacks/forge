import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MarkdownContent } from "@forge/ui/markdown-content";

// R-18/TC-014: issue descriptions are authored in a plain Textarea, so authors
// type chat-style newlines. CommonMark treats a lone "\n" as a soft break and
// renders it as a space, which silently joins the lines. The `breaks` prop opts
// a consumer into hard-break rendering; it stays off by default because event
// descriptions share this component and rely on the standard behavior.
describe("issue description line breaks", () => {
  // Adjacent plain lines, not a list: a line starting with "1." would begin an
  // ordered list and there would be no soft break left to render.
  const authored = [
    "Filtering by assignee wipes the workspace.",
    "It only happens once a saved view is active.",
    "",
    "Expected a [result](https://example.com), got `undefined`.",
  ].join("\n");

  it("keeps author-entered single line breaks visible when breaks is set", () => {
    const html = renderToStaticMarkup(
      <MarkdownContent breaks>{authored}</MarkdownContent>,
    );

    expect(html).toContain("<br/>");
    expect(html).toContain("Filtering by assignee wipes the workspace.");
    expect(html).toContain("It only happens once a saved view is active.");
  });

  it("leaves Markdown semantics intact alongside the added breaks", () => {
    const html = renderToStaticMarkup(
      <MarkdownContent breaks>{authored}</MarkdownContent>,
    );

    expect(html).toContain('href="https://example.com"');
    expect(html).toContain("<code>undefined</code>");
    // The blank line is still a paragraph boundary, not another <br>.
    expect(html.split("<p>").length - 1).toBe(2);
  });

  it("renders an unordered list and long unbroken content without escaping the container", () => {
    const html = renderToStaticMarkup(
      <MarkdownContent breaks>
        {
          "- one\n- two\n\nSupercalifragilisticexpialidociousveryunbrokenidentifier"
        }
      </MarkdownContent>,
    );

    expect(html).toContain("<ul>");
    expect(html.split("<li>").length - 1).toBe(2);
    expect(html).toContain("break-words");
  });

  it("does not change shared consumers that omit the prop", () => {
    const html = renderToStaticMarkup(
      <MarkdownContent>{"first line\nsecond line"}</MarkdownContent>,
    );

    expect(html).not.toContain("<br");
    expect(html).toContain("first line\nsecond line");
  });
});
