import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { CLUB } from "@forge/consts";
import { eq } from "@forge/db";
import { db } from "@forge/db/client";
import { DuesPayment, Member } from "@forge/db/schemas/knight-hacks";
import { permissions } from "@forge/utils";
import * as discord from "@forge/utils/discord";
import { stripe } from "@forge/utils/stripe";

import { env } from "../env";
import { permProcedure, protectedProcedure } from "../trpc";

export const duesPaymentRouter = {
  createCheckout: protectedProcedure.mutation(async ({ ctx }) => {
    const baseUrl =
      env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : "https://blade.knighthacks.org";

    const price = CLUB.MEMBERSHIP_PRICE as number;

    const member = await db
      .select()
      .from(Member)
      .where(eq(Member.userId, ctx.session.user.id))
      .limit(1);

    if (member.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message:
          "User is not a member of Knight Hacks, please sign up and try again.",
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Club Membership",
            },
            unit_amount: price, // Price in cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/member/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/`,
      metadata: {
        member_id: member[0]?.id ?? "",
      },
    });

    return { checkoutUrl: session.url };
  }),

  createPaymentIntent: protectedProcedure.mutation(async ({ ctx }) => {
    const price = CLUB.MEMBERSHIP_PRICE as number;

    const member = await db
      .select()
      .from(Member)
      .where(eq(Member.userId, ctx.session.user.id))
      .limit(1);

    if (member.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message:
          "User is not a member of Knight Hacks, please sign up and try again.",
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: price,
      currency: "usd",
      payment_method_types: ["card", "us_bank_account"],
      metadata: {
        member_id: member[0]?.id ?? "",
      },
    });

    return { clientSecret: paymentIntent.client_secret };
  }),

  validatePaidDues: protectedProcedure.query(async ({ ctx }) => {
    const duesPaymentExists = await db
      .select()
      .from(DuesPayment)
      .innerJoin(Member, eq(DuesPayment.memberId, Member.id))
      .where(eq(Member.userId, ctx.session.user.id))
      .limit(1);

    return {
      username: ctx.session.user.name,
      duesPaid: duesPaymentExists.length > 0,
    };
  }),

  orderSuccess: protectedProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      const paymentIntent = await stripe.paymentIntents.retrieve(input);

      if (paymentIntent.status !== "succeeded") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Payment has not been completed.",
        });
      }

      const memberId = paymentIntent.metadata?.member_id ?? "";

      // Idempotency guard: skip insert if already fulfilled
      const existing = await db
        .select()
        .from(DuesPayment)
        .where(eq(DuesPayment.memberId, memberId))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(DuesPayment).values({
          memberId,
          amount: paymentIntent.amount,
          paymentDate: new Date(paymentIntent.created * 1000),
          year: new Date().getFullYear(),
        });
      }

      await log({
        message: `A member has successfully paid their dues. ${paymentIntent.amount}`,
        title: "Dues Paid",
        color: "success_green",
        userId: ctx.session.user.discordUserId,
      });

      return {
        id: paymentIntent.id,
        total: paymentIntent.amount,
        email: paymentIntent.receipt_email,
        status: paymentIntent.status,
      };
    }),

  getDuesPaymentDates: permProcedure.query(async ({ ctx }) => {
    permissions.controlPerms.or(["READ_MEMBERS", "READ_CLUB_DATA"], ctx);

    return await db
      .select({ paymentDate: DuesPayment.paymentDate })
      .from(DuesPayment);
  }),
} satisfies TRPCRouterRecord;
