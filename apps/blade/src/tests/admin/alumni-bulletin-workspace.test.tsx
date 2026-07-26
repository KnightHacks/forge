import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AlumniBulletinWorkspace } from "~/app/_components/admin/alumni-bulletin-workspace";

describe("AlumniBulletinWorkspace", () => {
  it("TC-013 uses a full-width board with card statuses and responsive preview", () => {
    const html = renderToStaticMarkup(
      createElement(AlumniBulletinWorkspace, {
        forms: [],
        onArchive: () => undefined,
        onCreate: () => undefined,
        onEdit: () => undefined,
        onReorder: () => undefined,
        onRestore: () => undefined,
        posts: [
          {
            body: "Help welcome the next class.",
            ctaLabel: "Volunteer",
            displayOrder: 0,
            expiresAt: null,
            externalUrl: "https://knighthacks.org/volunteer",
            formId: null,
            id: "00000000-0000-4000-8000-000000000821",
            imageAlt: null,
            imageUrl: null,
            publishAt: null,
            state: "published",
            title: "Fall volunteers",
          },
        ],
      }),
    );

    expect(html).toContain('data-alumni-admin-layout="full-width"');
    expect(html).toContain("Create bulletin post");
    expect(html).toContain("Fall volunteers");
    expect(html).toContain("Published");
    expect(html).toContain("Board preview");
    expect(html).toContain("Desktop");
    expect(html).toContain("Mobile");
    expect(html).not.toContain("grid-cols-[1fr_");
  });
});
