import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import Stripe from "stripe";
import { z } from "zod";

import { KNIGHTHACKS_MEMBERSHIP_PRICE } from "@forge/consts";
import { eq } from "@forge/db";
import { db } from "@forge/db/client";
import { DuesPayment, Member } from "@forge/db/schemas/knight-hacks";

import { env } from "../env";
import { protectedProcedure } from "../trpc";
import { log, stripe } from "../utils";

export const duesPaymentRouter = {
  createCheckout: protectedProcedure.mutation(async ({ ctx }) => {
    const baseUrl =
      env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : "https://blade.knighthacks.org";

    const price = KNIGHTHACKS_MEMBERSHIP_PRICE as number;

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
      const stripe = new Stripe(env.STRIPE_SECRET_KEY, { typescript: true });
      const session = await stripe.checkout.sessions.retrieve(input);

      await log({
        message: `A member has successfully paid their dues. ${session.amount_total}`,
        title: "Dues Paid",
        color: "success_green",
        userId: ctx.session.user.discordUserId,
      });

      return {
        id: session.id,
        total: session.amount_total,
        email: session.customer_details?.email,
        status: session.payment_status,
      };
    }),
} satisfies TRPCRouterRecord;
