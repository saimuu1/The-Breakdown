import { NextResponse } from "next/server";

import { appUrl, getStripe, proPriceId } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Start a Pro subscription: create (or reuse) the Stripe customer for the
   logged-in user and return a hosted Checkout URL to redirect to. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const stripe = getStripe();
  const origin = request.headers.get("origin") ?? new URL(request.url).origin;

  // Reuse the customer if we've already created one for this user.
  const { data } = await supabase
    .from("profiles")
    .select("stripe_customer_id, plan")
    .eq("id", user.id)
    .maybeSingle();
  const profile = data as { stripe_customer_id: string | null; plan: string } | null;

  if (profile?.plan === "pro") {
    return NextResponse.json({ error: "Already on Pro" }, { status: 400 });
  }

  let customerId = profile?.stripe_customer_id ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    // Persist with the service role — users can't write their own profile.
    await createAdminClient()
      .from("profiles")
      .update({ stripe_customer_id: customerId } as never)
      .eq("id", user.id);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: proPriceId(), quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${appUrl(origin)}/dashboard?upgraded=1`,
    cancel_url: `${appUrl(origin)}/pricing?canceled=1`,
  });

  return NextResponse.json({ url: session.url });
}
