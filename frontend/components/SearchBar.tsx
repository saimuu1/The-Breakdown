/** Search predictions by team / fighter / event name. Plain GET form so it works
   without client JS; preserves the active sport tab. `basePath` lets the same bar
   drive both the upcoming (/dashboard) and past (/past) views. */
export function SearchBar({
  sport,
  q,
  basePath = "/past",
  placeholder = "Search a fighter, team, or event…",
}: {
  sport: string;
  q?: string;
  basePath?: string;
  placeholder?: string;
}) {
  return (
    <form action={basePath} method="get" className="mb-8 flex items-center gap-3">
      {sport && <input type="hidden" name="sport" value={sport} />}
      <div className="relative flex-1">
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder={placeholder}
          className="w-full rounded-xl border border-neutral-800 bg-neutral-900/60 py-3 pl-11 pr-4 text-sm text-neutral-100 outline-none transition placeholder:text-neutral-500 focus:border-emerald-500/60 focus:bg-neutral-900 focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>
      <button
        type="submit"
        className="shrink-0 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400"
      >
        Search
      </button>
      {q && (
        <a
          href={sport ? `${basePath}?sport=${sport}` : basePath}
          className="shrink-0 text-sm text-neutral-500 transition hover:text-neutral-300"
        >
          Clear
        </a>
      )}
    </form>
  );
}
