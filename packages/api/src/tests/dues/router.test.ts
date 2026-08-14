import type Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Session } from "@forge/auth/server";

import { duesRouter } from "../../routers/dues";
import { createCallerFactory, createTRPCRouter } from "../../trpc";

const mocks = vi.hoisted(() => ({
  db: {
    query: {
      DuesConfiguration: {
        findFirst: vi.fn(),
      },
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
  amount: 2500,
  id: "dues-payment-id",
  paymentDate: new Date("2026-06-20T12:00:00Z"),
  stripePaymentIntentId: "pi_paid",
  year: 2025,
};

const activeEntitlement = {
  active: true,
  createdAt: activeDues.paymentDate,
  id: "dues-entitlement-id",
  memberId,
  sourcePaymentId: activeDues.id,
  updatedAt: activeDues.paymentDate,
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

function mockPaymentAvailability(paymentsEnabled: boolean) {
  mocks.db.query.DuesConfiguration.findFirst.mockResolvedValue({
    paymentsEnabled,
  });
}

function mockDuesState({
  entitlements = [],
  payments = [],
}: {
  entitlements?: unknown[];
  payments?: unknown[];
} = {}) {
  mocks.db.select.mockReset();
  const entitlementWhere = vi.fn().mockResolvedValue(entitlements);
  const paymentOrderBy = vi.fn().mockResolvedValue(payments);
  const paymentWhere = vi.fn(() => ({ orderBy: paymentOrderBy }));
  mocks.db.select
    .mockReturnValueOnce({
      from: vi.fn(() => ({ where: entitlementWhere })),
    })
    .mockReturnValueOnce({
      from: vi.fn(() => ({ where: paymentWhere })),
    });
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
  insertedPayment = {
    ...activeDues,
    id: "inserted-dues-payment-id",
    stripePaymentIntentId: "pi_test",
  },
  memberRow = member,
}: {
  existingStripePayment?: typeof activeDues | null;
  insertedPayment?: typeof activeDues | null;
  memberRow?: typeof member | null;
} = {}) {
  const returning = vi
    .fn()
    .mockResolvedValue(insertedPayment ? [insertedPayment] : []);
  const onConflictDoNothing = vi.fn(() => ({ returning }));
  const onConflictDoUpdate = vi.fn((_options: { setWhere?: unknown }) =>
    Promise.resolve(undefined),
  );
  const values = vi.fn(() => ({ onConflictDoNothing, onConflictDoUpdate }));
  const insert = vi.fn(() => ({ values }));
  const duesPaymentFindFirst = vi.fn().mockResolvedValue(existingStripePayment);
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
    onConflictDoUpdate,
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
    mockPaymentAvailability(false);
    mockDuesState();
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
    expect(result.currentAcademicYear.label).toBe(
      "2025-2026 academic school year",
    );
    expect(result.lateYearWarning).toBe(true);
    expect(result.paymentsLocked).toBe(true);
  });

  it("returns paid status for an active current-year entitlement", async () => {
    mockDuesState({
      entitlements: [activeEntitlement],
      payments: [activeDues],
    });

    const result = await createCaller().dues.getStatus();

    expect(result.paid).toBe(true);
    expect(result.state).toBe("paid");
    expect(result.amountPaid).toBe(2500);
    expect(result.paidAt).toEqual(activeDues.paymentDate);
    expect(result.paymentId).toBe(activeDues.id);
    expect(result.paymentAcademicYear.shortLabel).toBe("2025-2026");
    expect(result.stripePaymentIntentId).toBe("pi_paid");
  });

  it("returns paid status for an active manual entitlement", async () => {
    mockDuesState({
      entitlements: [{ ...activeEntitlement, sourcePaymentId: null }],
    });

    const result = await createCaller().dues.getStatus();

    expect(result).toMatchObject({
      amountPaid: null,
      paid: true,
      paidAt: activeEntitlement.updatedAt,
      paymentId: null,
      state: "paid",
      stripePaymentIntentId: null,
    });
  });

  it("does not treat payment history without an entitlement as paid", async () => {
    mockDuesState({ payments: [activeDues] });

    const result = await createCaller().dues.getStatus();

    expect(result.paid).toBe(false);
    expect(result.paymentId).toBeNull();
  });

  it("treats an inactive current-year entitlement as unpaid for the current year", async () => {
    mockDuesState({
      entitlements: [{ ...activeEntitlement, active: false }],
      payments: [activeDues],
    });

    const result = await createCaller().dues.getStatus();

    expect(result.paid).toBe(false);
    expect(result.currentAcademicYear.shortLabel).toBe("2025-2026");
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
    mockDuesState({ entitlements: [activeEntitlement] });

    await expect(
      createCaller().dues.createPaymentIntent(),
    ).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(mocks.stripe.paymentIntents.create).not.toHaveBeenCalled();
  });

  it("blocks PaymentIntent creation when admins have paused payments", async () => {
    await expect(
      createCaller().dues.createPaymentIntent(),
    ).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
      message: "Dues payments are paused until further notice.",
    });
    expect(mocks.stripe.paymentIntents.create).not.toHaveBeenCalled();
  });

  it("creates a card PaymentIntent with cents and metadata", async () => {
    mockPaymentAvailability(true);
    vi.setSystemTime(new Date("2026-08-31T00:00:00.000Z"));
    mocks.stripe.paymentIntents.create.mockResolvedValue(
      stripePaymentIntent({
        id: "pi_created",
        status: "requires_payment_method",
      }),
    );

    const result = await createCaller().dues.createPaymentIntent();

    expect(result).toMatchObject({
      amount: 2500,
      amountLabel: "$25.00",
      clientSecret: "pi_test_secret_secret",
      paymentAcademicYear: {
        endYear: 2027,
        label: "2026-2027 academic school year",
        shortLabel: "2026-2027",
        startYear: 2026,
      },
      paymentIntentId: "pi_created",
    });
    expect(mocks.stripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 2500,
        currency: "usd",
        metadata: {
          academic_year_start: "2026",
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
        amount: 2500,
        memberId,
        stripePaymentIntentId: "pi_test",
        year: 2025,
      }),
    );
    const entitlementUpdate = transaction.onConflictDoUpdate.mock.calls[0]?.[0];
    expect(entitlementUpdate?.setWhere).toBeDefined();

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
