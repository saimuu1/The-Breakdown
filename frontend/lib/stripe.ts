import Stripe from "stripe";

/**
 * Server-only Stripe client. Reads the secret key from STRIPE_SECRET_KEY.
 *
 * Test mode vs live is decided entirely by which key you set — a `sk_test_...`
 * key never moves real money and only accepts test cards, so the whole billing
 * flow can be built and demoed with zero income. Swap to `sk_live_...` later to
 * go live; no code changes.
 */
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  _stripe = new Stripe(key);
  return _stripe;
}

/** The Pro plan's recurring Price id (price_...), created in the Stripe dashboard. */
export function proPriceId(): string {
  const id = process.env.STRIPE_PRICE_ID;
  if (!id) throw new Error("STRIPE_PRICE_ID is not set");
  return id;
}

/** Absolute base URL for Stripe success/cancel redirects. Falls back to the
   request origin when NEXT_PUBLIC_APP_URL isn't set (e.g. local dev). */
export function appUrl(origin: string): string {
  return process.env.NEXT_PUBLIC_APP_URL || origin;
}
