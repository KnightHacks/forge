import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MemberEventFeedback } from "~/app/_components/member/member-event-feedback";

const feedbackMocks = vi.hoisted(() => ({
  invalidateFeedback: vi.fn(() => Promise.resolve()),
  invalidateMember: vi.fn(() => Promise.resolve()),
  refresh: vi.fn(),
  onSuccess: undefined as
    | ((
        result: { pointsAwarded: number; responseId: string | null },
        variables: {
          answers: {
            customAnswers: Record<string, unknown>;
            discovery: string;
            fun: number;
            improve: string;
            learning: number;
            overall: number;
            worked: string;
          };
          formId: string;
        },
      ) => void)
    | undefined,
  toastSuccess: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: feedbackMocks.refresh }),
}));

vi.mock("@forge/ui/toast", () => ({
  toast: { success: feedbackMocks.toastSuccess },
}));

vi.mock("~/trpc/react", () => ({
  api: {
    event: {
      submitFeedback: {
        useMutation: (options: {
          onSuccess: typeof feedbackMocks.onSuccess;
        }) => {
          feedbackMocks.onSuccess = options.onSuccess;
          return { isPending: false, mutate: vi.fn() };
        },
      },
    },
    useUtils: () => ({
      event: {
        listMyFeedback: { invalidate: feedbackMocks.invalidateFeedback },
      },
      member: { getMember: { invalidate: feedbackMocks.invalidateMember } },
    }),
  },
}));

vi.mock("~/app/_components/member/event-feedback-dialog", () => ({
  EventFeedbackDialog: () => null,
}));

describe("MemberEventFeedback", () => {
  beforeEach(() => {
    feedbackMocks.onSuccess = undefined;
    feedbackMocks.toastSuccess.mockClear();
    feedbackMocks.invalidateFeedback.mockClear();
    feedbackMocks.invalidateMember.mockClear();
    feedbackMocks.refresh.mockClear();
  });

  it("anchors available feedback at the card's bottom-right edge before event end", () => {
    const html = renderToStaticMarkup(
      createElement(MemberEventFeedback, {
        opportunity: {
          dueAt: "2026-08-29T23:00:00.000Z",
          eventId: "00000000-0000-4000-8000-000000001001",
          eventName: "Git Workshop",
          formId: "00000000-0000-4000-8000-000000001002",
          rewardPoints: 5,
          status: "available",
          urgent: false,
        },
        surface: "dashboard",
      }),
    );

    expect(html).toContain('data-feedback-position="bottom-right"');
    expect(html).toContain("justify-end");
    expect(html).toContain('aria-label="Give feedback for Git Workshop"');
    expect(html).not.toContain(">Give feedback<");
    expect(html).not.toContain("Due ");
  });

  it("closes accepted feedback through the success state and shows a points toast", () => {
    renderToStaticMarkup(
      createElement(MemberEventFeedback, {
        opportunity: {
          dueAt: "2026-08-29T23:00:00.000Z",
          eventId: "00000000-0000-4000-8000-000000001001",
          eventName: "Git Workshop",
          formId: "00000000-0000-4000-8000-000000001002",
          rewardPoints: 5,
          status: "available",
          urgent: false,
        },
        surface: "dashboard",
      }),
    );

    feedbackMocks.onSuccess?.(
      {
        pointsAwarded: 5,
        responseId: "00000000-0000-4000-8000-000000001003",
      },
      {
        answers: {
          customAnswers: {},
          discovery: "Discord",
          fun: 5,
          improve: "",
          learning: 5,
          overall: 5,
          worked: "Great pacing",
        },
        formId: "00000000-0000-4000-8000-000000001002",
      },
    );

    expect(feedbackMocks.toastSuccess).toHaveBeenCalledWith(
      "Feedback submitted",
      {
        description:
          "5 points earned. Thanks for helping us improve Git Workshop.",
      },
    );
    expect(feedbackMocks.invalidateFeedback).toHaveBeenCalledOnce();
    expect(feedbackMocks.invalidateMember).toHaveBeenCalledOnce();
    expect(feedbackMocks.refresh).toHaveBeenCalledOnce();
  });

  it("renders completed dashboard feedback with the success visual", () => {
    const html = renderToStaticMarkup(
      createElement(MemberEventFeedback, {
        opportunity: {
          dueAt: "2026-08-29T23:00:00.000Z",
          eventId: "00000000-0000-4000-8000-000000001001",
          eventName: "Git Workshop",
          formId: "00000000-0000-4000-8000-000000001002",
          rewardPoints: 5,
          status: "completed",
          urgent: false,
        },
        surface: "dashboard",
      }),
    );

    expect(html).toContain('data-feedback-state="completed"');
    expect(html).toContain('data-feedback-completed-visual="success"');
  });
});
