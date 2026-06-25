import Link from "next/link";

import { TeamCrest } from "@/components/TeamCrest";
import { SUPPORT_URL } from "@/lib/legal";

const displayFont = { fontFamily: "var(--font-syne), system-ui, sans-serif" };

export default function Home() {
  return (
    <main className="min-h-screen bg-[#07090e] text-[#e4e7f0]">
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
    <header className="sticky top-0 z-20 border-b border-white/[0.05] bg-[#07090e]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          <Logo id="logo-top" />
          <span className="text-sm font-bold uppercase tracking-widest" style={displayFont}>
            The Breakdown
          </span>
        </div>
        <Link
          href="/login?next=/dashboard"
          className="rounded-lg bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-neutral-950 transition-colors duration-150 hover:bg-emerald-400"
        >
          Log in
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 lg:grid-cols-2 lg:py-32">
      <div className="flex flex-col items-start gap-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-widest text-[#8b92a8]">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Soccer · UFC · NBA
        </span>
        <h1 className="text-balance text-6xl font-bold leading-[1.02] tracking-tight sm:text-7xl" style={displayFont}>
          The stats,{" "}
          <span className="text-emerald-400">broken down</span>{" "}
          for you.
        </h1>
        <p className="max-w-md text-lg leading-relaxed text-[#6b7390]">
          The Breakdown reads the numbers so you don&apos;t have to. Our model calls
          every match, then breaks it down like a friend who actually knows the sport —
          who&apos;s winning, who&apos;s got the edge, and why it&apos;s going that way.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/login?next=/dashboard&mode=signup"
            className="rounded-lg bg-emerald-500 px-5 py-2.5 font-semibold text-neutral-950 transition-colors duration-150 hover:bg-emerald-400"
          >
            Create a free account
          </Link>
          <Link
            href="/login?next=/dashboard"
            className="rounded-lg border border-white/12 px-5 py-2.5 font-medium text-[#b0b8d0] transition-colors duration-150 hover:border-white/25 hover:text-[#e4e7f0]"
          >
            Log in
          </Link>
        </div>
        <p className="text-sm text-[#4a506a]">
          One free account. Every sport. Every pick. No paywall.
        </p>
      </div>

      <div className="lg:pl-6">
        <MockCard />
      </div>
    </section>
  );
}

