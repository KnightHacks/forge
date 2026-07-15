import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { GenericFormRespondent } from "~/app/_components/forms/generic-form-respondent";

vi.mock("~/trpc/react", () => ({
  api: {
    forms: {
      getAttachmentDownload: {
        useQuery: () => ({ refetch: vi.fn() }),
      },
    },
  },
}));

const definition = {
  description: "Tell us which club workshops you want to attend.",
  id: "00000000-0000-4000-8000-000000001001",
  name: "Workshop Interest",
  questions: [],
  responseMode: "single_locked" as const,
  slugName: "workshop-interest",
};

const answeredDefinition = {
  ...definition,
  questions: [
    {
      id: "team",
      prompt: "What team are you on?",
      type: "multiple_choice",
    },
    {
      id: "topics",
      prompt: "Which topics?",
      type: "checkboxes",
    },
    {
      id: "portfolio",
      prompt: "Portfolio",
      type: "link",
    },
    {
      id: "resume",
      prompt: "Resume",
      type: "file",
    },
  ],
};

describe("GenericFormRespondent", () => {
  it("TC-015 clearly renders the scheduled/not-yet-open state", () => {
    const html = renderToStaticMarkup(
      createElement(GenericFormRespondent, {
        definition,
        respondentState: {
          opensAt: "2026-08-20T22:00:00.000Z",
          status: "scheduled" as const,
        },
      }),
    );

    expect(html).toContain('data-form-state="scheduled"');
    expect(html).toContain('role="status"');
    expect(html).toContain("This form is not open yet");
    expect(html).toContain("Opens");
    expect(html).toContain("August 20, 2026");
    expect(html).not.toContain("Submit response");
  });

  it("TC-015 clearly renders the closed state without a submission control", () => {
    const html = renderToStaticMarkup(
      createElement(GenericFormRespondent, {
        definition,
        respondentState: {
          closedAt: "2026-09-01T03:59:59.000Z",
          reason: "schedule" as const,
          status: "closed" as const,
        },
      }),
    );

    expect(html).toContain('data-form-state="closed"');
    expect(html).toContain("This form is closed");
    expect(html).toContain("Responses are no longer accepted");
    expect(html).not.toContain("Submit response");
  });

  it("TC-016 renders a locked response receipt without an inert review action", () => {
    const html = renderToStaticMarkup(
      createElement(GenericFormRespondent, {
        definition: answeredDefinition,
        respondentState: {
          answers: [
            {
              questionId: "team",
              value: {
                kind: "option",
                label: "Director/Officer",
                value: "director-officer",
              },
            },
            {
              questionId: "topics",
              value: [
                { kind: "option", label: "Web", value: "web" },
                { kind: "other", text: "Robotics" },
              ],
            },
            {
              questionId: "portfolio",
              value: "https://github.com/knighthacks",
            },
            {
              questionId: "resume",
              value: {
                attachmentId: "00000000-0000-4000-8000-000000000099",
                fileName: "resume.pdf",
              },
            },
          ],
          editable: false,
          responseId: "00000000-0000-4000-8000-000000001201",
          status: "submitted" as const,
          submittedAt: "2026-08-21T15:30:00.000Z",
        },
      }),
    );

    expect(html).toContain('data-form-state="submitted"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("Your submitted response");
    expect(html).toContain("This response is locked and cannot be edited");
    expect(html).toContain('aria-label="Submitted answers"');
    expect(html).toContain("Director/Officer");
    expect(html).toContain("Web, Robotics");
    expect(html).toContain('data-form-response-link="clickable"');
    expect(html).toContain('href="https://github.com/knighthacks"');
    expect(html).toContain('data-form-attachment-download="available"');
    expect(html).toContain("resume.pdf");
    expect(html).not.toContain("director-officer");
    expect(html).not.toContain("{&quot;kind&quot;");
    expect(html).not.toContain("Review your response");
    expect(html).not.toContain("#submitted-response");
    expect(html).not.toContain("Callbacks");
    expect(html).not.toContain("Automation");
    expect(html).not.toContain("Retry");
    expect(html).not.toContain("Failed");
  });

  it("uses a mobile-first, labelled form surface with touch-sized controls", () => {
    const html = renderToStaticMarkup(
      createElement(GenericFormRespondent, {
        definition,
        respondentState: {
          answers: [],
          editable: false,
          responseId: "00000000-0000-4000-8000-000000001201",
          status: "submitted" as const,
          submittedAt: "2026-08-21T15:30:00.000Z",
        },
      }),
    );

    expect(html).toContain('data-form-respondent-layout="mobile-first"');
    expect(html).toContain('aria-labelledby="form-title"');
    expect(html).toContain('id="form-title"');
    expect(html).toContain('href="/member/dashboard"');
    expect(html).toContain("Back to dashboard");
    expect(html).toMatch(/(?:min-h-11|h-11)/);
    expect(html).toContain("focus-visible:ring-2");
  });
});
