import type { ReactNode } from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { HackathonCheckInResult } from "~/app/_components/admin/hackathon-events/check-in-result-dialog";
import { CheckInResultDialog } from "~/app/_components/admin/hackathon-events/check-in-result-dialog";

vi.mock("@forge/ui/dialog", () => {
  const Container = ({ children }: { children: ReactNode }) =>
    createElement("div", null, children);
  return {
    Dialog: Container,
    DialogContent: Container,
    DialogDescription: Container,
    DialogFooter: Container,
    DialogHeader: Container,
    DialogTitle: Container,
  };
});

const result: HackathonCheckInResult = {
  attemptId: "00000000-0000-4000-8000-000000000001",
  checkedInAt: "2026-08-05T17:00:00.000Z",
  class: { color: "#CCA4F4", name: "Builders" },
  dateOfBirth: "2010-08-06",
  eventName: "Knight Hacks Check-in",
  eventPurpose: "primary_check_in",
  firstTimeStatus: "first",
  hackerName: "Ada Builder",
  isVip: true,
  operatorName: "Grace Operator",
  outcome: "checked_in",
  pointsAwarded: 10,
  roleDelivery: {
    grants: [
      { kind: "general", state: "succeeded" },
      { kind: "class", state: "failed" },
      { kind: "vip", state: "succeeded" },
    ],
    needsAttention: true,
  },
  statusAtAttempt: "Confirmed",
  wasMinorAtAttempt: true,
};

describe("hackathon check-in result", () => {
  it("keeps the operational identity, minor, VIP, class, and role facts together", () => {
    const html = renderToStaticMarkup(
      createElement(CheckInResultDialog, {
        onOpenChange: vi.fn(),
        onRetryRoles: vi.fn(),
        open: true,
        result,
      }),
    );

    expect(html).toContain("Checked in");
    expect(html).toContain("MINOR — under 18 at check-in");
    expect(html).toContain("Ada Builder");
    expect(html).toContain("Aug 6, 2010");
    expect(html).toContain("Builders");
    expect(html).toContain("VIP");
    expect(html).toContain("Discord roles need attention");
    expect(html).toContain("Retry Discord roles");
    expect(html).toContain("Done");
    expect(html).not.toContain("First-time hacker");
    expect(html).not.toContain("Points this attempt");
    expect(html).not.toContain("Grace Operator");
    expect(html).not.toContain("Recorded");
    expect(html).not.toContain("Discord username");
  });

  it("treats an uncertain transport outcome as recoverable history work", () => {
    const html = renderToStaticMarkup(
      createElement(CheckInResultDialog, {
        onOpenChange: vi.fn(),
        open: true,
        result: {
          ...result,
          hackerName: null,
          outcome: "unknown",
          roleDelivery: null,
          wasMinorAtAttempt: false,
        },
      }),
    );

    expect(html).toContain("Outcome unknown");
    expect(html).toContain("Check history before trying again");
    expect(html).not.toContain("MINOR — under 18 at check-in");
  });
});
