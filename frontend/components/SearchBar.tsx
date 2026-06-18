/** Search past predictions by team / fighter name. Plain GET form so it works
   without client JS; preserves the active sport tab. */
export function SearchBar({ sport, q }: { sport: string; q?: string }) {
  return (
    <form action="/past" method="get" className="mb-6 flex gap-2">
      {sport && <input type="hidden" name="sport" value={sport} />}
      <input
        type="search"
        name="q"
        defaultValue={q ?? ""}
        placeholder="Search a team or fighter…"
        className="w-full max-w-xs rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-emerald-500"
      />
      <button
        type="submit"
        className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:border-neutral-500"
      >
        Search
      </button>
      {q && (
        <a
          href={sport ? `/past?sport=${sport}` : "/past"}
          className="self-center text-sm text-neutral-500 hover:text-neutral-300"
        >
          Clear
        </a>
      )}
    </form>
  );
}
