import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <section className="mx-auto flex max-w-3xl flex-col items-center gap-8 px-6 py-32 text-center">
        <span className="rounded-full border border-neutral-700 px-3 py-1 text-xs uppercase tracking-widest text-neutral-400">
          The Breakdown
        </span>
        <h1 className="text-balance text-5xl font-bold tracking-tight sm:text-6xl">
          The stats, broken down for you.
        </h1>
        <p className="max-w-xl text-lg text-neutral-400">
          The Breakdown reads the numbers so you don&apos;t have to. Model-driven win
          probabilities for soccer, UFC, and NBA — each one shipped with a sharp,
          plain-English analysis. Built for the fans who just want the read, and the
          bettors who want an edge.
        </p>
        <div className="flex gap-4">
          <Link
            href="/login?next=/dashboard"
            className="rounded-lg bg-emerald-500 px-5 py-2.5 font-medium text-neutral-950 transition hover:bg-emerald-400"
          >
            Create an account
          </Link>
          <Link
            href="/login?next=/dashboard"
            className="rounded-lg border border-neutral-700 px-5 py-2.5 font-medium text-neutral-200 transition hover:border-neutral-500"
          >
            Log in
          </Link>
        </div>
        <p className="text-xs text-neutral-600">
          Free account for soccer picks. UFC &amp; NBA unlock with Pro. See the{" "}
          <Link href="/accuracy" className="underline hover:text-neutral-400">
            track record
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
