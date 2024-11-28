import type { TRPCRouterRecord } from "@trpc/server";

import { KNIGHTHACKS_MEMBERSHIP_PRICE } from "@blade/consts/knight-hacks";

import { env } from "../../env";
import { protectedProcedure } from "../trpc";

export const paymentRouter = {
  createCheckout: protectedProcedure.mutation(async ({ ctx }) => {
    const baseUrl =
      env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : "https://app.knighthacks.org";

    const price = KNIGHTHACKS_MEMBERSHIP_PRICE as number;

    const session = await ctx.stripe.checkout.sessions.create({
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
      success_url: `${baseUrl}/success`,
      cancel_url: `${baseUrl}/cancel`,
    });

    return { checkoutUrl: session.url };
  }),
} satisfies TRPCRouterRecord;
