import Stripe from "stripe";
import { getEnv } from "./env.js";

let stripeInstance: Stripe | null = null;

/**
 * Returns a cached Stripe SDK client initialized with the server secret key.
 */
export function getStripe(): Stripe {
  if (!stripeInstance) {
    const { STRIPE_SECRET_KEY } = getEnv();
    stripeInstance = new Stripe(STRIPE_SECRET_KEY);
  }
  return stripeInstance;
}
