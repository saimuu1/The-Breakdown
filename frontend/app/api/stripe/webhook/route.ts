import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** Stripe webhook — the ONLY thing that changes a user's plan. Stripe calls
   this on subscription lifecycle events; we verify the signature, then flip
   profiles.plan with the service role (no user session here, so RLS is bypassed
   intentionally). Configure the endpoint + signing secret in the Stripe
   dashboard (Developers → Webhooks) and set STRIPE_WEBHOOK_SECRET. */
export async function POST(request: Request) {
  const sig = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: "Missing signature/secret" }, { status: 400 });
  }

  const body = await request.text(); // raw body required for signature check
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    return NextResponse.json({ error: `Invalid signature: ${String(err)}` }, { status: 400 });
  }

  const admin = createAdminClient();

  const setPlanByCustomer = async (customerId: string, plan: "free" | "pro") => {
    await admin.from("profiles").update({ plan } as never).eq("stripe_customer_id", customerId);
  };

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const userId = s.client_reference_id;
      const customerId = typeof s.customer === "string" ? s.customer : s.customer?.id;
      if (userId) {
        await admin
          .from("profiles")
          .update({ plan: "pro", stripe_customer_id: customerId ?? null } as never)
          .eq("id", userId);
      } else if (customerId) {
        await setPlanByCustomer(customerId, "pro");
      }
      break;
    }
    // Active/renewed subscription → Pro; ended/unpaid → back to Free.
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const active = sub.status === "active" || sub.status === "trialing";
      await setPlanByCustomer(customerId, active ? "pro" : "free");
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      await setPlanByCustomer(customerId, "free");
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
