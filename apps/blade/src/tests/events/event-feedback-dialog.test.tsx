import type { ReactNode } from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { EventFeedbackDialog } from "~/app/_components/member/event-feedback-dialog";

vi.mock("@forge/ui/dialog", async () => {
  const { createElement } = await import("react");
  const Container = ({ children, ...props }: { children: ReactNode }) =>
    createElement("div", props, children);

  return {
    Dialog: ({ children }: { children: ReactNode }) =>
      createElement("div", { role: "dialog" }, children),
    DialogClose: Container,
    DialogContent: Container,
    DialogDescription: Container,
    DialogFooter: Container,
    DialogHeader: Container,
    DialogTitle: Container,
    DialogTrigger: Container,
  };
});

const event = {
  id: "00000000-0000-4000-8000-000000002001",
  name: "Git Workshop",
};

const definition = {
  id: "00000000-0000-4000-8000-000000002101",
  questions: [
    {
      id: "00000000-0000-4000-8000-000000002201",
      label: "Overall event rating",
      max: 5,
      min: 1,
      required: true,
      type: "linear_scale" as const,
    },
    {
      id: "00000000-0000-4000-8000-000000002202",
      label: "How fun was the event?",
      max: 5,
      min: 1,
      required: true,
      type: "linear_scale" as const,
    },
    {
      id: "00000000-0000-4000-8000-000000002203",
      label: "How much did you learn?",
      max: 5,
      min: 1,
      required: true,
      type: "linear_scale" as const,
    },
    {
      id: "00000000-0000-4000-8000-000000002204",
      label: "What worked well?",
      required: false,
      type: "paragraph" as const,
    },
    {
      id: "00000000-0000-4000-8000-000000002205",
      label: "What should we improve?",
      required: false,
      type: "paragraph" as const,
    },
    {
      allowOther: true,
      id: "00000000-0000-4000-8000-000000002206",
      label: "How did you hear about this event?",
      options: ["Discord", "Instagram", "Google Calendar", "Other"],
      required: true,
      type: "multiple_choice" as const,
    },
  ],
};

describe("EventFeedbackDialog", () => {
  it("TC-044 renders the complete core feedback experience in an event-owned dialog", () => {
    const html = renderToStaticMarkup(
      createElement(EventFeedbackDialog, {
        definition,
        event,
        onClose: vi.fn(),
        onSubmit: vi.fn(),
        open: true,
        state: {
          closesAt: "2026-08-29T23:00:00.000Z",
          rewardAmount: 5,
          status: "available" as const,
        },
      }),
    );

    expect(html).toContain('aria-label="Event feedback for Git Workshop"');
    expect(html).toContain('data-event-feedback-dialog-state="available"');
    expect(html).toContain("Overall event rating");
    expect(html).toContain("How fun was the event?");
    expect(html).toContain("How much did you learn?");
    expect(html).toContain("What worked well?");
    expect(html).toContain("What should we improve?");
    expect(html).toContain("How did you hear about this event?");
    expect(html).toContain("Google Calendar");
    expect(html).toContain("Other");
    expect(html).toContain("Submit feedback");
    expect(html).toContain("Earn 5 points");
    expect(html).not.toContain('href="/member/feedback');
    expect(html).not.toContain('href="/form/');
  });

  it("TC-048 keeps completed feedback and original answers read-only after expiry", () => {
    const html = renderToStaticMarkup(
      createElement(EventFeedbackDialog, {
        definition,
        event,
        onClose: vi.fn(),
        onSubmit: vi.fn(),
        open: true,
        state: {
          answers: [
            {
              label: "Overall event rating",
              questionId: "00000000-0000-4000-8000-000000002201",
              value: 5,
            },
            {
              label: "What worked well?",
              questionId: "00000000-0000-4000-8000-000000002204",
              value: "The live examples were excellent.",
            },
          ],
          rewardAmount: 5,
          status: "completed" as const,
          submittedAt: "2026-08-22T20:00:00.000Z",
          windowClosed: true,
        },
      }),
    );

    expect(html).toContain('data-event-feedback-dialog-state="completed"');
    expect(html).toContain("Feedback submitted");
    expect(html).toContain("5 points earned");
    expect(html).toContain("Overall event rating");
    expect(html).toContain("The live examples were excellent.");
    expect(html).toContain("Read only");
    expect(html).not.toContain("Submit feedback");
    expect(html).not.toContain("Edit feedback");
    expect(html).not.toContain("Save changes");
  });

  it("TC-052 preserves completed/reward copy when the retained answer was deleted", () => {
    const html = renderToStaticMarkup(
      createElement(EventFeedbackDialog, {
        definition,
        event,
        onClose: vi.fn(),
        onSubmit: vi.fn(),
        open: true,
        state: {
          answers: null,
          responseDeleted: true,
          rewardAmount: 5,
          status: "completed" as const,
          submittedAt: "2026-08-22T20:00:00.000Z",
          windowClosed: true,
        },
      }),
    );

    expect(html).toContain("Feedback completed");
    expect(html).toContain("5 points earned");
    expect(html).toContain("The submitted answers are no longer available");
    expect(html).not.toContain("Submit feedback");
  });

  it("uses a full-screen mobile dialog, labelled fields, and touch-sized actions", () => {
    const html = renderToStaticMarkup(
      createElement(EventFeedbackDialog, {
        definition,
        event,
        onClose: vi.fn(),
        onSubmit: vi.fn(),
        open: true,
        state: {
          closesAt: "2026-08-29T23:00:00.000Z",
          rewardAmount: 5,
          status: "available" as const,
        },
      }),
    );

    expect(html).toContain('data-event-feedback-dialog-layout="responsive"');
    expect(html).toContain("h-[100svh]");
    expect(html).toMatch(/(?:min-h-11|h-11)/);
    expect(html).toContain("focus-visible:ring-2");
  });
});
