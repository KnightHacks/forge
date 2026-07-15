import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MemberFormHistory } from "~/app/_components/member/member-form-history";

const responses = [
  {
    formKind: "general" as const,
    formName: "Workshop Interest",
    locked: true,
    responseId: "00000000-0000-4000-8000-000000001401",
    slugName: "workshop-interest",
    submittedAt: "2026-08-21T15:30:00.000Z",
  },
  {
    formKind: "general" as const,
    formName: "Workshop Interest",
    locked: true,
    responseId: "00000000-0000-4000-8000-000000001402",
    slugName: "workshop-interest",
    submittedAt: "2026-08-22T16:45:00.000Z",
  },
  {
    formKind: "event_feedback" as const,
    formName: "Feedback: Git Workshop",
    locked: true,
    responseId: "00000000-0000-4000-8000-000000001403",
    slugName: "feedback-git-workshop",
    submittedAt: "2026-08-23T18:00:00.000Z",
  },
];

describe("MemberFormHistory", () => {
  it("TC-021 TC-047 is owned response history, not form or feedback discovery", () => {
    const html = renderToStaticMarkup(
      createElement(MemberFormHistory, { responses }),
    );

    expect(html).toContain("Previous forms");
    expect(html).toContain("Workshop Interest");
    expect(html).not.toContain("Feedback: Git Workshop");
    expect(html).not.toContain("Available forms");
    expect(html).not.toContain("Open forms");
    expect(html).not.toContain("Browse forms");
    expect(html).not.toContain("Complete feedback");
  });

  it("TC-022 distinguishes every multiple-response submission", () => {
    const html = renderToStaticMarkup(
      createElement(MemberFormHistory, { responses }),
    );

    expect((html.match(/Workshop Interest/g) ?? []).length).toBe(2);
    expect(html).toContain("August 21, 2026");
    expect(html).toContain("August 22, 2026");
    expect(html).toContain(
      'href="/form/workshop-interest?responseId=00000000-0000-4000-8000-000000001401"',
    );
    expect(html).toContain(
      'href="/form/workshop-interest?responseId=00000000-0000-4000-8000-000000001402"',
    );
  });

  it("uses a responsive, labelled history surface with keyboard-visible actions", () => {
    const html = renderToStaticMarkup(
      createElement(MemberFormHistory, { responses }),
    );

    expect(html).toContain('data-member-form-history-layout="responsive"');
    expect(html).toContain('aria-labelledby="previous-forms-heading"');
    expect(html).toContain('id="previous-forms-heading"');
    expect(html).toMatch(/(?:min-h-11|h-11)/);
    expect(html).toContain("focus-visible:ring-2");
  });
});
