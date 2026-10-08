import { describe, expect, it } from "vitest";

import { campaignHtmlWithFooter } from "../campaign-content";

describe("campaign document delivery", () => {
  it("preserves authored HTML and personalization with controls inside its body", () => {
    const document =
      '<!doctype html><html><head><style>body{margin:0}</style></head><body bgcolor="#071522"><p>Hello {{ .Subscriber.Name }}</p><a href="https://knighthacks.org@TrackLink">Dashboard</a></body></html>';
    const html = campaignHtmlWithFooter(document);
    expect(
      html.startsWith(document.slice(0, document.indexOf("</body>"))),
    ).toBe(true);
    expect(html).toContain('href="{{ UnsubscribeURL }}"');
    expect(html).toContain('href="{{ MessageURL }}"');
    expect(html).toContain("{{ TrackView }}</div></div></body></html>");
    expect(html.match(/<body\b/g)).toHaveLength(1);
    expect(html).not.toMatch(/class="(?:wrap|gutter)"|#F0F1F3|padding:30px/i);
  });

  it("supports visual fragments and uppercase body tags", () => {
    expect(campaignHtmlWithFooter("<p>Hello</p>")).toMatch(
      /^<p>Hello<\/p>.*{{ TrackView }}<\/div><\/div>$/,
    );
    expect(campaignHtmlWithFooter("<BODY>Hello</BODY>")).toContain(
      "{{ TrackView }}</div></div></BODY>",
    );
    expect(campaignHtmlWithFooter("<html><p>Hello</p></html>")).toContain(
      "{{ TrackView }}</div></div></html>",
    );
  });

  it("retains existing provider controls without duplicating links or tracking", () => {
    const html =
      '<body><a href="{{ UnsubscribeURL }}">Preferences</a><a href="{{ MessageURL }}">Online</a>{{ TrackView }}</body>';
    expect(campaignHtmlWithFooter(html)).toBe(html);
    const once = campaignHtmlWithFooter("<body>Hello</body>");
    expect(campaignHtmlWithFooter(once)).toBe(once);
  });
});
