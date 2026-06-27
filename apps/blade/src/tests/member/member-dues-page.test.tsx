import type { ReactNode } from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { CurrentDuesStatus } from "~/app/_components/member/member-dashboard";
import { MemberDuesPayment } from "~/app/_components/member/member-dues-payment";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock("@forge/ui/dialog", async () => {
  const { createElement } = await import("react");
  const Container = ({ children }: { children: ReactNode }) =>
    createElement("div", null, children);

  return {
    Dialog: ({ children, open }: { children: ReactNode; open?: boolean }) =>
      open ? createElement("div", { role: "dialog" }, children) : null,
    DialogContent: Container,
    DialogDescription: Container,
    DialogFooter: Container,
    DialogHeader: Container,
    DialogTitle: Container,
  };
});

vi.mock("~/env", () => ({
  env: {
    NEXT_PUBLIC_BLADE_E2E_AUTH: "true",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_fake",
  },
}));

vi.mock("~/trpc/react", () => ({
  api: {
    dues: {
      confirmPayment: {
        useMutation: vi.fn(() => ({
          isPending: false,
          mutateAsync: vi.fn(),
        })),
      },
      createPaymentIntent: {
        useMutation: vi.fn(() => ({
          data: null,
          isError: false,
          mutate: vi.fn(),
        })),
      },
    },
    useUtils: vi.fn(() => ({
      dues: {
        getStatus: {
          invalidate: vi.fn(),
        },
      },
    })),
  },
}));

vi.mock("@stripe/stripe-js", () => ({
  loadStripe: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: ReactNode }) =>
    createElement("div", null, children),
  PaymentElement: () => createElement("div", null, "Stripe payment element"),
  useElements: () => null,
  useStripe: () => null,
}));

const duesStatus = {
  amountDue: 2500,
  amountDueLabel: "$25.00",
  amountPaid: null,
  currentAcademicYear: {
    endYear: 2027,
    label: "2026-2027 academic school year",
    shortLabel: "2026-2027",
    startYear: 2026,
  },
  currentYearHasStaleDues: false,
  lateYearWarning: false,
  paid: false,
  paidAt: null,
  payableAcademicYear: {
    endYear: 2027,
    label: "2026-2027 academic school year",
    shortLabel: "2026-2027",
    startYear: 2026,
  },
  paymentAcademicYear: {
    endYear: 2027,
    label: "2026-2027 academic school year",
    shortLabel: "2026-2027",
    startYear: 2026,
  },
  paymentId: null,
  state: "unpaid",
  stripePaymentIntentId: null,
} as CurrentDuesStatus;

describe("MemberDuesPayment", () => {
  it("renders the dues payment page with amount, school year, and refund copy", () => {
    const html = renderToStaticMarkup(
      createElement(MemberDuesPayment, { duesStatus }),
    );

    expect(html).toContain("Pay member dues");
    expect(html).toContain("2026-2027 academic school year");
    expect(html).toContain("$25.00");
    expect(html).toContain("Non-refundable membership dues");
    expect(html).toContain("Complete test payment");
    expect(html).toContain('href="/member/dashboard"');
    expect(html).not.toContain("The school year is almost over");
    expect(html).not.toContain("you will need to pay dues again");
  });

  it("renders the payment page when late-year warning state is requested", () => {
    const html = renderToStaticMarkup(
      createElement(MemberDuesPayment, {
        duesStatus: { ...duesStatus, lateYearWarning: true },
      }),
    );

    expect(html).toContain("The school year is almost over");
    expect(html).toContain(
      "The new school year is almost here, which means you will need to pay dues again in the Fall Semester.",
    );
    expect(html).toContain("Continue to payment");
    expect(html).toContain("Return home");
  });
});
