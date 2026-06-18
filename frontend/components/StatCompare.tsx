import { statRows } from "@/lib/featureLabels";

/** Head-to-head stat table: each row is a centered bar leaning to the favored
   side (home = emerald/left, away = sky/right), sized by how decisive the edge is. */
export function StatCompare({
  diffs,
  home,
  away,
  sportId,
}: {
  diffs: Record<string, number | null>;
  home: string;
  away: string;
  sportId: string;
}) {
  const rows = statRows(diffs, home, away, sportId);
  if (rows.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between text-sm font-bold uppercase tracking-widest">
        <span className="text-emerald-400">{home}</span>
        <span className="text-neutral-500">Head to head</span>
        <span className="text-sky-400">{away}</span>
      </div>
      <ul className="divide-y divide-neutral-800 rounded-xl border border-neutral-800 bg-neutral-900">
        {rows.map((r) => {
          const homeFav = r.favored === home;
          const pct = Math.round(r.strength * 50); // half-width max per side
          return (
            <li key={r.label} className="px-4 py-2.5">
              <div className="mb-1 text-center text-xs text-neutral-400">{r.label}</div>
              <div className="flex h-2 items-center">
                <div className="flex h-full w-1/2 justify-end">
                  {homeFav && (
                    <div
                      className="h-full rounded-l bg-emerald-500"
                      style={{ width: `${pct * 2}%` }}
                    />
                  )}
                </div>
                <div className="h-3 w-px bg-neutral-600" />
                <div className="flex h-full w-1/2 justify-start">
                  {!homeFav && r.favored && (
                    <div
                      className="h-full rounded-r bg-sky-500"
                      style={{ width: `${pct * 2}%` }}
                    />
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
