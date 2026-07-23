import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { FeedCard } from "@/components/FeedCard";
import { FollowingList } from "@/components/FollowingList";
import { Nav } from "@/components/Nav";
import { SiteFooter } from "@/components/SiteFooter";
import { getFeed } from "@/lib/feed";
import { getFollowedCompetitors } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const IMPORTANCE_GROUP = [
  { min: 90, label: "Must-see", color: "text-red-400" },
  { min: 75, label: "Important", color: "text-amber-400" },
  { min: 60, label: "Notable", color: "text-emerald-400" },
  { min: 0,  label: "Updates", color: "text-[#5a607a]" },
];

export default async function FavoritesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen bg-[#07090e] text-[#e4e7f0]">
        <Nav />
        <main className="mx-auto max-w-3xl px-6 py-24 text-center">
          <p className="text-lg font-medium text-[#b0b8d0]">Log in to build your feed.</p>
          <p className="mt-2 text-sm text-[#5a607a]">
            Follow teams and fighters to track what matters most.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded-lg bg-emerald-500 px-5 py-2.5 font-semibold text-neutral-950 transition-colors duration-150 hover:bg-emerald-400"
          >
            Log in
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const [items, following] = await Promise.all([getFeed(), getFollowedCompetitors()]);

  return (
    <AppShell>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <header className="mb-8">
          <h1
            className="text-4xl font-bold tracking-tight text-[#e4e7f0]"
            style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
          >
            Your feed
          </h1>
          <p className="mt-2 text-[#5a607a]">
            {following.length > 0
              ? "The most important developments for the teams and fighters you follow."
              : "Follow teams and fighters to see what matters."}
          </p>
        </header>

        <FollowingList following={following} />

        {items.length === 0 ? (
          <EmptyFeed hasFollows={following.length > 0} />
        ) : (
          <FeedGroups items={items} />
        )}
      </main>
    </AppShell>
  );
}

function FeedGroups({ items }: { items: Awaited<ReturnType<typeof getFeed>> }) {
  const groups: { label: string; color: string; items: typeof items }[] = [];
  const used = new Set<string>();

  for (const { min, label, color } of IMPORTANCE_GROUP) {
    const bucket = items.filter((i) => i.importance >= min && !used.has(i.id));
    if (bucket.length > 0) {
      bucket.forEach((i) => used.add(i.id));
      groups.push({ label, color, items: bucket });
    }
  }

  return (
    <div className="space-y-10">
      {groups.map((g) => (
        <section key={g.label}>
          <h2 className={`mb-4 text-xs font-bold uppercase tracking-widest ${g.color}`}>
            {g.label}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {g.items.map((item) => (
              <FeedCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function EmptyFeed({ hasFollows }: { hasFollows: boolean }) {
  if (hasFollows) {
    return (
      <div className="rounded-2xl border border-dashed border-[#1e2236] p-12 text-center">
        <p className="text-lg font-medium text-[#b0b8d0]">Nothing new right now.</p>
        <p className="mt-2 max-w-sm mx-auto text-sm text-[#5a607a]">
          We&apos;re tracking everyone you follow. Their next match, latest result,
          and streaks will show up here as they happen.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-dashed border-[#1e2236] p-12 text-center">
      <p className="text-lg font-medium text-[#b0b8d0]">Follow a fighter or team to start.</p>
      <p className="mt-2 max-w-sm mx-auto text-sm text-[#5a607a]">
        Tap the{" "}
        <span className="font-semibold text-emerald-400">★</span>{" "}
        next to any fighter or team — on a prediction card or its match page — to follow
        them. Their upcoming matches, results, and streaks appear here, ranked by what
        matters most.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/dashboard"
          className="rounded-lg border border-[#1e2236] px-4 py-2 text-sm font-medium text-[#b0b8d0] transition-colors duration-150 hover:border-[#2e3248] hover:text-[#e4e7f0]"
        >
          Browse upcoming →
        </Link>
        <Link
          href="/past"
          className="rounded-lg border border-[#1e2236] px-4 py-2 text-sm font-medium text-[#b0b8d0] transition-colors duration-150 hover:border-[#2e3248] hover:text-[#e4e7f0]"
        >
          Browse past →
        </Link>
      </div>
    </div>
  );
}
