import type Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Session } from "@forge/auth/server";

import { duesRouter } from "../../routers/dues";
import { createCallerFactory, createTRPCRouter } from "../../trpc";

const mocks = vi.hoisted(() => ({
  db: {
    query: {
      Member: {
        findFirst: vi.fn(),
      },
    },
    select: vi.fn(),
    transaction: vi.fn(),
  },
  stripe: {
    paymentIntents: {
      create: vi.fn(),
      retrieve: vi.fn(),
    },
  },
}));

vi.mock("@forge/db/client", () => ({
  db: mocks.db,
}));

vi.mock("@forge/utils/stripe", () => ({
  stripe: mocks.stripe,
}));

const userId = "00000000-0000-4000-8000-000000000301";
const memberId = "00000000-0000-4000-8000-000000000302";
const session = {
  user: {
    email: "casey@example.test",
    id: userId,
    name: "casey-member",
  },
} as Session;

const callerFactory = createCallerFactory(
  createTRPCRouter({
    dues: duesRouter,
  }),
);

const member = {
  email: "casey@example.test",
  id: memberId,
  userId,
};

const activeDues = {
  active: true,
  amount: 2500,
  id: "dues-payment-id",
  paymentDate: new Date("2026-06-20T12:00:00Z"),
  stripePaymentIntentId: "pi_paid",
  year: 2025,
};

function createCaller(currentSession: Session | null = session) {
  return callerFactory({
    headers: new Headers(),
    session: currentSession,
    source: "dues-router-test",
  });
}

function mockMember(memberRow: typeof member | null = member) {
  mocks.db.query.Member.findFirst.mockResolvedValue(memberRow);
}

function mockDuesRows(rows: unknown[]) {
  const orderBy = vi.fn().mockResolvedValue(rows);
  const where = vi.fn(() => ({ orderBy }));
  const from = vi.fn(() => ({ where }));

  mocks.db.select.mockReturnValue({ from });

  return {
    from,
    orderBy,
    where,
  };
}

function stripePaymentIntent(
  overrides: Partial<Stripe.PaymentIntent> = {},
): Stripe.PaymentIntent {
  return {
    amount: 2500,
    client_secret: "pi_test_secret_secret",
    created: 1_782_000_000,
    currency: "usd",
    id: "pi_test",
    metadata: {
      academic_year_start: "2025",
      member_id: memberId,
      user_id: userId,
    },
    object: "payment_intent",
    status: "succeeded",
    ...overrides,
  } as Stripe.PaymentIntent;
}

function mockTransaction({
  existingStripePayment = null,
  existingYearPayment = null,
  insertedPayment = {
    ...activeDues,
    id: "inserted-dues-payment-id",
    stripePaymentIntentId: "pi_test",
  },
  memberRow = member,
}: {
  existingStripePayment?: typeof activeDues | null;
  existingYearPayment?: typeof activeDues | null;
  insertedPayment?: typeof activeDues | null;
  memberRow?: typeof member | null;
} = {}) {
  const returning = vi
    .fn()
    .mockResolvedValue(insertedPayment ? [insertedPayment] : []);
  const onConflictDoNothing = vi.fn(() => ({ returning }));
  const values = vi.fn(() => ({ onConflictDoNothing }));
  const insert = vi.fn(() => ({ values }));
  const duesPaymentFindFirst = vi
    .fn()
    .mockResolvedValueOnce(existingStripePayment)
    .mockResolvedValueOnce(existingYearPayment);
  const tx = {
    insert,
    query: {
      DuesPayment: {
        findFirst: duesPaymentFindFirst,
      },
      Member: {
        findFirst: vi.fn().mockResolvedValue(memberRow),
      },
    },
  };

  mocks.db.transaction.mockImplementation(
    (callback: (txHandle: typeof tx) => unknown) =>
      Promise.resolve(callback(tx)),
  );

  return {
    duesPaymentFindFirst,
    insert,
    returning,
    values,
  };
}

