import type { TRPCRouterRecord } from "@trpc/server";

import { env } from "../../env";
import { protectedProcedure } from "../trpc";

export const paymentRouter = {
  createCheckout: protectedProcedure.mutation(async ({ ctx }) => {
    const baseUrl =
      env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : `https://${env.AUTH_SECRET}`;

    const session = await ctx.stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Club Membership",
            },
            unit_amount: 1000, // Price in cents
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
