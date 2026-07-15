import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { EventFeedbackCta } from "~/app/_components/member/event-feedback-cta";

function renderCta(
  surface: "dashboard" | "event_history",
  feedback:
    | {
        closesAt: string;
        rewardAmount: number;
        status: "available" | "due_soon";
      }
    | {
        rewardAmount: number;
        status: "completed";
      },
) {
  return renderToStaticMarkup(
    createElement(EventFeedbackCta, {
      eventName: "Git Workshop",
      feedback,
      onOpen: vi.fn(),
      surface,
    }),
  );
}

describe("EventFeedbackCta", () => {
  it.each(["event_history", "dashboard"] as const)(
    "TC-046 shows compact due-soon urgency without a due-date row on %s cards",
    (surface) => {
      const html = renderCta(surface, {
        closesAt: "2026-08-23T23:00:00.000Z",
        rewardAmount: 5,
        status: "due_soon",
      });

      expect(html).toContain(`data-feedback-surface="${surface}"`);
      expect(html).toContain('data-feedback-state="due_soon"');
      expect(html).toContain("(!)");
      expect(html).toContain("text-destructive");
      expect(html).toContain('aria-label="Feedback is due soon"');
      expect(html).toContain('aria-label="Give feedback for Git Workshop');
      expect(html).not.toContain("Due Aug");
      expect(html).not.toContain("border-destructive");
    },
  );

  it("TC-046 keeps exactly-24-hours/non-urgent availability out of red urgency styling", () => {
    const html = renderCta("event_history", {
      closesAt: "2026-08-24T23:00:00.000Z",
      rewardAmount: 5,
      status: "available",
    });

    expect(html).toContain('data-feedback-state="available"');
    expect(html).toContain("Give feedback");
    expect(html).not.toContain("Due Aug");
    expect(html).not.toContain("(!)");
    expect(html).not.toContain("text-destructive");
    expect(html).not.toContain("border-destructive");
  });

  it("TC-046 TC-048 keeps completed dashboard feedback icon-only", () => {
    const html = renderCta("dashboard", {
      rewardAmount: 5,
      status: "completed",
    });

    expect(html).toContain('data-feedback-state="completed"');
    expect(html).toContain('data-feedback-completed-visual="success"');
    expect(html).toContain('aria-label="Review feedback for Git Workshop"');
    expect(html).toContain("bg-[hsl(var(--chart-2)/0.18)]");
    expect(html).toContain("text-muted-foreground");
    expect(html).not.toContain("Feedback submitted");
    expect(html).not.toContain("5 points earned");
    expect(html).not.toContain(">Review feedback<");
    expect(html).not.toContain("text-destructive");
  });

  it("TC-046 TC-048 keeps completion context on event history", () => {
    const html = renderCta("event_history", {
      rewardAmount: 5,
      status: "completed",
    });

    expect(html).toContain("Feedback submitted");
    expect(html).toContain("5 points earned");
    expect(html).toContain("Review feedback");
  });

  it("keeps the member-card action touch-sized and keyboard-visible", () => {
    const html = renderCta("dashboard", {
      closesAt: "2026-08-23T23:00:00.000Z",
      rewardAmount: 5,
      status: "due_soon",
    });

    expect(html).toMatch(/(?:min-h-11|h-11)/);
    expect(html).toContain("focus-visible:ring-2");
  });
});
