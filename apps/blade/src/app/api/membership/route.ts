/* eslint-disable no-console */
import type { NextRequest } from "next/server";
import Stripe from "stripe";

import { db } from "@forge/db/client";
import { DuesPayment, DuesPaymentSchema } from "@forge/db/schemas/knight-hacks";

import { env } from "~/env";

async function membershipRecord(sessionId: string) {
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, { typescript: true });

  // TODO: Make this function safe to run multiple times,
  // even concurrently, with the same session ID

  // TODO: Make sure fulfillment hasn't already been
  // peformed for this Checkout Session

  // Retrieve the Checkout Session from the API
  try {
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);

    const values = {
      memberId: checkoutSession.metadata?.member_id,
      amount: checkoutSession.amount_subtotal,
      paymentDate: new Date(checkoutSession.created * 1000), // Unix timestamp to JS timestamp
      year: new Date().getFullYear(),
    };

    const validatedCheckoutFields = DuesPaymentSchema.omit({
      id: true,
    }).safeParse(values);

    if (!validatedCheckoutFields.success) {
      console.log(validatedCheckoutFields.error.issues);
      throw new Error("Invalid or missing field(s)");
    }
    // Check the Checkout Session's payment_status property
    // to determine if fulfillment should be peformed
    if (checkoutSession.payment_status !== "unpaid") {
      await db.insert(DuesPayment).values({ ...validatedCheckoutFields.data });
      return true;
    }
    throw new Error("Checkout session payment status is unpaid");
  } catch (e) {
    console.error("Error:", e);
    return false;
  }
}

export async function POST(request: NextRequest) {
  const sig = request.headers.get("stripe-signature") ?? "";
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, { typescript: true });
  const webhookSecret = env.STRIPE_SECRET_WEBHOOK_KEY;
  const body = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return new Response("Webhook Error", {
      status: 400,
    });
  }

  let success = false;

  switch (event.type) {
    case "checkout.session.async_payment_failed":
      return new Response("Payment failed", {
        status: 401,
      });
    case "checkout.session.async_payment_succeeded":
      success = await membershipRecord(event.data.object.id);
      break;
    case "checkout.session.completed":
      success = await membershipRecord(event.data.object.id);
      break;
    case "checkout.session.expired":
      return new Response("Checkout session expired", {
        status: 408,
      });
    default:
      return new Response(`Unhandled event type ${event.type}`, {
        status: 202,
      });
  }
  if (success)
    return new Response("Payment complete", {
      status: 200,
    });
  else
    return new Response("Server error", {
      status: 500,
    });
}
