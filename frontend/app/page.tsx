import Link from "next/link";

const SUPPORT_EMAIL = "smural61@asu.edu";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#070810] text-neutral-100 antialiased">
      <TopBar />
      <Hero />
      <Sports />
      <HowItWorks />
      <SampleBreakdown />
      <FinalCta />
      <Footer />
    </main>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#070810]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          <Logo id="logo-top" />
          <span className="text-sm font-bold uppercase tracking-widest">The Breakdown</span>
        </div>
        <Link
          href="/login?next=/dashboard"
          className="rounded-lg bg-gradient-to-r from-emerald-400 to-emerald-500 px-4 py-1.5 font-medium text-neutral-950 shadow-lg shadow-emerald-500/20 transition hover:from-emerald-300 hover:to-emerald-400"
        >
          Log in
        </Link>
      </div>
    </header>
  );
}

/* ---------- Hero (band: deep base + ambient glows) ---------- */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* ambient glows */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-40 -top-48 h-[560px] w-[560px] rounded-full bg-emerald-500/15 blur-[130px]" />
        <div className="absolute -right-40 top-0 h-[480px] w-[480px] rounded-full bg-sky-500/15 blur-[130px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,0.06),transparent_55%)]" />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 lg:grid-cols-2 lg:py-32">
        <div className="flex flex-col items-start gap-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-widest text-neutral-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Soccer · UFC · NBA
          </span>
          <h1 className="text-balance text-6xl font-bold leading-[1.02] tracking-tight sm:text-7xl">
            The stats,
            <br />
            <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-sky-400 bg-clip-text text-transparent">
              broken down
            </span>{" "}
            for you.
          </h1>
          <p className="max-w-md text-lg leading-relaxed text-neutral-400">
            The Breakdown reads the numbers so you don&apos;t have to. Our model calls
            every match, then breaks it down like a friend who actually knows the sport —
            who&apos;s winning, who&apos;s got the edge, and why it&apos;s going that way.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/login?next=/dashboard"
              className="rounded-lg bg-gradient-to-r from-emerald-400 to-emerald-500 px-5 py-2.5 font-medium text-neutral-950 shadow-lg shadow-emerald-500/25 transition hover:from-emerald-300 hover:to-emerald-400"
            >
              Create a free account
            </Link>
            <Link
              href="/login?next=/dashboard"
              className="rounded-lg border border-white/15 px-5 py-2.5 font-medium text-neutral-200 transition hover:border-white/30 hover:bg-white/5"
            >
              Log in
            </Link>
          </div>
          <p className="text-sm text-neutral-500">
            One free account unlocks every sport and every pick. No tiers, no paywall.
          </p>
        </div>

        <div className="lg:pl-6">
          <MockCard />
        </div>
      </div>
    </section>
  );
}

/** A representative prediction card — mirrors the real one users see after logging in. */
function MockCard() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-emerald-500/20 via-transparent to-sky-500/20 blur-3xl" />
      <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 shadow-2xl shadow-black/50 backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between text-xs text-neutral-500">
          <span className="rounded-md bg-white/10 px-2 py-0.5 font-medium uppercase tracking-wide text-neutral-300">
            UFC
          </span>
          <span>UFC Freedom 250 · Main Event</span>
        </div>

        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex flex-1 items-center justify-end gap-2 text-right">
            <span className="font-semibold">Ilia Topuria</span>
            <Crest initials="IT" tone="emerald" />
          </div>
          <span className="text-xs font-medium text-neutral-600">vs</span>
          <div className="flex flex-1 items-center gap-2">
            <Crest initials="JG" tone="sky" />
            <span className="font-semibold">Justin Gaethje</span>
          </div>
        </div>

        <MockBar home={36} />

        <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-neutral-400">
          <span className="font-semibold text-emerald-400">The Breakdown: </span>
          Gaethje&apos;s relentless pressure and leg-kick volume look to drag this into the
          championship rounds, where his output climbs — and the model leans his way late if
          he can weather Topuria&apos;s early power…
        </p>
      </div>
    </div>
  );
}

function Crest({ initials, tone }: { initials: string; tone: "emerald" | "sky" }) {
  const cls =
    tone === "emerald" ? "bg-emerald-500/20 text-emerald-300" : "bg-sky-500/20 text-sky-300";
  return (
    <span
      className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${cls}`}
    >
      {initials}
    </span>
  );
}

function MockBar({ home }: { home: number }) {
  const away = 100 - home;
  const homeFav = home >= away;
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-white/10">
        <div className="bg-gradient-to-r from-emerald-400 to-emerald-500" style={{ width: `${home}%` }} />
        <div className="bg-gradient-to-r from-sky-500 to-sky-400" style={{ width: `${away}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-xs font-medium">
        <span className={homeFav ? "text-emerald-300" : "text-emerald-400/60"}>{home}%</span>
        <span className={!homeFav ? "text-sky-300" : "text-sky-400/60"}>{away}%</span>
      </div>
    </div>
  );
}

/* ---------- Eyebrow helper ---------- */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-3">
      <span className="h-px w-8 bg-gradient-to-r from-transparent to-emerald-400/60" />
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400/90">
        {children}
      </span>
      <span className="h-px w-8 bg-gradient-to-l from-transparent to-emerald-400/60" />
    </div>
  );
}

/* ---------- Sports (raised band) ---------- */

