import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  IdentifiedResponses,
  ResponseAnalyticsCard,
} from "~/app/_components/admin/forms/form-responses-dashboard";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/forms/form-1/responses",
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("~/trpc/react", () => ({
  api: {
    forms: {
      getAttachmentDownload: {
        useQuery: () => ({ refetch: vi.fn() }),
      },
      getLegacyAttachmentDownload: {
        useQuery: () => ({ refetch: vi.fn() }),
      },
    },
  },
}));

describe("form response reader", () => {
  it("TC-026 renders every free-text answer in one bounded scrolling table", () => {
    const answers = Array.from({ length: 60 }, (_, index) => ({
      responseId: `response-${index + 1}`,
      value: `Long qualitative answer ${index + 1} ${"detail ".repeat(20)}`,
    }));
    const html = renderToStaticMarkup(
      createElement(ResponseAnalyticsCard, {
        summary: {
          answers,
          currentPrompt: "What should we improve?",
          nonEmptyCount: 60,
          questionId: "improve",
          type: "paragraph",
        },
      }),
    );

    expect(html).toContain('data-answer-density="bounded"');
    expect(html).toContain("max-h-72");
    expect(html).toContain("overflow-y-auto");
    expect(html).toContain("60 responses");
    expect(html).toContain("<table");
    expect(html).toContain("Response</th>");
    expect(html).toContain("Answer</th>");
    expect(html).toContain("Long qualitative answer 10");
    expect(html).toContain("Long qualitative answer 60");
    expect(html).not.toContain("Showing 1–10");
    expect(html).not.toContain("Next answers");
    expect(html).not.toContain("View full answer");
    expect(html).toContain(
      'aria-label="60 answers to What should we improve?"',
    );
  });

  it("TC-026 renders a labeled donut for a small mutually-exclusive choice set", () => {
    const html = renderToStaticMarkup(
      createElement(ResponseAnalyticsCard, {
        summary: {
          categories: [
            { count: 6, label: "Discord", value: "discord" },
            { count: 4, label: "Instagram", value: "instagram" },
          ],
          currentPrompt: "How did you hear about us?",
          questionId: "source",
          type: "multiple_choice",
        },
      }),
    );

    expect(html).toContain('data-analytics-visualization="donut"');
    expect(html).toContain('data-chart-library="shadcn"');
    expect(html).toContain(
      'aria-label="How did you hear about us? response distribution"',
    );
    expect(html).toContain("6 · 60%");
    expect(html).toContain("4 · 40%");
  });

  it("TC-026 uses respondent-based bars, not a pie, for multi-select answers", () => {
    const html = renderToStaticMarkup(
      createElement(ResponseAnalyticsCard, {
        summary: {
          currentPrompt: "Which topics interest you?",
          questionId: "topics",
          respondentCount: 10,
          selections: [
            { count: 8, label: "Web", value: "web" },
            { count: 6, label: "AI", value: "ai" },
          ],
          type: "checkboxes",
        },
      }),
    );

    expect(html).toContain('data-analytics-visualization="multi-select-bars"');
    expect(html).toContain('data-chart-library="shadcn"');
    expect(html).toContain("8 · 80% of respondents");
    expect(html).toContain("6 · 60% of respondents");
    expect(html).not.toContain('data-analytics-visualization="donut"');
  });

  it("TC-026 renders a Yes/No breakdown for boolean responses", () => {
    const html = renderToStaticMarkup(
      createElement(ResponseAnalyticsCard, {
        summary: {
          categories: [
            { count: 18, label: "Yes", value: "yes" },
            { count: 6, label: "No", value: "no" },
          ],
          currentPrompt: "Can you attend every meeting?",
          questionId: "availability",
          respondentCount: 24,
          type: "boolean",
        },
      }),
    );

    expect(html).toContain('data-analytics-visualization="donut"');
    expect(html).toContain("18 · 75%");
    expect(html).toContain("6 · 25%");
    expect(html).toContain("Yes");
    expect(html).toContain("No");
  });

  it("TC-026 renders links and uploaded files as accessible actions", () => {
    const linkHtml = renderToStaticMarkup(
      createElement(ResponseAnalyticsCard, {
        summary: {
          answers: [
            {
              responseId: "response-1",
              value: "https://github.com/knighthacks",
            },
          ],
          currentPrompt: "Portfolio",
          questionId: "portfolio",
          type: "link",
        },
      }),
    );
    const fileHtml = renderToStaticMarkup(
      createElement(ResponseAnalyticsCard, {
        summary: {
          currentPrompt: "Resume",
          files: [
            {
              attachmentId: "00000000-0000-4000-8000-000000000099",
              fileName: "resume.pdf",
              responseId: "response-1",
            },
          ],
          questionId: "resume",
          type: "file",
        },
      }),
    );

    expect(linkHtml).toContain('data-form-response-link="clickable"');
    expect(linkHtml).toContain('href="https://github.com/knighthacks"');
    expect(linkHtml).toContain('target="_blank"');
    expect(fileHtml).toContain('data-form-attachment-download="available"');
    expect(fileHtml).toContain("1 uploaded file");
    expect(fileHtml).toContain("resume.pdf");
  });

  it("TC-026 keeps legacy uploaded files downloadable", () => {
    const html = renderToStaticMarkup(
      createElement(ResponseAnalyticsCard, {
        summary: {
          currentPrompt: "Resume",
          files: [
            {
              fileName: "legacy-resume.pdf",
              formId: "00000000-0000-4000-8000-000000000099",
              legacyObjectName:
                "00000000-0000-4000-8000-000000000099/files/legacy-resume.pdf",
              responseId: "response-1",
            },
          ],
          questionId: "resume",
          type: "file",
        },
      }),
    );

    expect(html).toContain('data-form-attachment-download="legacy"');
    expect(html).toContain("legacy-resume.pdf");
  });

  it("TC-026 keeps identified submissions compact and opens detail on demand", () => {
    const response = {
      answers: {
        improve: "A full answer that should stay out of the table row",
        source: { kind: "option", label: "Discord", value: "discord" },
      },
      member: {
        email: "member@example.com",
        id: "member-1",
        name: "Member One",
      },
      responseId: "response-1",
      snapshot: {
        questions: [
          { id: "improve", prompt: "What should improve?", type: "paragraph" },
          { id: "source", prompt: "Discovery source", type: "multiple_choice" },
        ],
      },
      submittedAt: "2026-07-15T20:00:00.000Z",
    };
    const html = renderToStaticMarkup(
      createElement(IdentifiedResponses, {
        deletePending: false,
        onDelete: vi.fn(),
        responses: [response],
      }),
    );

    expect(html).toContain('data-response-density="compact"');
    expect(html).toContain("max-h-[65svh]");
    expect(html).toContain("overflow-y-auto");
    expect(html).toContain("View response");
    expect(html).toContain("2 answers");
    expect(html).not.toContain(
      "A full answer that should stay out of the table row",
    );
  });

  it("TC-026 keeps every identified response in one scroll-bounded table", () => {
    const responses = Array.from({ length: 30 }, (_, index) => ({
      answers: { improve: `Answer ${index + 1}` },
      member: {
        email: `member-${index + 1}@example.com`,
        id: `member-${index + 1}`,
        name: `Member ${index + 1}`,
      },
      responseId: `response-${index + 1}`,
      snapshot: {
        questions: [
          { id: "improve", prompt: "What should improve?", type: "paragraph" },
        ],
      },
      submittedAt: "2026-07-15T20:00:00.000Z",
    }));
    const html = renderToStaticMarkup(
      createElement(IdentifiedResponses, {
        deletePending: false,
        onDelete: vi.fn(),
        responses,
      }),
    );

    expect(html).toContain("30 identified submissions");
    expect(html).toContain("Member 30");
    expect(html).not.toContain("Page 1 of 2");
    expect(html).not.toContain("Next response page");
  });
});
