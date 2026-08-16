import type Stripe from "stripe";
import { TRPCError } from "@trpc/server";

import type { db as forgeDb } from "@forge/db/client";
import { and, eq } from "@forge/db";
import {
  DuesEntitlement,
  DuesPayment,
  Member,
} from "@forge/db/schemas/knight-hacks";

interface RecordSucceededDuesPaymentOptions {
  database: typeof forgeDb;
  expectedMemberId?: string;
  expectedUserId?: string;
  paymentIntent: Stripe.PaymentIntent;
}

function readPaymentIntentMetadata(paymentIntent: Stripe.PaymentIntent) {
  const memberId = paymentIntent.metadata.member_id;
  const userId = paymentIntent.metadata.user_id;
  const academicYearStart = Number(paymentIntent.metadata.academic_year_start);

  if (!memberId || !userId || !Number.isInteger(academicYearStart)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Payment metadata is incomplete.",
    });
  }

  return {
    academicYearStart,
    memberId,
    userId,
  };
}

export function assertDuesPaymentIntentOwnership({
  expectedMemberId,
  expectedUserId,
  paymentIntent,
}: Omit<RecordSucceededDuesPaymentOptions, "database">) {
  const metadata = readPaymentIntentMetadata(paymentIntent);

  if (
    (expectedMemberId && metadata.memberId !== expectedMemberId) ||
    (expectedUserId && metadata.userId !== expectedUserId)
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Payment does not belong to the authenticated user.",
    });
  }

  return metadata;
}

export async function recordSucceededDuesPayment({
  database,
  expectedMemberId,
  expectedUserId,
  paymentIntent,
}: RecordSucceededDuesPaymentOptions) {
  if (paymentIntent.status !== "succeeded") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Payment has not been completed.",
    });
  }

  const metadata = assertDuesPaymentIntentOwnership({
    expectedMemberId,
    expectedUserId,
    paymentIntent,
  });

  return await database.transaction(async (tx) => {
    const member = await tx.query.Member.findFirst({
      where: and(
        eq(Member.id, metadata.memberId),
        eq(Member.userId, metadata.userId),
      ),
      columns: {
        id: true,
        userId: true,
      },
    });

    if (!member) {
      throw new TRPCError({
        code: expectedUserId ? "FORBIDDEN" : "NOT_FOUND",
        message: expectedUserId
          ? "Payment does not belong to the authenticated user."
          : "Member profile for this payment does not exist.",
      });
    }

    const existingStripePayment = await tx.query.DuesPayment.findFirst({
      where: eq(DuesPayment.stripePaymentIntentId, paymentIntent.id),
    });

    if (existingStripePayment) {
      return {
        duesPayment: existingStripePayment,
        inserted: false,
      };
    }

    const paymentDate = new Date(paymentIntent.created * 1000);
    const [insertedPayment] = await tx
      .insert(DuesPayment)
      .values({
        amount: paymentIntent.amount,
        memberId: metadata.memberId,
        paymentDate,
        stripePaymentIntentId: paymentIntent.id,
        year: metadata.academicYearStart,
      })
      .onConflictDoNothing()
      .returning();

    if (insertedPayment) {
      await tx
        .insert(DuesEntitlement)
        .values({
          active: true,
          createdAt: paymentDate,
          memberId: metadata.memberId,
          sourcePaymentId: insertedPayment.id,
          updatedAt: paymentDate,
          year: metadata.academicYearStart,
        })
        .onConflictDoUpdate({
          set: {
            active: true,
            sourcePaymentId: insertedPayment.id,
            updatedAt: new Date(),
          },
          setWhere: eq(DuesEntitlement.active, false),
          target: [DuesEntitlement.memberId, DuesEntitlement.year],
        });
      return {
        duesPayment: insertedPayment,
        inserted: true,
      };
    }

    // The webhook and client confirmation can race on the same PaymentIntent.
    // The winner records both the immutable payment and its entitlement; the
    // loser returns that payment without reactivating a later admin revocation.
    const concurrentStripePayment = await tx.query.DuesPayment.findFirst({
      where: eq(DuesPayment.stripePaymentIntentId, paymentIntent.id),
    });

    if (concurrentStripePayment) {
      return {
        duesPayment: concurrentStripePayment,
        inserted: false,
      };
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Dues payment could not be recorded.",
    });
  });
}