const SPORTS = [
  {
    name: "Soccer",
    blurb: "World Cup & internationals — form, goals, and momentum modeled per side.",
    icon: "⚽",
  },
  {
    name: "UFC",
    blurb: "Every card, fight by fight. Tale-of-the-tape edges and finishing trends.",
    icon: "🥊",
  },
  {
    name: "NBA",
    blurb: "The whole season, searchable. Point-in-time form with no hindsight leakage.",
    icon: "🏀",
  },
];

function Sports() {
  return (
    <section className="border-y border-white/[0.07] bg-[#0d0f17]">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <Eyebrow>Three sports, one model pipeline</Eyebrow>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {SPORTS.map((s) => (
            <div
              key={s.name}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition duration-300 hover:-translate-y-1 hover:border-emerald-400/30 hover:bg-white/[0.06]"
            >
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-500/0 blur-2xl transition group-hover:bg-emerald-500/10" />
              <div className="text-3xl">{s.icon}</div>
              <h3 className="mt-3 text-lg font-semibold">{s.name}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">{s.blurb}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- How it works (base band) ---------- */

const STEPS = [
  {
    n: "01",
    title: "We crunch the numbers",
    body: "Recent form, head-to-head history, how the key players are doing — the same stuff you'd check, just a whole lot more of it.",
  },
  {
    n: "02",
    title: "You get a win chance",
    body: "Out comes a clear shot for each side, shown as a simple bar so you can see who we like at a glance.",
  },
  {
    n: "03",
    title: "And the why behind it",
    body: "Then we lay it out in plain English — who's got the edge, which players matter, and why the pick is the pick.",
  },
];

function HowItWorks() {
  return (
    <section className="bg-[#070810]">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="text-center text-3xl font-bold tracking-tight">How it works</h2>
        <p className="mt-3 text-center text-neutral-400">
          From a wall of stats to a pick that actually makes sense.
        </p>
        <div className="mt-12 grid gap-10 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="relative">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400/20 to-sky-500/20 text-sm font-bold text-emerald-300">
                {s.n}
              </div>
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-400">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Sample breakdown (raised band) ---------- */

const SECTIONS = [
  {
    label: "Stage",
    body: "A five-round lightweight title fight headlining in Abu Dhabi — Gaethje defending against a featherweight champ moving up to chase a second belt.",
  },
  {
    label: "The Edge",
    body: "Gaethje's volume and championship-round cardio are the model's biggest lean — his output tends to climb late, exactly where a move-up fighter is most likely to fade.",
  },
  {
    label: "The Pick",
    body: "Gaethje by decision or late TKO. The model gives him 64% — the value is in the deep waters of rounds four and five.",
  },
];

function SampleBreakdown() {
  return (
    <section className="border-y border-white/[0.07] bg-[#0d0f17]">
      <div className="mx-auto max-w-3xl px-6 py-24">
        <h2 className="text-3xl font-bold tracking-tight">Not just a number — a read</h2>
        <p className="mt-3 text-neutral-400">
          Every pick ships with a structured breakdown. Here&apos;s the shape of it:
        </p>
        <div className="mt-8 space-y-4">
          {SECTIONS.map((s) => (
            <div
              key={s.label}
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 pl-6"
            >
              <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-emerald-400 to-sky-500" />
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">
                {s.label}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-neutral-300">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Final CTA (premium gradient panel) ---------- */

function FinalCta() {
  return (
    <section className="bg-[#070810]">
      <div className="mx-auto max-w-6xl px-6 py-28">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/10 via-[#0d0f17] to-sky-500/10 px-6 py-20 text-center">
          <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/20 blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-sky-500/20 blur-[100px]" />
          <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-7">
            <h2 className="text-balance text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Stop guessing.{" "}
              <span className="bg-gradient-to-r from-emerald-300 to-sky-400 bg-clip-text text-transparent">
                Start reading the numbers.
              </span>
            </h2>
            <p className="max-w-lg text-lg text-neutral-300">
              Create a free account and unlock every Soccer, UFC, and NBA pick — past and
              upcoming — with the full breakdown behind each one.
            </p>
            <Link
              href="/login?next=/dashboard"
              className="rounded-lg bg-gradient-to-r from-emerald-400 to-emerald-500 px-7 py-3.5 font-medium text-neutral-950 shadow-xl shadow-emerald-500/30 transition hover:from-emerald-300 hover:to-emerald-400"
            >
              Create a free account
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */

function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#070810]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-neutral-500 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <Logo id="logo-foot" size={16} />
          <span className="font-bold uppercase tracking-widest text-neutral-400">
            The Breakdown
          </span>
        </div>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 transition hover:border-white/20 hover:text-neutral-200"
          aria-label="Email support"
        >
          <MailIcon />
          Support
        </a>
      </div>
    </footer>
  );
}

/** Logomark: three ascending bars — a clean nod to stats being broken down. */
function Logo({ id, size = 22 }: { id: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="24" x2="24" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34d399" />
          <stop offset="1" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      <rect x="2.5" y="13" width="5" height="8.5" rx="2" fill={`url(#${id})`} />
      <rect x="9.5" y="7" width="5" height="14.5" rx="2" fill={`url(#${id})`} />
      <rect x="16.5" y="2.5" width="5" height="19" rx="2" fill={`url(#${id})`} />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
