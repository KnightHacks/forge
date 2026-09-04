import { describe, expect, it } from "vitest";

import {
  issueImageIds,
  issueImageMarkdown,
  issueImageReferences,
} from "../../utils/issues/images";

describe("managed issue image references", () => {
  const first = "f1490a89-24c2-4d1e-bad7-a90182b61bfd";
  const second = "7dcdde9d-c228-48f8-8958-32d254872da8";

  it("[TC-015] writes and parses durable managed-image Markdown", () => {
    const markdown = issueImageMarkdown("Board [draft]", first);
    expect(markdown).toBe(
      "![Board  draft](/_managed/issue-images/f1490a89-24c2-4d1e-bad7-a90182b61bfd)",
    );
    expect(issueImageReferences(markdown)).toEqual([
      { alt: "Board  draft", attachmentId: first, markdown },
    ]);
  });

  it("deduplicates retained ids and ignores ordinary remote images", () => {
    const managed = issueImageMarkdown("One", first);
    expect(
      issueImageIds(
        `${managed}\n${managed}\n![Remote](https://example.com/a.png)\n${issueImageMarkdown("Two", second)}`,
      ),
    ).toEqual([first, second]);
  });

  it("parses empty and overlong alt text for authoritative save validation", () => {
    expect(
      issueImageReferences(`![](/_managed/issue-images/${first})`)[0]?.alt,
    ).toBe("");
    expect(
      issueImageReferences(
        `![${"a".repeat(501)}](/_managed/issue-images/${first})`,
      )[0]?.alt,
    ).toHaveLength(501);
  });
});
