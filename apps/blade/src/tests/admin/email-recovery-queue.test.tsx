/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { RouterOutputs } from "@forge/api";

import { RecipientRetryReview } from "~/app/_components/admin/email/email-recovery-queue";

vi.mock("~/app/_components/admin/email/use-email-recovery", () => ({
  useEmailRecovery: vi.fn(),
}));
afterEach(cleanup);

function fixture(): RouterOutputs["email"]["investigateSend"] {
  return {
    investigationId: "review",
    checkedAt: new Date(),
    complete: true,
    retries: [],
    send: {
      id: "original",
      subject: "Synthetic arrival instructions",
      createdAt: new Date("2026-10-01T18:00:00Z"),
      expected: 65,
      sent: 1,
      compiledHtml: "<p>Original message</p>",
      compiledText: "Original message",
    },
    recipients: [
      ...Array.from({ length: 60 }, (_, i) => ({
        id: `recipient-${i}`,
        email: `recipient-${i}@example.test`,
        status: "retryable",
        smtpCode: 421,
        retrySendId: null,
      })),
      ...["permanent", "unknown", "unconfirmed", "ineligible", "retried"].map(
        (status) => ({
          id: status,
          email: `${status}@example.test`,
          status,
          smtpCode: null,
          retrySendId: null,
        }),
      ),
    ],
  };
}
describe("recipient retry review", () => {
  it("requires explicit selection and a second review before queueing only selected IDs", () => {
    const onRetry = vi.fn();
    render(
      <RecipientRetryReview
        detail={fixture()}
        pending={false}
        onClose={vi.fn()}
        onRetry={onRetry}
      />,
    );
    expect(
      screen
        .getByRole("button", { name: "Review 0 selected" })
        .hasAttribute("disabled"),
    ).toBe(true);
    fireEvent.click(screen.getByLabelText("Retry recipient-0@example.test"));
    fireEvent.click(screen.getByRole("button", { name: "Review 1 selected" }));
    expect(onRetry).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Queue the original email for this selected recipient/),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Queue 1 retry" }));
    expect(onRetry).toHaveBeenCalledExactlyOnceWith(["recipient-0"]);
  });
  it("paginates 60 retryable recipients and never selects unsafe outcomes", () => {
    render(
      <RecipientRetryReview
        detail={fixture()}
        pending={false}
        onClose={vi.fn()}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getAllByRole("checkbox")).toHaveLength(25);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(
      screen.getByLabelText("Retry recipient-25@example.test"),
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Recipient status"), {
      target: { value: "all" },
    });
    fireEvent.change(screen.getByLabelText("Search recovery recipients"), {
      target: { value: "permanent" },
    });
    expect(
      screen
        .getByLabelText("Retry permanent@example.test")
        .hasAttribute("disabled"),
    ).toBe(true);
  });
  it("closing the review sends nothing and server errors remain visible", () => {
    const onRetry = vi.fn();
    const onClose = vi.fn();
    render(
      <RecipientRetryReview
        detail={fixture()}
        pending={false}
        onClose={onClose}
        onRetry={onRetry}
        error="Delivery evidence changed. Investigate again."
      />,
    );
    expect(screen.getByRole("alert").textContent).toContain("evidence changed");
    fireEvent.click(screen.getByText("Close", { selector: "button" }));
    expect(onRetry).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
  it("shows previous retry outcomes and opens a failed child for a new review", () => {
    const detail = fixture();
    detail.retries = [
      {
        id: "failed-child",
        status: "failed",
        createdAt: new Date(),
        sent: 8,
        expected: 10,
        providerMayHaveStarted: true,
      },
      {
        id: "completed-child",
        status: "completed",
        createdAt: new Date(),
        sent: 4,
        expected: 4,
        providerMayHaveStarted: true,
      },
    ];
    const onReviewRetry = vi.fn();
    const onRetry = vi.fn();
    render(
      <RecipientRetryReview
        detail={detail}
        pending={false}
        onClose={vi.fn()}
        onRetry={onRetry}
        onReviewRetry={onReviewRetry}
      />,
    );
    expect(
      screen.getByRole("region", { name: "Retry history" }).textContent,
    ).toContain("4/4 reported sent");
    fireEvent.click(screen.getByRole("button", { name: "Review retry" }));
    expect(onReviewRetry).toHaveBeenCalledExactlyOnceWith("failed-child");
    expect(onRetry).not.toHaveBeenCalled();
  });
  it("the individual Retry action confirms only that person even after selecting everyone", () => {
    const onRetry = vi.fn();
    render(
      <RecipientRetryReview
        detail={fixture()}
        pending={false}
        onClose={vi.fn()}
        onRetry={onRetry}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Select 60 retryable" }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Review retry for recipient-2@example.test",
      }),
    );
    expect(onRetry).not.toHaveBeenCalled();
    expect(screen.queryByText("recipient-0@example.test")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Queue 1 retry" }));
    expect(onRetry).toHaveBeenCalledExactlyOnceWith(["recipient-2"]);
  });
});
