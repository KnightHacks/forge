import { beforeEach, describe, expect, it, vi } from "vitest";

import type { recordSucceededDuesPayment as recordSucceededDuesPaymentType } from "@forge/api/utils";

const mocks = vi.hoisted(() => ({
  db: {
    transaction: vi.fn(),
  },
  logger: {
    error: vi.fn(),
  },
  recordSucceededDuesPayment: vi.fn(),
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
  },
}));

vi.mock("~/env", () => ({
  env: {
    STRIPE_SECRET_WEBHOOK_KEY: "whsec_test",
  },
}));

vi.mock("@forge/db/client", () => ({
  db: mocks.db,
}));

vi.mock("@forge/api/utils", () => ({
  recordSucceededDuesPayment: mocks.recordSucceededDuesPayment,
}));

vi.mock("@forge/utils", () => ({
  logger: mocks.logger,
}));

vi.mock("@forge/utils/stripe", () => ({
  stripe: mocks.stripe,
}));

async function postMembershipWebhook() {
  const { POST } = await import("~/app/api/membership/route");

  return await POST(
    new Request("http://blade.test/api/membership", {
      body: "{}",
      headers: {
        "stripe-signature": "sig_test",
      },
      method: "POST",
    }),
  );
}

describe("/api/membership Stripe webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("records repeated succeeded events idempotently through the shared helper", async () => {
    const paymentIntent = {
      amount: 2500,
      created: 1_782_000_000,
      id: "pi_webhook",
      metadata: {
        academic_year_start: "2025",
        member_id: "member-id",
        user_id: "user-id",
      },
      object: "payment_intent",
      status: "succeeded",
    };
    mocks.stripe.webhooks.constructEvent.mockReturnValue({
      data: {
        object: paymentIntent,
      },
      type: "payment_intent.succeeded",
    });
    const actualUtils = await vi.importActual<{
      recordSucceededDuesPayment: typeof recordSucceededDuesPaymentType;
    }>("@forge/api/utils");
    let storedPayment: Record<string, unknown> | null = null;
    const returning = vi.fn(() => {
      storedPayment = {
        active: true,
        amount: 2500,
        id: "dues-payment-id",
        memberId: "member-id",
        paymentDate: new Date(1_782_000_000 * 1000),
        stripePaymentIntentId: "pi_webhook",
        year: 2025,
      };
      return Promise.resolve([storedPayment]);
    });
    const onConflictDoNothing = vi.fn(() => ({ returning }));
    const values = vi.fn(() => ({ onConflictDoNothing }));
    const insert = vi.fn(() => ({ values }));
    const transaction = {
      insert,
      query: {
        DuesPayment: {
          findFirst: vi.fn(() => Promise.resolve(storedPayment)),
        },
        Member: {
          findFirst: vi.fn(() =>
            Promise.resolve({
              id: "member-id",
              userId: "user-id",
            }),
          ),
        },
      },
    };
    mocks.db.transaction.mockImplementation(
      (callback: (transactionHandle: typeof transaction) => unknown) =>
        Promise.resolve(callback(transaction)),
    );
    mocks.recordSucceededDuesPayment.mockImplementation(
      actualUtils.recordSucceededDuesPayment,
    );

    const firstResponse = await postMembershipWebhook();
    const repeatedResponse = await postMembershipWebhook();

    expect(firstResponse.status).toBe(200);
    expect(repeatedResponse.status).toBe(200);
    await expect(firstResponse.text()).resolves.toBe("Payment complete");
    await expect(repeatedResponse.text()).resolves.toBe("Payment complete");
    expect(mocks.stripe.webhooks.constructEvent).toHaveBeenCalledWith(
      "{}",
      "sig_test",
      "whsec_test",
    );
    expect(mocks.stripe.webhooks.constructEvent).toHaveBeenCalledTimes(2);
    expect(mocks.recordSucceededDuesPayment).toHaveBeenCalledTimes(2);
    expect(mocks.recordSucceededDuesPayment).toHaveBeenNthCalledWith(1, {
      database: mocks.db,
      paymentIntent,
    });
    expect(mocks.recordSucceededDuesPayment).toHaveBeenNthCalledWith(2, {
      database: mocks.db,
      paymentIntent,
    });
    expect(insert).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        active: true,
        amount: 2500,
        memberId: "member-id",
        stripePaymentIntentId: "pi_webhook",
        year: 2025,
      }),
    );
    expect(storedPayment).toMatchObject({
      id: "dues-payment-id",
      stripePaymentIntentId: "pi_webhook",
    });
  });

  it("rejects invalid webhook signatures", async () => {
    mocks.stripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error("invalid signature");
    });

    const response = await postMembershipWebhook();

    expect(response.status).toBe(400);
    expect(mocks.recordSucceededDuesPayment).not.toHaveBeenCalled();
  });

  it("acknowledges unsupported Stripe events without recording dues", async () => {
    mocks.stripe.webhooks.constructEvent.mockReturnValue({
      data: {
        object: { id: "pi_failed" },
      },
      type: "payment_intent.payment_failed",
    });

    const response = await postMembershipWebhook();

    expect(response.status).toBe(202);
    expect(mocks.recordSucceededDuesPayment).not.toHaveBeenCalled();
  });
});
