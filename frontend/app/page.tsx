import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <section className="mx-auto flex max-w-3xl flex-col items-center gap-8 px-6 py-32 text-center">
        <span className="rounded-full border border-neutral-700 px-3 py-1 text-xs uppercase tracking-widest text-neutral-400">
          The Breakdown
        </span>
        <h1 className="text-balance text-5xl font-bold tracking-tight sm:text-6xl">
          Honest outcome predictions for the sports you watch.
        </h1>
        <p className="max-w-xl text-lg text-neutral-400">
          Model-driven win probabilities for soccer, UFC, and NBA — every pick
          shipped with a punchy AI breakdown and benchmarked honestly against the
          betting market.
        </p>
        <div className="flex gap-4">
          <Link
            href="/dashboard"
            className="rounded-lg bg-emerald-500 px-5 py-2.5 font-medium text-neutral-950 transition hover:bg-emerald-400"
          >
            View predictions
          </Link>
          <Link
            href="/accuracy"
            className="rounded-lg border border-neutral-700 px-5 py-2.5 font-medium text-neutral-200 transition hover:border-neutral-500"
          >
            See our track record
          </Link>
        </div>
        <p className="text-xs text-neutral-600">
          Soccer is free. UFC &amp; NBA picks unlock with Pro.
        </p>
      </section>
    </main>
  );
}
