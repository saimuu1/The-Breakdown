import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { DeleteAccountButton } from "@/components/DeleteAccountButton";
import { FollowingList } from "@/components/FollowingList";
import { BILLING_ENABLED } from "@/lib/flags";
import { getFollowedCompetitors, getMyPlan } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

function formatJoined(iso: string | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  });
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/settings");

  const [plan, following] = await Promise.all([getMyPlan(), getFollowedCompetitors()]);

  return (
    <AppShell>
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1
          className="text-4xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
        >
          Settings
        </h1>
        <p className="mt-2 text-[#5a607a]">Manage your account and what you follow.</p>

        {/* Account */}
        <Section title="Account">
          <Row label="Email">
            <span className="text-[#e4e7f0]">{user.email}</span>
          </Row>
          {BILLING_ENABLED && (
            <Row label="Plan">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                  plan === "pro"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-[#1e2236] text-[#8b92a8]"
                }`}
              >
                {plan}
              </span>
            </Row>
          )}
          <Row label="Member since">
            <span className="text-[#b0b8d0]">{formatJoined(user.created_at)}</span>
          </Row>
        </Section>

        {/* Following */}
        <Section title="Following">
          {following.length > 0 ? (
            <FollowingList following={following} />
          ) : (
            <p className="text-sm text-[#5a607a]">
              You&apos;re not following anyone yet. Tap the ★ next to a team or fighter on the{" "}
              <Link href="/dashboard" className="text-emerald-400 hover:underline">
                board
              </Link>{" "}
              to build your feed.
            </p>
          )}
        </Section>

        {/* Session */}
        <Section title="Session">
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-lg border border-[#272b3f] px-4 py-2 text-sm font-medium text-[#b0b8d0] transition-colors duration-150 hover:border-[#3a3e55] hover:text-[#e4e7f0]"
            >
              Sign out
            </button>
          </form>
        </Section>

        {/* Danger zone */}
        <section className="mt-10 rounded-2xl border border-red-500/20 bg-red-500/[0.03] p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-red-400/80">Danger zone</h2>
          <div className="mt-4">
            <DeleteAccountButton />
          </div>
        </section>
      </main>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-[#5a607a]">{title}</h2>
      <div className="space-y-3 rounded-2xl border border-[#1e2236] bg-[#0c0f1a] p-6">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-[#5a607a]">{label}</span>
      {children}
    </div>
  );
}
