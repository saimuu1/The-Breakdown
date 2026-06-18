// Renders "The Breakdown" write-up. The v3 persona emits labeled sections
// (STAGE / THE EDGE / KEY FACTORS / THE PICK); we parse them into styled blocks
// and gracefully fall back to plain prose for older (unlabeled) analyses.

const SECTIONS = ["STAGE", "THE EDGE", "KEY FACTORS", "THE PICK"] as const;

function parseSections(text: string): { heading: string; body: string }[] | null {
  const found: { heading: string; body: string }[] = [];
  // Match "HEADER:" anywhere, capturing text until the next header or end.
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
    <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-6">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-emerald-400">
        The Breakdown
      </h2>
      {sections ? (
        <div className="space-y-4">
          {sections.map((s) => (
            <div key={s.heading}>
              <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-neutral-500">
                {s.heading}
              </h3>
              <p className="leading-relaxed text-neutral-200">{s.body}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="whitespace-pre-line leading-relaxed text-neutral-200">{text}</p>
      )}
    </section>
  );
}
