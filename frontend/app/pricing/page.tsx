import Link from "next/link";

import { ManageBillingButton } from "@/components/ManageBillingButton";
import { Nav } from "@/components/Nav";
import { SiteFooter } from "@/components/SiteFooter";
import { UpgradeButton } from "@/components/UpgradeButton";
import { BILLING_ENABLED } from "@/lib/flags";
import { getMyPlan } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pricing" };

const FREE = ["World Cup predictions", "The Breakdown analysis", "Follow teams & build your feed"];
const PRO = [
  "Everything in Free",
  "UFC fight predictions",
  "NBA game & playoff predictions",
  "Full history & search",
  "Every Breakdown, every sport",
];

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const plan = user ? await getMyPlan() : "free";
  const isPro = plan === "pro";

  // Paywall is off for now — every sport is free. Show a welcoming notice instead
  // of a checkout that can't take real money yet.
  if (!BILLING_ENABLED) {
    return (
      <div className="min-h-screen bg-[#07090e] text-[#e4e7f0]">
        <Nav />
        <main className="mx-auto max-w-2xl px-6 py-24 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-3 py-1 text-xs font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Everything&apos;s free
          </span>
          <h1
            className="mt-5 text-4xl font-bold tracking-tight text-[#e4e7f0]"
            style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
          >
            Every sport, on the house
          </h1>
          <p className="mx-auto mt-4 max-w-md text-lg text-[#5a607a]">
            Soccer, UFC, and NBA predictions — plus the full Breakdown analysis — are
            all free while we&apos;re getting started. No plan to pick.
          </p>
          <div className="mt-8">
            <Link
              href={user ? "/dashboard" : "/login?next=/dashboard"}
              className="inline-block rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-neutral-950 transition-colors duration-150 hover:bg-emerald-400"
            >
              {user ? "Go to the board" : "Create a free account"}
            </Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-[#e4e7f0]">
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <header className="text-center">
          <h1
            className="text-4xl font-bold tracking-tight text-[#e4e7f0]"
            style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
          >
            Simple pricing
          </h1>
          <p className="mt-3 text-[#5a607a]">
            Start free. Go Pro for every sport, called before the first whistle.
          </p>
        </header>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {/* Free */}
          <div className="rounded-2xl border border-[#1e2236] bg-[#0c0f1a] p-6">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#5a607a]">Free</p>
            <p className="mt-3 text-3xl font-bold text-[#e4e7f0]">
              $0<span className="text-base font-normal text-[#5a607a]">/mo</span>
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-[#b0b8d0]">
              {FREE.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              {user ? (
                <span className="text-sm text-[#5a607a]">
                  {isPro ? "Included in your plan" : "Your current plan"}
                </span>
              ) : (
                <Link
                  href="/login?next=/pricing"
                  className="inline-block rounded-xl border border-[#272b3f] px-5 py-2.5 font-medium text-[#b0b8d0] transition-colors duration-150 hover:border-[#3a3e55] hover:text-[#e4e7f0]"
                >
                  Create a free account
                </Link>
              )}
            </div>
          </div>

          {/* Pro */}
          <div className="relative rounded-2xl border border-emerald-500/30 bg-[#0c0f1a] p-6">
            <span className="absolute -top-3 left-6 rounded-full bg-emerald-500 px-3 py-0.5 text-xs font-bold text-neutral-950">
              Pro
            </span>
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">Pro</p>
            <p className="mt-3 text-3xl font-bold text-[#e4e7f0]">
              $9<span className="text-base font-normal text-[#5a607a]">/mo</span>
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-[#b0b8d0]">
              {PRO.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              {!user ? (
                <Link
                  href="/login?next=/pricing"
                  className="inline-block rounded-xl bg-emerald-500 px-5 py-2.5 font-semibold text-neutral-950 transition-colors duration-150 hover:bg-emerald-400"
                >
                  Get started
                </Link>
              ) : isPro ? (
                <ManageBillingButton />
              ) : (
                <UpgradeButton>Go Pro</UpgradeButton>
              )}
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-[#3a3e55]">
          Cancel anytime. Predictions are for entertainment, not betting advice.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}

function Check() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#34d399"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 shrink-0"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
