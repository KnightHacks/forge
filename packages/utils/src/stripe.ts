import "server-only";

import Stripe from "stripe";

import { stripeEnv } from "./stripe-env";

export const stripe = new Stripe(stripeEnv.STRIPE_SECRET_KEY, {
  typescript: true,
});
