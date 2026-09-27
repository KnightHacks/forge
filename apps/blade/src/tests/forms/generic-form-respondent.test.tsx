import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { GenericFormRespondent } from "~/app/_components/forms/generic-form-respondent";

vi.mock("~/trpc/react", () => ({
  api: {
    forms: {
      getAttachmentDownload: {
        useQuery: ({ attachmentId }: { attachmentId: string }) => ({
          data: { url: `https://cdn.test/${attachmentId}` },
          isError: false,
          isPending: false,
        }),
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
  it("TC-019 renders the managed 4:1 banner before the form title", () => {
    const html = renderToStaticMarkup(
      createElement(GenericFormRespondent, {
        definition: {
          ...definition,
          banner: {
            alt: "Workshop audience",
            attachmentId: "00000000-0000-4000-8000-000000001099",
          },
        },
        respondentState: { status: "open" as const },
      }),
    );

    expect(html).toContain('alt="Workshop audience"');
    expect(html).toContain("aspect-[4/1]");
    expect(html.indexOf('alt="Workshop audience"')).toBeLessThan(
      html.indexOf('id="form-title"'),
    );
  });

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
        respondentState: { status: "closed" as const },
      }),
    );

    expect(html).toContain("This form is closed");
    expect(html).toContain("Responses are no longer accepted");
    expect(html).not.toContain("Submit response");
  });

  it("distinguishes a form closed early from one past its deadline", () => {
    const html = renderToStaticMarkup(
      createElement(GenericFormRespondent, {
        definition,
        respondentState: { status: "manually_closed" as const },
      }),
    );

    expect(html).toContain('data-form-state="manually_closed"');
    expect(html).toContain("This form was closed early");
    expect(html).toContain("Responses are no longer accepted");
    expect(html).not.toContain("Submit response");
  });

  it("names the archived state instead of calling it closed", () => {
    const html = renderToStaticMarkup(
      createElement(GenericFormRespondent, {
        definition,
        respondentState: { status: "archived" as const },
      }),
    );

    expect(html).toContain('data-form-state="archived"');
    expect(html).toContain("This form has been archived");
    expect(html).toContain("Archived forms no longer accept responses");
  });

  it("tells an ineligible member why the form is unavailable", () => {
    const html = renderToStaticMarkup(
      createElement(GenericFormRespondent, {
        definition,
        respondentState: { status: "ineligible" as const },
      }),
    );

    expect(html).toContain('role="status"');
    expect(html).toContain('data-form-state="ineligible"');
    expect(html).toContain("You are not eligible for this form");
    expect(html).toContain("It is limited to specific members");
    expect(html).not.toContain("This form is closed");
  });

  it("omits the opening date when a scheduled form has none", () => {
    const html = renderToStaticMarkup(
      createElement(GenericFormRespondent, {
        definition,
        respondentState: { opensAt: null, status: "scheduled" as const },
      }),
    );

    expect(html).toContain("This form is not open yet");
    expect(html).not.toContain("Opens");
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

    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("Response submitted");
    expect(html).toContain("This response is locked and cannot be edited");
    expect(html).toContain('aria-label="Submitted answers"');
    expect(html).toContain("Director/Officer");
    expect(html).toContain("Web, Robotics");
    expect(html).toContain('href="https://github.com/knighthacks"');
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

  it("labels the form surface and links back to the member dashboard", () => {
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

    expect(html).toContain('aria-labelledby="form-title"');
    expect(html).toContain('id="form-title"');
    expect(html).toContain('href="/member/dashboard"');
    expect(html).toContain("Back to dashboard");
  });
});