describe("duesRouter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-26T12:00:00Z"));
    vi.clearAllMocks();
    mockMember();
    mockDuesRows([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns unpaid status for a member without dues", async () => {
    const result = await createCaller().dues.getStatus();

    expect(result).toMatchObject({
      amountDue: 2500,
      amountDueLabel: "$25.00",
      paid: false,
      state: "unpaid",
    });
    expect(result.currentAcademicYear.shortLabel).toBe("2025-2026");
    expect(result.payableAcademicYear.shortLabel).toBe("2025-2026");
    expect(result.payableAcademicYear.label).toBe(
      "2025-2026 academic school year",
    );
    expect(result.lateYearWarning).toBe(true);
  });

  it("returns paid status for an active current-year dues row", async () => {
    mockDuesRows([activeDues]);

    const result = await createCaller().dues.getStatus();

    expect(result.paid).toBe(true);
    expect(result.state).toBe("paid");
    expect(result.amountPaid).toBe(2500);
    expect(result.paidAt).toEqual(activeDues.paymentDate);
    expect(result.paymentId).toBe(activeDues.id);
    expect(result.paymentAcademicYear.shortLabel).toBe("2025-2026");
    expect(result.stripePaymentIntentId).toBe("pi_paid");
  });

  it("treats a legacy calendar-year manual grant as paid", async () => {
    const legacyManualGrant = {
      ...activeDues,
      id: "legacy-manual-grant",
      stripePaymentIntentId: null,
      year: 2026,
    };
    mockDuesRows([legacyManualGrant]);

    const result = await createCaller().dues.getStatus();

    expect(result.paid).toBe(true);
    expect(result.paymentId).toBe(legacyManualGrant.id);
    expect(result.paymentAcademicYear.shortLabel).toBe("2026-2027");
  });

  it("treats stale current-year dues as unpaid and payable next year", async () => {
    mockDuesRows([{ ...activeDues, active: false }]);

    const result = await createCaller().dues.getStatus();

    expect(result.paid).toBe(false);
    expect(result.currentYearHasStaleDues).toBe(true);
    expect(result.payableAcademicYear.shortLabel).toBe("2026-2027");
    expect(mocks.db.transaction).not.toHaveBeenCalled();
  });

  it("requires a member before creating a PaymentIntent", async () => {
    mockMember(null);

    await expect(
      createCaller().dues.createPaymentIntent(),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect(mocks.stripe.paymentIntents.create).not.toHaveBeenCalled();
  });

  it("blocks PaymentIntent creation when dues are already paid", async () => {
    mockDuesRows([activeDues]);

    await expect(
      createCaller().dues.createPaymentIntent(),
    ).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(mocks.stripe.paymentIntents.create).not.toHaveBeenCalled();
  });

  it("creates a card PaymentIntent with cents and metadata", async () => {
    mocks.stripe.paymentIntents.create.mockResolvedValue(
      stripePaymentIntent({
        id: "pi_created",
      }),
    );

    const result = await createCaller().dues.createPaymentIntent();

    expect(result).toMatchObject({
      amount: 2500,
      amountLabel: "$25.00",
      clientSecret: "pi_test_secret_secret",
      paymentAcademicYear: {
        endYear: 2026,
        label: "2025-2026 academic school year",
        shortLabel: "2025-2026",
        startYear: 2025,
      },
      paymentIntentId: "pi_created",
    });
    expect(mocks.stripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 2500,
        currency: "usd",
        metadata: {
          academic_year_start: "2025",
          member_id: memberId,
          user_id: userId,
        },
        payment_method_types: ["card"],
        receipt_email: "casey@example.test",
      }),
    );
  });

  it("records a succeeded PaymentIntent idempotently", async () => {
    mocks.stripe.paymentIntents.retrieve.mockResolvedValue(
      stripePaymentIntent(),
    );
    const transaction = mockTransaction();

    const result = await createCaller().dues.confirmPayment({
      paymentIntentId: "pi_test",
    });

    expect(result).toMatchObject({
      amount: 2500,
      duesPaymentId: "inserted-dues-payment-id",
      inserted: true,
      state: "paid",
    });
    expect(transaction.values).toHaveBeenCalledWith(
      expect.objectContaining({
        active: true,
        amount: 2500,
        memberId,
        stripePaymentIntentId: "pi_test",
        year: 2025,
      }),
    );

    mocks.stripe.paymentIntents.retrieve.mockResolvedValue(
      stripePaymentIntent(),
    );
    mockTransaction({ existingStripePayment: activeDues });

    await expect(
      createCaller().dues.confirmPayment({ paymentIntentId: "pi_test" }),
    ).resolves.toMatchObject({
      inserted: false,
      state: "paid",
    });
  });

  it("does not insert dues while Stripe is still processing", async () => {
    mocks.stripe.paymentIntents.retrieve.mockResolvedValue(
      stripePaymentIntent({ status: "processing" }),
    );

    const result = await createCaller().dues.confirmPayment({
      paymentIntentId: "pi_processing",
    });

    expect(result).toMatchObject({
      paymentIntentId: "pi_test",
      state: "processing",
    });
    expect(mocks.db.transaction).not.toHaveBeenCalled();
  });

  it("forbids reading processing state for another user's PaymentIntent", async () => {
    mocks.stripe.paymentIntents.retrieve.mockResolvedValue(
      stripePaymentIntent({
        metadata: {
          academic_year_start: "2025",
          member_id: memberId,
          user_id: "00000000-0000-4000-8000-000000000399",
        },
        status: "processing",
      }),
    );

    await expect(
      createCaller().dues.confirmPayment({
        paymentIntentId: "pi_processing_other_user",
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Payment does not belong to the authenticated user.",
    });
    expect(mocks.db.transaction).not.toHaveBeenCalled();
  });

  it.each(["requires_payment_method", "requires_action", "canceled"] as const)(
    "rejects the %s PaymentIntent state with a safe error",
    async (status) => {
      mocks.stripe.paymentIntents.retrieve.mockResolvedValue(
        stripePaymentIntent({ status }),
      );

      await expect(
        createCaller().dues.confirmPayment({ paymentIntentId: "pi_failed" }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Payment has not been completed.",
      });
      expect(mocks.db.transaction).not.toHaveBeenCalled();
    },
  );

  it("forbids confirming another user's PaymentIntent", async () => {
    mocks.stripe.paymentIntents.retrieve.mockResolvedValue(
      stripePaymentIntent({
        metadata: {
          academic_year_start: "2025",
          member_id: memberId,
          user_id: "00000000-0000-4000-8000-000000000399",
        },
      }),
    );

    await expect(
      createCaller().dues.confirmPayment({ paymentIntentId: "pi_wrong_user" }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(mocks.db.transaction).not.toHaveBeenCalled();
  });

  it("forbids confirming a PaymentIntent for another member", async () => {
    mocks.stripe.paymentIntents.retrieve.mockResolvedValue(
      stripePaymentIntent({
        metadata: {
          academic_year_start: "2025",
          member_id: "00000000-0000-4000-8000-000000000398",
          user_id: userId,
        },
      }),
    );

    await expect(
      createCaller().dues.confirmPayment({
        paymentIntentId: "pi_wrong_member",
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Payment does not belong to the authenticated user.",
    });
    expect(mocks.db.transaction).not.toHaveBeenCalled();
  });
});