// A real, completed prediction the model called correctly — shown on the landing
// as honest proof, not a hypothetical. England (50%) over Croatia at the World Cup.
function MockCard() {
  return (
    <div className="rounded-2xl border border-[#1e2236] bg-[#0c0f1a] p-5 shadow-2xl shadow-black/40">
      <div className="mb-4 flex items-center justify-between text-xs text-[#5a607a]">
        <span className="rounded bg-[#181b2a] px-2 py-0.5 font-medium uppercase tracking-wide text-[#8b92a8]">
          Soccer
        </span>
        <span>World Cup · Group stage</span>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex flex-1 items-center justify-end gap-2 text-right">
          <span className="font-semibold text-[#e4e7f0]">England</span>
          <TeamCrest
            name="England"
            logoUrl="https://a.espncdn.com/i/teamlogos/countries/500/eng.png"
          />
        </div>
        <span className="text-xs font-medium text-[#3a3e55]">vs</span>
        <div className="flex flex-1 items-center gap-2">
          <TeamCrest
            name="Croatia"
            logoUrl="https://a.espncdn.com/i/teamlogos/countries/500/cro.png"
          />
          <span className="font-semibold text-[#e4e7f0]">Croatia</span>
        </div>
      </div>

      <div className="flex h-1.5 overflow-hidden rounded-full bg-[#1a1e30]">
        <div className="bg-emerald-500" style={{ width: "50.3%" }} />
        <div className="bg-[#3a3e55]" style={{ width: "24.2%" }} />
        <div className="bg-sky-500" style={{ width: "25.5%" }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs font-medium">
        <span className="text-emerald-400">England 50%</span>
        <span className="text-[#5a607a]">Draw 24%</span>
        <span className="text-sky-400/60">Croatia 25%</span>
      </div>

      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-2.5 py-1 text-xs font-semibold text-emerald-400">
        <span aria-hidden="true">✓</span> Called it — England won
      </div>

      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[#5a607a]">
        <span className="font-semibold text-emerald-400">The Breakdown: </span>
        England and Croatia have history — they met in the 2018 World Cup semifinal. Reshaped
        under Gareth Southgate since, England were the model&apos;s lean in a tight one.
      </p>
    </div>
  );
}

/* ---------- Sports ---------- */

const SPORTS = [
  {
    name: "Soccer",
    blurb: "World Cup & internationals — form, goals, and momentum modeled per side.",
    tag: "⚽",
  },
  {
    name: "UFC",
    blurb: "Every main card, fight by fight. Tale-of-the-tape edges and finishing trends.",
    tag: "🥊",
  },
  {
    name: "NBA",
    blurb: "The full season, searchable. Point-in-time form with no hindsight leakage.",
    tag: "🏀",
  },
];

function Sports() {
  return (
    <section className="border-y border-white/[0.05] bg-[#0a0d14]">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <p className="mb-10 text-center text-xs font-bold uppercase tracking-[0.2em] text-[#5a607a]">
          Three sports, one model pipeline
        </p>
        <div className="mt-2 grid gap-4 sm:grid-cols-3">
          {SPORTS.map((s) => (
            <div
              key={s.name}
              className="rounded-2xl border border-[#1a1d2a] bg-[#0c0f1a] p-6 transition-colors duration-150 hover:border-[#272b3f]"
            >
              <p className="text-2xl">{s.tag}</p>
              <h3 className="mt-3 text-base font-bold text-[#e4e7f0]" style={displayFont}>
                {s.name}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#5a607a]">{s.blurb}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- How it works ---------- */

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
    <section className="bg-[#07090e]">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="text-center text-3xl font-bold tracking-tight" style={displayFont}>
          How it works
        </h2>
        <p className="mt-3 text-center text-[#5a607a]">
          From a wall of stats to a pick that actually makes sense.
        </p>
        <div className="mt-14 grid gap-10 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n}>
              <p className="text-5xl font-bold tabular-nums text-[#1a1e30]" style={displayFont}>
                {s.n}
              </p>
              <h3 className="mt-4 text-lg font-semibold text-[#e4e7f0]">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5a607a]">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Sample breakdown ---------- */

const BREAKDOWN_SECTIONS = [
  {
    label: "The Story",
    body: "A World Cup clash with real history — England and Croatia, who met in the 2018 semifinal. England arrived reshaped under Gareth Southgate, blending experience with a wave of young talent.",
  },
  {
    label: "The Key to the Matchup",
    body: "England's squad depth and improved balance under Southgate were the model's biggest lean — the edge that decides a tight, evenly-matched game.",
  },
  {
    label: "The Pick",
    body: "England, the clear favorite at 50% to Croatia's 25% — and they delivered. Exactly the kind of close game the model is built to read.",
  },
];

function SampleBreakdown() {
  return (
    <section className="border-y border-white/[0.05] bg-[#0a0d14]">
      <div className="mx-auto max-w-3xl px-6 py-24">
        <h2 className="text-3xl font-bold tracking-tight" style={displayFont}>
          Not just a number — a read
        </h2>
        <p className="mt-3 text-[#5a607a]">
          Every pick ships with a structured breakdown. Here&apos;s the shape of it:
        </p>
        <div className="mt-8 space-y-3">
          {BREAKDOWN_SECTIONS.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-[#1a1d2a] bg-[#0c0f1a] p-5"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                {s.label}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#b0b8d0]">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Final CTA ---------- */

function FinalCta() {
  return (
    <section className="bg-[#07090e]">
      <div className="mx-auto max-w-6xl px-6 py-28">
        <div className="rounded-3xl border border-[#1e2236] bg-[#0c0f1a] px-6 py-20 text-center">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">
            Free to join
          </p>
          <h2 className="text-balance text-4xl font-bold leading-tight tracking-tight sm:text-5xl" style={displayFont}>
            Stop guessing.{" "}
            <span className="text-emerald-400">Start reading the numbers.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-lg text-[#6b7390]">
            Create a free account and unlock every Soccer, UFC, and NBA pick — past and
            upcoming — with the full breakdown behind each one.
          </p>
          <Link
            href="/login?next=/dashboard&mode=signup"
            className="mt-8 inline-block rounded-lg bg-emerald-500 px-7 py-3.5 font-semibold text-neutral-950 transition-colors duration-150 hover:bg-emerald-400"
          >
            Create a free account
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */

function Footer() {
  return (
    <footer className="border-t border-white/[0.05] bg-[#07090e]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col items-center justify-between gap-4 text-sm text-[#4a506a] sm:flex-row">
          <div className="flex items-center gap-2.5">
            <Logo id="logo-foot" size={16} />
            <span className="font-bold uppercase tracking-widest text-[#6b7390]" style={displayFont}>
              The Breakdown
            </span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs">
            <Link href="/terms" className="transition-colors duration-150 hover:text-[#b0b8d0]">
              Terms
            </Link>
            <Link href="/privacy" className="transition-colors duration-150 hover:text-[#b0b8d0]">
              Privacy
            </Link>
            <Link
              href="/responsible-gaming"
              className="transition-colors duration-150 hover:text-[#b0b8d0]"
            >
              Responsible gaming
            </Link>
            <a
              href={SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 transition-colors duration-150 hover:text-[#b0b8d0]"
            >
              <MailIcon />
              Support
            </a>
          </nav>
        </div>
        <p className="mt-6 text-center text-xs leading-relaxed text-[#3a3e55] sm:text-left">
          For informational and entertainment purposes only — not betting, investment, or financial
          advice. No outcome is guaranteed. 18+. If gambling is a problem for you, call
          1-800-GAMBLER.
        </p>
      </div>
    </footer>
  );
}

function Logo({ size = 22 }: { id?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2.5" y="13" width="5" height="8.5" rx="1.5" fill="#34d399" />
      <rect x="9.5" y="7" width="5" height="14.5" rx="1.5" fill="#34d399" opacity="0.8" />
      <rect x="16.5" y="2.5" width="5" height="19" rx="1.5" fill="#34d399" opacity="0.6" />
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
