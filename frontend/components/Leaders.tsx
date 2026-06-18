import { TeamCrest } from "@/components/TeamCrest";

export interface MatchContext {
  leaders?: { home?: string[]; away?: string[] } | null;
}

/** Per-team key players (from ESPN leaders), shown as two columns. Renders
   nothing when the free feed didn't provide leaders (e.g. most soccer games). */
export function Leaders({
  context,
  home,
  away,
  homeLogo,
  awayLogo,
}: {
  context: MatchContext | null;
  home: string;
  away: string;
  homeLogo?: string | null;
  awayLogo?: string | null;
}) {
  const leaders = context?.leaders;
  const hasAny = !!(leaders?.home?.length || leaders?.away?.length);
  if (!hasAny) return null;

  return (
    <section>
      <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-neutral-400">
        Key players
      </h2>
      <div className="grid grid-cols-2 gap-4">
        <Column name={home} logo={homeLogo} players={leaders?.home ?? []} accent="emerald" />
        <Column name={away} logo={awayLogo} players={leaders?.away ?? []} accent="sky" />
      </div>
    </section>
  );
}

function Column({
  name,
  logo,
  players,
  accent,
}: {
  name: string;
  logo?: string | null;
  players: string[];
  accent: "emerald" | "sky";
}) {
  const dot = accent === "emerald" ? "text-emerald-400" : "text-sky-400";
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="mb-2 flex items-center gap-2">
        <TeamCrest name={name} logoUrl={logo} size={20} />
        <span className="text-sm font-semibold text-neutral-200">{name}</span>
      </div>
      <ul className="space-y-1 text-sm text-neutral-400">
        {players.length === 0 && <li className="text-neutral-600">—</li>}
        {players.map((p) => (
          <li key={p}>
            <span className={dot}>•</span> {p}
          </li>
        ))}
      </ul>
    </div>
  );
}
