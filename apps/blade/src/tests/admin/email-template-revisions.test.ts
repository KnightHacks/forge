import { describe, expect, it } from "vitest";

import type { EmailPortalTemplate } from "~/app/_components/admin/email/email-portal-types";
import { publishedTemplateOptions } from "~/app/_components/admin/email/email-template-revisions";

const template = (
  overrides: Partial<EmailPortalTemplate> & { id: string },
): EmailPortalTemplate => ({
  domain: "club",
  kind: "code",
  name: `Template ${overrides.id}`,
  ...overrides,
});

describe("publishedTemplateOptions", () => {
  it("uses the explicitly published revision", () => {
    const options = publishedTemplateOptions([
      template({
        id: "t1",
        latestRevision: { id: "rev-2", state: "draft", version: 2 },
        publishedRevision: { id: "rev-1", version: 1 },
      }),
    ]);
    expect(options.map(({ revisionId }) => revisionId)).toEqual(["rev-1"]);
  });

  it("falls back to the latest revision when it is itself published", () => {
    const options = publishedTemplateOptions([
      template({
        id: "t1",
        latestRevision: { id: "rev-3", state: "published", version: 3 },
      }),
    ]);
    expect(options.map(({ revisionId }) => revisionId)).toEqual(["rev-3"]);
  });

  it("drops templates whose latest revision is not published", () => {
    expect(
      publishedTemplateOptions([
        template({
          id: "t1",
          latestRevision: { id: "rev-1", state: "draft", version: 1 },
        }),
        template({
          id: "t2",
          latestRevision: { id: "rev-2", state: "superseded", version: 2 },
        }),
      ]),
    ).toEqual([]);
  });

  it("drops templates with no revision at all", () => {
    expect(
      publishedTemplateOptions([
        template({ id: "t1" }),
        template({ id: "t2", latestRevision: null }),
      ]),
    ).toEqual([]);
  });

  it("drops a published latest revision that carries no id", () => {
    expect(
      publishedTemplateOptions([
        template({
          id: "t1",
          latestRevision: { state: "published", version: 4 },
        }),
      ]),
    ).toEqual([]);
  });

  it("keeps the remaining template fields and their original order", () => {
    const options = publishedTemplateOptions([
      template({
        id: "t1",
        name: "Weekly digest",
        publishedRevision: { id: "rev-1", version: 1 },
      }),
      template({ id: "t2", name: "Unpublished" }),
      template({
        id: "t3",
        kind: "visual",
        name: "Sponsor blast",
        publishedRevision: { id: "rev-9", version: 2 },
      }),
    ]);
    expect(
      options.map(({ kind, name, revisionId }) => ({ kind, name, revisionId })),
    ).toEqual([
      { kind: "code", name: "Weekly digest", revisionId: "rev-1" },
      { kind: "visual", name: "Sponsor blast", revisionId: "rev-9" },
    ]);
  });
});
