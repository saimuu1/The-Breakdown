// A two/three-way probability bar. Emerald = the model's favored outcome.

const OUTCOME_ORDER = ["home", "draw", "away"];

function ordered(probs: Record<string, number>) {
  return Object.entries(probs).sort(
    (a, b) => OUTCOME_ORDER.indexOf(a[0]) - OUTCOME_ORDER.indexOf(b[0]),
  );
}

const SEGMENT_COLORS: Record<string, string> = {
  home: "bg-emerald-500",
  draw: "bg-neutral-500",
  away: "bg-sky-500",
};

export function ProbabilityBar({ probs }: { probs: Record<string, number> }) {
  const entries = ordered(probs);
  const top = entries.reduce((a, b) => (b[1] > a[1] ? b : a));

  return (
    <div className="space-y-1.5">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-neutral-800">
        {entries.map(([outcome, p]) => (
          <div
            key={outcome}
            className={SEGMENT_COLORS[outcome] ?? "bg-neutral-600"}
            style={{ width: `${p * 100}%` }}
            aria-label={`${outcome} ${(p * 100).toFixed(0)}%`}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs">
        {entries.map(([outcome, p]) => (
          <span
            key={outcome}
            className={`capitalize ${
              outcome === top[0] ? "font-semibold text-neutral-100" : "text-neutral-500"
            }`}
          >
            {outcome} {(p * 100).toFixed(0)}%
          </span>
        ))}
      </div>
    </div>
  );
}
