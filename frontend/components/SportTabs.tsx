import Link from "next/link";

const SPORTS: { id: string; label: string; soon?: boolean }[] = [
  { id: "ufc", label: "UFC" },
  { id: "soccer", label: "Soccer" },
  { id: "nba", label: "NBA" },
];

const ACTIVE: Record<string, string> = {
  emerald: "border-emerald-500 bg-emerald-500/10 text-emerald-400",
  violet: "border-violet-500 bg-violet-500/10 text-violet-300",
};

export function SportTabs({
  basePath,
  active,
  accent = "emerald",
}: {
  basePath: string;
  active: string;
  accent?: "emerald" | "violet";
}) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {SPORTS.map((s) => {
        const isActive = s.id === active;
        const href = s.id ? `${basePath}?sport=${s.id}` : basePath;
        return (
          <Link
            key={s.id || "all"}
            href={href}
            className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition ${
              isActive
                ? ACTIVE[accent]
                : "border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200"
            }`}
          >
            {s.label}
            {s.soon && (
              <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] uppercase text-neutral-500">
                soon
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
