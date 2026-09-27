import { describe, expect, it } from "vitest";

import {
  managedImageReferences,
  managedImageUploadFileName,
  safeManagedImageAlt,
  stripManagedImageReferences,
} from "~/app/_components/admin/issues/issue-managed-images";

describe("managed issue image helpers", () => {
  const first = "f1490a89-24c2-4d1e-bad7-a90182b61bfd";
  const second = "7dcdde9d-c228-48f8-8958-32d254872da8";

  it("removes managed references when a draft changes owning teams", () => {
    const description = [
      "Before",
      `![First](/_managed/issue-images/${first})`,
      `![Second](/_managed/issue-images/${second})`,
      "After",
    ].join("\n\n");

    expect(stripManagedImageReferences(description)).toBe("Before\n\nAfter");
  });

  it("leaves ordinary image markdown untouched", () => {
    const description = "![Remote](https://example.com/image.png)";
    expect(stripManagedImageReferences(description)).toBe(description);
  });

  it("parses references and sanitizes unsafe alt-text delimiters", () => {
    const markdown = `![Board](/_managed/issue-images/${first})`;
    expect(managedImageReferences(markdown)).toEqual([
      {
        alt: "Board",
        attachmentId: first,
        end: markdown.length,
        start: 0,
      },
    ]);
    expect(safeManagedImageAlt("Board [draft]\\v2")).toBe("Board  draft  v2");
  });

  it("gives unnamed clipboard images a valid upload filename", () => {
    expect(managedImageUploadFileName("", "png")).toBe("pasted-image.png");
    expect(managedImageUploadFileName("  ", "webp")).toBe("pasted-image.webp");
    expect(managedImageUploadFileName(" screenshot.gif ", "gif")).toBe(
      "screenshot.gif",
    );
  });
});
