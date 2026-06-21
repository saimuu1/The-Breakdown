const SECTIONS = [
  "THE STORY",
  "THE KEY TO THE MATCHUP",
  "STAGE",
  "THE EDGE",
  "KEY FACTORS",
  "THE PICK",
] as const;

function parseSections(text: string): { heading: string; body: string }[] | null {
  const found: { heading: string; body: string }[] = [];
  const pattern = new RegExp(
    `(${SECTIONS.join("|")})\\s*:\\s*([\\s\\S]*?)(?=(?:${SECTIONS.join("|")})\\s*:|$)`,
    "g",
  );
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    found.push({ heading: m[1], body: m[2].trim() });
  }
  return found.length >= 2 ? found : null;
}

export function Breakdown({ text }: { text: string }) {
  const sections = parseSections(text);

  return (
    <section className="rounded-2xl border border-[#1e2236] bg-[#0c0f1a] p-6">
      <h2
        className="mb-5 text-xs font-bold uppercase tracking-widest text-emerald-400"
        style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
      >
        The Breakdown
      </h2>
      {sections ? (
        <div className="space-y-5">
          {sections.map((s) => (
            <div key={s.heading}>
              <h3 className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[#3a3e55]">
                {s.heading}
              </h3>
              <p className="leading-relaxed text-[#b0b8d0]">{s.body}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="whitespace-pre-line leading-relaxed text-[#b0b8d0]">{text}</p>
      )}
    </section>
  );
}
