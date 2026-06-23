import { Nav } from "@/components/Nav";
import { SiteFooter } from "@/components/SiteFooter";

/** Shared shell + typography for the legal pages (Terms, Privacy, etc.). */
export function LegalDoc({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#07090e] text-[#e4e7f0]">
      <Nav />
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1
          className="text-3xl font-bold tracking-tight text-[#e4e7f0]"
          style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
        >
          {title}
        </h1>
        {updated && <p className="mt-2 text-sm text-[#5a607a]">Last updated {updated}</p>}

        <div className="legal-body mt-8 space-y-6 text-sm leading-relaxed text-[#b0b8d0]">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

/** A titled section within a legal doc. */
export function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-[#e4e7f0]">{heading}</h2>
      {children}
    </section>
  );
}
