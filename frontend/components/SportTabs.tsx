import Link from "next/link";

const SPORTS: { id: string; label: string; soon?: boolean }[] = [
  { id: "soccer", label: "Soccer" },
  { id: "ufc", label: "UFC" },
  { id: "nba", label: "NBA" },
];

export function SportTabs({
  basePath,
  active,
}: {
  basePath: string;
  active: string;
  accent?: string; // kept for backwards compat, unused
}) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {SPORTS.map((s) => {
        const isActive = s.id === active;
        const href = `${basePath}?sport=${s.id}`;
        return (
          <Link
            key={s.id}
            href={href}
            className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors duration-150 ${
              isActive
                ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-400"
                : "border-[#1e2236] text-[#7a8099] hover:border-[#2e3248] hover:text-[#b0b8d0]"
            }`}
          >
            {s.label}
            {s.soon && (
              <span className="rounded bg-[#181b2a] px-1.5 py-0.5 text-[10px] uppercase text-[#5a607a]">
                soon
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
