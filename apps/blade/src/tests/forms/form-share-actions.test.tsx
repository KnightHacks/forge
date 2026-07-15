import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { FormShareActions } from "~/app/_components/admin/forms/form-share-actions";

const canonicalUrl = "https://blade.knighthacks.org/form/workshop-interest";
const qrPngDataUrl = "data:image/png;base64,c3RhYmxlLWZvcm0tdXJs";

describe("FormShareActions", () => {
  it("TC-008 TC-009 exposes exactly the approved stable-link and QR actions", () => {
    const html = renderToStaticMarkup(
      createElement(FormShareActions, {
        canonicalUrl,
        formName: "Workshop Interest",
        onCopyLink: vi.fn(),
        onOpenQrPreview: vi.fn(),
        qrPngDataUrl,
        slugName: "workshop-interest",
      }),
    );

    expect(html).toContain('aria-label="Form sharing"');
    expect(html).toContain("Copy link");
    expect(html).toContain("Open form");
    expect(html).toContain("QR preview");
    expect(html).toContain("Download QR");
    expect(html).toContain(`href="${canonicalUrl}"`);
    expect(html).toContain('target="_blank"');
    expect(html).toContain(`href="${qrPngDataUrl}"`);
    expect(html).toMatch(/download="[^"]+\.png"/);
    expect(html).not.toContain("Print QR");
    expect(html).not.toContain("token=");
    expect(html).not.toContain("access_token");
  });

  it("keeps every mobile share action touch-sized and keyboard-visible", () => {
    const html = renderToStaticMarkup(
      createElement(FormShareActions, {
        canonicalUrl,
        formName: "Workshop Interest",
        onCopyLink: vi.fn(),
        onOpenQrPreview: vi.fn(),
        qrPngDataUrl,
        slugName: "workshop-interest",
      }),
    );

    expect(html).toContain('data-form-share-layout="responsive"');
    expect(
      (html.match(/(?:min-h-11|h-11)/g) ?? []).length,
    ).toBeGreaterThanOrEqual(4);
    expect(html).toContain("focus-visible:ring-2");
  });
});
