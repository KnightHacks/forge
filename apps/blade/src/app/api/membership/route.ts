import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { TRPCError } from "@trpc/server";

import { recordSucceededDuesPayment } from "@forge/api/utils";
import { db } from "@forge/db/client";
import { logger } from "@forge/utils";
import { stripe } from "@forge/utils/stripe";

import { env } from "~/env";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature") ?? "";
  const body = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_SECRET_WEBHOOK_KEY,
    );
  } catch {
    return new Response("Webhook Error", { status: 400 });
  }

  if (event.type !== "payment_intent.succeeded") {
    return new Response(`Unhandled event type ${event.type}`, { status: 202 });
  }

  try {
    await recordSucceededDuesPayment({
      database: db,
      paymentIntent: event.data.object,
    });
  } catch (error) {
    logger.error("Failed to record dues payment from Stripe webhook:", error);

    if (error instanceof TRPCError && error.code === "BAD_REQUEST") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Dues payment could not be recorded." },
      { status: 500 },
    );
  }

  return new Response("Payment complete", { status: 200 });
}
