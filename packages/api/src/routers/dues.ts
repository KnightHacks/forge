import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";

import { CLUB } from "@forge/consts";
import { desc, eq } from "@forge/db";
import { db } from "@forge/db/client";
import {
  DuesEntitlement,
  DuesPayment,
  Member,
} from "@forge/db/schemas/knight-hacks";
import { stripe } from "@forge/utils/stripe";
import {
  buildDuesAcademicYear,
  duesPaymentIntentInputSchema,
  formatDuesAmount,
} from "@forge/validators";

import { protectedProcedure } from "../trpc";
import { getDuesPaymentsEnabled } from "../utils/dues/configuration";
import {
  assertDuesPaymentIntentOwnership,
  recordSucceededDuesPayment,
} from "../utils/dues/payment";
import { buildDuesStatus } from "../utils/dues/status";

async function getMemberForSession(userId: string) {
  const member = await db.query.Member.findFirst({
    where: eq(Member.userId, userId),
    columns: {
      email: true,
      id: true,
      userId: true,
    },
  });

  if (!member) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Create a member profile before paying dues.",
    });
  }

  return member;
}

async function getDuesStateForMember(memberId: string) {
  const [entitlements, payments] = await Promise.all([
    db
      .select()
      .from(DuesEntitlement)
      .where(eq(DuesEntitlement.memberId, memberId)),
    db
      .select({
        amount: DuesPayment.amount,
        id: DuesPayment.id,
        paymentDate: DuesPayment.paymentDate,
        stripePaymentIntentId: DuesPayment.stripePaymentIntentId,
        year: DuesPayment.year,
      })
      .from(DuesPayment)
      .where(eq(DuesPayment.memberId, memberId))
      .orderBy(desc(DuesPayment.paymentDate)),
  ]);

  return { entitlements, payments };
}

async function getStatusForMember(memberId: string) {
  const [duesState, paymentsEnabled] = await Promise.all([
    getDuesStateForMember(memberId),
    getDuesPaymentsEnabled(),
  ]);
  const status = buildDuesStatus(duesState);

  return {
    ...status,
    paymentsLocked: !paymentsEnabled,
  };
}

export const duesRouter = {
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const member = await getMemberForSession(ctx.session.user.id);

    return await getStatusForMember(member.id);
  }),

  createPaymentIntent: protectedProcedure.mutation(async ({ ctx }) => {
    const member = await getMemberForSession(ctx.session.user.id);
    const status = await getStatusForMember(member.id);

    if (status.paid) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Membership dues have already been paid.",
      });
    }

    if (status.paymentsLocked) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Dues payments are paused until further notice.",
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: CLUB.MEMBERSHIP_PRICE,
      currency: "usd",
      metadata: {
        academic_year_start: String(status.currentAcademicYear.startYear),
        member_id: member.id,
        user_id: member.userId,
      },
      payment_method_types: ["card"],
      receipt_email: member.email,
    });

    if (!paymentIntent.client_secret) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Could not initialize dues payment.",
      });
    }

    return {
      amount: CLUB.MEMBERSHIP_PRICE,
      amountLabel: formatDuesAmount(CLUB.MEMBERSHIP_PRICE),
      clientSecret: paymentIntent.client_secret,
      paymentAcademicYear: status.currentAcademicYear,
      paymentIntentId: paymentIntent.id,
    };
  }),

  confirmPayment: protectedProcedure
    .input(duesPaymentIntentInputSchema)
    .mutation(async ({ ctx, input }) => {
      const member = await getMemberForSession(ctx.session.user.id);
      const paymentIntent = await stripe.paymentIntents.retrieve(
        input.paymentIntentId,
      );

      assertDuesPaymentIntentOwnership({
        expectedMemberId: member.id,
        expectedUserId: ctx.session.user.id,
        paymentIntent,
      });

      if (paymentIntent.status === "processing") {
        return {
          amount: paymentIntent.amount,
          paymentIntentId: paymentIntent.id,
          state: "processing",
        } as const;
      }

      const incompleteStatuses = [
        "canceled",
        "requires_action",
        "requires_capture",
        "requires_confirmation",
        "requires_payment_method",
      ];

      if (incompleteStatuses.includes(paymentIntent.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Payment has not been completed.",
        });
      }

      const recorded = await recordSucceededDuesPayment({
        database: db,
        expectedMemberId: member.id,
        expectedUserId: ctx.session.user.id,
        paymentIntent,
      });

      return {
        amount: recorded.duesPayment.amount,
        duesPaymentId: recorded.duesPayment.id,
        inserted: recorded.inserted,
        paymentAcademicYear: buildDuesAcademicYear(recorded.duesPayment.year),
        paymentIntentId: paymentIntent.id,
        state: "paid",
      } as const;
    }),
} satisfies TRPCRouterRecord;
